require('dotenv').config();
const connectDB = require('./src/config/db');
const app = require('./src/app');
const bookingService = require('./src/services/bookingService');

// Connect to MongoDB
connectDB();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Periodically release slots held by abandoned checkouts (see
// bookingService.releaseExpiredBookings for why this bound exists).
const EXPIRY_SWEEP_INTERVAL_MS = 2 * 60 * 1000;
const PENDING_BOOKING_MAX_AGE_MINUTES = 15;
setInterval(async () => {
  try {
    const released = await bookingService.releaseExpiredBookings(PENDING_BOOKING_MAX_AGE_MINUTES);
    if (released > 0) console.log(`Released ${released} expired pending booking(s).`);
  } catch (err) {
    console.error('Expired booking sweep failed:', err.message);
  }
}, EXPIRY_SWEEP_INTERVAL_MS);

// Handle unhandled promise rejections gracefully
process.on('unhandledRejection', (err, promise) => {
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

