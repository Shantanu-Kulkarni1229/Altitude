const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: { 
    type: String, 
    required: true, 
    enum: ['human', 'agent', 'system'] 
  },
  action: { type: String, required: true },
  decision: { 
    type: String, 
    required: true,
    enum: ['approved', 'rejected', 'fallback', 'processed'] 
  },
  reason: { type: String, required: true },
  amount: { type: Number }, // Optional, if money is involved
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' }, // Optional
  outcome: { 
    type: String, 
    required: true,
    enum: ['success', 'failure', 'fallback'] 
  }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);
