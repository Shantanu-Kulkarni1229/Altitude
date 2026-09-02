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
});

// Tier 2.3: Health Check Endpoint
app.get('/api/v1/health', async (req, res) => {
  const healthStatus = { overall: 'healthy', mongo: 'unreachable', ollama: 'unreachable' };
  
  // Check Mongo
  if (mongoose.connection.readyState === 1) healthStatus.mongo = 'healthy';
  else healthStatus.overall = 'degraded';
  
  // Check Ollama (Ping via fast fetch)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const ollamaCheck = await fetch('http://127.0.0.1:11434', { signal: controller.signal });
    clearTimeout(timeout);
    if (ollamaCheck.ok) healthStatus.ollama = 'healthy';
    else healthStatus.overall = 'degraded';
  } catch (error) {
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

// Global Error Handler
app.use(errorHandler);

module.exports = app;
