import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import TrekDetail from './pages/TrekDetail';
import MyBookings from './pages/MyBookings';
import LiveDemo from './pages/LiveDemo';
import AdminLayout from './layouts/AdminLayout';
import Overview from './pages/admin/Overview';
import AuditTrail from './pages/admin/AuditTrail';
import AgentActivity from './pages/admin/AgentActivity';
import Guardrails from './pages/admin/Guardrails';
import Catalog from './pages/admin/Catalog';
import ConciergePanel from './components/ConciergePanel';
import chatLogo from './assets/altitude chatbot Logo.png';

function AnimatedRoutes() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  // Admin routes manage their own page transition (AdminLayout's Outlet
  // animation) so the sidebar doesn't remount on every navigation — only
  // the public marketplace pages get the route-level fade/slide here.
  if (isAdmin) {
    return (
      <Routes location={location}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="audit" element={<AuditTrail />} />
          <Route path="agents" element={<AgentActivity />} />
          <Route path="guardrails" element={<Guardrails />} />
          <Route path="catalog" element={<Catalog />} />
        </Route>
      </Routes>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      >
        <Routes location={location}>
          <Route path="/" element={<Home />} />
          <Route path="/trek/:id" element={<TrekDetail />} />
          <Route path="/bookings" element={<MyBookings />} />
          <Route path="/demo" element={<LiveDemo />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

const App = () => {
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);

  return (
    <div className="font-sans antialiased text-ink-800 min-h-screen relative overflow-x-hidden">
      <RootShell isConciergeOpen={isConciergeOpen} setIsConciergeOpen={setIsConciergeOpen} />
    </div>
  );
};

function RootShell({ isConciergeOpen, setIsConciergeOpen }) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <>
      {!isAdmin && <Navbar />}

      <AnimatedRoutes />

      {!isAdmin && <ConciergePanel isOpen={isConciergeOpen} setIsOpen={setIsConciergeOpen} />}

      {/* Floating Concierge Button */}
      <AnimatePresence>
        {!isAdmin && !isConciergeOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 24 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsConciergeOpen(true)}
            className="fixed bottom-6 right-6 bg-flare-500 text-white p-3 rounded-full shadow-2xl shadow-flare-900/30 hover:bg-flare-600 z-40 group flex items-center overflow-hidden"
          >
            <img src={chatLogo} alt="Chatbot Logo" className="w-8 h-8 flex-shrink-0 object-contain" />
            <span className="font-semibold text-sm whitespace-nowrap overflow-hidden max-w-0 opacity-0 group-hover:max-w-[150px] group-hover:opacity-100 group-hover:ml-3 transition-all duration-300 ease-in-out">
              Ask Concierge
            </span>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
