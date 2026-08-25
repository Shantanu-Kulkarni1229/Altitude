import React from 'react';
import { Calendar, MapPin, CheckCircle } from 'lucide-react';

export default function MyBookings() {
  return (
    <div className="bg-[#faf9f6] min-h-screen pb-20 pt-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-stone-900 mb-8">My Bookings</h1>
        
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0 bg-stone-100">
              <img src="https://images.unsplash.com/photo-1572782252655-9c8771392601?w=600&auto=format&fit=crop&q=60" alt="Valley of Flowers" className="w-full h-full object-cover" />
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">Valley of Flowers</h3>
                  <div className="flex items-center text-sm text-stone-500 gap-3 mt-1">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Uttarakhand</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Aug 12 - Aug 17</span>
                  </div>
                </div>
                <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Confirmed
                </span>
              </div>
              
              <div className="mt-4 pt-4 border-t border-stone-100 flex justify-between items-center text-sm">
                <span className="text-stone-500">Booking ID: #ALT-8291A</span>
                <span className="font-semibold text-stone-900">Total: ₹13,000</span>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
