const bookingService = require('../services/bookingService');
const Booking = require('../models/Booking');
const { v4: uuidv4 } = require('uuid');

exports.createBooking = async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  try {
    const result = await bookingService.processBookingAttempt(req.body, correlationId);
    res.status(201).json({
      success: true,
      message: 'Booking process complete',
      bookingId: result.booking.bookingId,
      razorpayOrderId: result.order.id,
      totalAmount: result.totalAmount
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.confirmBooking = async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  try {
    const booking = await bookingService.confirmBooking(req.body, correlationId);
    res.status(200).json({
      success: true,
      message: 'Booking confirmed successfully',
      data: booking
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.cancelBooking = async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const { reason } = req.body;
  const booking = await bookingService.cancelBooking(req.params.bookingId, reason, correlationId);
  res.status(200).json({ success: true, message: 'Booking cancelled successfully', data: booking });
};

exports.razorpayWebhook = async (req, res) => {
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  const signature = req.headers['x-razorpay-signature'];
  // The route applies express.raw() so req.body is the raw request Buffer —
  // required so the HMAC is computed over the exact bytes Razorpay signed.
  try {
    await bookingService.confirmViaWebhook(req.body, signature, correlationId);
    res.status(200).send('OK');
  } catch (e) {
    res.status(400).send('Webhook Error');
  }
};

exports.getUserBookings = async (req, res) => {
  const bookings = await Booking.find({ customerId: req.params.customerId }).populate({
    path: 'batchId',
    populate: { path: 'trekId' }
  });
  res.status(200).json({ success: true, data: bookings });
};
