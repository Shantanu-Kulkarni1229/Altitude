import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, CalendarDays, ShieldAlert, User } from 'lucide-react';
import logo from '../assets/Altitude Logo.png';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-[#faf9f6]/90 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="Altitude Logo" className="h-8 w-auto object-contain" />
              <span className="font-semibold text-xl tracking-tight text-stone-900">Altitude</span>
            </Link>
          </div>
          <div className="hidden md:flex space-x-8">
            <Link to="/" className="text-stone-600 hover:text-stone-900 font-medium transition-colors">
              Discover
            </Link>
            <Link to="/bookings" className="text-stone-600 hover:text-stone-900 font-medium transition-colors">
              My Bookings
            </Link>
            <Link to="/admin" className="text-stone-600 hover:text-stone-900 font-medium transition-colors flex items-center gap-1">
              <ShieldAlert className="h-4 w-4" />
              Admin
            </Link>
          </div>
          <div className="flex items-center">
            <div className="h-9 w-9 bg-stone-200 rounded-full flex items-center justify-center text-stone-600">
              <User className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
