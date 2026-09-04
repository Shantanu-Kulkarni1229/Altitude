import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Check, Bot, ShieldX, Gauge, Sparkles, Users2, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../lib/api';
import KpiCard from '../../components/admin/KpiCard';
import RevenueSplitBar from '../../components/admin/RevenueSplitBar';
import RejectionBarChart from '../../components/admin/RejectionBarChart';
import { ACTOR_META, DECISION_META, actionLabel } from '../../components/admin/auditFormat';
import AgentSeal from '../../components/logbook/AgentSeal';

export default function Overview() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE_URL}/api/v1/analytics/summary`),
      axios.get(`${API_BASE_URL}/api/v1/audit?limit=6`)
    ]).then(([a, l]) => {
      setAnalytics(a.data.data);
      setRecent(l.data.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-[76px] bg-paper-200 rounded-lg" />)}
        </div>
        <div className="h-48 bg-paper-200 rounded-lg" />
      </div>
    );
  }

  const totalRejections = Object.values(analytics.rejectionsBreakdown).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <KpiCard index={0} icon={TrendingUp} tone="pine" label="Total revenue" value={`₹${analytics.totalRevenue.toLocaleString()}`} />
        <KpiCard index={1} icon={Check} tone="ink" label="Confirmed bookings" value={analytics.totalBookings} />
        <KpiCard index={2} icon={Bot} tone="seal" label="AI-sourced bookings" value={analytics.bySource.agent.bookings} />
        <KpiCard
          index={3} icon={ShieldX} tone="rust" label="Guardrail blocks" value={totalRejections}
          as="button" onClick={() => navigate('/admin/audit?decision=rejected')} hint="Jump to blocked bookings in the Audit Trail"
        />
        <KpiCard
          index={4} icon={Gauge} tone="brass" label="Failures handled gracefully" value={analytics.gracefulFailures.total}
          hint="Guardrail rejections + rate limits + duplicate-request protection — every failure this system absorbed cleanly."
        />
        <KpiCard index={5} icon={Sparkles} tone="flare" label="AI reasoning events" value={analytics.aiReasoningEvents} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-paper-50 rounded-lg border border-paper-300 shadow-sm shadow-canvas-950/[0.02] p-6">
          <h2 className="text-sm font-semibold text-ink-900 mb-1 flex items-center gap-1.5"><Users2 className="w-4 h-4 text-seal-600" /> Revenue: human vs. AI concierge</h2>
          <p className="text-xs text-ink-500 mb-5">Who's actually closing the sale.</p>
          <RevenueSplitBar bySource={analytics.bySource} />
        </motion.div>

        {totalRejections > 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-paper-50 rounded-lg border border-paper-300 shadow-sm shadow-canvas-950/[0.02] p-6">
            <h2 className="text-sm font-semibold text-ink-900 mb-1">Guardrail rejections by category</h2>
            <p className="text-xs text-ink-500 mb-5">Every blocked booking, broken down by which check stopped it.</p>
            <RejectionBarChart breakdown={analytics.rejectionsBreakdown} />
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-paper-50 rounded-lg border border-paper-300 shadow-sm shadow-canvas-950/[0.02] p-6 flex flex-col items-center justify-center text-center">
            <ShieldX className="w-8 h-8 text-paper-300 mb-2" />
            <p className="text-sm font-medium text-ink-700">No guardrail rejections yet</p>
            <p className="text-xs text-ink-400 mt-1">This fills in the moment a booking gets blocked.</p>
          </motion.div>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-paper-50 rounded-lg border border-paper-300 shadow-sm shadow-canvas-950/[0.02] overflow-hidden">
        <div className="px-6 py-4 border-b border-paper-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-900">Recent activity</h2>
          <Link to="/admin/audit" className="text-xs font-semibold text-ink-500 hover:text-ink-900 flex items-center gap-1">
            View full audit trail <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-paper-200">
          {recent.length === 0 ? (
            <p className="text-center text-ink-400 text-sm py-10">No activity yet — book a trek to populate the dashboard.</p>
          ) : recent.map((log) => {
            const actor = ACTOR_META[log.actor] || ACTOR_META.human;
            const decision = DECISION_META[log.decision] || DECISION_META.rejected;
            const ActorIcon = actor.icon;
            return (
              <div key={log._id} className="px-6 py-3.5 flex items-center gap-3">
                {log.actor === 'agent' ? (
                  <AgentSeal label="AI" className="shrink-0" />
                ) : (
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${actor.cls}`}><ActorIcon className="w-4 h-4" /></span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-800 truncate"><span className="font-medium">{actionLabel(log.action)}</span> — {log.reason}</p>
                  <p className="text-[11px] text-ink-400 font-mono">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
                <span className={`text-xs font-medium shrink-0 ${decision.cls}`}>{decision.label}</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
