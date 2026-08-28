const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  customerId: { type: String, required: true },
  customerFitnessLevel: { type: Number, required: true },
  addOns: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AddOn' }],
  totalAmount: { type: Number, required: true },
  source: { 
    type: String, 
    required: true,
    enum: ['human', 'agent'] 
  },
  status: { 
    type: String, 
    required: true,
    enum: ['pending_payment', 'confirmed', 'rejected'] 
  },
  outcomeReason: { type: String },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
