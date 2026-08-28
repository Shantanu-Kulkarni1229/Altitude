const bookingService = require('../services/bookingService');
const Booking = require('../models/Booking');

exports.createBooking = async (req, res) => {
  try {
    const result = await bookingService.processBookingAttempt(req.body);
    res.status(201).json({
      success: true,
      message: 'Booking created and pending payment',
      bookingId: result.booking.bookingId,
      razorpayOrderId: result.order.id,
      totalAmount: result.totalAmount
    });
  } catch (error) {
    // If it's a known error from the service (e.g., guardrail fail)
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.confirmBooking = async (req, res) => {
  try {
    const booking = await bookingService.confirmBooking(req.body);
    res.status(200).json({
      success: true,
      message: 'Booking confirmed successfully',
      data: booking
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.getUserBookings = async (req, res) => {
  const bookings = await Booking.find({ customerId: req.params.customerId }).populate({
    path: 'batchId',
    populate: { path: 'trekId' }
  });
  res.status(200).json({ success: true, data: bookings });
};
