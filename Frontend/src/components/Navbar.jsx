import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldCheck, User, Bot } from 'lucide-react';
import logo from '../assets/Altitude Logo.png';

const navLinkClass = ({ isActive }) =>
  `relative font-medium text-sm transition-colors ${isActive ? 'text-stone-900' : 'text-stone-500 hover:text-stone-900'}`;

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-stone-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="Altitude Logo" className="h-7 w-auto object-contain" />
            <span className="font-bold text-lg tracking-tight text-stone-900">Altitude</span>
          </NavLink>

          <div className="hidden md:flex items-center gap-8">
            <NavLink to="/" end className={navLinkClass}>Discover</NavLink>
            <NavLink to="/bookings" className={navLinkClass}>My Bookings</NavLink>
            <NavLink to="/agent-demo" className={({ isActive }) => `${navLinkClass({ isActive })} flex items-center gap-1.5`}>
              <Bot className="h-3.5 w-3.5" />
              Live Agent Demo
            </NavLink>
            <NavLink to="/admin" className={({ isActive }) => `${navLinkClass({ isActive })} flex items-center gap-1.5`}>
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </NavLink>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-stone-100 border border-stone-200 rounded-full flex items-center justify-center text-stone-500">
              <User className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
