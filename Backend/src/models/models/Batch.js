const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  batchId: { type: String, required: true, unique: true },
  trekId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trek', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalSlots: { type: Number, required: true },
  slotsBooked: { type: Number, required: true, default: 0 },
  price: { type: Number, required: true },
  status: { 
    type: String, 
    required: true,
    enum: ['open', 'full', 'cancelled'],
    default: 'open'
  }
}, { timestamps: true });

// Ensure slotsBooked never exceeds totalSlots
batchSchema.pre('save', function(next) {
  if (this.slotsBooked > this.totalSlots) {
    return next(new Error('Slots booked cannot exceed total slots available.'));
  }
  if (this.slotsBooked === this.totalSlots) {
    this.status = 'full';
  }
  next();
});

module.exports = mongoose.model('Batch', batchSchema);
