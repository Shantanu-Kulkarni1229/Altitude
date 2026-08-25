import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
import TrekCard from './TrekCard';
import { treks } from '../data/treks';
import chatLogo from '../assets/altitude chatbot Logo.png';

export default function ConciergePanel({ isOpen, setIsOpen }) {
  const [messages, setMessages] = useState([
    { id: 1, type: 'concierge', text: 'Hi! I can help you find and book the perfect trek. What kind of adventure are you looking for?' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), type: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Simulate AI response for demo
    setTimeout(() => {
      let aiResponse;
      if (userMsg.text.toLowerCase().includes('moderate') || userMsg.text.toLowerCase().includes('valley')) {
        aiResponse = {
          id: Date.now() + 1,
          type: 'concierge',
          text: 'I found a great moderate trek for you. The Valley of Flowers is perfect this time of year.',
          trekRecommendation: treks.find(t => t.id === 'trk_001'),
          guardrail: 'Within budget · Fitness level matched'
        };
      } else if (userMsg.text.toLowerCase().includes('extreme') && userMsg.text.toLowerCase().includes('beginner')) {
        aiResponse = {
          id: Date.now() + 1,
          type: 'concierge',
          text: 'I cannot recommend Stok Kangri for beginners. It requires high physical fitness and prior high-altitude experience. However, here is a fantastic moderate alternative.',
          trekRecommendation: treks.find(t => t.id === 'trk_007'),
          guardrailRejected: 'Safety Check: Fitness mismatch. Blocked.'
        };
      } else {
        aiResponse = {
          id: Date.now() + 1,
          type: 'concierge',
          text: 'I can definitely help you with that. We have some great options in the Himalayas. Can you tell me a bit about your past trekking experience?',
        };
      }
      setMessages(prev => [...prev, aiResponse]);
    }, 1500);
  };

  // Prevent background scroll when panel is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-40 sm:hidden transition-opacity" 
          onClick={() => setIsOpen(false)}
        />
      )}
      
      <div className={`fixed inset-y-0 right-0 w-[85%] max-w-[400px] sm:w-[400px] bg-white shadow-2xl border-l border-stone-200 z-50 flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-[#faf9f6]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center overflow-hidden p-1">
              <img src={chatLogo} alt="Chatbot Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900">Concierge</h3>
              <p className="text-xs text-stone-500">Travel expert</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-stone-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.type === 'user' 
                ? 'bg-stone-900 text-white rounded-tr-sm' 
                : 'bg-white border border-stone-200 text-stone-800 rounded-tl-sm shadow-sm'
            }`}>
              <p className="text-[15px] leading-relaxed">{msg.text}</p>
            </div>
            
            {msg.trekRecommendation && (
              <div className="mt-3 w-[85%] ml-1">
                <TrekCard trek={msg.trekRecommendation} compact={true} />
              </div>
            )}
            
            {msg.guardrail && (
              <div className="mt-2 ml-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                {msg.guardrail}
              </div>
            )}

            {msg.guardrailRejected && (
              <div className="mt-2 ml-2 flex items-center gap-1.5 text-xs text-rose-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                {msg.guardrailRejected}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-stone-200">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a trek..."
            className="w-full bg-stone-100 border-none rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all placeholder:text-stone-400"
          />
          <button 
            type="submit" 
            disabled={!input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-stone-900 disabled:text-stone-400 hover:bg-stone-200 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
      </div>
    </>
  );
}
