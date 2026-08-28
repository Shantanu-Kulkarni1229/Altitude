const express = require('express');
const router = express.Router();
const trekController = require('../controllers/trekController');
const asyncHandler = require('../middlewares/asyncHandler');

router.get('/', asyncHandler(trekController.getTreks));
router.get('/addons/all', asyncHandler(trekController.getAddons));
router.get('/:trekId', asyncHandler(trekController.getTrekDetails));

module.exports = router;
