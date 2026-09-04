import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, User, Terminal } from 'lucide-react';
import logo from '../assets/Altitude Logo.png';

function NavItem({ to, end, children }) {
  return (
    <NavLink to={to} end={end} className="relative py-1.5">
      {({ isActive }) => (
        <>
          <span className={`font-medium text-sm transition-colors ${isActive ? 'text-paper-50' : 'text-canvas-400 hover:text-paper-100'}`}>
            {children}
          </span>
          {isActive && (
            <motion.span
              layoutId="navbar-active-underline"
              className="absolute left-0 right-0 -bottom-[1px] h-0.5 rounded-full bg-flare-500"
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Navbar() {
  return (
    <motion.nav
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 bg-canvas-950/95 backdrop-blur-xl border-b border-canvas-800"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <NavLink to="/" className="flex items-center gap-2 shrink-0">
            <img src={logo} alt="Altitude Logo" className="h-7 w-auto object-contain brightness-0 invert" />
            <span className="font-display font-bold text-lg tracking-tight text-paper-50">Altitude</span>
          </NavLink>

          <div className="hidden md:flex items-center gap-8">
            <NavItem to="/" end>Discover</NavItem>
            <NavItem to="/bookings">My Bookings</NavItem>
            <NavLink
              to="/demo"
              className="flex items-center gap-1.5 text-sm font-medium text-canvas-400 hover:text-paper-100 transition-colors"
            >
              <Terminal className="h-3.5 w-3.5" />
              Watch an AI Buy
            </NavLink>
            <NavLink
              to="/admin"
              className="flex items-center gap-1.5 text-sm font-medium text-canvas-500 hover:text-paper-200 transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin
            </NavLink>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-canvas-800 border border-canvas-600 rounded-full flex items-center justify-center text-canvas-300">
              <User className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
