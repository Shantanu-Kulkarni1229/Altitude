import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, ScrollText, Bot, ShieldCheck, Mountain,
  Home, Menu, X, Circle
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';
import logo from '../assets/Altitude Logo.png';

const NAV_ITEMS = [
  { to: '/admin/overview', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/audit', label: 'Audit Trail', icon: ScrollText },
  { to: '/admin/agents', label: 'AI Agent Activity', icon: Bot },
  { to: '/admin/guardrails', label: 'Guardrails & Safety', icon: ShieldCheck },
  { to: '/admin/catalog', label: 'Catalog', icon: Mountain }
];

const PAGE_META = {
  '/admin/overview': { title: 'Overview', subtitle: 'The whole trust-and-growth story, at a glance.' },
  '/admin/audit': { title: 'Audit Trail', subtitle: 'Immutable, filterable record of every decision this system made.' },
  '/admin/agents': { title: 'AI Agent Activity', subtitle: "What Altia actually reasoned through, not just what it booked." },
  '/admin/guardrails': { title: 'Guardrails & Safety', subtitle: 'What gets checked before a rupee moves, and why.' },
  '/admin/catalog': { title: 'Catalog', subtitle: 'Live inventory across every trek and departure.' }
};

function useHealthPing() {
  const [status, setStatus] = useState('checking');
  useEffect(() => {
    let cancelled = false;
    const check = () => {
      axios.get(`${API_BASE_URL}/api/v1/health`, { timeout: 5000 })
        .then(({ data }) => { if (!cancelled) setStatus(data.overall === 'healthy' ? 'healthy' : 'degraded'); })
        .catch(() => { if (!cancelled) setStatus('down'); });
    };
    check();
    const id = setInterval(check, 20000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);
  return status;
}

export default function AdminLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const health = useHealthPing();
  const meta = PAGE_META[location.pathname] || { title: 'Admin', subtitle: '' };

  const healthDot = { healthy: 'bg-pine-400', degraded: 'bg-brass-400', down: 'bg-rust-400', checking: 'bg-canvas-500' }[health];
  const healthLabel = { healthy: 'All systems live', degraded: 'Degraded', down: 'API unreachable', checking: 'Checking...' }[health];

  const SidebarContent = (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="Altitude" className="h-7 w-auto object-contain brightness-0 invert" />
          <div>
            <p className="font-bold text-paper-50 text-sm leading-tight font-display">Altitude</p>
            <p className="text-[11px] text-canvas-400 leading-tight font-mono">Expedition desk</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-flare-500/10 text-flare-400' : 'text-canvas-400 hover:text-paper-100 hover:bg-white/5'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="admin-nav-active"
                    className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-flare-500"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-5 pt-3 border-t border-white/10 space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-canvas-400 font-mono">
          <Circle className={`w-2 h-2 rounded-full ${healthDot} ${health === 'checking' ? 'animate-pulse' : ''}`} fill="currentColor" />
          {healthLabel}
        </div>
        <NavLink
          to="/"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-canvas-400 hover:text-paper-100 hover:bg-white/5 transition-colors"
        >
          <Home className="w-4 h-4" />
          Home
        </NavLink>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-paper-100 flex overflow-hidden">
      {/* Desktop sidebar — fixed, never scrolls with the content */}
      <aside className="hidden lg:block w-64 shrink-0 bg-canvas-950 h-full">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-canvas-950/60 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 w-72 bg-canvas-950 z-50 lg:hidden"
            >
              {SidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <header className="shrink-0 z-30 bg-paper-50/90 backdrop-blur-xl border-b border-paper-300/70 px-5 sm:px-8 py-4 flex items-center gap-4">
          <button onClick={() => setMobileOpen(true)} className="lg:hidden text-ink-500 hover:text-ink-900">
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-ink-900 tracking-tight truncate font-display">{meta.title}</h1>
            <p className="text-xs sm:text-sm text-ink-500 truncate">{meta.subtitle}</p>
          </div>
          <NavLink
            to="/"
            className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900 border border-paper-300 hover:border-ink-400 rounded-lg px-3 py-2 transition-colors"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </NavLink>
        </header>

        <main className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 sm:py-8">
          <div className="max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
