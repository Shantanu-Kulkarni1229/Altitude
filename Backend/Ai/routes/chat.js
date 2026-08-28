const express = require('express');
const router = express.Router();
const conciergeService = require('../services/conciergeService');
const asyncHandler = require('../../src/middlewares/asyncHandler');

// POST /api/v1/chat/message
router.post('/message', asyncHandler(async (req, res) => {
  const { message, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const response = await conciergeService.handleChatMessage(message, context);
  res.status(200).json(response);
}));

// POST /api/v1/chat/book
router.post('/book', asyncHandler(async (req, res) => {
  const bookingData = req.body;
  
  if (!bookingData.batchId || !bookingData.customerId || !bookingData.customerFitnessLevel) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }

  const response = await conciergeService.handleBookingConfirmation(bookingData);
  res.status(200).json(response);
}));

module.exports = router;
