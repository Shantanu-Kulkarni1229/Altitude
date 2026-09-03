const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },
  batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
  customerId: { type: String, required: true },
  customerFitnessLevel: { type: Number, required: true },
  // Collected conversationally by the concierge (or typed at checkout) so
  // Razorpay Checkout can be pre-filled — the customer only has to confirm
  // a payment method, not retype their details into the payment gateway.
  customerName: { type: String },
  customerEmail: { type: String },
  customerPhone: { type: String },
  travelers: { type: Number, default: 1, min: 1 },
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
    enum: ['pending_payment', 'confirmed', 'rejected', 'cancelled'] 
  },
  outcomeReason: { type: String },
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  idempotencyKey: { type: String, unique: true, sparse: true },
  correlationId: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
