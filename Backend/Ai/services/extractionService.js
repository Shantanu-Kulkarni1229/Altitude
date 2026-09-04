const { LLMService } = require('./llmService');
const extractionPrompt = require('../prompts/extractionPrompt');

class ExtractionService {
  async extractSignals(customerMessage, options = {}) {
    const prompt = extractionPrompt(customerMessage, options);

    // We let LLMUnavailableError bubble up. Strict JSON mode removes the
    // whole class of failures where the model wraps its answer in prose or
    // markdown despite being told not to.
    const rawResponse = await LLMService.generateResponse(prompt, 15000, { jsonMode: true });
    
    try {
      // Attempt to parse JSON
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawResponse);
      
      // If essential keys are missing or completely blank, flag low confidence
      if (!parsed.difficulty && !parsed.budgetCeiling && !parsed.month && !parsed.fitnessLevel && !parsed.travelers && !parsed.isBookingIntent && !parsed.isInfoRequest && !parsed.customerName) {
        return { confidence: 'low', signals: parsed };
      }
      
      return { confidence: 'high', signals: parsed };
    } catch (parseError) {
      // If the LLM didn't return valid JSON, we fallback to low confidence
      return { confidence: 'low', signals: {} };
    }
  }
}

module.exports = new ExtractionService();
