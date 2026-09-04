import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TrekCard from './TrekCard';
import chatLogo from '../assets/altitude chatbot Logo.png';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

export default function ConciergePanel({ isOpen, setIsOpen }) {
  const [messages, setMessages] = useState([
    { id: 1, type: 'concierge', text: "Hey there! I'm Altia, your Altitude trek expert — I've booked hundreds of adventurers onto their perfect trek. What kind of experience are you after?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  // One id per chat session, sent on every /chat/message call so the AI's
  // extraction/recommendation/booking audit trail entries for this
  // conversation share a correlationId in the admin audit log.
  const sessionCorrelationId = useRef(crypto.randomUUID());
  // Preferences (difficulty/budget/month/fitness) accumulated across the
  // whole conversation, echoed back by the backend each turn. Lets a
  // follow-up like "cheaper please" still know the customer wants an
  // extreme trek, instead of forgetting what was said two messages ago.
  const priorSignals = useRef({});
  // Set while Altia is waiting on the customer's name/email to finish a
  // booking — echoed back by the backend each turn until it's resolved.
  const pendingBooking = useRef(null);

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
    axios.post(`${API_BASE_URL}/api/v1/chat/abandoned-nudge`, {
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
      const response = await axios.post(`${API_BASE_URL}/api/v1/chat/message`, {
        message: currentInput,
        context: {
          lastTrekId,
          correlationId: sessionCorrelationId.current,
          priorSignals: priorSignals.current,
          pendingBooking: pendingBooking.current
        }
      });

      const { type, text, data, signals } = response.data;
      if (signals) priorSignals.current = signals;
      pendingBooking.current = data?.pendingBooking || null;

      if (type === 'booking_redirect') {
        setIsOpen(false);
        // via=agent + corr tell the checkout page this booking was AI-initiated,
        // so it reserves through the agent-attributed path (source: 'agent')
        // instead of the default human checkout; name/email/phone (collected
        // conversationally) let the Razorpay modal open pre-filled, so the
        // customer only has to confirm a payment method.
        const params = new URLSearchParams({ checkout: 'true', via: 'agent', corr: sessionCorrelationId.current });
        if (data.customerName) params.set('name', data.customerName);
        if (data.customerEmail) params.set('email', data.customerEmail);
        if (data.customerPhone) params.set('phone', data.customerPhone);
        if (data.travelers) params.set('travelers', data.travelers);
        navigate(`/trek/${data.trekId}?${params.toString()}`);
        return;
      }

      const aiResponse = {
        id: Date.now() + 1,
        type: 'concierge',
        text: text,
        trekRecommendation: data?.treks && data.treks.length > 0 ? data.treks[0] : null,
        guardrail: data?.treks?.[0]?.reasoning || null,
        suggestedAddOn: data?.suggestedAddon || null,
        isAlternative: !!data?.isAlternative,
        isFallback: type === 'fallback'
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'concierge',
        text: "Hit a snag reaching my systems — but I'm still here. Mind trying that again in a moment?",
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile overlay */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-canvas-950/60 backdrop-blur-[2px] z-40 sm:hidden"
            onClick={() => setIsOpen(false)}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
            className="fixed inset-y-0 right-0 w-[92%] max-w-[420px] bg-paper-50 shadow-2xl shadow-canvas-950/20 border-l border-paper-300 z-50 flex flex-col"
          >
            <div className="px-5 py-4 border-b border-paper-200 flex justify-between items-center bg-canvas-950">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-full bg-canvas-800 text-white flex items-center justify-center overflow-hidden p-1.5 shrink-0">
                  <img src={chatLogo} alt="Altia" className="w-full h-full object-contain" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-pine-500 border-2 border-canvas-950" />
                </div>
                <div>
                  <h3 className="font-semibold text-paper-50 leading-tight font-display">Altia</h3>
                  <p className="text-xs text-pine-400 font-medium font-mono">Trek expert · online now</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-canvas-400 hover:text-paper-100 hover:bg-canvas-800 rounded-full p-1.5 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scroll-on-paper px-4 py-5 space-y-4 bg-paper-100">
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex flex-col ${msg.type === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`max-w-[88%] rounded-xl px-4 py-2.5 ${
                    msg.type === 'user'
                      ? 'bg-flare-500 text-white rounded-tr-md'
                      : 'bg-paper-50 border border-paper-300 text-ink-800 rounded-tl-md shadow-sm shadow-canvas-950/[0.03]'
                  }`}>
                    <p className="text-[14.5px] leading-relaxed whitespace-pre-line">{msg.text}</p>
                  </div>

                  {msg.trekRecommendation && (
                    <div className="mt-2.5 w-[92%] ml-1">
                      <TrekCard trek={msg.trekRecommendation} compact={true} />
                    </div>
                  )}

                  {msg.isAlternative && (
                    <div className="mt-2 ml-1 flex items-center gap-1.5 text-[11px] font-semibold text-brass-600 bg-brass-100 border border-brass-400/40 w-fit px-2 py-0.5 rounded-full">
                      Closest match — not an exact hit on your original ask
                    </div>
                  )}

                  {msg.guardrail && !msg.isFallback && (
                    <div className="mt-2 ml-1 flex items-start gap-1.5 text-xs text-pine-700 font-medium max-w-[92%]">
                      <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>Why this one: {msg.guardrail}</span>
                    </div>
                  )}

                  {msg.suggestedAddOn && (
                    <div className="mt-2 ml-1 max-w-[92%] flex items-start gap-1.5 text-xs text-seal-600 font-medium">
                      <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      <span>
                        Suggested add-on: <strong>{msg.suggestedAddOn.addonName}</strong> — {msg.suggestedAddOn.reason} (stays within the add-on spending cap for this trek)
                      </span>
                    </div>
                  )}

                  {msg.campaignNudge && (
                    <motion.button
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        setIsOpen(false);
                        navigate(`/trek/${msg.campaignNudge.trekId}?checkout=true&via=agent&corr=${sessionCorrelationId.current}`);
                      }}
                      className="mt-2 ml-1 flex items-center gap-1.5 text-xs font-semibold text-white bg-flare-500 hover:bg-flare-600 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Resume booking
                    </motion.button>
                  )}

                  {msg.isFallback && msg.id !== 1 && (
                    <div className="mt-2 ml-1 flex items-center gap-1.5 text-xs text-brass-600 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Fallback mode active
                    </div>
                  )}
                </motion.div>
              ))}
              {loading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-start">
                  <div className="bg-paper-50 border border-paper-300 text-ink-800 rounded-xl rounded-tl-md shadow-sm px-4 py-3 flex gap-1">
                    <span className="w-1.5 h-1.5 bg-ink-300 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-ink-300 rounded-full animate-bounce delay-100"></span>
                    <span className="w-1.5 h-1.5 bg-ink-300 rounded-full animate-bounce delay-200"></span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-paper-50 border-t border-paper-200">
              <form onSubmit={handleSend} className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Altia about a trek..."
                  disabled={loading}
                  className="w-full bg-paper-100 border border-paper-300 rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-flare-500/40 transition-all placeholder:text-ink-400 disabled:opacity-50"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-white bg-flare-500 disabled:bg-paper-300 hover:bg-flare-600 rounded-full transition-colors"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
