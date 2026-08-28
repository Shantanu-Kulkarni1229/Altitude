const express = require('express');
const cors = require('cors');
const errorHandler = require('./middlewares/errorHandler');

// Route imports
const trekRoutes = require('./routes/trekRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const auditRoutes = require('./routes/auditRoutes');
const chatRoutes = require('../Ai/routes/chat');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/treks', trekRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/chat', chatRoutes);

// Global Error Handler
app.use(errorHandler);

module.exports = app;
