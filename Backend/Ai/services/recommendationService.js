const { LLMService } = require('./llmService');
const recommendationPrompt = require('../prompts/recommendationPrompt');
const addonPrompt = require('../prompts/addonPrompt');
const infoPrompt = require('../prompts/infoPrompt');

class RecommendationService {
  async generateExplanations(matches, signals, isAlternative = false) {
    const explainedMatches = [];

    for (const match of matches) {
      try {
        const prompt = recommendationPrompt(match, signals, isAlternative);
        const reasoning = await LLMService.generateResponse(prompt);
        explainedMatches.push({ ...match, reasoning: reasoning.trim() });
      } catch (error) {
        // Degrade gracefully if LLM fails just for reasoning
        explainedMatches.push({
          ...match,
          reasoning: isAlternative
            ? "This one didn't come up in your exact search, but it's a trek our customers love — take a look."
            : "Here is a trek matching your criteria."
        });
      }
    }

    return explainedMatches;
  }

  async suggestAddon(trek, fitnessLevel) {
    try {
      const prompt = addonPrompt(trek, fitnessLevel);
      const rawResponse = await LLMService.generateResponse(prompt);
      
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawResponse);
      
      return parsed;
    } catch (error) {
      return null;
    }
  }

  // Answers a follow-up question about a trek the customer is already
  // looking at (e.g. "what's the itinerary?") without re-running the whole
  // search/recommendation pipeline — that would just repeat the same pitch
  // and card, which reads as broken rather than conversational.
  async answerTrekQuestion(trek, question) {
    const prompt = infoPrompt(trek, question);
    const answer = await LLMService.generateResponse(prompt);
    return answer.trim();
  }
}

module.exports = new RecommendationService();
