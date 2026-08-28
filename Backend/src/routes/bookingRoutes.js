const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const asyncHandler = require('../middlewares/asyncHandler');

router.post('/create', bookingController.createBooking);
router.post('/confirm', bookingController.confirmBooking);
router.get('/user/:customerId', asyncHandler(bookingController.getUserBookings));

module.exports = router;
