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

    // Attach open batches
    const matches = [];
    for (const trek of treks) {
      const batches = await Batch.find({ trekId: trek._id, status: { $ne: 'full' } }).lean();
      if (batches.length > 0) {
        matches.push({ ...trek, batches });
      }
    }
    
    return matches.slice(0, 3); // Return top 3 matches
  }
}

module.exports = new RetrievalService();
