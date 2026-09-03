import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Clock, Calendar, Check, ChevronLeft, ShieldCheck, MessageCircle, X, Mountain, Sparkles, Minus, Plus, Users } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

const difficultyColors = {
  easy: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  moderate: 'bg-amber-100 text-amber-800 border-amber-200',
  hard: 'bg-orange-100 text-orange-800 border-orange-200',
  extreme: 'bg-rose-100 text-rose-800 border-rose-200'
};

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
  // Whether this checkout should be booked through the agent-attributed
  // path (source: 'agent', its own guardrail trace) rather than the human
  // checkout path. True when the AI chat redirected here, or when the
  // "Book with Concierge" button is used directly.
  const [isAgentInitiated, setIsAgentInitiated] = useState(false);
  const [agentCorrelationId, setAgentCorrelationId] = useState(null);
  // Contact details — pre-filled from the chat if Altia already collected
  // them, editable either way, and passed to Razorpay's `prefill` so the
  // customer only has to confirm a payment method at the very end.
  const [contact, setContact] = useState({ name: '', email: '', phone: '' });
  // Number of people this booking is for — prices and reserved slots both
  // scale by this. Prefilled from the chat if Altia already asked ("for 4
  // people"), editable here either way.
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

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-stone-400 text-sm">Loading trek details...</div>;
  if (!trek) return <div className="min-h-[60vh] flex items-center justify-center text-stone-400 text-sm">Trek not found.</div>;

  const toggleAddon = (addonId) => {
    setSelectedAddons(prev =>
      prev.includes(addonId) ? prev.filter(id => id !== addonId) : [...prev, addonId]
    );
  };

  const selectedDepData = batches.find(b => b.batchId === selectedDeparture);
  const basePrice = selectedDepData ? selectedDepData.price : trek.basePrice; // per person
  const addonsTotal = selectedAddons.reduce((acc, addonId) => {
    const addon = addonsData.find(a => a.addOnId === addonId);
    return acc + (addon ? addon.price : 0);
  }, 0); // per person
  const perPersonTotal = basePrice + addonsTotal;
  const totalAmount = perPersonTotal * travelers;
  const contactComplete = contact.name.trim().length > 0 && /\S+@\S+\.\S+/.test(contact.email);
  const availableSlots = selectedDepData ? selectedDepData.totalSlots - selectedDepData.slotsBooked : 0;
  const notEnoughSlots = !!selectedDepData && availableSlots < travelers;

  const handleCheckout = async () => {
    if (!contactComplete) return;
    setCheckoutStep('processing');
    try {
      // 1. Create Booking & Run Guardrails.
      // Agent-initiated checkouts (AI chat redirect or "Book with Concierge")
      // go through /chat/book so the reservation is attributed to source:'agent'
      // with its own audited guardrail trace, instead of the default human path.
      let bookingId, razorpayOrderId;
      const contactPayload = { customerName: contact.name, customerEmail: contact.email, customerPhone: contact.phone, travelers };

      if (isAgentInitiated) {
        const agentRes = await axios.post(`${API_BASE_URL}/api/v1/chat/book`, {
          batchId: selectedDeparture,
          customerId: "cust_123", // Mock customer
          customerFitnessLevel: 3, // Mock average fitness
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
          customerId: "cust_123", // Mock customer
          customerFitnessLevel: 3, // Mock average fitness
          addOnIds: selectedAddons,
          source: 'human',
          ...contactPayload
        });

        bookingId = createRes.data.bookingId;
        razorpayOrderId = createRes.data.razorpayOrderId;
      }

      // 2. Open Razorpay Window — pre-filled with everything except the
      // payment method itself, which has to be entered inside Razorpay's
      // own secure checkout (never our UI, by PCI-DSS design).
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Must match the backend's RAZORPAY_KEY_ID (test mode)
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
            // 3. Confirm payment on backend
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
            // Slot is already reserved (pending_payment) at this point — track
            // it so the concierge can offer one bounded nudge to resume later.
            localStorage.setItem('altitude_abandoned_checkout', JSON.stringify({
              trekId: trek.trekId,
              trekName: trek.name,
              batchId: selectedDeparture,
              ts: Date.now()
            }));
            setCheckoutStep('summary'); // User closed window
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      // Guardrail rejected
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
    <div className="bg-[#faf9f6] min-h-screen pb-32">
      {/* Back navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <Link to="/" className="inline-flex items-center text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors group">
          <ChevronLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-0.5" />
          Back to all treks
        </Link>
      </div>

      {/* Hero Image */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
        <div className="relative h-[420px] md:h-[560px] rounded-3xl overflow-hidden shadow-2xl shadow-stone-900/20">
          <img src={trek.coverPhoto} alt={trek.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"></div>
          <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full">
            <span className={`inline-block text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full backdrop-blur-md mb-4 ${difficultyColors[trek.difficulty]}`}>
              {trek.difficulty}
            </span>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">{trek.name}</h1>
            <div className="flex flex-wrap items-center text-white/90 gap-x-6 gap-y-2 text-sm md:text-base">
              <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 md:w-5 md:h-5" /> {trek.region}</span>
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 md:w-5 md:h-5" /> {trek.durationDays} days</span>
              <span className="flex items-center gap-1.5"><Mountain className="w-4 h-4 md:w-5 md:h-5" /> {trek.maxAltitude || 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-14">
            <section>
              <h2 className="text-2xl font-bold text-stone-900 mb-4 tracking-tight">About this trek</h2>
              <div className="flex flex-wrap gap-3 mb-6">
                <span className="bg-white border border-stone-200 text-stone-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5">
                  <Mountain className="w-4 h-4 text-stone-400" /> Max Altitude: {trek.maxAltitude || "N/A"}
                </span>
                <span className="bg-white border border-stone-200 text-stone-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-stone-400" /> Distance: {trek.trekDistance || "N/A"}
                </span>
                <span className="bg-white border border-stone-200 text-stone-700 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Min fitness level {trek.minFitnessLevel}/10
                </span>
              </div>
              <p className="text-stone-600 leading-relaxed text-lg mb-8">{trek.description}</p>

              {trek.highlights && trek.highlights.length > 0 && (
                <div className="mb-10">
                  <h3 className="text-lg font-bold text-stone-900 mb-4">Highlights</h3>
                  <ul className="space-y-3">
                    {trek.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-stone-600">
                        <div className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-emerald-700" />
                        </div>
                        <span className="leading-relaxed">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {trek.itinerary && trek.itinerary.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-stone-900 mb-6">Itinerary</h3>
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-stone-200 before:to-transparent">
                    {trek.itinerary.map((day, idx) => (
                      <div key={idx} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-stone-900 text-white font-bold text-sm shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                          {day.day}
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-5 rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-stone-300 transition-all">
                          <h4 className="font-bold text-stone-900 mb-2">{day.title}</h4>
                          <p className="text-sm text-stone-600 leading-relaxed">{day.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section>
              <h2 className="text-2xl font-bold text-stone-900 mb-6 tracking-tight">Available Departures</h2>
              <div className="grid gap-3">
                {batches.map(dep => {
                  const isSelected = selectedDeparture === dep.batchId;
                  const availableSlots = dep.totalSlots - dep.slotsBooked;
                  const isLow = availableSlots > 0 && availableSlots <= 3;
                  const isFull = availableSlots === 0;

                  return (
                    <div
                      key={dep.batchId}
                      onClick={() => !isFull && setSelectedDeparture(dep.batchId)}
                      className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between
                        ${isFull ? 'opacity-50 cursor-not-allowed border-stone-200 bg-stone-50' :
                          isSelected ? 'border-emerald-500 bg-emerald-50/60 shadow-sm' : 'border-stone-200 bg-white hover:border-stone-300'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                          ${isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-stone-300'}`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <div>
                          <p className="font-semibold text-stone-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-stone-400" />
                            {new Date(dep.startDate).toLocaleDateString()} - {new Date(dep.endDate).toLocaleDateString()}
                          </p>
                          <p className="text-sm mt-1 font-medium text-stone-600">₹{dep.price.toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {isFull ? (
                          <span className="text-stone-500 font-medium bg-stone-200 px-3 py-1 rounded-full text-sm">Sold out</span>
                        ) : (
                          <span className={`text-sm font-semibold px-3 py-1 rounded-full
                            ${isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {availableSlots} {availableSlots === 1 ? 'spot' : 'spots'} left
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {addonsData && addonsData.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold text-stone-900 mb-6 tracking-tight">Optional Add-ons</h2>
                <div className="grid gap-3">
                  {addonsData.map(addon => {
                    const isSelected = selectedAddons.includes(addon.addOnId);
                    return (
                      <div
                        key={addon.addOnId}
                        onClick={() => toggleAddon(addon.addOnId)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer flex justify-between items-center
                          ${isSelected ? 'border-emerald-500 bg-emerald-50/60' : 'border-stone-200 bg-white hover:border-stone-300'}`}
                      >
                        <div>
                          <p className="font-semibold text-stone-900">{addon.name}</p>
                          <p className="text-sm text-stone-500 mt-0.5">{addon.description}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-medium text-stone-900">+₹{addon.price.toLocaleString()}</p>
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
                            ${isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-300'}`}>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Sticky Sidebar */}
          <div>
            <div className="sticky top-24 bg-white rounded-3xl p-6 border border-stone-200 shadow-xl shadow-stone-900/[0.06]">
              <h3 className="text-lg font-bold text-stone-900 mb-6">Booking Summary</h3>

              <div className="flex items-center justify-between mb-6 pb-6 border-b border-stone-100">
                <div className="flex items-center gap-2 text-stone-700 font-medium text-sm">
                  <Users className="w-4 h-4 text-stone-400" />
                  Travelers
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setTravelers(t => Math.max(1, t - 1))}
                    className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50 hover:border-stone-300 transition-colors disabled:opacity-30"
                    disabled={travelers <= 1}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-5 text-center font-semibold text-stone-900 tabular-nums">{travelers}</span>
                  <button
                    onClick={() => setTravelers(t => Math.min(20, t + 1))}
                    className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center text-stone-500 hover:bg-stone-50 hover:border-stone-300 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 mb-6 text-stone-600">
                <div className="flex justify-between">
                  <span>Base price {travelers > 1 && <span className="text-stone-400">(per person)</span>}</span>
                  <span className="font-medium text-stone-900">₹{basePrice.toLocaleString()}</span>
                </div>
                {selectedAddons.length > 0 && (
                  <div className="border-t border-stone-100 pt-4 space-y-2">
                    <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Add-ons {travelers > 1 && '(per person)'}</p>
                    {selectedAddons.map(addonId => {
                      const addon = addonsData.find(a => a.addOnId === addonId);
                      return (
                        <div key={addonId} className="flex justify-between text-sm">
                          <span>{addon?.name}</span>
                          <span className="font-medium text-stone-900">₹{addon?.price.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {travelers > 1 && (
                  <div className="flex justify-between text-sm border-t border-stone-100 pt-4">
                    <span>₹{perPersonTotal.toLocaleString()} × {travelers} travelers</span>
                  </div>
                )}

                <div className="border-t border-stone-200 pt-4 flex justify-between items-end">
                  <span className="font-semibold text-stone-900">Total</span>
                  <span className="text-2xl font-bold text-stone-900">₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {notEnoughSlots && (
                <div className="mb-4 text-xs font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                  Only {availableSlots} {availableSlots === 1 ? 'spot' : 'spots'} left on this date — reduce travelers or pick another departure.
                </div>
              )}

              <div className="space-y-3">
                <button
                  disabled={!selectedDepData || notEnoughSlots}
                  onClick={() => { setIsAgentInitiated(false); setIsCheckoutOpen(true); }}
                  className="w-full bg-stone-950 text-white font-semibold py-4 rounded-2xl hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 shadow-lg shadow-stone-900/10"
                >
                  <ShieldCheck className="w-5 h-5" />
                  Book Now
                </button>
                <button
                  disabled={!selectedDepData || notEnoughSlots}
                  onClick={() => { setIsAgentInitiated(true); setAgentCorrelationId(null); setIsCheckoutOpen(true); }}
                  className="w-full bg-white border-2 border-stone-200 text-stone-800 font-semibold py-3.5 rounded-2xl hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle className="w-5 h-5" />
                  Book with Concierge
                </button>
              </div>

              <div className="mt-5 pt-5 border-t border-stone-100 flex items-start gap-2 text-xs text-stone-400">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-stone-300" />
                <span>Every booking is checked against fitness, budget, and availability guardrails before payment — and logged to a full audit trail.</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Checkout Modal Overlay */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            {checkoutStep === 'summary' && (
              <>
                <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                  <h3 className="text-xl font-bold text-stone-900">Confirm Booking</h3>
                  <button onClick={() => setIsCheckoutOpen(false)} className="text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full p-1.5 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-6">
                  {isAgentInitiated && (
                    <div className="mb-4 flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 w-fit px-2.5 py-1 rounded-full">
                      <MessageCircle className="w-3.5 h-3.5" />
                      Booking via AI Concierge (source: agent)
                    </div>
                  )}
                  <div className="flex items-center gap-4 mb-6">
                    <img src={trek.coverPhoto} className="w-16 h-16 rounded-xl object-cover" alt="" />
                    <div>
                      <p className="font-bold text-stone-900">{trek.name}</p>
                      <p className="text-sm text-stone-500">{selectedDepData && `${new Date(selectedDepData.startDate).toLocaleDateString()} - ${new Date(selectedDepData.endDate).toLocaleDateString()}`}</p>
                      {travelers > 1 && (
                        <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1"><Users className="w-3 h-3" /> {travelers} travelers</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mb-5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                      Your details
                      {contact.name && contact.email && (
                        <span className="text-emerald-600 font-medium normal-case tracking-normal">— pre-filled by Altia</span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="Full name"
                      value={contact.name}
                      onChange={(e) => setContact(c => ({ ...c, name: e.target.value }))}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition-all placeholder:text-stone-400"
                    />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={contact.email}
                      onChange={(e) => setContact(c => ({ ...c, email: e.target.value }))}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition-all placeholder:text-stone-400"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (optional)"
                      value={contact.phone}
                      onChange={(e) => setContact(c => ({ ...c, phone: e.target.value }))}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-400 transition-all placeholder:text-stone-400"
                    />
                  </div>

                  <div className="bg-stone-50 rounded-2xl p-4 mb-6 border border-stone-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-stone-600 text-sm">Total Amount</span>
                      <span className="font-bold text-lg text-stone-900">₹{totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-full">
                      <ShieldCheck className="w-3 h-3" /> Ready for final safety check
                    </div>
                  </div>

                  <button
                    onClick={handleCheckout}
                    disabled={!contactComplete}
                    className="w-full bg-stone-950 text-white font-semibold py-4 rounded-2xl hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Pay via Razorpay
                  </button>
                  <p className="text-[11px] text-stone-400 text-center mt-3 leading-relaxed">
                    We hand off your name, email and phone to Razorpay's secure checkout — only the payment method itself is entered there, never on this page.
                  </p>
                </div>
              </>
            )}

            {checkoutStep === 'processing' && (
              <div className="p-12 text-center">
                <div className="w-12 h-12 border-4 border-stone-200 border-t-stone-900 rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold text-stone-900">Processing Payment...</h3>
                <p className="text-stone-500 text-sm mt-2">Waiting for gateway verification.</p>
              </div>
            )}

            {checkoutStep === 'rejected_fitness' && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-stone-900">Booking Blocked</h3>
                <p className="text-stone-600 mt-2 mb-6 text-sm leading-relaxed">
                  <strong>Safety Guardrail Triggered:</strong> {checkoutError}
                </p>
                <div className="bg-stone-50 rounded-xl p-4 mb-6 text-left border border-stone-200">
                  <p className="text-sm font-semibold text-stone-900 mb-2">Want to try a moderate trek?</p>
                  <Link to="/" onClick={() => setIsCheckoutOpen(false)} className="text-stone-900 font-bold hover:underline">
                    Explore all treks
                  </Link>
                </div>
                <button onClick={() => setIsCheckoutOpen(false)} className="w-full bg-stone-100 text-stone-900 font-semibold py-3 px-6 rounded-xl hover:bg-stone-200 transition-colors">
                  Close
                </button>
              </div>
            )}

            {checkoutStep === 'rejected_slots' && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-stone-900">Booking Blocked</h3>
                <p className="text-stone-600 mt-2 mb-6 text-sm leading-relaxed">
                  <strong>Availability Guardrail Triggered:</strong> {checkoutError}
                </p>
                <button onClick={() => { setIsCheckoutOpen(false); setCheckoutStep('summary'); }} className="w-full bg-stone-100 text-stone-900 font-semibold py-3 px-6 rounded-xl hover:bg-stone-200 transition-colors">
                  Choose Another Date
                </button>
              </div>
            )}

            {checkoutStep === 'rejected_other' && (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <X className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-stone-900">Booking Blocked</h3>
                <p className="text-stone-600 mt-2 mb-6 text-sm leading-relaxed">
                  <strong>Guardrail / Error:</strong> {checkoutError}
                </p>
                <button onClick={() => { setIsCheckoutOpen(false); setCheckoutStep('summary'); }} className="w-full bg-stone-100 text-stone-900 font-semibold py-3 px-6 rounded-xl hover:bg-stone-200 transition-colors">
                  Close
                </button>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-stone-900">Booking Confirmed</h3>
                <p className="text-stone-600 mt-2 mb-6">Your adventure awaits! Booking ID: #{finalBookingId}</p>
                <Link to="/bookings" onClick={() => setIsCheckoutOpen(false)} className="inline-block bg-stone-950 text-white font-semibold py-3 px-6 rounded-xl hover:bg-stone-800 transition-colors">
                  View My Bookings
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
