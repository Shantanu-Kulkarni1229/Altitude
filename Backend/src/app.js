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
const { LLMService } = require('../Ai/services/llmService');
const { logGuardrailDecision } = require('./utils/guardrails');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Tier 1.3: Rate Limiter for AI Chat
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

// Tier 2.3: Health Check Endpoint
app.get('/api/v1/health', async (req, res) => {
  const healthStatus = { overall: 'healthy', mongo: 'unreachable', llm: 'unknown' };

  // Check Mongo
  if (mongoose.connection.readyState === 1) healthStatus.mongo = 'healthy';
  else healthStatus.overall = 'degraded';

  // LLM status reflects the outcome of the last real Groq call made by the
  // concierge, rather than pinging an unrelated local port — this stayed
  // wrong for a while because the service was originally scaffolded for a
  // local Ollama deployment and only later switched to a cloud provider.
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
app.get('/api/v1/openapi.json', (req, res) => res.sendFile(require('path').join(__dirname, '..', 'openapi.json')));

// Global Error Handler
app.use(errorHandler);

module.exports = app;
