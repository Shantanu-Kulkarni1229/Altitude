const { LLMService } = require('./llmService');
const extractionPrompt = require('../prompts/extractionPrompt');

class ExtractionService {
  async extractSignals(customerMessage) {
    const prompt = extractionPrompt(customerMessage);

    // We let LLMUnavailableError bubble up
    const rawResponse = await LLMService.generateResponse(prompt);
    
    try {
      // Attempt to parse JSON
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawResponse);
      
      // If essential keys are missing or completely blank, flag low confidence
      if (!parsed.difficulty && !parsed.budgetCeiling && !parsed.month && !parsed.fitnessLevel && !parsed.isBookingIntent) {
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
