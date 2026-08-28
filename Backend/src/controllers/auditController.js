const AuditLog = require('../models/AuditLog');

exports.getAuditLogs = async (req, res) => {
  const { actor, outcome } = req.query;
  let query = {};
  
  if (actor) query.actor = actor;
  if (outcome) query.outcome = outcome;
  
  const logs = await AuditLog.find(query).sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: logs });
};
