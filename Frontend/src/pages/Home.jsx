import React, { useState, useEffect } from 'react';
import { Search, Frown, Sparkles, ShieldCheck, Bot } from 'lucide-react';
import TrekCard from '../components/TrekCard';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [treks, setTreks] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const filteredTreks = treks.filter(trek => {
    const matchesSearch = trek.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          trek.region.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'All' || trek.difficulty.toLowerCase() === difficultyFilter.toLowerCase();

    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="bg-[#faf9f6] min-h-screen pb-24">
      {/* Hero Section */}
      <section className="relative min-h-[560px] flex flex-col justify-center items-center text-center px-4 py-24">
        <div className="absolute inset-0 bg-stone-950 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=1600&auto=format&fit=crop&q=80"
            alt="Mountain Landscape"
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-stone-950/10" />
        </div>

        <div className="relative z-10 max-w-3xl w-full">
          <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/20 backdrop-blur-md text-white/90 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <Bot className="w-3.5 h-3.5" />
            Booked by an AI concierge, guarded by real safety checks
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">Where to next?</h1>
          <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">Curated Himalayan treks, matched to your fitness, budget, and ambition — booked in minutes.</p>

          {/* Search/Filter Bar */}
          <div className="bg-white p-2 rounded-2xl shadow-2xl shadow-black/30 flex flex-col md:flex-row gap-2 max-w-4xl mx-auto items-center">
            <div className="flex-1 flex items-center px-4 py-3 md:border-r border-stone-200 w-full">
              <Search className="w-5 h-5 text-stone-400 mr-3 shrink-0" />
              <input
                type="text"
                placeholder="Where do you want to trek?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-stone-800 placeholder:text-stone-400"
              />
            </div>
            <div className="flex-1 flex items-center px-4 py-3 w-full group relative cursor-pointer hover:bg-stone-50 transition-colors rounded-xl md:rounded-none">
              <div className="flex flex-col w-full">
                <span className="text-xs font-semibold text-stone-500 uppercase">Difficulty</span>
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="bg-transparent border-none outline-none text-stone-900 cursor-pointer appearance-none w-full"
                >
                  <option value="All">All levels</option>
                  <option value="easy">Easy</option>
                  <option value="moderate">Moderate</option>
                  <option value="hard">Hard</option>
                  <option value="extreme">Extreme</option>
                </select>
              </div>
            </div>
            <button className="bg-stone-950 hover:bg-stone-800 text-white p-4 rounded-xl w-full md:w-auto flex justify-center transition-colors">
              <Search className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8 text-white/70 text-sm">
            <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> {treks.length || '10+'} curated routes</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Every booking guardrail-checked</span>
          </div>
        </div>
      </section>

      {/* Trek Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-2 tracking-tight">Explore the Himalayas</h2>
            <p className="text-stone-500">Curated treks for every experience level.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-stone-100" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-stone-100 rounded w-3/4" />
                  <div className="h-3 bg-stone-100 rounded w-1/2" />
                  <div className="h-4 bg-stone-100 rounded w-1/3 mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredTreks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTreks.map(trek => (
              <TrekCard key={trek.trekId} trek={trek} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mb-4">
              <Frown className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">No treks found</h3>
            <p className="text-stone-500 max-w-md mx-auto mb-6">
              We couldn't find any treks matching your current filters. Try adjusting your search criteria, or ask Altia — they'll find you something you'll love.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setDifficultyFilter('All'); }}
              className="bg-stone-950 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-stone-800 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
