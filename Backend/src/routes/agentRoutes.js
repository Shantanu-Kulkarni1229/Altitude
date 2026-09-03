const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agentController');
const asyncHandler = require('../middlewares/asyncHandler');

router.get('/catalog', asyncHandler(agentController.getCatalog));

module.exports = router;
