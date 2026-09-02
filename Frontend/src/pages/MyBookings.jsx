import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

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
    <div className="bg-[#faf9f6] min-h-screen pb-20 pt-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-8">My Bookings</h1>
        
        {loading ? (
          <div className="text-center py-10 text-stone-500">Loading your bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-10 text-stone-500">You have no bookings yet.</div>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => {
              const trek = booking.batchId?.trekId;
              if (!trek) return null;
              const isConfirmed = booking.status === 'confirmed';
              const isCancelled = booking.status === 'cancelled';
              
              return (
                <div key={booking._id} className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-stone-100">
                    <img src={trek.coverPhoto} alt={trek.name} className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 w-full">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-stone-900">{trek.name}</h3>
                        <div className="flex items-center text-sm text-stone-500 gap-3 mt-1">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {trek.region}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" /> 
                            {new Date(booking.batchId.startDate).toLocaleDateString()} - {new Date(booking.batchId.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1
                        ${isConfirmed ? 'bg-emerald-100 text-emerald-700' : isCancelled ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {isConfirmed && <CheckCircle className="w-3 h-3" />}
                        {isCancelled && <XCircle className="w-3 h-3" />}
                        {booking.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-stone-100 flex justify-between items-center text-sm">
                      <span className="text-stone-500">Booking ID: #{booking.bookingId}</span>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-stone-900">Total: ₹{booking.totalAmount.toLocaleString()}</span>
                        {isConfirmed && (
                          <button 
                            onClick={() => handleCancel(booking.bookingId)}
                            className="text-rose-600 hover:text-rose-700 font-semibold text-xs ml-4 border border-rose-200 px-3 py-1 rounded hover:bg-rose-50"
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
