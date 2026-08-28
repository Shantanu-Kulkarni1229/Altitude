const AuditLog = require('../models/AuditLog');

// 1. Budget check
const checkBudget = (totalAmount, maxBudget) => {
  if (maxBudget && totalAmount > maxBudget) {
    return {
      passed: false,
      reason: `Booking total (₹${totalAmount}) exceeds maximum budget (₹${maxBudget}).`
    };
  }
  return { passed: true, reason: 'Within budget' };
};

// 2. Fitness check
const checkFitness = (customerFitness, requiredFitness) => {
  if (customerFitness < requiredFitness) {
    return {
      passed: false,
      reason: `Safety Guardrail: Customer fitness level (${customerFitness}) does not meet the minimum required for this trek (${requiredFitness}).`
    };
  }
  return { passed: true, reason: 'Fitness level matched' };
};

// 3. Add-on Cap
const checkAddonCap = (basePrice, addonsTotal) => {
  const maxAddonSpend = basePrice * 0.25; // Let's say 25% max
  if (addonsTotal > maxAddonSpend) {
    return {
      passed: false,
      reason: `Add-on spending (₹${addonsTotal}) exceeds cap of 25% of base price (₹${maxAddonSpend}).`
    };
  }
  return { passed: true, reason: 'Add-on spend within limits' };
};

// Log Guardrail Action
const logGuardrailDecision = async (actor, action, decision, reason, amount, outcome, bookingId = null) => {
  try {
    const log = new AuditLog({
      actor,
      action,
      decision,
      reason,
      amount,
      outcome,
      bookingId
    });
    await log.save();
  } catch (error) {
    console.error("Error logging audit:", error);
  }
};

module.exports = {
  checkBudget,
  checkFitness,
  checkAddonCap,
  logGuardrailDecision
};
