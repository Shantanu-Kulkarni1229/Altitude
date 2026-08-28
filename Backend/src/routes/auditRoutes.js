const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const asyncHandler = require('../middlewares/asyncHandler');

router.get('/', asyncHandler(auditController.getAuditLogs));

module.exports = router;
