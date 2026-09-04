import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Compass, Route as RouteIcon, HelpCircle, Bell, ShoppingBag } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../lib/api';
import KpiCard from '../../components/admin/KpiCard';
import { TraceChips, DetailToggle } from '../../components/admin/TraceModal';

const EVENT_META = {
  signal_extraction: { label: 'Understood request', icon: Sparkles, cls: 'text-ink-600 bg-paper-200' },
  trek_recommendation: { label: 'Recommended a trek', icon: Compass, cls: 'text-pine-700 bg-pine-50' },
  sales_pivot: { label: 'Pivoted to alternative', icon: RouteIcon, cls: 'text-brass-600 bg-brass-100' },
  trek_info_request: { label: 'Answered a question', icon: HelpCircle, cls: 'text-seal-600 bg-seal-100' },
  campaign_nudge: { label: 'Proactive nudge', icon: Bell, cls: 'text-flare-600 bg-flare-50' }
};
const REASONING_ACTIONS = Object.keys(EVENT_META);

export default function AgentActivity() {
  const [logs, setLogs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE_URL}/api/v1/audit?actor=agent&limit=300`),
      axios.get(`${API_BASE_URL}/api/v1/audit?actor=agent&decision=approved&limit=300`)
    ]).then(([all, approved]) => {
      setLogs(all.data.data.filter((l) => REASONING_ACTIONS.includes(l.action)));
      setBookings(approved.data.data.filter((l) => l.action === 'booking_attempt'));
    }).finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c = { signal_extraction: 0, trek_recommendation: 0, sales_pivot: 0, trek_info_request: 0, campaign_nudge: 0 };
    logs.forEach((l) => { if (c[l.action] !== undefined) c[l.action] += 1; });
    return c;
  }, [logs]);

  const agentRevenue = bookings.reduce((s, b) => s + (b.amount || 0), 0);
  const filtered = filter === 'all' ? logs : logs.filter((l) => l.action === filter);

  if (loading) {
    return <div className="h-96 bg-paper-200 rounded-lg animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard index={0} icon={ShoppingBag} tone="ink" label="Bookings" hint="Agent bookings" value={bookings.length} />
        <KpiCard index={1} icon={Sparkles} tone="seal" label="Understood" hint="Requests understood" value={counts.signal_extraction} />
        <KpiCard index={2} icon={Compass} tone="pine" label="Recommended" hint="Treks recommended" value={counts.trek_recommendation} />
        <KpiCard index={3} icon={RouteIcon} tone="brass" label="Pivots" hint="Sales pivots" value={counts.sales_pivot} />
        <KpiCard index={4} icon={HelpCircle} tone="seal" label="Answered" hint="Questions answered" value={counts.trek_info_request} />
        <KpiCard index={5} icon={Bell} tone="flare" label="Nudges" hint="Proactive nudges" value={counts.campaign_nudge} />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-paper-50 rounded-lg border border-paper-300 p-5 flex items-center gap-3 text-sm">
        <ShoppingBag className="w-4 h-4 text-ink-400 shrink-0" />
        <p className="text-ink-600">Altia has independently closed <strong className="text-ink-900 font-mono">₹{agentRevenue.toLocaleString()}</strong> in bookings, each one reserved through the exact same guardrails a human checkout goes through.</p>
      </motion.div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilter('all')} className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${filter === 'all' ? 'bg-canvas-950 text-white border-canvas-950' : 'bg-paper-50 text-ink-500 border-paper-300 hover:text-ink-900'}`}>All reasoning</button>
        {Object.entries(EVENT_META).map(([key, meta]) => (
          <button key={key} onClick={() => setFilter(key)} className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${filter === key ? 'bg-canvas-950 text-white border-canvas-950' : 'bg-paper-50 text-ink-500 border-paper-300 hover:text-ink-900'}`}>
            {meta.label}
          </button>
        ))}
      </div>

      <div className="bg-paper-50 rounded-lg border border-paper-300 shadow-sm shadow-canvas-950/[0.02] divide-y divide-paper-200">
        {filtered.length === 0 ? (
          <p className="text-center text-ink-400 text-sm py-14">No AI reasoning events yet — chat with Altia on the site to populate this feed.</p>
        ) : filtered.map((log, i) => {
          const meta = EVENT_META[log.action] || EVENT_META.signal_extraction;
          const Icon = meta.icon;
          return (
            <motion.div
              key={log._id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i, 8) * 0.03 }}
              className="px-6 py-4 flex items-start gap-3"
            >
              <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${meta.cls}`}><Icon className="w-4 h-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-ink-400 font-mono">{new Date(log.createdAt).toLocaleString()} · {meta.label}</p>
                <p className="text-sm text-ink-800 mt-0.5">{log.reason}</p>
                <TraceChips trace={log.trace} />
                <DetailToggle detail={log.detail} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
