const { v4: uuidv4 } = require('uuid');
const extractionService = require('./extractionService');
const retrievalService = require('./retrievalService');
const recommendationService = require('./recommendationService');
const { LLMUnavailableError } = require('./llmService');
const bookingService = require('../../src/services/bookingService');
const AuditLog = require('../../src/models/AuditLog');
const Trek = require('../../src/models/Trek');

const CARRYABLE_SIGNAL_KEYS = ['difficulty', 'budgetCeiling', 'month', 'fitnessLevel', 'travelers'];
const CONTACT_KEYS = ['customerName', 'customerEmail', 'customerPhone'];

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+?91[-\s]?)?[6-9]\d{9}\b/;

// Regex is far more reliable than an LLM for structured tokens like emails
// and phone numbers, so we pull those directly from the raw message rather
// than trusting the extraction model to transcribe them correctly.
function extractContactFromText(message) {
  const email = message.match(EMAIL_RE)?.[0];
  const phone = message.match(PHONE_RE)?.[0]?.replace(/[-\s]/g, '');
  return { customerEmail: email, customerPhone: phone };
}

// A good salesperson remembers what you told them two messages ago. Each
// turn's extraction only reflects THAT message; we merge it onto whatever
// preferences the customer has already stated this session so "cheaper
// please" after "I want an extreme trek" still knows they want extreme.
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

function describeSignals(signals) {
  const parts = [];
  if (signals.difficulty) parts.push(`${signals.difficulty} difficulty`);
  if (signals.budgetCeiling) parts.push(`under ₹${Number(signals.budgetCeiling).toLocaleString('en-IN')} per person`);
  if (signals.month) parts.push(`around ${signals.month}`);
  if (signals.travelers > 1) parts.push(`for ${signals.travelers} people`);
  return parts.length > 0 ? parts.join(', ') : 'something great';
}

class ConciergeService {
  async handleChatMessage(message, context = {}) {
    const correlationId = context.correlationId || uuidv4();

    try {
      // 1. Extraction (+ reliable regex extraction for email/phone — an LLM
      // is more likely to mistranscribe a structured token like an email
      // than a regex is to miss one)
      const extractionResult = await extractionService.extractSignals(message);
      const contactFromText = extractContactFromText(message);
      const incomingSignals = { ...extractionResult.signals, ...contactFromText };
      const signals = mergeSignals(context.priorSignals, incomingSignals);

      await this._logAiEvent({
        action: 'signal_extraction',
        reason: `confidence=${extractionResult.confidence}; thisTurn=${JSON.stringify(incomingSignals)}; merged=${JSON.stringify(signals)}`,
        correlationId
      });

      // Handle Booking Intent
      // Only treat as an immediate redirect if THIS message didn't also introduce new search filters
      const hasNewFiltersThisTurn = extractionResult.signals.difficulty || extractionResult.signals.budgetCeiling || extractionResult.signals.month;
      const isBookingIntentThisTurn = extractionResult.confidence === 'high' && extractionResult.signals.isBookingIntent && !hasNewFiltersThisTurn;

      // If we're already mid-way through collecting contact details for a
      // booking (customer replied with just "John, john@x.com"), keep
      // resolving that booking — unless they've clearly pivoted to a new
      // search (stated a new difficulty/budget/month), in which case drop
      // the pending booking rather than trap them answering a question they
      // no longer care about.
      if (context.pendingBooking?.trekId && !hasNewFiltersThisTurn) {
        return this._resolveBooking(context.pendingBooking.trekId, signals, correlationId);
      }

      if (isBookingIntentThisTurn) {
        if (context.lastTrekId) {
          return this._resolveBooking(context.lastTrekId, signals, correlationId);
        } else {
          return {
            type: 'clarification',
            text: "Love the enthusiasm! Which trek are we booking?",
            data: null,
            signals
          };
        }
      }

      // Follow-up question about the trek already on screen ("what's the
      // itinerary?", "how hard is it?") — answer it directly instead of
      // re-running the whole search pipeline, which would just repeat the
      // same card and pitch and read as broken rather than conversational.
      if (extractionResult.confidence === 'high' && extractionResult.signals.isInfoRequest && context.lastTrekId && !hasNewFiltersThisTurn) {
        return this._answerTrekInfo(context.lastTrekId, message, signals, correlationId);
      }

      // Only bail out to a clarifying question if THIS turn was unparseable
      // AND we have no accumulated preferences from earlier in the chat to
      // fall back on — never lose the thread of a conversation that's
      // already going somewhere.
      if (extractionResult.confidence === 'low' && !hasAnySignal(signals)) {
        return {
          type: 'clarification',
          text: "I'd love to find your perfect trek! Tell me your budget, how challenging you want it, or a bit about your trekking experience — I'll take it from there.",
          data: null,
          signals
        };
      }

      // 2. Retrieval — strict match first, then pivot to the closest
      // alternative rather than leaving the customer with nothing.
      let matches = await retrievalService.findMatches(signals);
      let isAlternative = false;

      if (matches.length === 0) {
        matches = await retrievalService.findAlternatives(signals);
        isAlternative = matches.length > 0;

        if (isAlternative) {
          await this._logAiEvent({
            action: 'sales_pivot',
            reason: `No exact match for "${describeSignals(signals)}" — pivoted to closest alternative(s): ${matches.map((m) => m.trekId).join(', ')}. Fitness safety filter was not relaxed.`,
            correlationId
          });
        }
      }

      if (matches.length === 0) {
        // Genuinely nothing safe to offer (e.g. stated fitness excludes every
        // trek in the catalog) — the one case we won't paper over, because
        // safety isn't negotiable even for a sales pitch.
        return {
          type: 'no_match',
          text: "I want to get you moving, but I won't put you on something unsafe for your experience level right now. Want me to suggest a gentler starter trek to build up to it?",
          data: null,
          signals
        };
      }

      // 3. Recommendation (Explanations & Addon)
      const explainedMatches = await recommendationService.generateExplanations(matches, signals, isAlternative);
      const topTrek = explainedMatches[0];
      const suggestedAddon = await recommendationService.suggestAddon(topTrek, signals.fitnessLevel);

      await this._logAiEvent({
        action: 'trek_recommendation',
        reason: `top=${topTrek.trekId || topTrek._id}; isAlternative=${isAlternative}; reasoning="${(topTrek.reasoning || '').slice(0, 200)}"; suggestedAddon=${suggestedAddon ? suggestedAddon.addonName : 'none'}`,
        correlationId
      });

      return {
        type: 'recommendation',
        text: isAlternative
          ? `I don't have an exact match for ${describeSignals(signals)}, but I think you're going to love this one instead.`
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
        // Fallback Logic
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

    await this._logAiEvent({
      action: 'trek_info_request',
      reason: `trekId=${trekId}; question="${question.slice(0, 150)}"`,
      correlationId
    });

    return {
      type: 'trek_info',
      text: answer,
      data: { trekId, correlationId },
      signals
    };
  }

  // Collects the minimum contact info needed to pre-fill Razorpay Checkout
  // (name + email; phone is a bonus) before handing off to payment — the
  // furthest a chat assistant can legitimately take a checkout, since the
  // actual card/UPI entry has to happen inside Razorpay's own secure,
  // PCI-DSS-scoped surface, not ours.
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
    // Re-enter the exact backend logic directly
    try {
      bookingData.source = 'agent'; // Explicitly set actor for audit
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

  // Campaign orchestrator (minimal, bounded): if the frontend tells us the
  // user abandoned a checkout (closed the Razorpay modal without paying),
  // offer exactly one proactive nudge to resume it. The frontend enforces
  // "at most once per session" via a sessionStorage flag before calling this;
  // this method additionally re-validates its inputs and always logs the
  // nudge to the audit trail, so it's gated and explainable like every other
  // money-adjacent AI action, not an open-ended discount/marketing engine.
  async getAbandonedCheckoutNudge({ trekId, trekName, batchId, correlationId }) {
    const id = correlationId || uuidv4();
    if (!trekId || !batchId) {
      return { type: 'no_nudge', text: null, data: null };
    }

    await this._logAiEvent({
      action: 'campaign_nudge',
      reason: `Proactive resume-checkout nudge offered for trek=${trekId} (${trekName || 'unknown'}) batch=${batchId}.`,
      correlationId: id
    });

    return {
      type: 'campaign_nudge',
      text: `Welcome back! You still have a spot held for ${trekName || 'your trek'} — want me to pick up where you left off?`,
      data: { trekId, batchId, correlationId: id }
    };
  }

  // Persists a non-monetary AI reasoning step (extraction / recommendation)
  // to the same audit trail used for booking decisions, so the "why did the
  // AI suggest this" trail is queryable, not just the eventual money action.
  async _logAiEvent({ action, reason, correlationId }) {
    try {
      const log = new AuditLog({
        actor: 'agent',
        action,
        decision: 'processed',
        reason,
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
        reason: `LLM service unavailable or timed out. User message: "${(message || '').slice(0, 300)}"`,
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
