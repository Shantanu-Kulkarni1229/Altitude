import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, MapPin, CheckCircle, XCircle, Clock3, Compass } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

const statusStyles = {
  confirmed: 'bg-pine-100 text-pine-700',
  cancelled: 'bg-rust-100 text-rust-700',
  rejected: 'bg-rust-100 text-rust-700',
  pending_payment: 'bg-brass-100 text-brass-600'
};

const listContainer = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const listItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/v1/bookings/user/cust_123`);
        setBookings(res.data.data);
      } catch (error) {
        console.error('Error fetching bookings', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const handleCancel = async (bookingId) => {
    if(!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await axios.post(`${API_BASE_URL}/api/v1/bookings/${bookingId}/cancel`);
      setBookings(prev => prev.map(b => b.bookingId === bookingId ? { ...b, status: 'cancelled' } : b));
    } catch (error) {
      alert('Error cancelling booking');
    }
  };

  return (
    <div className="bg-paper-100 min-h-screen pb-24 pt-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <h1 className="font-display text-3xl font-bold text-ink-900 mb-1 tracking-tight">My log</h1>
          <p className="text-ink-500 mb-8">Everything you've booked, human or AI-assisted, in one place.</p>
        </motion.div>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-paper-50 rounded-xl p-6 border border-paper-300 flex gap-6 animate-pulse">
                <div className="w-24 h-24 rounded-lg bg-paper-200 shrink-0" />
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-4 bg-paper-200 rounded w-1/2" />
                  <div className="h-3 bg-paper-200 rounded w-1/3" />
                  <div className="h-3 bg-paper-200 rounded w-1/4 mt-6" />
                </div>
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-paper-50 rounded-xl border border-dashed border-paper-300 p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-paper-100 text-ink-400 rounded-full flex items-center justify-center mb-4">
              <Compass className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-ink-900 mb-2 font-display">No entries yet</h3>
            <p className="text-ink-500 max-w-md mx-auto mb-6">Your next waypoint is one conversation away — browse treks or ask Altia to find you one.</p>
            <Link to="/" className="bg-flare-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-flare-600 transition-colors">
              Explore treks
            </Link>
          </motion.div>
        ) : (
          <motion.div variants={listContainer} initial="hidden" animate="show" className="space-y-4">
            {bookings.map(booking => {
              const trek = booking.batchId?.trekId;
              if (!trek) return null;
              const isConfirmed = booking.status === 'confirmed';
              const isCancelled = booking.status === 'cancelled' || booking.status === 'rejected';
              const isPending = booking.status === 'pending_payment';

              return (
                <motion.div
                  key={booking._id}
                  variants={listItem}
                  layout
                  className="bg-paper-50 rounded-xl p-6 border border-paper-300 shadow-sm shadow-canvas-950/[0.02] flex flex-col sm:flex-row gap-6 items-start sm:items-center hover:border-flare-300 transition-colors"
                >
                  <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-paper-200">
                    <img src={trek.coverPhoto} alt={trek.name} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 w-full">
                    <div className="flex justify-between items-start mb-2 gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-ink-900 font-display">{trek.name}</h3>
                        <div className="flex flex-wrap items-center text-sm text-ink-500 gap-x-3 gap-y-1 mt-1 font-mono">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {trek.region}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(booking.batchId.startDate).toLocaleDateString()} — {new Date(booking.batchId.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <motion.span
                        layout
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 ${statusStyles[booking.status] || 'bg-paper-200 text-ink-600'}`}
                      >
                        {isConfirmed && <CheckCircle className="w-3 h-3" />}
                        {isCancelled && <XCircle className="w-3 h-3" />}
                        {isPending && <Clock3 className="w-3 h-3" />}
                        {booking.status.replace('_', ' ').toUpperCase()}
                      </motion.span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-dashed border-paper-300 flex flex-wrap justify-between items-center gap-3 text-sm">
                      <span className="text-ink-400 font-mono text-xs">#{booking.bookingId}</span>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-ink-900 font-mono tabular">₹{booking.totalAmount.toLocaleString()}</span>
                        {isConfirmed && (
                          <button
                            onClick={() => handleCancel(booking.bookingId)}
                            className="text-rust-600 hover:text-rust-700 font-semibold text-xs border border-rust-200 px-3 py-1.5 rounded-lg hover:bg-rust-50 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}
