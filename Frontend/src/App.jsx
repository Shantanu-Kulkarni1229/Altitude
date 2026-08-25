import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import TrekDetail from './pages/TrekDetail';
import MyBookings from './pages/MyBookings';
import AdminAudit from './pages/AdminAudit';
import ConciergePanel from './components/ConciergePanel';
import chatLogo from './assets/altitude chatbot Logo.png';

const App = () => {
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);

  return (
    <div className="font-sans antialiased text-stone-800 selection:bg-stone-200 min-h-screen relative overflow-x-hidden">
      <Navbar />
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/trek/:id" element={<TrekDetail />} />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/admin" element={<AdminAudit />} />
      </Routes>

      <ConciergePanel isOpen={isConciergeOpen} setIsOpen={setIsConciergeOpen} />

      {/* Floating Concierge Button */}
      {!isConciergeOpen && (
        <button
          onClick={() => setIsConciergeOpen(true)}
          className="fixed bottom-6 right-6 bg-stone-900 text-white p-3 rounded-full shadow-2xl hover:bg-stone-800 transition-all duration-300 ease-in-out z-40 group flex items-center overflow-hidden"
        >
          <img src={chatLogo} alt="Chatbot Logo" className="w-8 h-8 flex-shrink-0 object-contain" />
          <span className="font-semibold text-sm whitespace-nowrap overflow-hidden max-w-0 opacity-0 group-hover:max-w-[150px] group-hover:opacity-100 group-hover:ml-3 transition-all duration-300 ease-in-out">
            Ask Concierge
          </span>
        </button>
      )}
    </div>
  );
};

export default App;