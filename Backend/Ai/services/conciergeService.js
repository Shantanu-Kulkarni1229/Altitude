const extractionService = require('./extractionService');
const retrievalService = require('./retrievalService');
const recommendationService = require('./recommendationService');
const { OllamaUnavailableError } = require('./ollamaService');
const bookingService = require('../../src/services/bookingService');
const AuditLog = require('../../src/models/AuditLog');

class ConciergeService {
  async handleChatMessage(message, context = {}) {
    try {
      // 1. Extraction
      const extractionResult = await extractionService.extractSignals(message);
      
      // Handle Booking Intent
      if (extractionResult.confidence === 'high' && extractionResult.signals.isBookingIntent) {
        if (context.lastTrekId) {
          return {
            type: 'booking_redirect',
            text: 'I can help you book that right away! Let me take you to the booking checkout page for that trek.',
            data: { trekId: context.lastTrekId }
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

      return {
        type: 'recommendation',
        text: "I found some great options for you. Here is my top recommendation based on your preferences.",
        data: {
          treks: explainedMatches,
          suggestedAddon
        }
      };

    } catch (error) {
      if (error instanceof OllamaUnavailableError) {
        // Fallback Logic
        await this._logFallbackEvent(message);
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
      const result = await bookingService.processBookingAttempt(bookingData);
      
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

  async _logFallbackEvent(message) {
    try {
      const log = new AuditLog({
        actor: 'system',
        action: 'ai_chat_attempt',
        decision: 'fallback',
        reason: 'Ollama service is unavailable or timed out.',
        outcome: 'fallback'
      });
      await log.save();
    } catch (e) {
      console.error("Failed to write audit log for fallback", e);
    }
  }
}

module.exports = new ConciergeService();
