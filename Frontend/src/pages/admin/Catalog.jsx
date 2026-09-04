import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExternalLink, ArrowUpDown } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../lib/api';
import KpiCard from '../../components/admin/KpiCard';
import { Mountain, MapPin, IndianRupee } from 'lucide-react';

const DIFFICULTY_CLS = {
  easy: 'bg-pine-100 text-pine-700',
  moderate: 'bg-brass-100 text-brass-600',
  hard: 'bg-flare-100 text-flare-700',
  extreme: 'bg-rust-100 text-rust-700'
};

export default function Catalog() {
  const [treks, setTreks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState('');
  const [sortBy, setSortBy] = useState('name');

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/v1/treks`)
      .then(({ data }) => setTreks(data.data))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    let out = difficulty ? treks.filter((t) => t.difficulty === difficulty) : treks;
    out = [...out].sort((a, b) => {
      if (sortBy === 'price') return a.basePrice - b.basePrice;
      if (sortBy === 'fitness') return a.minFitnessLevel - b.minFitnessLevel;
      return a.name.localeCompare(b.name);
    });
    return out;
  }, [treks, difficulty, sortBy]);

  const regions = new Set(treks.map((t) => t.region)).size;
  const avgPrice = treks.length ? Math.round(treks.reduce((s, t) => s + t.basePrice, 0) / treks.length) : 0;

  if (loading) return <div className="h-96 bg-paper-200 rounded-lg animate-pulse" />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <KpiCard index={0} icon={Mountain} tone="ink" label="Treks live" value={treks.length} />
        <KpiCard index={1} icon={MapPin} tone="pine" label="Regions covered" value={regions} />
        <KpiCard index={2} icon={IndianRupee} tone="seal" label="Average base price" value={`₹${avgPrice.toLocaleString()}`} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="bg-paper-50 border border-paper-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flare-500/40"
        >
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="moderate">Moderate</option>
          <option value="hard">Hard</option>
          <option value="extreme">Extreme</option>
        </select>
        <button
          onClick={() => setSortBy((s) => (s === 'name' ? 'price' : s === 'price' ? 'fitness' : 'name'))}
          className="flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900 bg-paper-50 border border-paper-300 px-3 py-2.5 rounded-lg transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5" /> Sort: {sortBy === 'name' ? 'Name' : sortBy === 'price' ? 'Price' : 'Min fitness'}
        </button>
      </div>

      <div className="bg-paper-50 border border-paper-300 rounded-lg shadow-sm shadow-canvas-950/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper-100 text-ink-500 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Trek</th>
                <th className="px-6 py-4">Region</th>
                <th className="px-6 py-4">Difficulty</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Min fitness</th>
                <th className="px-6 py-4">Base price</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200">
              {rows.map((t, i) => (
                <motion.tr
                  key={t.trekId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: Math.min(i, 10) * 0.02 }}
                  className="hover:bg-paper-100/60 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-ink-900">{t.name}</td>
                  <td className="px-6 py-4 text-ink-500">{t.region}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${DIFFICULTY_CLS[t.difficulty]}`}>{t.difficulty}</span>
                  </td>
                  <td className="px-6 py-4 text-ink-500 font-mono">{t.durationDays} days</td>
                  <td className="px-6 py-4 text-ink-500 font-mono">{t.minFitnessLevel}/10</td>
                  <td className="px-6 py-4 font-medium text-ink-900 font-mono tabular">₹{t.basePrice.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <Link to={`/trek/${t.trekId}`} target="_blank" className="flex items-center gap-1 text-[11px] font-semibold text-ink-400 hover:text-flare-600 transition-colors">
                      View live <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
