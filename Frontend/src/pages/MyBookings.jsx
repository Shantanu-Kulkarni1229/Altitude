import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, CheckCircle, XCircle, Clock3, Compass } from 'lucide-react';
import axios from 'axios';

const statusStyles = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
  rejected: 'bg-rose-100 text-rose-700',
  pending_payment: 'bg-amber-100 text-amber-700'
};

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/v1/bookings/user/cust_123');
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
      await axios.post(`http://localhost:5000/api/v1/bookings/${bookingId}/cancel`);
      setBookings(prev => prev.map(b => b.bookingId === bookingId ? { ...b, status: 'cancelled' } : b));
    } catch (error) {
      alert('Error cancelling booking');
    }
  };

  return (
    <div className="bg-[#faf9f6] min-h-screen pb-24 pt-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-1 tracking-tight">My Bookings</h1>
        <p className="text-stone-500 mb-8">Everything you've booked, human or AI-assisted, in one place.</p>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-stone-200 flex gap-6 animate-pulse">
                <div className="w-24 h-24 rounded-xl bg-stone-100 shrink-0" />
                <div className="flex-1 space-y-3 py-1">
                  <div className="h-4 bg-stone-100 rounded w-1/2" />
                  <div className="h-3 bg-stone-100 rounded w-1/3" />
                  <div className="h-3 bg-stone-100 rounded w-1/4 mt-6" />
                </div>
              </div>
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mb-4">
              <Compass className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">No bookings yet</h3>
            <p className="text-stone-500 max-w-md mx-auto mb-6">Your next adventure is one conversation away — browse treks or ask Maya to find you one.</p>
            <Link to="/" className="bg-stone-950 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-stone-800 transition-colors">
              Explore treks
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => {
              const trek = booking.batchId?.trekId;
              if (!trek) return null;
              const isConfirmed = booking.status === 'confirmed';
              const isCancelled = booking.status === 'cancelled' || booking.status === 'rejected';
              const isPending = booking.status === 'pending_payment';

              return (
                <div key={booking._id} className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm shadow-stone-900/[0.02] flex flex-col sm:flex-row gap-6 items-start sm:items-center hover:border-stone-300 transition-colors">
                  <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-stone-100">
                    <img src={trek.coverPhoto} alt={trek.name} className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 w-full">
                    <div className="flex justify-between items-start mb-2 gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-stone-900">{trek.name}</h3>
                        <div className="flex flex-wrap items-center text-sm text-stone-500 gap-x-3 gap-y-1 mt-1">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {trek.region}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(booking.batchId.startDate).toLocaleDateString()} - {new Date(booking.batchId.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 ${statusStyles[booking.status] || 'bg-stone-100 text-stone-600'}`}>
                        {isConfirmed && <CheckCircle className="w-3 h-3" />}
                        {isCancelled && <XCircle className="w-3 h-3" />}
                        {isPending && <Clock3 className="w-3 h-3" />}
                        {booking.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    <div className="mt-4 pt-4 border-t border-stone-100 flex flex-wrap justify-between items-center gap-3 text-sm">
                      <span className="text-stone-400 font-mono text-xs">#{booking.bookingId}</span>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-stone-900">₹{booking.totalAmount.toLocaleString()}</span>
                        {isConfirmed && (
                          <button
                            onClick={() => handleCancel(booking.bookingId)}
                            className="text-rose-600 hover:text-rose-700 font-semibold text-xs border border-rose-200 px-3 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
