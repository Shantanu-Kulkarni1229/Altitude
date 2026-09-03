const { v4: uuidv4 } = require('uuid');
const extractionService = require('./extractionService');
const retrievalService = require('./retrievalService');
const recommendationService = require('./recommendationService');
const { LLMUnavailableError } = require('./llmService');
const bookingService = require('../../src/services/bookingService');
const AuditLog = require('../../src/models/AuditLog');

class ConciergeService {
  async handleChatMessage(message, context = {}) {
    const correlationId = context.correlationId || uuidv4();

    try {
      // 1. Extraction
      const extractionResult = await extractionService.extractSignals(message);
      await this._logAiEvent({
        action: 'signal_extraction',
        reason: `confidence=${extractionResult.confidence}; signals=${JSON.stringify(extractionResult.signals)}`,
        correlationId
      });

      // Handle Booking Intent
      // Only treat as an immediate redirect if they didn't provide new search filters
      const hasSearchFilters = extractionResult.signals.difficulty || extractionResult.signals.budgetCeiling || extractionResult.signals.month;

      if (extractionResult.confidence === 'high' && extractionResult.signals.isBookingIntent && !hasSearchFilters) {
        if (context.lastTrekId) {
          return {
            type: 'booking_redirect',
            text: 'I can help you book that right away! Let me take you to the booking checkout page for that trek.',
            data: { trekId: context.lastTrekId, correlationId }
          };
        } else {
          return {
            type: 'clarification',
            text: 'I can help you book! Which trek would you like to book?',
            data: null
          };
        }
      }

      if (extractionResult.confidence === 'low') {
        return {
          type: 'clarification',
          text: "I want to make sure I find the perfect trek for you. Could you tell me a bit more about your budget, preferred difficulty, or past trekking experience?",
          data: null
        };
      }

      // 2. Retrieval
      const matches = await retrievalService.findMatches(extractionResult.signals);

      if (matches.length === 0) {
        return {
          type: 'no_match',
          text: "I couldn't find any open treks matching all those specific criteria right now. Let me know if you are flexible on budget or difficulty!",
          data: null
        };
      }

      // 3. Recommendation (Explanations & Addon)
      const explainedMatches = await recommendationService.generateExplanations(matches, extractionResult.signals);
      const topTrek = explainedMatches[0];
      const suggestedAddon = await recommendationService.suggestAddon(topTrek, extractionResult.signals.fitnessLevel);

      await this._logAiEvent({
        action: 'trek_recommendation',
        reason: `top=${topTrek.trekId || topTrek._id}; reasoning="${(topTrek.reasoning || '').slice(0, 200)}"; suggestedAddon=${suggestedAddon ? suggestedAddon.addonName : 'none'}`,
        correlationId
      });

      return {
        type: 'recommendation',
        text: "I found some great options for you. Here is my top recommendation based on your preferences.",
        data: {
          treks: explainedMatches,
          suggestedAddon,
          correlationId
        }
      };

    } catch (error) {
      if (error instanceof LLMUnavailableError) {
        // Fallback Logic
        await this._logFallbackEvent(message, correlationId);
        return {
          type: 'fallback',
          text: "I am currently undergoing scheduled maintenance and cannot process travel requests. Please browse our catalog directly to book.",
          data: null
        };
      }
      throw error;
    }
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
