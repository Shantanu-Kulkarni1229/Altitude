import React, { useState } from 'react';
import { Search, SlidersHorizontal, Frown } from 'lucide-react';
import TrekCard from '../components/TrekCard';
import { treks } from '../data/treks';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');

  const filteredTreks = treks.filter(trek => {
    const matchesSearch = trek.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          trek.region.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'All' || trek.difficulty.toLowerCase() === difficultyFilter.toLowerCase();
    
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div className="bg-[#faf9f6] min-h-screen pb-20">
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[500px] flex flex-col justify-center items-center text-center px-4">
        <div className="absolute inset-0 bg-stone-900 overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=1600&auto=format&fit=crop&q=80" 
            alt="Mountain Landscape" 
            className="w-full h-full object-cover opacity-60"
          />
        </div>
        
        <div className="relative z-10 max-w-3xl w-full">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">Where to next?</h1>
          
          {/* Search/Filter Bar */}
          <div className="bg-white p-2 rounded-2xl shadow-xl flex flex-col md:flex-row gap-2 max-w-4xl mx-auto items-center">
            <div className="flex-1 flex items-center px-4 py-3 md:border-r border-stone-200 w-full">
              <Search className="w-5 h-5 text-stone-400 mr-3" />
              <input 
                type="text" 
                placeholder="Where do you want to trek?" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-stone-800 placeholder:text-stone-400"
              />
            </div>
            <div className="flex-1 flex items-center px-4 py-3 w-full group relative cursor-pointer hover:bg-stone-50 transition-colors rounded-lg md:rounded-none">
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
            <button className="bg-stone-900 hover:bg-stone-800 text-white p-4 rounded-xl w-full md:w-auto flex justify-center transition-colors">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* Trek Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-stone-900 mb-2">Explore the Himalayas</h2>
            <p className="text-stone-500">Curated treks for every experience level.</p>
          </div>
        </div>

        {filteredTreks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTreks.map(trek => (
              <TrekCard key={trek.id} trek={trek} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mb-4">
              <Frown className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-stone-900 mb-2">No treks found</h3>
            <p className="text-stone-500 max-w-md mx-auto mb-6">
              We couldn't find any treks matching your current filters. Try adjusting your search criteria or explore our popular moderate treks.
            </p>
            <button 
              onClick={() => { setSearchQuery(''); setDifficultyFilter('All'); }}
              className="bg-stone-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-stone-800 transition-colors"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
