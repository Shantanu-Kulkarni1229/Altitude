const Trek = require('../../src/models/Trek');
const Batch = require('../../src/models/Batch');

class RetrievalService {
  async findMatches(signals) {
    let query = {};

    // Map difficulty
    if (signals.difficulty) {
      query.difficulty = signals.difficulty.toLowerCase();
    }

    // Map budget Ceiling
    if (signals.budgetCeiling) {
      query.basePrice = { $lte: Number(signals.budgetCeiling) };
    }

    // In a real app we might map month to batch start dates, but for now we just match the static data.

    // Find treks
    let treks = await Trek.find(query).lean();

    // If fitness level is inferred, filter out safety risks
    if (signals.fitnessLevel) {
      treks = treks.filter(t => signals.fitnessLevel >= t.minFitnessLevel);
    }

    return this._attachOpenBatches(treks);
  }

  // Used when findMatches comes back empty. Preference filters (difficulty,
  // budget) relax and re-score by closeness; the fitness safety filter never
  // relaxes.
  async findAlternatives(signals) {
    let treks = await Trek.find({}).lean();

    if (signals.fitnessLevel) {
      treks = treks.filter(t => signals.fitnessLevel >= t.minFitnessLevel);
    }

    const scored = treks.map((trek) => {
      let score = 0;
      if (signals.difficulty && trek.difficulty === signals.difficulty.toLowerCase()) score += 2;
      if (signals.budgetCeiling) {
        const over = Math.max(trek.basePrice - Number(signals.budgetCeiling), 0);
        score -= over / Number(signals.budgetCeiling); // closer to budget scores higher
      }
      return { trek, score };
    }).sort((a, b) => b.score - a.score).map((s) => s.trek);

    return this._attachOpenBatches(scored);
  }

  // A condensed, honest snapshot of what's actually in the catalog right
  // now — grounding for the general-chat fallback so it can answer "do you
  // have anything in Ladakh" or "what's your cheapest trek" without ever
  // inventing a trek that doesn't exist.
  async getCatalogSummary() {
    const treks = await Trek.find({}).select('name region difficulty basePrice durationDays minFitnessLevel').lean();
    return treks.map((t) => `${t.name} — ${t.region}, ${t.difficulty}, ${t.durationDays}d, ₹${t.basePrice}/person, min fitness ${t.minFitnessLevel}/10`);
  }

  async _attachOpenBatches(treks) {
    const matches = [];
    for (const trek of treks) {
      const batches = await Batch.find({ trekId: trek._id, status: { $ne: 'full' } }).lean();
      if (batches.length > 0) {
        const slotsAvailable = Math.max(...batches.map((b) => b.totalSlots - b.slotsBooked));
        matches.push({ ...trek, batches, slotsAvailable });
      }
      if (matches.length >= 4) break;
    }
    return matches;
  }
}

module.exports = new RetrievalService();
