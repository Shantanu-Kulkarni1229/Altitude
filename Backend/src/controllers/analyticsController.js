const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLog');

exports.getSummary = async (req, res) => {
  try {
    // Total Bookings & Revenue
    const bookings = await Booking.find({ status: 'confirmed' });
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalAmount, 0);

    // Guardrail Rejections Breakdown
    const rejections = await AuditLog.find({ decision: 'rejected' });
    const rejectionsBreakdown = { budget: 0, fitness: 0, slots: 0, addonCap: 0, other: 0 };
    
    rejections.forEach(log => {
      if (log.reason.toLowerCase().includes('budget')) rejectionsBreakdown.budget++;
      else if (log.reason.toLowerCase().includes('fitness')) rejectionsBreakdown.fitness++;
      else if (log.reason.toLowerCase().includes('slot') || log.reason.toLowerCase().includes('fully booked')) rejectionsBreakdown.slots++;
      else if (log.reason.toLowerCase().includes('add-on')) rejectionsBreakdown.addonCap++;
      else rejectionsBreakdown.other++;
    });

    res.status(200).json({
      success: true,
      data: {
        totalBookings,
        totalRevenue,
        rejectionsBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
