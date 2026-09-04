const express = require('express');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');

const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

// Route imports
const trekRoutes = require('./routes/trekRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const auditRoutes = require('./routes/auditRoutes');
const chatRoutes = require('../Ai/routes/chat');
const analyticsRoutes = require('./routes/analyticsRoutes');
const agentRoutes = require('./routes/agentRoutes');
const demoRoutes = require('./routes/demoRoutes');
const { LLMService } = require('../Ai/services/llmService');
const { logGuardrailDecision } = require('./utils/guardrails');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 requests per `window` (here, per minute)
  message: { error: 'Too many chat requests from this IP, please try again after a minute' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: async (req, res, next, options) => {
    await logGuardrailDecision(
      'system',
      'rate_limit',
      'rejected',
      `Chat rate limit exceeded for ${req.ip} (${options.max} req/${options.windowMs / 1000}s)`,
      null,
      'rate_limit_exceeded'
    );
    res.status(options.statusCode).json(options.message);
  }
});

// The live demo panel spawns a real process per run (hitting real Groq +
// Razorpay test APIs) — cap it hard so a public link can't be used to spam
// the server or those upstream APIs.
const demoLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { error: 'Too many demo runs from this IP — please wait a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.get('/api/v1/health', async (req, res) => {
  const healthStatus = { overall: 'healthy', mongo: 'unreachable', llm: 'unknown' };

  if (mongoose.connection.readyState === 1) healthStatus.mongo = 'healthy';
  else healthStatus.overall = 'degraded';

  // Reflects the outcome of the last real Groq call the concierge made,
  // rather than pinging a separate health endpoint.
  if (LLMService.lastCallOk === true) healthStatus.llm = 'healthy';
  else if (LLMService.lastCallOk === false) {
    healthStatus.llm = 'unreachable';
    healthStatus.overall = 'degraded';
  }

  const status = healthStatus.overall === 'healthy' ? 200 : 503;
  res.status(status).json(healthStatus);
});

// Routes
app.use('/api/v1/treks', trekRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/chat', chatLimiter, chatRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/agent', agentRoutes);
app.use('/api/v1/demo', demoLimiter, demoRoutes);
app.get('/api/v1/openapi.json', (req, res) => res.sendFile(require('path').join(__dirname, '..', 'openapi.json')));

// Global Error Handler
app.use(errorHandler);

module.exports = app;
