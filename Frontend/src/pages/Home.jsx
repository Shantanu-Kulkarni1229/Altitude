import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Search, Frown, ShieldCheck } from 'lucide-react';
import TrekCard from '../components/TrekCard';
import WaypointStamp from '../components/logbook/WaypointStamp';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

const gridContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } }
};
const gridItem = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }
};

const DIFFICULTIES = [
  { value: 'All', label: 'All levels' },
  { value: 'easy', label: 'Easy' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'hard', label: 'Hard' },
  { value: 'extreme', label: 'Extreme' }
];

// Real regions this catalog covers, plotted along the hero's route line.
// Clicking a waypoint is the primary way into the log below — it sets the
// region filter and scrolls straight to the matching entries.
const ROUTE_WAYPOINTS = [
  { label: 'Uttarakhand', x: 90, y: 58 },
  { label: 'Himachal Pradesh', x: 230, y: 30 },
  { label: 'Ladakh', x: 360, y: 74 },
  { label: 'Sikkim', x: 500, y: 26 },
  { label: 'Nepal Himalayas', x: 630, y: 62 }
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState(null);
  const [treks, setTreks] = useState([]);
  const [loading, setLoading] = useState(true);
  const logRef = useRef(null);

  useEffect(() => {
    const fetchTreks = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/v1/treks`);
        setTreks(response.data.data);
      } catch (error) {
        console.error('Error fetching treks:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTreks();
  }, []);

  const selectWaypoint = (region) => {
    setRegionFilter((prev) => (prev === region ? null : region));
    logRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const filteredTreks = treks.filter(trek => {
    const matchesSearch = trek.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          trek.region.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'All' || trek.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
    const matchesRegion = !regionFilter || trek.region === regionFilter;

    return matchesSearch && matchesDifficulty && matchesRegion;
  });

  return (
    <div className="bg-canvas-950 min-h-screen">
      {/* Hero — a real expedition photo, dark-graded to match the canvas ground
          it fades into below. Waypoint stamps are the primary action; search
          is a quiet fallback. */}
      <section className="relative bg-canvas-950 overflow-hidden px-4 pt-16 pb-14 md:pt-20 md:pb-20">
        <motion.img
          initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          src="https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=1600&auto=format&fit=crop&q=80"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* TODO: swap the src above for the user-supplied hero photo when provided */}
        <div className="absolute inset-0 bg-canvas-950/70" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-canvas-950" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '18px 18px' }} />

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="font-display text-6xl md:text-8xl font-bold text-paper-50 mb-3 tracking-tight leading-[0.95]"
          >
            Plot your route.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="text-canvas-300 text-lg mb-4 max-w-xl mx-auto"
          >
            Himalayan treks matched to your fitness, budget, and ambition — every waypoint logged, checked, and booked in minutes.
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-canvas-500 text-xs font-mono mb-10"
          >
            tap a waypoint to jump into that region's log
          </motion.p>

          {/* The route line — real region waypoints, the primary interaction */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.3 }}
            className="relative hidden md:block h-28 max-w-3xl mx-auto mb-8"
          >
            <svg className="route-line absolute inset-0 w-full h-full" viewBox="0 0 720 100" preserveAspectRatio="none" fill="none" aria-hidden="true">
              <path
                d="M 20 60 C 90 30, 160 85, 230 40 S 340 20, 360 74 S 470 15, 500 26 S 600 90, 630 62 S 690 40, 700 55"
                stroke="var(--color-canvas-500)" strokeWidth="1.5" strokeLinecap="round" style={{ '--route-length': 900 }}
              />
            </svg>
            {ROUTE_WAYPOINTS.map((wp, i) => {
              const active = regionFilter === wp.label;
              return (
                <motion.button
                  key={wp.label}
                  type="button"
                  onClick={() => selectWaypoint(wp.label)}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.94 }}
                  initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.9 + i * 0.12, type: 'spring', stiffness: 300, damping: 18 }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 cursor-pointer group"
                  style={{ left: `${(wp.x / 720) * 100}%`, top: `${(wp.y / 100) * 100}%` }}
                >
                  <WaypointStamp
                    n={i + 1}
                    tone={active ? 'flare' : 'canvas'}
                    size={active ? 'lg' : 'md'}
                    rotate={i % 2 === 0 ? -6 : 6}
                    className="transition-all group-hover:brightness-125"
                  />
                  <span className={`text-[11px] font-mono whitespace-nowrap transition-colors ${active ? 'text-flare-400 font-semibold' : 'text-canvas-400 group-hover:text-paper-200'}`}>{wp.label}</span>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Search — a quiet fallback, not the primary CTA */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto items-center"
          >
            <div className="flex-1 flex items-center bg-canvas-900 border border-canvas-700 rounded-full px-3.5 py-2 w-full">
              <Search className="w-3.5 h-3.5 text-canvas-500 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="Or search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-paper-100 placeholder:text-canvas-500 text-sm"
              />
            </div>
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="bg-canvas-900 border border-canvas-700 rounded-full px-3.5 py-2 text-sm text-canvas-300 outline-none cursor-pointer w-full sm:w-auto"
            >
              {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-canvas-300 text-sm font-mono tabular"
          >
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-pine-400" /> {treks.length || '25'} routes logged</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-pine-400" /> Every booking guardrail-checked</span>
          </motion.div>
        </div>
      </section>

      {/* Waypoint log — a dark expedition table with the trek entries laid on it like cards on a desk */}
      <section ref={logRef} className="bg-canvas-950 pt-12 pb-16 scroll-mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-between items-end gap-3 mb-8">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-paper-50 mb-1 tracking-tight">Waypoint log</h2>
              <p className="text-canvas-400">
                {regionFilter ? <>Entries for <span className="text-flare-400 font-medium">{regionFilter}</span>.</> : 'Every route currently open for booking.'}
              </p>
            </div>
            {regionFilter && (
              <button
                onClick={() => setRegionFilter(null)}
                className="text-xs font-semibold text-canvas-300 hover:text-paper-50 border border-canvas-700 hover:border-canvas-500 rounded-full px-3 py-1.5 transition-colors"
              >
                Clear region
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-paper-50 rounded-lg border border-canvas-800 overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-paper-200" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-paper-200 rounded w-3/4" />
                    <div className="h-3 bg-paper-200 rounded w-1/2" />
                    <div className="h-4 bg-paper-200 rounded w-1/3 mt-4" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTreks.length > 0 ? (
            <motion.div
              key={`${searchQuery}-${difficultyFilter}-${regionFilter}`}
              variants={gridContainer}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredTreks.map((trek, i) => (
                <motion.div key={trek.trekId} variants={gridItem}>
                  <TrekCard trek={trek} index={i} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-canvas-900 rounded-lg border border-dashed border-canvas-700 p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-canvas-800 text-canvas-400 rounded-full flex items-center justify-center mb-4">
                <Frown className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-paper-50 mb-2 font-display">No routes found</h3>
              <p className="text-canvas-400 max-w-md mx-auto mb-6">
                We couldn't find any treks matching your current filters. Try adjusting your search criteria, or ask Altia — they'll find you something you'll love.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setDifficultyFilter('All'); setRegionFilter(null); }}
                className="bg-flare-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-flare-600 transition-colors"
              >
                Clear filters
              </button>
            </motion.div>
          )}
        </div>
      </section>
    </div>
  );
}
