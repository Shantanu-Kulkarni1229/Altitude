import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TrekCard from './TrekCard';
import chatLogo from '../assets/altitude chatbot Logo.png';
import axios from 'axios';

export default function ConciergePanel({ isOpen, setIsOpen }) {
  const [messages, setMessages] = useState([
    { id: 1, type: 'concierge', text: 'Hi! I can help you find and book the perfect trek. What kind of adventure are you looking for?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  // One id per chat session, sent on every /chat/message call so the AI's
  // extraction/recommendation/booking audit trail entries for this
  // conversation share a correlationId in the admin audit log.
  const sessionCorrelationId = useRef(crypto.randomUUID());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Bounded campaign orchestrator: on opening the panel, offer at most one
  // proactive nudge per browser session if there's a recent abandoned
  // checkout (Razorpay modal closed without paying). Gated server-side too
  // (getAbandonedCheckoutNudge) and always audit-logged there.
  useEffect(() => {
    if (!isOpen) return;
    if (sessionStorage.getItem('altitude_nudge_shown')) return;

    const raw = localStorage.getItem('altitude_abandoned_checkout');
    if (!raw) return;

    let abandoned;
    try { abandoned = JSON.parse(raw); } catch { return; }
    const ageMinutes = (Date.now() - abandoned.ts) / 60000;
    if (ageMinutes > 15) {
      localStorage.removeItem('altitude_abandoned_checkout');
      return;
    }

    sessionStorage.setItem('altitude_nudge_shown', '1');
    axios.post('http://localhost:5000/api/v1/chat/abandoned-nudge', {
      trekId: abandoned.trekId,
      trekName: abandoned.trekName,
      batchId: abandoned.batchId,
      correlationId: sessionCorrelationId.current
    }).then(({ data }) => {
      if (data.type !== 'campaign_nudge') return;
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'concierge',
        text: data.text,
        campaignNudge: { trekId: data.data.trekId }
      }]);
    }).catch(() => { /* best-effort nudge; silent on failure */ });
  }, [isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { id: Date.now(), type: 'user', text: input };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    const currentInput = input;
    setInput('');
    setLoading(true);

    const lastRecommendedMsg = currentMessages.slice().reverse().find(m => m.trekRecommendation);
    const lastTrekId = lastRecommendedMsg ? lastRecommendedMsg.trekRecommendation.trekId : null;

    try {
      const response = await axios.post('http://localhost:5000/api/v1/chat/message', {
        message: currentInput,
        context: { lastTrekId, correlationId: sessionCorrelationId.current }
      });

      const { type, text, data } = response.data;

      if (type === 'booking_redirect') {
        setIsOpen(false);
        // via=agent + corr tell the checkout page this booking was AI-initiated,
        // so it reserves through the agent-attributed path (source: 'agent')
        // instead of the default human checkout, and shares this session's
        // correlationId so the whole conversation-to-booking chain is traceable.
        navigate(`/trek/${data.trekId}?checkout=true&via=agent&corr=${sessionCorrelationId.current}`);
        return;
      }
      
      const aiResponse = {
        id: Date.now() + 1,
        type: 'concierge',
        text: text,
        trekRecommendation: data?.treks && data.treks.length > 0 ? data.treks[0] : null,
        guardrail: data?.treks?.[0]?.reasoning || null,
        suggestedAddOn: data?.suggestedAddon || null,
        isFallback: type === 'fallback'
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'concierge',
        text: 'I am sorry, but I am having trouble connecting to my servers right now.',
        isFallback: true
      }]);
    } finally {
      setLoading(false);
    }
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
      
      <div className={`fixed inset-y-0 right-0 w-[90%] max-w-[450px] sm:w-[450px] bg-white shadow-2xl border-l border-stone-200 z-50 flex flex-col transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="px-6 py-4 border-b border-stone-200 flex justify-between items-center bg-[#faf9f6]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center overflow-hidden p-1">
              <img src={chatLogo} alt="Chatbot Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h3 className="font-semibold text-stone-900">Concierge</h3>
              <p className="text-xs text-stone-500">AI Travel expert</p>
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
              <p className="text-[15px] leading-relaxed whitespace-pre-line">{msg.text}</p>
            </div>
            
            {msg.trekRecommendation && (
              <div className="mt-3 w-[90%] ml-1">
                <TrekCard trek={msg.trekRecommendation} compact={true} />
              </div>
            )}
            
            {msg.guardrail && !msg.isFallback && (
              <div className="mt-2 ml-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Reason: {msg.guardrail}</span>
              </div>
            )}

            {msg.suggestedAddOn && (
              <div className="mt-2 ml-2 max-w-[85%] flex items-start gap-1.5 text-xs text-blue-600 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  Suggested add-on: <strong>{msg.suggestedAddOn.addonName}</strong> — {msg.suggestedAddOn.reason} (stays within the add-on spending cap for this trek)
                </span>
              </div>
            )}

            {msg.campaignNudge && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate(`/trek/${msg.campaignNudge.trekId}?checkout=true&via=agent&corr=${sessionCorrelationId.current}`);
                }}
                className="mt-2 ml-2 flex items-center gap-1.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 px-3 py-1.5 rounded-lg transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Resume booking
              </button>
            )}

            {msg.isFallback && msg.id !== 1 && (
              <div className="mt-2 ml-2 flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                Fallback Mode Active
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex flex-col items-start">
            <div className="bg-white border border-stone-200 text-stone-800 rounded-2xl rounded-tl-sm shadow-sm px-4 py-3 flex gap-1">
              <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce delay-100"></span>
              <span className="w-2 h-2 bg-stone-300 rounded-full animate-bounce delay-200"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-stone-200">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a trek..."
            disabled={loading}
            className="w-full bg-stone-100 border-none rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 transition-all placeholder:text-stone-400 disabled:opacity-50"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || loading}
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
