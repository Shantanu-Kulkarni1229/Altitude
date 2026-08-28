const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const Batch = require('../models/Batch');
const AddOn = require('../models/AddOn');
const Booking = require('../models/Booking');
const { checkBudget, checkFitness, checkAddonCap, logGuardrailDecision } = require('../utils/guardrails');

class BookingService {
  async processBookingAttempt(data) {
    const { batchId, customerId, customerFitnessLevel, addOnIds, source, maxBudget } = data;
    
    const batch = await Batch.findOne({ batchId }).populate('trekId');
    if (!batch) {
      throw new Error('Batch not found');
    }
    const trek = batch.trekId;

    let addOns = [];
    let addonsTotal = 0;
    if (addOnIds && addOnIds.length > 0) {
      addOns = await AddOn.find({ addOnId: { $in: addOnIds } });
      addonsTotal = addOns.reduce((sum, item) => sum + item.price, 0);
    }
    
    const totalAmount = batch.price + addonsTotal;

    // 1. Fitness Check
    const fitnessResult = checkFitness(customerFitnessLevel, trek.minFitnessLevel);
    if (!fitnessResult.passed) {
      await logGuardrailDecision(source || 'human', 'booking_attempt', 'rejected', fitnessResult.reason, totalAmount, 'failure');
      throw new Error(fitnessResult.reason);
    }

    // 2. Add-on Cap Check
    const addonResult = checkAddonCap(trek.basePrice, addonsTotal);
    if (!addonResult.passed) {
      await logGuardrailDecision(source || 'human', 'booking_attempt', 'rejected', addonResult.reason, totalAmount, 'failure');
      throw new Error(addonResult.reason);
    }

    // 3. Budget Check (if maxBudget is provided)
    const budgetResult = checkBudget(totalAmount, maxBudget);
    if (!budgetResult.passed) {
      await logGuardrailDecision(source || 'human', 'booking_attempt', 'rejected', budgetResult.reason, totalAmount, 'failure');
      throw new Error(budgetResult.reason);
    }

    // 4. Atomic Slot Check & Reservation
    const updatedBatch = await Batch.findOneAndUpdate(
      { _id: batch._id, slotsBooked: { $lt: batch.totalSlots } },
      { $inc: { slotsBooked: 1 } },
      { new: true }
    );

    if (!updatedBatch) {
      const reason = 'Availability Guardrail: Batch is fully booked or no slots remaining.';
      await logGuardrailDecision(source || 'human', 'booking_attempt', 'rejected', reason, totalAmount, 'failure');
      throw new Error(reason);
    }

    if (updatedBatch.slotsBooked === updatedBatch.totalSlots) {
      await Batch.updateOne({ _id: batch._id }, { status: 'full' });
    }

    // Create Razorpay order
    let order;
    try {
       order = await razorpay.orders.create({
        amount: totalAmount * 100, 
        currency: 'INR',
        receipt: `receipt_${Date.now()}`
      });
    } catch (rzpErr) {
      await Batch.updateOne({ _id: batch._id }, { $inc: { slotsBooked: -1 } });
      const reason = 'System error: Failed to create payment order.';
      await logGuardrailDecision('system', 'payment_creation', 'rejected', reason, totalAmount, 'failure');
      throw new Error(reason);
    }

    // Create Booking
    const booking = new Booking({
      bookingId: `BKG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      batchId: batch._id,
      customerId,
      customerFitnessLevel,
      addOns: addOns.map(a => a._id),
      totalAmount,
      source: source || 'human',
      status: 'pending_payment',
      razorpayOrderId: order.id
    });
    
    await booking.save();

    await logGuardrailDecision(source || 'human', 'booking_attempt', 'approved', 'All guardrails passed, slot reserved, pending payment.', totalAmount, 'success', booking._id);

    return { booking, order, totalAmount };
  }

  async confirmBooking(data) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId } = data;
    
    const booking = await Booking.findOne({ bookingId, status: 'pending_payment' });
    if (!booking) throw new Error('Valid pending booking not found');

    const secret = process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder';
    const generated_signature = crypto.createHmac('sha256', secret)
                                      .update(razorpay_order_id + "|" + razorpay_payment_id)
                                      .digest('hex');
                                      
    if (generated_signature !== razorpay_signature) {
      await Batch.updateOne({ _id: booking.batchId }, { $inc: { slotsBooked: -1 } });
      booking.status = 'rejected';
      booking.outcomeReason = 'Payment signature mismatch. Slot released.';
      await booking.save();
      await logGuardrailDecision('system', 'payment_verification', 'rejected', 'Invalid payment signature.', booking.totalAmount, 'failure', booking._id);
      throw new Error('Invalid payment signature');
    }

    booking.status = 'confirmed';
    booking.razorpayPaymentId = razorpay_payment_id;
    booking.outcomeReason = 'Payment successful and verified.';
    await booking.save();

    await logGuardrailDecision('system', 'payment_verification', 'approved', 'Payment successful.', booking.totalAmount, 'success', booking._id);

    return booking;
  }
}

module.exports = new BookingService();
