const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const asyncHandler = require('../middlewares/asyncHandler');

router.get('/summary', asyncHandler(analyticsController.getSummary));

module.exports = router;
