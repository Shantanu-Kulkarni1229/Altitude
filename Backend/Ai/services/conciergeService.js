const { v4: uuidv4 } = require('uuid');
const extractionService = require('./extractionService');
const retrievalService = require('./retrievalService');
const recommendationService = require('./recommendationService');
const { LLMService, LLMUnavailableError } = require('./llmService');
const generalChatPrompt = require('../prompts/generalChatPrompt');
const bookingService = require('../../src/services/bookingService');
const AuditLog = require('../../src/models/AuditLog');
const Trek = require('../../src/models/Trek');

const CARRYABLE_SIGNAL_KEYS = ['difficulty', 'budgetCeiling', 'month', 'fitnessLevel', 'travelers'];
const CONTACT_KEYS = ['customerName', 'customerEmail', 'customerPhone'];

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+?91[-\s]?)?[6-9]\d{9}\b/;

// Regex is more reliable than the LLM for structured tokens like emails/phones.
function extractContactFromText(message) {
  const email = message.match(EMAIL_RE)?.[0];
  const phone = message.match(PHONE_RE)?.[0]?.replace(/[-\s]/g, '');
  return { customerEmail: email, customerPhone: phone };
}

// Carries preferences forward across turns so "cheaper please" still knows
// the customer wants an extreme trek stated two messages ago.
function mergeSignals(prior = {}, incoming = {}) {
  const merged = { ...prior };
  for (const key of [...CARRYABLE_SIGNAL_KEYS, ...CONTACT_KEYS]) {
    if (incoming[key] !== undefined && incoming[key] !== null && incoming[key] !== '') {
      merged[key] = incoming[key];
    }
  }
  merged.isBookingIntent = !!incoming.isBookingIntent; // per-turn, never carried forward
  return merged;
}

function hasAnySignal(signals) {
  return CARRYABLE_SIGNAL_KEYS.some((key) => !!signals[key]);
}

// A follow-up naming one of several shown treks ("why is Kedarkantha good?")
// resolves to that trek rather than whichever ranked first.
function resolveTargetTrekId(message, context) {
  const recent = context.recentTreks || [];
  const lower = message.toLowerCase();
  const named = recent.find((t) => t.name && lower.includes(t.name.toLowerCase()));
  return named ? named.trekId : context.lastTrekId;
}

function describeSignals(signals) {
  const parts = [];
  if (signals.difficulty) parts.push(`${signals.difficulty} difficulty`);
  if (signals.budgetCeiling) parts.push(`under ₹${Number(signals.budgetCeiling).toLocaleString('en-IN')} per person`);
  if (signals.month) parts.push(`around ${signals.month}`);
  if (signals.travelers > 1) parts.push(`for ${signals.travelers} people`);
  return parts.length > 0 ? parts.join(', ') : 'something great';
}

// Plain-English summary for the audit log — raw signals go in `detail`.
function describeSignalsForAudit(signals) {
  const parts = [];
  if (signals.difficulty) parts.push(`${signals.difficulty} difficulty`);
  if (signals.budgetCeiling) parts.push(`budget ₹${Number(signals.budgetCeiling).toLocaleString('en-IN')}/person`);
  if (signals.month) parts.push(`timing "${signals.month}"`);
  if (signals.travelers > 1) parts.push(`${signals.travelers} travelers`);
  if (signals.customerName) parts.push(`name captured`);
  if (signals.customerEmail) parts.push(`email captured`);
  return parts;
}

class ConciergeService {
  async handleChatMessage(message, context = {}) {
    const correlationId = context.correlationId || uuidv4();

    try {
      const extractionResult = await extractionService.extractSignals(message, { hasActiveTrek: !!context.lastTrekId });
      const contactFromText = extractContactFromText(message);
      const incomingSignals = { ...extractionResult.signals, ...contactFromText };
      const signals = mergeSignals(context.priorSignals, incomingSignals);

      const understoodParts = describeSignalsForAudit(signals);
      await this._logAiEvent({
        action: 'signal_extraction',
        reason: understoodParts.length > 0
          ? `Understood ${understoodParts.join(', ')} (${extractionResult.confidence} confidence).`
          : `Couldn't confidently understand this message yet (${extractionResult.confidence} confidence).`,
        detail: { confidence: extractionResult.confidence, thisTurn: incomingSignals, merged: signals },
        correlationId
      });

      // Only treat as an immediate booking redirect if this message didn't also introduce new search filters.
      const hasNewFiltersThisTurn = extractionResult.signals.difficulty || extractionResult.signals.budgetCeiling || extractionResult.signals.month;
      const isBookingIntentThisTurn = extractionResult.confidence === 'high' && extractionResult.signals.isBookingIntent && !hasNewFiltersThisTurn;

      // Keep resolving a pending booking unless the customer clearly pivoted to a new search.
      if (context.pendingBooking?.trekId && !hasNewFiltersThisTurn) {
        return this._resolveBooking(context.pendingBooking.trekId, signals, correlationId);
      }

      const targetTrekId = resolveTargetTrekId(message, context);

      if (isBookingIntentThisTurn) {
        if (targetTrekId) {
          return this._resolveBooking(targetTrekId, signals, correlationId);
        } else {
          return {
            type: 'clarification',
            text: "Love the enthusiasm! Which trek are we booking?",
            data: null,
            signals
          };
        }
      }

      // Answer a follow-up about the trek already on screen instead of re-running the search
      // pipeline. `fallsThroughToStaleSearch` is a safety net: the extractor sees only this one
      // message, so short elliptical follow-ups ("why this?") can miss isInfoRequest — any turn
      // with a trek in context and no new filter has nothing useful to do but repeat itself,
      // so default it to an info request instead.
      const looksLikeInfoRequest = extractionResult.confidence === 'high' && extractionResult.signals.isInfoRequest;
      const fallsThroughToStaleSearch = context.lastTrekId && !hasNewFiltersThisTurn && !extractionResult.signals.isBookingIntent;
      if (looksLikeInfoRequest || fallsThroughToStaleSearch) {
        return this._answerTrekInfo(targetTrekId, message, signals, correlationId);
      }

      if (extractionResult.confidence === 'low' && !hasAnySignal(signals)) {
        const text = await this._generalChatReply(message, correlationId);
        return {
          type: 'clarification',
          text,
          data: null,
          signals
        };
      }

      // Strict match first, then pivot to the closest alternative rather than nothing.
      let matches = await retrievalService.findMatches(signals);
      let isAlternative = false;

      if (matches.length === 0) {
        matches = await retrievalService.findAlternatives(signals);
        isAlternative = matches.length > 0;

        if (isAlternative) {
          await this._logAiEvent({
            action: 'sales_pivot',
            reason: `No exact match for ${describeSignals(signals)} — pivoted to the closest alternative, "${matches[0].name}". The fitness safety guardrail was not relaxed to make this pivot.`,
            detail: { requestedSignals: signals, alternatives: matches.map((m) => ({ trekId: m.trekId, name: m.name })) },
            correlationId
          });
        }
      }

      if (matches.length === 0) {
        // Nothing safe to offer — safety isn't negotiable even for a sales pitch.
        return {
          type: 'no_match',
          text: "I want to get you moving, but I won't put you on something unsafe for your experience level right now. Want me to suggest a gentler starter trek to build up to it?",
          data: null,
          signals
        };
      }

      const explainedMatches = await recommendationService.generateExplanations(matches, signals, isAlternative);
      const topTrek = explainedMatches[0];
      const suggestedAddon = await recommendationService.suggestAddon(topTrek, signals.fitnessLevel);

      const otherNames = explainedMatches.slice(1).map((m) => m.name);
      await this._logAiEvent({
        action: 'trek_recommendation',
        reason: `Recommended "${topTrek.name}"${otherNames.length ? ` plus ${otherNames.length} more option${otherNames.length > 1 ? 's' : ''} (${otherNames.join(', ')})` : ''}${isAlternative ? ' (closest alternative, not an exact match)' : ''}.${suggestedAddon ? ` Suggested add-on: ${suggestedAddon.addonName}.` : ''}`,
        detail: {
          trekIds: explainedMatches.map((m) => m.trekId || m._id),
          isAlternative,
          aiReasoning: topTrek.reasoning,
          suggestedAddon
        },
        correlationId
      });

      const multiple = explainedMatches.length > 1;
      return {
        type: 'recommendation',
        text: isAlternative
          ? `I don't have an exact match for ${describeSignals(signals)}, but here ${multiple ? 'are a few options' : 'is one'} you're going to love instead.`
          : multiple
            ? `I found ${explainedMatches.length} great options for you — take a look.`
            : "I found a great option for you — here's my top pick.",
        data: {
          treks: explainedMatches,
          suggestedAddon,
          isAlternative,
          correlationId
        },
        signals
      };

    } catch (error) {
      if (error instanceof LLMUnavailableError) {
        await this._logFallbackEvent(message, correlationId);
        return {
          type: 'fallback',
          text: "My AI brain is momentarily offline, but don't let that slow you down — browse our catalog below and I'll be right back to help you book.",
          data: null
        };
      }
      throw error;
    }
  }

  // Catches anything that isn't a search, booking intent, or a question about the trek on
  // screen. Grounded in the real catalog so it never invents prices or treks; falls back to a
  // static line if the LLM call itself fails.
  async _generalChatReply(message, correlationId) {
    try {
      const catalogSummary = await retrievalService.getCatalogSummary();
      const prompt = generalChatPrompt(message, catalogSummary);
      const reply = (await LLMService.generateResponse(prompt)).trim();

      await this._logAiEvent({
        action: 'signal_extraction',
        reason: `Chatted freely — no specific search signal in this message ("${message.length > 60 ? `${message.slice(0, 60)}…` : message}").`,
        detail: { userMessage: message, reply },
        correlationId
      });

      return reply;
    } catch (error) {
      if (error instanceof LLMUnavailableError) throw error; // let the outer handler show the offline fallback
      return "I'd love to find your perfect trek! Tell me your budget, how challenging you want it, or a bit about your trekking experience — I'll take it from there.";
    }
  }

  async _answerTrekInfo(trekId, question, signals, correlationId) {
    const trek = await Trek.findOne({ trekId }).lean();
    if (!trek) {
      return {
        type: 'clarification',
        text: "Which trek would you like more details on?",
        data: null,
        signals
      };
    }

    const answer = await recommendationService.answerTrekQuestion(trek, question);
    const shortQuestion = question.length > 80 ? `${question.slice(0, 80)}…` : question;

    await this._logAiEvent({
      action: 'trek_info_request',
      reason: `Answered a question about "${trek.name}": "${shortQuestion}"`,
      detail: { trekId, question, answer },
      correlationId
    });

    return {
      type: 'trek_info',
      text: answer,
      data: { trekId, correlationId },
      signals
    };
  }

  // Collects name + email to pre-fill Razorpay Checkout — as far as a chat assistant can take a
  // booking, since card/UPI entry has to happen inside Razorpay's own PCI-DSS-scoped surface.
  async _resolveBooking(trekId, signals, correlationId) {
    const missing = [];
    if (!signals.customerName) missing.push('name');
    if (!signals.customerEmail) missing.push('email');

    if (missing.length === 0) {
      const firstName = signals.customerName.split(' ')[0];
      const travelers = Number(signals.travelers) > 0 ? Number(signals.travelers) : 1;
      const groupNote = travelers > 1 ? ` for all ${travelers} of you` : '';
      return {
        type: 'booking_redirect',
        text: `Perfect, thanks ${firstName}! Let's lock it in${groupNote} — taking you to checkout now.`,
        data: {
          trekId,
          customerName: signals.customerName,
          customerEmail: signals.customerEmail,
          customerPhone: signals.customerPhone || '',
          travelers,
          correlationId
        },
        signals
      };
    }

    return {
      type: 'contact_request',
      text: `Almost there! Just need your ${missing.join(' and ')} to get this booking ready for you — I'll have it pre-filled at checkout so all you do is pay.`,
      data: { pendingBooking: { trekId }, correlationId },
      signals
    };
  }

  async handleBookingConfirmation(bookingData) {
    try {
      bookingData.source = 'agent';
      const result = await bookingService.processBookingAttempt(bookingData, bookingData.correlationId);

      return {
        type: 'booking_success',
        text: "Your booking was successfully processed and the slot is held. Please complete the payment.",
        data: result
      };
    } catch (error) {
      return {
        type: 'booking_failure',
        text: error.message,
        data: null
      };
    }
  }

  // At most one proactive nudge per session (enforced client-side too) if a checkout was
  // abandoned — always audit-logged, no discount engine.
  async getAbandonedCheckoutNudge({ trekId, trekName, batchId, correlationId }) {
    const id = correlationId || uuidv4();
    if (!trekId || !batchId) {
      return { type: 'no_nudge', text: null, data: null };
    }

    await this._logAiEvent({
      action: 'campaign_nudge',
      reason: `Offered to resume the abandoned checkout for "${trekName || 'a trek'}" — one nudge per session, no discount applied.`,
      detail: { trekId, batchId },
      correlationId: id
    });

    return {
      type: 'campaign_nudge',
      text: `Welcome back! You still have a spot held for ${trekName || 'your trek'} — want me to pick up where you left off?`,
      data: { trekId, batchId, correlationId: id }
    };
  }

  // Non-monetary AI reasoning steps go through the same audit trail as booking decisions.
  async _logAiEvent({ action, reason, detail, correlationId }) {
    try {
      const log = new AuditLog({
        actor: 'agent',
        action,
        decision: 'processed',
        reason,
        detail,
        outcome: 'success',
        correlationId
      });
      await log.save();
    } catch (e) {
      console.error(`Failed to write audit log for ${action}`, e);
    }
  }

  async _logFallbackEvent(message, correlationId) {
    try {
      const log = new AuditLog({
        actor: 'system',
        action: 'ai_chat_attempt',
        decision: 'fallback',
        reason: 'The AI service was temporarily unavailable, so the concierge gracefully switched to a fallback message instead of failing outright.',
        detail: { userMessage: (message || '').slice(0, 300) },
        outcome: 'fallback',
        correlationId
      });
      await log.save();
    } catch (e) {
      console.error("Failed to write audit log for fallback", e);
    }
  }
}

module.exports = new ConciergeService();
