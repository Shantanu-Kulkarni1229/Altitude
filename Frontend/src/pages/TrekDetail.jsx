import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Calendar, Check, ChevronLeft, ShieldCheck, MessageCircle, X, Mountain, Sparkles, Minus, Plus, Users } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';
import WaypointStamp from '../components/logbook/WaypointStamp';
import ThresholdGauge from '../components/logbook/ThresholdGauge';
import AgentSeal from '../components/logbook/AgentSeal';

const DIFFICULTY_TONE = { easy: 'pine', moderate: 'brass', hard: 'flare', extreme: 'rust' };
const DIFFICULTY_CLS = {
  easy: 'bg-pine-50 text-pine-700 border-pine-200',
  moderate: 'bg-brass-100 text-brass-600 border-brass-400/50',
  hard: 'bg-flare-50 text-flare-700 border-flare-300',
  extreme: 'bg-rust-50 text-rust-700 border-rust-300'
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } }
};
const staggerContainer = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
const listStagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };

export default function TrekDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [trek, setTrek] = useState(null);
  const [batches, setBatches] = useState([]);
  const [addonsData, setAddonsData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedDeparture, setSelectedDeparture] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState('summary');
  const [checkoutError, setCheckoutError] = useState('');
  const [finalBookingId, setFinalBookingId] = useState('');
  const [isAgentInitiated, setIsAgentInitiated] = useState(false);
  const [agentCorrelationId, setAgentCorrelationId] = useState(null);
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  const [travelers, setTravelers] = useState(1);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/v1/treks/${id}`);
        setTrek(response.data.data.trek);
        setBatches(response.data.data.batches);
        setAddonsData(response.data.data.addons);
        if (response.data.data.batches.length > 0) {
          setSelectedDeparture(response.data.data.batches[0].batchId);
        }
      } catch (error) {
        console.error('Error fetching trek:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [id]);

  useEffect(() => {
    if (trek && !loading) {
      const searchParams = new URLSearchParams(location.search);
      if (searchParams.get('checkout') === 'true') {
        setIsCheckoutOpen(true);
        if (searchParams.get('via') === 'agent') {
          setIsAgentInitiated(true);
          setAgentCorrelationId(searchParams.get('corr'));
        }
        setContact({
          name: searchParams.get('name') || '',
          email: searchParams.get('email') || '',
          phone: searchParams.get('phone') || ''
        });
        const travelersParam = parseInt(searchParams.get('travelers'), 10);
        if (travelersParam > 0) setTravelers(travelersParam);
      }
    }
  }, [trek, loading, location.search]);

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center bg-paper-100 text-ink-400 text-sm">Loading trek details...</div>;
  if (!trek) return <div className="min-h-[60vh] flex items-center justify-center bg-paper-100 text-ink-400 text-sm">Trek not found.</div>;

  const toggleAddon = (addonId) => {
    setSelectedAddons(prev =>
      prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]
    );
  };

  const selectedDepData = batches.find(b => b.batchId === selectedDeparture);
  const basePrice = selectedDepData ? selectedDepData.price : trek.basePrice;
  const addonsTotal = selectedAddons.reduce((acc, addonId) => {
    const addon = addonsData.find(a => a.addOnId === addonId);
    return acc + (addon ? addon.price : 0);
  }, 0);
  const perPersonTotal = basePrice + addonsTotal;
  const totalAmount = perPersonTotal * travelers;
  const contactComplete = contact.name.trim().length > 0 && /\S+@\S+\.\S+/.test(contact.email);
  const availableSlots = selectedDepData ? selectedDepData.totalSlots - selectedDepData.slotsBooked : 0;
  const notEnoughSlots = !!selectedDepData && availableSlots < travelers;
  const diffTone = DIFFICULTY_TONE[trek.difficulty] || 'brass';

  const handleCheckout = async () => {
    if (!contactComplete) return;
    setCheckoutStep('processing');
    try {
      let bookingId, razorpayOrderId;
      const contactPayload = { customerName: contact.name, customerEmail: contact.email, customerPhone: contact.phone, travelers };

      if (isAgentInitiated) {
        const agentRes = await axios.post(`${API_BASE_URL}/api/v1/chat/book`, {
          batchId: selectedDeparture,
          customerId: "cust_123",
          customerFitnessLevel: 3,
          addOnIds: selectedAddons,
          correlationId: agentCorrelationId || undefined,
          ...contactPayload
        });

        if (agentRes.data.type === 'booking_failure') {
          throw new Error(agentRes.data.text);
        }

        bookingId = agentRes.data.data.booking.bookingId;
        razorpayOrderId = agentRes.data.data.order.id;
      } else {
        const createRes = await axios.post(`${API_BASE_URL}/api/v1/bookings/create`, {
          batchId: selectedDeparture,
          customerId: "cust_123",
          customerFitnessLevel: 3,
          addOnIds: selectedAddons,
          source: 'human',
          ...contactPayload
        });

        bookingId = createRes.data.bookingId;
        razorpayOrderId = createRes.data.razorpayOrderId;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: totalAmount * 100,
        currency: "INR",
        name: "Altitude",
        description: `Booking for ${trek.name}`,
        order_id: razorpayOrderId,
        prefill: {
          name: contact.name,
          email: contact.email,
          contact: contact.phone || undefined
        },
        handler: async function (response) {
          try {
            setCheckoutStep('processing');
            await axios.post(`${API_BASE_URL}/api/v1/bookings/confirm`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              bookingId
            });
            localStorage.removeItem('altitude_abandoned_checkout');
            setFinalBookingId(bookingId);
            setCheckoutStep('success');
          } catch (err) {
            setCheckoutError('Payment verification failed.');
            setCheckoutStep('rejected_other');
          }
        },
        modal: {
          ondismiss: function () {
            localStorage.setItem('altitude_abandoned_checkout', JSON.stringify({
              trekId: trek.trekId,
              trekName: trek.name,
              batchId: selectedDeparture,
              ts: Date.now()
            }));
            setCheckoutStep('summary');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message;
      setCheckoutError(errorMsg);
      if (errorMsg.toLowerCase().includes('fitness')) {
        setCheckoutStep('rejected_fitness');
      } else if (errorMsg.toLowerCase().includes('availability') || errorMsg.toLowerCase().includes('slots')) {
        setCheckoutStep('rejected_slots');
      } else {
        setCheckoutStep('rejected_other');
      }
    }
  };

  return (
    <div className="bg-paper-100 min-h-screen pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <Link to="/" className="inline-flex items-center text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors group">
          <ChevronLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-0.5" />
          Back to the log
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        <motion.div
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative h-[420px] md:h-[560px] rounded-2xl overflow-hidden shadow-2xl shadow-canvas-950/30"
        >
          <img src={trek.coverPhoto} alt={trek.name} className="w-full h-full object-cover grayscale-[8%] contrast-[1.05]" />
          <div className="absolute inset-0 bg-gradient-to-t from-canvas-950/85 via-canvas-950/15 to-transparent"></div>
          <WaypointStamp n={trek.trekId?.replace(/\D/g, '').slice(-2) || '01'} tone={diffTone} size="lg" className="absolute top-6 left-6 shadow-lg" rotate={-6} />
          <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full">
            <span className={`inline-block text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full border mb-4 ${DIFFICULTY_CLS[trek.difficulty]}`}>
              {trek.difficulty}
            </span>
            <h1 className="font-display text-4xl md:text-6xl font-bold text-paper-50 mb-4 tracking-tight">{trek.name}</h1>
            <div className="flex flex-wrap items-center text-paper-200 gap-x-6 gap-y-2 text-sm md:text-base font-mono tabular">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 md:w-5 md:h-5" /> {trek.region}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 md:w-5 md:h-5" /> {trek.durationDays} days</span>
              <span className="flex items-center gap-1.5"><Mountain className="w-4 h-4 md:w-5 md:h-5" /> {trek.maxAltitude || 'N/A'}</span>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="lg:col-span-2 space-y-14">
            <motion.section variants={fadeUp}>
              <h2 className="font-display text-2xl font-bold text-ink-900 mb-4 tracking-tight">Field notes</h2>
              <div className="flex flex-wrap gap-3 mb-6">
                <span className="bg-paper-50 border border-paper-300 text-ink-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 font-mono">
                  <Mountain className="w-4 h-4 text-ink-400" /> Max altitude: {trek.maxAltitude || "N/A"}
                </span>
                <span className="bg-paper-50 border border-paper-300 text-ink-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 font-mono">
                  <Clock className="w-4 h-4 text-ink-400" /> Distance: {trek.trekDistance || "N/A"}
                </span>
                <span className="bg-paper-50 border border-paper-300 text-ink-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 font-mono">
                  <ShieldCheck className="w-4 h-4 text-pine-600" /> Min fitness {trek.minFitnessLevel}/10
                </span>
              </div>
              <p className="text-ink-600 leading-relaxed text-lg mb-8">{trek.description}</p>

              {trek.highlights && trek.highlights.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-lg font-bold text-ink-900 mb-4 font-display">Highlights</h3>
                  <motion.ul variants={listStagger} initial="hidden" animate="show" className="space-y-3">
                    {trek.highlights.map((highlight, idx) => (
                      <motion.li key={idx} variants={fadeUp} className="flex items-start gap-3 text-ink-600">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-pine-100 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-pine-700" />
                        </div>
                        <span className="leading-relaxed">{highlight}</span>
                      </motion.li>
                    ))}
                  </motion.ul>
                </div>
              )}

              {trek.itinerary && trek.itinerary.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-ink-900 mb-6 font-display">Day-by-day log</h3>
                  <motion.div variants={listStagger} initial="hidden" animate="show" className="relative pl-2">
                    <svg className="absolute left-[19px] top-2 bottom-2 w-px h-[calc(100%-16px)]" preserveAspectRatio="none">
                      <line x1="0" y1="0" x2="0" y2="100%" stroke="var(--color-paper-300)" strokeWidth="2" strokeDasharray="1 6" strokeLinecap="round" />
                    </svg>
                    <div className="space-y-5">
                      {trek.itinerary.map((day, idx) => (
                        <motion.div key={idx} variants={fadeUp} className="relative flex gap-4 items-start">
                          <WaypointStamp n={day.day} tone="ink" size="md" rotate={idx % 2 === 0 ? -3 : 3} className="z-10 bg-paper-100" />
                          <div className="flex-1 bg-paper-50 p-5 rounded-lg border border-paper-300 hover:border-flare-300 transition-colors">
                            <h4 className="font-bold text-ink-900 mb-2">{day.title}</h4>
                            <p className="text-sm text-ink-600 leading-relaxed">{day.details}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.section>

            <motion.section variants={fadeUp}>
              <h2 className="font-display text-2xl font-bold text-ink-900 mb-6 tracking-tight">Available departures</h2>
              <div className="grid gap-3">
                {batches.map(dep => {
                  const isSelected = selectedDeparture === dep.batchId;
                  const availableSlots = dep.totalSlots - dep.slotsBooked;
                  const isLow = availableSlots > 0 && availableSlots <= 3;
                  const isFull = availableSlots === 0;

                  return (
                    <motion.div
                      key={dep.batchId}
                      layout
                      onClick={() => !isFull && setSelectedDeparture(dep.batchId)}
                      className={`relative p-5 rounded-lg border-2 transition-colors cursor-pointer flex items-center justify-between
                        ${isFull ? 'opacity-50 cursor-not-allowed border-paper-300 bg-paper-100' :
                          isSelected ? 'border-flare-500 bg-flare-50/50' : 'border-paper-300 bg-paper-50 hover:border-ink-400'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                          ${isSelected ? 'border-flare-500 bg-flare-500' : 'border-paper-300'}`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <div>
                          <p className="font-semibold text-ink-900 flex items-center gap-2 font-mono tabular">
                            <Calendar className="w-4 h-4 text-ink-400" />
                            {new Date(dep.startDate).toLocaleDateString()} — {new Date(dep.endDate).toLocaleDateString()}
                          </p>
                          <p className="text-sm mt-1 font-medium text-ink-600 font-mono">₹{dep.price.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {isFull ? (
                          <span className="text-ink-500 font-medium bg-paper-200 px-3 py-1 rounded-full text-sm">Sold out</span>
                        ) : (
                          <span className={`text-sm font-semibold px-3 py-1 rounded-full font-mono tabular
                            ${isLow ? 'bg-rust-50 text-rust-700' : 'bg-pine-50 text-pine-700'}`}>
                            {availableSlots} {availableSlots === 1 ? 'spot' : 'spots'} left
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>

            {addonsData && addonsData.length > 0 && (
              <motion.section variants={fadeUp}>
                <h2 className="font-display text-2xl font-bold text-ink-900 mb-6 tracking-tight">Optional add-ons</h2>
                <div className="grid gap-3">
                  {addonsData.map(addon => {
                    const isSelected = selectedAddons.includes(addon.addOnId);
                    return (
                      <div
                        key={addon.addOnId}
                        onClick={() => toggleAddon(addon.addOnId)}
                        className={`p-4 rounded-lg border transition-colors cursor-pointer flex justify-between items-center
                          ${isSelected ? 'border-flare-500 bg-flare-50/50' : 'border-paper-300 bg-paper-50 hover:border-ink-400'}`}
                      >
                        <div>
                          <p className="font-semibold text-ink-900">{addon.name}</p>
                          <p className="text-sm text-ink-500 mt-0.5">{addon.description}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-medium text-ink-900 font-mono tabular">+₹{addon.price.toLocaleString()}</p>
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
                            ${isSelected ? 'bg-flare-500 border-flare-500 text-white' : 'border-paper-300'}`}>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.section>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="sticky top-24 bg-paper-50 rounded-2xl p-6 border border-paper-300 shadow-xl shadow-canvas-950/[0.06]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-ink-900 font-display">Booking log</h3>
                <ThresholdGauge label="Fitness req." value={trek.minFitnessLevel} max={10} size={64} />
              </div>

              <div className="flex items-center justify-between mb-6 pb-6 border-b border-dashed border-paper-300">
                <div className="flex items-center gap-2 text-ink-700 font-medium text-sm">
                  <Users className="w-4 h-4 text-ink-400" />
                  Travelers
                </div>
                <div className="flex items-center gap-3">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setTravelers(t => Math.max(1, t - 1))}
                    className="w-8 h-8 rounded-full border border-paper-300 flex items-center justify-center text-ink-500 hover:bg-paper-100 hover:border-ink-400 transition-colors disabled:opacity-30"
                    disabled={travelers <= 1}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </motion.button>
                  <span className="w-5 text-center font-semibold text-ink-900 font-mono tabular">{travelers}</span>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setTravelers(t => Math.min(20, t + 1))}
                    className="w-8 h-8 rounded-full border border-paper-300 flex items-center justify-center text-ink-500 hover:bg-paper-100 hover:border-ink-400 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>

              <div className="space-y-4 mb-6 text-ink-600 font-mono">
                <div className="flex justify-between text-sm">
                  <span className="font-sans">Base price {travelers > 1 && <span className="text-ink-400">(per person)</span>}</span>
                  <span className="font-semibold text-ink-900 tabular">₹{basePrice.toLocaleString()}</span>
                </div>
                {selectedAddons.length > 0 && (
                  <div className="border-t border-dashed border-paper-300 pt-4 space-y-2">
                    <p className="text-xs font-semibold text-ink-400 uppercase tracking-wider font-sans">Add-ons {travelers > 1 && '(per person)'}</p>
                    {selectedAddons.map(addonId => {
                      const addon = addonsData.find(a => a.addOnId === addonId);
                      return (
                        <div key={addonId} className="flex justify-between text-sm">
                          <span className="font-sans">{addon?.name}</span>
                          <span className="font-semibold text-ink-900 tabular">₹{addon?.price.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {travelers > 1 && (
                  <div className="flex justify-between text-xs border-t border-dashed border-paper-300 pt-4 text-ink-500">
                    <span className="tabular">₹{perPersonTotal.toLocaleString()} × {travelers} travelers</span>
                  </div>
                )}

                <div className="border-t border-paper-300 pt-4 flex justify-between items-end">
                  <span className="font-semibold text-ink-900 font-sans">Total</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={totalAmount}
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.18 }}
                      className="text-2xl font-bold text-ink-900 tabular"
                    >
                      ₹{totalAmount.toLocaleString()}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </div>

              <AnimatePresence>
                {notEnoughSlots && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 text-xs font-medium text-rust-700 bg-rust-50 border border-rust-200 rounded-lg px-3 py-2 overflow-hidden"
                  >
                    Only {availableSlots} {availableSlots === 1 ? 'spot' : 'spots'} left on this date — reduce travelers or pick another departure.
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-3">
                <motion.button
                  whileTap={!(!selectedDepData || notEnoughSlots) ? { scale: 0.98 } : undefined}
                  disabled={!selectedDepData || notEnoughSlots}
                  onClick={() => { setIsAgentInitiated(false); setIsCheckoutOpen(true); }}
                  className="w-full bg-flare-500 text-white font-semibold py-4 rounded-lg hover:bg-flare-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg shadow-flare-900/10"
                >
                  <ShieldCheck className="w-5 h-5" />
                  Book Now
                </motion.button>
                <motion.button
                  whileTap={!(!selectedDepData || notEnoughSlots) ? { scale: 0.98 } : undefined}
                  disabled={!selectedDepData || notEnoughSlots}
                  onClick={() => { setIsAgentInitiated(true); setAgentCorrelationId(null); setIsCheckoutOpen(true); }}
                  className="w-full bg-paper-50 border-2 border-paper-300 text-ink-800 font-semibold py-3.5 rounded-lg hover:border-seal-600 hover:bg-seal-100/30 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle className="w-5 h-5" />
                  Book with Concierge
                </motion.button>
              </div>

              <div className="mt-5 pt-5 border-t border-dashed border-paper-300 flex items-start gap-2 text-xs text-ink-500">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-ink-400" />
                <span>Every booking is checked against fitness, budget, and availability guardrails before payment — and logged to a full audit trail.</span>
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      <AnimatePresence>
        {isCheckoutOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas-950/75 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="bg-paper-50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <AnimatePresence mode="wait">
                {checkoutStep === 'summary' && (
                  <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                    <div className="p-6 border-b border-dashed border-paper-300 flex justify-between items-center">
                      <h3 className="text-xl font-bold text-ink-900 font-display">Confirm booking</h3>
                      <button onClick={() => setIsCheckoutOpen(false)} className="text-ink-400 hover:text-ink-700 hover:bg-paper-200 rounded-full p-1.5 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-6">
                      {isAgentInitiated && (
                        <AgentSeal label="Booking via AI Concierge (source: agent)" size="md" className="mb-4" />
                      )}
                      <div className="flex items-center gap-4 mb-6">
                        <img src={trek.coverPhoto} className="w-16 h-16 rounded-lg object-cover" alt="" />
                        <div>
                          <p className="font-bold text-ink-900">{trek.name}</p>
                          <p className="text-sm text-ink-500 font-mono">{selectedDepData && `${new Date(selectedDepData.startDate).toLocaleDateString()} — ${new Date(selectedDepData.endDate).toLocaleDateString()}`}</p>
                          {travelers > 1 && (
                            <p className="text-xs text-ink-400 mt-0.5 flex items-center gap-1"><Users className="w-3 h-3" /> {travelers} travelers</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 mb-5">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-500 uppercase tracking-wider">
                          <Sparkles className="w-3.5 h-3.5 text-flare-500" />
                          Your details
                          {contact.name && contact.email && (
                            <span className="text-pine-600 font-medium normal-case tracking-normal">— pre-filled by Altia</span>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Full name"
                          value={contact.name}
                          onChange={(e) => setContact(c => ({ ...c, name: e.target.value }))}
                          className="w-full bg-paper-100 border border-paper-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-flare-500/40 focus:border-flare-400 transition-all placeholder:text-ink-400"
                        />
                        <input
                          type="email"
                          placeholder="Email address"
                          value={contact.email}
                          onChange={(e) => setContact(c => ({ ...c, email: e.target.value }))}
                          className="w-full bg-paper-100 border border-paper-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-flare-500/40 focus:border-flare-400 transition-all placeholder:text-ink-400"
                        />
                        <input
                          type="tel"
                          placeholder="Phone (optional)"
                          value={contact.phone}
                          onChange={(e) => setContact(c => ({ ...c, phone: e.target.value }))}
                          className="w-full bg-paper-100 border border-paper-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-flare-500/40 focus:border-flare-400 transition-all placeholder:text-ink-400"
                        />
                      </div>

                      <div className="bg-paper-100 rounded-lg p-4 mb-6 border border-paper-300">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-ink-600 text-sm">Total amount</span>
                          <span className="font-bold text-lg text-ink-900 font-mono tabular">₹{totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-pine-700 bg-pine-50 w-fit px-2 py-1 rounded-full">
                          <ShieldCheck className="w-3 h-3" /> Ready for final safety check
                        </div>
                      </div>

                      <motion.button
                        whileTap={contactComplete ? { scale: 0.98 } : undefined}
                        onClick={handleCheckout}
                        disabled={!contactComplete}
                        className="w-full bg-flare-500 text-white font-semibold py-4 rounded-lg hover:bg-flare-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Pay via Razorpay
                      </motion.button>
                      <p className="text-[11px] text-ink-400 text-center mt-3 leading-relaxed">
                        We hand off your name, email and phone to Razorpay's secure checkout — only the payment method itself is entered there, never on this page.
                      </p>
                    </div>
                  </motion.div>
                )}

                {checkoutStep === 'processing' && (
                  <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="p-12 text-center">
                    <div className="w-12 h-12 border-4 border-paper-300 border-t-flare-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <h3 className="text-lg font-semibold text-ink-900 font-display">Processing payment...</h3>
                    <p className="text-ink-500 text-sm mt-2">Waiting for gateway verification.</p>
                  </motion.div>
                )}

                {checkoutStep === 'rejected_fitness' && (
                  <motion.div key="rejected_fitness" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="p-8 text-center">
                    <div className="w-16 h-16 bg-rust-100 text-rust-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <X className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-ink-900 font-display">Booking blocked</h3>
                    <p className="text-ink-600 mt-2 mb-6 text-sm leading-relaxed">
                      <strong>Safety guardrail triggered:</strong> {checkoutError}
                    </p>
                    <div className="bg-paper-100 rounded-lg p-4 mb-6 text-left border border-paper-300">
                      <p className="text-sm font-semibold text-ink-900 mb-2">Want to try a moderate trek?</p>
                      <Link to="/" onClick={() => setIsCheckoutOpen(false)} className="text-flare-600 font-bold hover:underline">
                        Explore all treks
                      </Link>
                    </div>
                    <button onClick={() => setIsCheckoutOpen(false)} className="w-full bg-paper-100 text-ink-900 font-semibold py-3 px-6 rounded-lg hover:bg-paper-200 transition-colors">
                      Close
                    </button>
                  </motion.div>
                )}

                {checkoutStep === 'rejected_slots' && (
                  <motion.div key="rejected_slots" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="p-8 text-center">
                    <div className="w-16 h-16 bg-rust-100 text-rust-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <X className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-ink-900 font-display">Booking blocked</h3>
                    <p className="text-ink-600 mt-2 mb-6 text-sm leading-relaxed">
                      <strong>Availability guardrail triggered:</strong> {checkoutError}
                    </p>
                    <button onClick={() => { setIsCheckoutOpen(false); setCheckoutStep('summary'); }} className="w-full bg-paper-100 text-ink-900 font-semibold py-3 px-6 rounded-lg hover:bg-paper-200 transition-colors">
                      Choose another date
                    </button>
                  </motion.div>
                )}

                {checkoutStep === 'rejected_other' && (
                  <motion.div key="rejected_other" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="p-8 text-center">
                    <div className="w-16 h-16 bg-rust-100 text-rust-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <X className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-ink-900 font-display">Booking blocked</h3>
                    <p className="text-ink-600 mt-2 mb-6 text-sm leading-relaxed">
                      <strong>Guardrail / error:</strong> {checkoutError}
                    </p>
                    <button onClick={() => { setIsCheckoutOpen(false); setCheckoutStep('summary'); }} className="w-full bg-paper-100 text-ink-900 font-semibold py-3 px-6 rounded-lg hover:bg-paper-200 transition-colors">
                      Close
                    </button>
                  </motion.div>
                )}

                {checkoutStep === 'success' && (
                  <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="p-12 text-center">
                    <motion.div
                      initial={{ scale: 0 }} animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 18, delay: 0.1 }}
                      className="w-16 h-16 bg-pine-100 text-pine-700 rounded-full flex items-center justify-center mx-auto mb-4"
                    >
                      <Check className="w-8 h-8" />
                    </motion.div>
                    <h3 className="text-2xl font-bold text-ink-900 font-display">Booking confirmed</h3>
                    <p className="text-ink-600 mt-2 mb-6 font-mono">Waypoint logged. Booking ID: #{finalBookingId}</p>
                    <Link to="/bookings" onClick={() => setIsCheckoutOpen(false)} className="inline-block bg-canvas-950 text-white font-semibold py-3 px-6 rounded-lg hover:bg-canvas-800 transition-colors">
                      View my bookings
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
