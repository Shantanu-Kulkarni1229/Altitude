const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const razorpay = require('../config/razorpay');
const Batch = require('../models/Batch');
const AddOn = require('../models/AddOn');
const Booking = require('../models/Booking');
const { checkBudget, checkFitness, checkAddonCap, logGuardrailDecision } = require('../utils/guardrails');
const { timingSafeEqualHex } = require('../utils/crypto');
const emailService = require('./emailService');

class BookingService {
  async processBookingAttempt(data, correlationId = uuidv4()) {
    const { batchId, customerId, customerFitnessLevel, addOnIds, source, maxBudget, idempotencyKey, customerName, customerEmail, customerPhone } = data;
    // Clamp to a sane range rather than trusting caller input outright —
    // this becomes the multiplier for both money charged and slots reserved.
    const rawTravelers = Number(data.travelers);
    const travelers = Number.isInteger(rawTravelers) && rawTravelers > 0 ? Math.min(rawTravelers, 20) : 1;

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

    // Prices in the catalog are PER PERSON; the group pays perPersonTotal x travelers.
    const perPersonTotal = batch.price + addonsTotal;
    const totalAmount = perPersonTotal * travelers;

    const trace = [];

    // Evaluate Guardrails
    const fitnessResult = checkFitness(customerFitnessLevel, trek.minFitnessLevel);
    trace.push({ check: 'Fitness', passed: fitnessResult.passed, reason: fitnessResult.reason });

    // Add-on cap is a spend-vs-base-price ratio, so it's evaluated per-person
    // (scaling both sides by `travelers` wouldn't change the ratio).
    const addonResult = checkAddonCap(trek.basePrice, addonsTotal);
    trace.push({ check: 'AddonCap', passed: addonResult.passed, reason: addonResult.reason });

    // maxBudget is a per-person cap (matches how budgetCeiling search filters work).
    const budgetResult = checkBudget(perPersonTotal, maxBudget);
    trace.push({ check: 'Budget', passed: budgetResult.passed, reason: budgetResult.reason });

    // Evaluate Slot (simulate check first) — reserving for the whole group, not just one seat.
    const hasSlot = (batch.slotsBooked + travelers) <= batch.totalSlots;
    trace.push({
      check: 'Slots',
      passed: hasSlot,
      reason: hasSlot
        ? 'Slot available'
        : `Not enough slots for ${travelers} traveler${travelers > 1 ? 's' : ''} — batch is full or doesn't have enough spots remaining.`
    });

    const anyFailed = trace.some(t => !t.passed);
    if (anyFailed) {
      const primaryReason = trace.find(t => !t.passed).reason;
      await logGuardrailDecision(source || 'human', 'booking_attempt', 'rejected', primaryReason, totalAmount, 'failure', null, correlationId, trace);
      throw new Error(primaryReason);
    }

    // 4. Atomic Slot Reservation (since all logic passed) — reserves
    // `travelers` slots in one compare-and-swap so a race for the last few
    // spots can't over-book the batch, the same way the single-seat case worked.
    const updatedBatch = await Batch.findOneAndUpdate(
      { _id: batch._id, $expr: { $lte: [{ $add: ['$slotsBooked', travelers] }, '$totalSlots'] } },
      { $inc: { slotsBooked: travelers } },
      { new: true }
    );

    if (!updatedBatch) {
      // Race condition hit during atomic update
      const reason = `Availability Guardrail: Not enough slots for ${travelers} traveler${travelers > 1 ? 's' : ''} — someone else just booked first.`;
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
      await Batch.updateOne({ _id: batch._id }, { $inc: { slotsBooked: -travelers } });
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
      customerName,
      customerEmail,
      customerPhone,
      travelers,
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

    if (!timingSafeEqualHex(generated_signature, razorpay_signature)) {
      await Batch.updateOne({ _id: booking.batchId }, { $inc: { slotsBooked: -(booking.travelers || 1) } });
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

    // Fire-and-forget — a slow or unavailable email provider must never
    // delay or fail an already-confirmed booking's response to the client.
    emailService.sendBookingReceipt(booking._id, correlationId).catch(() => {});

    return booking;
  }

  async cancelBooking(bookingId, reason, correlationId = uuidv4()) {
    const booking = await Booking.findOne({ bookingId, status: 'confirmed' });
    if (!booking) throw new Error('Valid confirmed booking not found');

    // Release slots atomically
    const seats = booking.travelers || 1;
    await Batch.findOneAndUpdate(
      { _id: booking.batchId, slotsBooked: { $gte: seats } },
      { $inc: { slotsBooked: -seats }, status: 'open' }
    );

    booking.status = 'cancelled';
    booking.outcomeReason = reason || 'Customer requested cancellation';
    await booking.save();

    await logGuardrailDecision('human', 'booking_cancellation', 'approved', booking.outcomeReason, booking.totalAmount, 'success', booking._id, correlationId);

    return booking;
  }

  // Webhook specific confirmation.
  // `rawBody` MUST be the exact bytes Razorpay sent (a Buffer) — the HMAC is
  // computed over the raw payload, not a re-serialized JS object, because
  // JSON.stringify() can reorder/re-escape fields and silently break
  // signature verification against a real Razorpay webhook delivery.
  async confirmViaWebhook(rawBody, signature, correlationId = uuidv4()) {
    const secret = process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder';
    const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : JSON.stringify(rawBody);
    const generatedSignature = crypto.createHmac('sha256', secret).update(bodyString).digest('hex');

    if (!timingSafeEqualHex(generatedSignature, signature)) {
      throw new Error('Invalid webhook signature');
    }

    const payload = JSON.parse(bodyString);
    const paymentEntity = payload.payload.payment.entity;
    const razorpayOrderId = paymentEntity.order_id;
    
    const booking = await Booking.findOne({ razorpayOrderId, status: 'pending_payment' });
    if (!booking) return; // Already processed or invalid

    booking.status = 'confirmed';
    booking.razorpayPaymentId = paymentEntity.id;
    booking.outcomeReason = 'Payment confirmed via webhook.';
    await booking.save();

    await logGuardrailDecision('system', 'webhook_verification', 'approved', 'Payment confirmed via webhook.', booking.totalAmount, 'success', booking._id, correlationId);

    emailService.sendBookingReceipt(booking._id, correlationId).catch(() => {});

    return booking;
  }

  // Releases slots held by abandoned checkouts (payment never completed).
  // Without this, a user who closes the Razorpay modal or navigates away
  // holds a slot forever, which undercuts the "bounded" guarantee — a
  // held-but-never-paid reservation is an unbounded resource lock.
  async releaseExpiredBookings(maxAgeMinutes = 15) {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    const expired = await Booking.find({ status: 'pending_payment', createdAt: { $lt: cutoff } });

    for (const booking of expired) {
      const seats = booking.travelers || 1;
      await Batch.findOneAndUpdate(
        { _id: booking.batchId, slotsBooked: { $gte: seats } },
        { $inc: { slotsBooked: -seats }, status: 'open' }
      );
      booking.status = 'cancelled';
      booking.outcomeReason = `Expired — payment not completed within ${maxAgeMinutes} minutes.`;
      await booking.save();
      await logGuardrailDecision('system', 'booking_expiry', 'approved', booking.outcomeReason, booking.totalAmount, 'success', booking._id, booking.correlationId);
    }

    return expired.length;
  }
}

module.exports = new BookingService();
