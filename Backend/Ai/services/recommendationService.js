const { OllamaService } = require('./ollamaService');
const recommendationPrompt = require('../prompts/recommendationPrompt');
const addonPrompt = require('../prompts/addonPrompt');

class RecommendationService {
  async generateExplanations(matches, signals) {
    const explainedMatches = [];

    for (const match of matches) {
      try {
        const prompt = recommendationPrompt(match, signals);
        const reasoning = await OllamaService.generateResponse(prompt);
        explainedMatches.push({ ...match, reasoning: reasoning.trim() });
      } catch (error) {
        // Degrade gracefully if LLM fails just for reasoning
        explainedMatches.push({ ...match, reasoning: "Here is a trek matching your criteria." });
      }
    }

    return explainedMatches;
  }

  async suggestAddon(trek, fitnessLevel) {
    try {
      const prompt = addonPrompt(trek, fitnessLevel);
      const rawResponse = await OllamaService.generateResponse(prompt);
      
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawResponse);
      
      return parsed;
    } catch (error) {
      return null;
    }
  }
}

module.exports = new RecommendationService();
