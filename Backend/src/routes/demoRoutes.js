const express = require('express');
const router = express.Router();
const demoController = require('../controllers/demoController');
const asyncHandler = require('../middlewares/asyncHandler');

router.get('/list', asyncHandler(demoController.listDemos));
router.get('/stream', demoController.streamDemo); // SSE — not JSON, handles its own errors

module.exports = router;
