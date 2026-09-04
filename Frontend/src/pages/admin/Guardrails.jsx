import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldX, Gauge, Copy, Ban } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../lib/api';
import KpiCard from '../../components/admin/KpiCard';
import RejectionBarChart from '../../components/admin/RejectionBarChart';
import { TraceChips } from '../../components/admin/TraceModal';
import { GUARDRAIL_LEGEND, ACTOR_META } from '../../components/admin/auditFormat';
import AgentSeal from '../../components/logbook/AgentSeal';
import ThresholdGauge from '../../components/logbook/ThresholdGauge';

export default function Guardrails() {
  const [analytics, setAnalytics] = useState(null);
  const [rejected, setRejected] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE_URL}/api/v1/analytics/summary`),
      axios.get(`${API_BASE_URL}/api/v1/audit?decision=rejected&limit=100`)
    ]).then(([a, r]) => {
      setAnalytics(a.data.data);
      setRejected(r.data.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="h-96 bg-paper-200 rounded-lg animate-pulse" />;

  const totalRejections = Object.values(analytics.rejectionsBreakdown).reduce((s, n) => s + n, 0);
  const totalAttempts = analytics.totalBookings + totalRejections;
  const rejectionRatePct = totalAttempts > 0 ? Math.round((totalRejections / totalAttempts) * 100) : 0;

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-canvas-950 rounded-lg p-6 flex flex-wrap items-center gap-8">
        <div>
          <h2 className="text-sm font-semibold text-paper-50 flex items-center gap-2"><Gauge className="w-4 h-4 text-brass-400" /> Instrument panel</h2>
          <p className="text-xs text-canvas-400 mt-1 max-w-xs">Live readouts, not just counts — the needle leans toward red as a value nears the limit that would block a booking.</p>
        </div>
        <ThresholdGauge label="Rejection rate" value={rejectionRatePct} max={100} unit="%" dark />
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <KpiCard index={0} icon={ShieldX} tone="rust" label="Guardrail rejections" value={analytics.gracefulFailures.guardrailRejections} />
        <KpiCard index={1} icon={Ban} tone="brass" label="Rate-limited requests" value={analytics.gracefulFailures.rateLimited} />
        <KpiCard index={2} icon={Copy} tone="ink" label="Duplicate requests prevented" value={analytics.gracefulFailures.duplicatePrevented} />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-paper-50 rounded-lg border border-paper-300 shadow-sm shadow-canvas-950/[0.02] p-6">
        <h2 className="text-sm font-semibold text-ink-900 mb-4 flex items-center gap-2"><Gauge className="w-4 h-4 text-brass-500" /> What each guardrail checks</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {GUARDRAIL_LEGEND.map((g) => (
            <div key={g.label} className="border border-paper-200 rounded-lg p-3.5">
              <p className="text-sm font-semibold text-ink-900">{g.label}</p>
              <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">{g.desc}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {totalRejections > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-paper-50 rounded-lg border border-paper-300 shadow-sm shadow-canvas-950/[0.02] p-6">
          <h2 className="text-sm font-semibold text-ink-900 mb-1">Rejections by category</h2>
          <p className="text-xs text-ink-500 mb-5">Every blocked booking, broken down by which check stopped it.</p>
          <RejectionBarChart breakdown={analytics.rejectionsBreakdown} />
        </motion.div>
      )}

      <div className="bg-paper-50 rounded-lg border border-paper-300 shadow-sm shadow-canvas-950/[0.02] overflow-hidden">
        <div className="px-6 py-4 border-b border-paper-200 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-ink-400" />
          <h2 className="text-sm font-semibold text-ink-900">Recent blocked attempts</h2>
        </div>
        <div className="divide-y divide-paper-200">
          {rejected.length === 0 ? (
            <p className="text-center text-ink-400 text-sm py-14">Nothing's been blocked yet — the system is bounded, not busy.</p>
          ) : rejected.slice(0, 20).map((log, i) => {
            const actor = ACTOR_META[log.actor] || ACTOR_META.human;
            const ActorIcon = actor.icon;
            return (
              <motion.div
                key={log._id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(i, 8) * 0.03 }}
                className="px-6 py-4 flex items-start gap-3"
              >
                {log.actor === 'agent' ? (
                  <AgentSeal label="AI" className="shrink-0" />
                ) : (
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${actor.cls}`}><ActorIcon className="w-4 h-4" /></span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-ink-400 font-mono">{new Date(log.createdAt).toLocaleString()} · {actor.label}</p>
                  <p className="text-sm text-ink-800 mt-0.5">{log.reason}</p>
                  <TraceChips trace={log.trace} />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
