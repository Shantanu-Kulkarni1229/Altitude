const AuditLog = require('../models/AuditLog');

exports.getAuditLogs = async (req, res) => {
  const { actor, outcome, decision, correlationId, limit } = req.query;
  let query = {};

  if (actor) query.actor = actor;
  if (outcome) query.outcome = outcome;
  if (decision) query.decision = decision;
  if (correlationId) query.correlationId = correlationId;

  // correlationId lookups (the trace drill-down) are always small and want
  // every matching row; the general feed is capped so an active demo server
  // never ships an unbounded payload to the dashboard.
  const cap = correlationId ? 500 : Math.min(Number(limit) || 200, 500);

  const logs = await AuditLog.find(query).sort({ createdAt: -1 }).limit(cap);
  res.status(200).json({ success: true, data: logs });
};
