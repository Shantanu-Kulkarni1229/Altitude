const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const razorpay = require('../config/razorpay');
const Batch = require('../models/Batch');
const AddOn = require('../models/AddOn');
const Booking = require('../models/Booking');
const { checkBudget, checkFitness, checkAddonCap, logGuardrailDecision } = require('../utils/guardrails');

class BookingService {
  async processBookingAttempt(data, correlationId = uuidv4()) {
    const { batchId, customerId, customerFitnessLevel, addOnIds, source, maxBudget, idempotencyKey } = data;

    // 1. Idempotency Check
    if (idempotencyKey) {
      const existingBooking = await Booking.findOne({ idempotencyKey }).populate('batchId');
      if (existingBooking) {
        await logGuardrailDecision('system', 'booking_attempt', 'duplicate_rejected', 'Duplicate request detected, returning existing result', existingBooking.totalAmount, 'duplicate_rejected', existingBooking._id, correlationId);
        return { 
          booking: existingBooking, 
          order: { id: existingBooking.razorpayOrderId }, 
          totalAmount: existingBooking.totalAmount 
        };
      }
    }
    
    const batch = await Batch.findOne({ batchId }).populate('trekId');
    if (!batch) throw new Error('Batch not found');
    
    const trek = batch.trekId;

    let addOns = [];
    let addonsTotal = 0;
    if (addOnIds && addOnIds.length > 0) {
      addOns = await AddOn.find({ addOnId: { $in: addOnIds } });
      addonsTotal = addOns.reduce((sum, item) => sum + item.price, 0);
    }
    
    const totalAmount = batch.price + addonsTotal;

    const trace = [];
    
    // Evaluate Guardrails
    const fitnessResult = checkFitness(customerFitnessLevel, trek.minFitnessLevel);
    trace.push({ check: 'Fitness', passed: fitnessResult.passed, reason: fitnessResult.reason });

    const addonResult = checkAddonCap(trek.basePrice, addonsTotal);
    trace.push({ check: 'AddonCap', passed: addonResult.passed, reason: addonResult.reason });

    const budgetResult = checkBudget(totalAmount, maxBudget);
    trace.push({ check: 'Budget', passed: budgetResult.passed, reason: budgetResult.reason });

    // Evaluate Slot (simulate check first)
    const hasSlot = batch.slotsBooked < batch.totalSlots;
    trace.push({ 
      check: 'Slots', 
      passed: hasSlot, 
      reason: hasSlot ? 'Slot available' : 'Batch is fully booked or no slots remaining.' 
    });

    const anyFailed = trace.some(t => !t.passed);
    if (anyFailed) {
      const primaryReason = trace.find(t => !t.passed).reason;
      await logGuardrailDecision(source || 'human', 'booking_attempt', 'rejected', primaryReason, totalAmount, 'failure', null, correlationId, trace);
      throw new Error(primaryReason);
    }

    // 4. Atomic Slot Reservation (since all logic passed)
    const updatedBatch = await Batch.findOneAndUpdate(
      { _id: batch._id, slotsBooked: { $lt: batch.totalSlots } },
      { $inc: { slotsBooked: 1 } },
      { new: true }
    );

    if (!updatedBatch) {
      // Race condition hit during atomic update
      const reason = 'Availability Guardrail: Batch is fully booked or no slots remaining.';
      trace[3] = { check: 'Slots', passed: false, reason }; // update trace
      await logGuardrailDecision(source || 'human', 'booking_attempt', 'rejected', reason, totalAmount, 'failure', null, correlationId, trace);
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
      await logGuardrailDecision('system', 'payment_creation', 'rejected', reason, totalAmount, 'failure', null, correlationId, trace);
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
      razorpayOrderId: order.id,
      idempotencyKey,
      correlationId
    });
    
    await booking.save();

    await logGuardrailDecision(source || 'human', 'booking_attempt', 'approved', 'All guardrails passed, slot reserved, pending payment.', totalAmount, 'success', booking._id, correlationId, trace);

    return { booking, order, totalAmount };
  }

  async confirmBooking(data, correlationId = uuidv4()) {
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
      await logGuardrailDecision('system', 'payment_verification', 'rejected', 'Invalid payment signature.', booking.totalAmount, 'failure', booking._id, correlationId);
      throw new Error('Invalid payment signature');
    }

    booking.status = 'confirmed';
    booking.razorpayPaymentId = razorpay_payment_id;
    booking.outcomeReason = 'Payment successful and verified.';
    await booking.save();

    await logGuardrailDecision('system', 'payment_verification', 'approved', 'Payment successful.', booking.totalAmount, 'success', booking._id, correlationId);

    return booking;
  }

  async cancelBooking(bookingId, reason, correlationId = uuidv4()) {
    const booking = await Booking.findOne({ bookingId, status: 'confirmed' });
    if (!booking) throw new Error('Valid confirmed booking not found');

    // Release slot atomically
    await Batch.findOneAndUpdate(
      { _id: booking.batchId, slotsBooked: { $gt: 0 } },
      { $inc: { slotsBooked: -1 }, status: 'open' }
    );

    booking.status = 'cancelled';
    booking.outcomeReason = reason || 'Customer requested cancellation';
    await booking.save();

    await logGuardrailDecision('human', 'booking_cancellation', 'approved', booking.outcomeReason, booking.totalAmount, 'success', booking._id, correlationId);

    return booking;
  }

  // Webhook specific confirmation
  async confirmViaWebhook(payload, signature, correlationId = uuidv4()) {
    const secret = process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder';
    const isValid = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex') === signature;
    
    if (!isValid) throw new Error('Invalid webhook signature');

    const paymentEntity = payload.payload.payment.entity;
    const razorpayOrderId = paymentEntity.order_id;
    
    const booking = await Booking.findOne({ razorpayOrderId, status: 'pending_payment' });
    if (!booking) return; // Already processed or invalid

    booking.status = 'confirmed';
    booking.razorpayPaymentId = paymentEntity.id;
    booking.outcomeReason = 'Payment confirmed via webhook.';
    await booking.save();

    await logGuardrailDecision('system', 'webhook_verification', 'approved', 'Payment confirmed via webhook.', booking.totalAmount, 'success', booking._id, correlationId);

    return booking;
  }
}

module.exports = new BookingService();
