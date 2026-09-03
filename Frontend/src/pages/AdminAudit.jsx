import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldAlert, Bot, User, Check, X, TrendingUp, AlertTriangle, ShieldX, Sparkles,
  Search, RefreshCw, Download, ChevronDown, Info, Clock3, Route, Radio, Gauge, Users2
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

const REJECTION_CATEGORIES = [
  { key: 'fitness', label: 'Fitness' },
  { key: 'slots', label: 'Slot availability' },
  { key: 'budget', label: 'Budget' },
  { key: 'addonCap', label: 'Add-on cap' },
  { key: 'other', label: 'Other' }
];

const ACTION_LABELS = {
  signal_extraction: 'Understood request',
  trek_recommendation: 'Recommended a trek',
  sales_pivot: 'Pivoted to alternative',
  trek_info_request: 'Answered a question',
  campaign_nudge: 'Proactive nudge',
  booking_attempt: 'Booking attempt',
  payment_verification: 'Payment verification',
  webhook_verification: 'Webhook payment confirmation',
  booking_cancellation: 'Booking cancelled',
  booking_expiry: 'Reservation expired',
  payment_creation: 'Payment order creation',
  ai_chat_attempt: 'AI chat (fallback)',
  rate_limit: 'Rate limit triggered'
};
const actionLabel = (action) => ACTION_LABELS[action] || (action || '').replace(/_/g, ' ');

const ACTOR_META = {
  agent: { label: 'API Agent', icon: Bot, cls: 'text-indigo-600 bg-indigo-50' },
  system: { label: 'System Core', icon: AlertTriangle, cls: 'text-stone-600 bg-stone-100' },
  human: { label: 'Human (Web)', icon: User, cls: 'text-stone-600 bg-stone-100' }
};

const DECISION_META = {
  approved: { label: 'Approved', icon: Check, cls: 'text-emerald-600' },
  processed: { label: 'AI Reasoning', icon: Sparkles, cls: 'text-blue-600' },
  fallback: { label: 'Fallback', icon: AlertTriangle, cls: 'text-amber-600' },
  rejected: { label: 'Blocked', icon: X, cls: 'text-rose-600' }
};

const GUARDRAIL_LEGEND = [
  { label: 'Fitness', desc: "Blocks a booking if the traveler's stated fitness is below the trek's minimum." },
  { label: 'Add-on cap', desc: 'Blocks add-on spend above 25% of the trek base price, per person.' },
  { label: 'Budget', desc: "Blocks a booking that exceeds the customer's stated per-person budget." },
  { label: 'Slot availability', desc: 'Atomic check — a race for the last seat can never over-book.' },
  { label: 'Rate limit', desc: 'Caps chat requests per IP; logged, not just silently dropped.' }
];

// Sequential, single-hue horizontal bar chart — rose because these are
// guardrail rejections, matching the "Blocked" color already used in the
// audit table below. Magnitude comparison across a handful of categories:
// one hue, more-is-longer, sorted descending, value labeled at the tip.
function RejectionBarChart({ breakdown }) {
  const data = useMemo(() => {
    return REJECTION_CATEGORIES
      .map((c) => ({ ...c, value: breakdown[c.key] || 0 }))
      .sort((a, b) => b.value - a.value);
  }, [breakdown]);

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div
          key={d.key}
          className="flex items-center gap-3"
          title={`${d.value} booking${d.value === 1 ? '' : 's'} blocked by the ${d.label.toLowerCase()} guardrail`}
        >
          <span className="w-32 shrink-0 text-sm text-stone-600">{d.label}</span>
          <div className="flex-1 h-5 bg-rose-50 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${Math.max((d.value / max) * 100, d.value > 0 ? 3 : 0)}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-sm font-semibold text-stone-900 text-right tabular-nums">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

// Part-to-whole, two categories, categorical color (emerald=agent-assisted
// revenue matches the "AI Reasoning"/agent color used elsewhere; stone=human)
// — the direct visual evidence for "AI grows revenue", not just "AI exists".
function RevenueSplitBar({ bySource }) {
  const humanRev = bySource.human.revenue;
  const agentRev = bySource.agent.revenue;
  const total = humanRev + agentRev;
  const agentPct = total > 0 ? Math.round((agentRev / total) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between text-xs font-medium text-stone-500 mb-2">
        <span>Human checkout — ₹{humanRev.toLocaleString()} ({bySource.human.bookings})</span>
        <span>AI concierge — ₹{agentRev.toLocaleString()} ({bySource.agent.bookings})</span>
      </div>
      <div className="h-4 rounded-full overflow-hidden bg-stone-100 flex">
        <div className="h-full bg-stone-400 transition-all duration-700" style={{ width: `${100 - agentPct}%` }} />
        <div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${agentPct}%` }} />
      </div>
      <p className="text-xs text-stone-500 mt-2">
        <strong className="text-indigo-600">{agentPct}%</strong> of confirmed revenue was sourced by the AI concierge, not the plain web checkout.
      </p>
    </div>
  );
}

function TraceChips({ trace }) {
  if (!trace || trace.length === 0) return null;
  return (
    <div className="mt-2 text-xs flex gap-1.5 flex-wrap">
      {trace.map((t, idx) => (
        <span key={idx} className={`px-1.5 py-0.5 rounded-md ${t.passed ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100 font-semibold'}`}>
          {t.check}: {t.passed ? 'Pass' : 'Fail'}
        </span>
      ))}
    </div>
  );
}

function DetailToggle({ detail }) {
  const [open, setOpen] = useState(false);
  if (!detail || Object.keys(detail).length === 0) return null;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] font-medium text-stone-400 hover:text-stone-700 flex items-center gap-1 transition-colors"
      >
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        {open ? 'Hide' : 'Show'} technical detail
      </button>
      {open && (
        <pre className="mt-1.5 bg-stone-950 text-emerald-300 text-[11px] rounded-lg p-3 overflow-x-auto max-w-md">
          {JSON.stringify(detail, null, 2)}
        </pre>
      )}
    </div>
  );
}

// Full conversation-to-payment journey for one correlationId, chronological —
// this is "explainable" made literal: one customer's whole story, start to finish.
function TraceModal({ correlationId, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/v1/audit?correlationId=${encodeURIComponent(correlationId)}`)
      .then(({ data }) => setLogs([...data.data].reverse()))
      .finally(() => setLoading(false));
  }, [correlationId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-stone-100 flex justify-between items-start shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0">
              <Route className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">Full journey trace</h3>
              <p className="text-[11px] text-stone-400 font-mono">{correlationId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full p-1.5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <p className="text-center text-stone-400 text-sm py-10">Loading trace...</p>
          ) : logs.length === 0 ? (
            <p className="text-center text-stone-400 text-sm py-10">No events found for this id.</p>
          ) : (
            <div className="space-y-6 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
              {logs.map((log) => {
                const meta = DECISION_META[log.decision] || DECISION_META.approved;
                const Icon = meta.icon;
                return (
                  <div key={log._id} className="relative pl-10">
                    <div className={`absolute left-0 top-0 w-8 h-8 rounded-full border-4 border-white flex items-center justify-center shrink-0 shadow-sm z-10 ${meta.cls} bg-white`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-[11px] text-stone-400 mb-0.5">{new Date(log.createdAt).toLocaleString()} · {actionLabel(log.action)}</p>
                    <p className="text-sm font-medium text-stone-900">{log.reason}</p>
                    <TraceChips trace={log.trace} />
                    <DetailToggle detail={log.detail} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [traceId, setTraceId] = useState(null);

  const [actorFilter, setActorFilter] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('');
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(200);

  const fetchAll = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (actorFilter) params.set('actor', actorFilter);
      if (decisionFilter) params.set('decision', decisionFilter);

      const [logsRes, analyticsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/v1/audit?${params.toString()}`),
        axios.get(`${API_BASE_URL}/api/v1/analytics/summary`)
      ]);
      setLogs(logsRes.data.data);
      setAnalytics(analyticsRes.data.data);
    } catch (error) {
      console.error('Error fetching audit data:', error);
    } finally {
      setLoading(false);
    }
  }, [actorFilter, decisionFilter, limit]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => fetchAll(true), 8000);
    return () => clearInterval(id);
  }, [live, fetchAll]);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter((l) => l.reason.toLowerCase().includes(q) || actionLabel(l.action).toLowerCase().includes(q));
  }, [logs, search]);

  const exportCsv = () => {
    const rows = [['Time', 'Actor', 'Action', 'Decision', 'Outcome', 'Amount', 'Reason', 'CorrelationId']];
    filteredLogs.forEach((l) => rows.push([
      new Date(l.createdAt).toISOString(), l.actor, actionLabel(l.action), l.decision, l.outcome,
      l.amount ?? '', `"${(l.reason || '').replace(/"/g, '""')}"`, l.correlationId || ''
    ]));
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `altitude-audit-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalRejections = analytics
    ? Object.values(analytics.rejectionsBreakdown).reduce((sum, n) => sum + n, 0)
    : 0;

  return (
    <div className="bg-stone-50 min-h-screen pb-24 pt-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-stone-900 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Safety System Audit Log</h1>
              <p className="text-stone-500 text-sm">Immutable record of every booking decision, AI reasoning step, and guardrail intervention.</p>
            </div>
          </div>
          <button
            onClick={() => setShowLegend((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-900 bg-white border border-stone-200 px-3 py-2 rounded-xl transition-colors"
          >
            <Info className="w-3.5 h-3.5" /> What do the guardrails check?
          </button>
        </div>

        {showLegend && (
          <div className="mb-8 bg-white rounded-2xl border border-stone-200 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {GUARDRAIL_LEGEND.map((g) => (
              <div key={g.label}>
                <p className="text-sm font-semibold text-stone-900">{g.label}</p>
                <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{g.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* KPI row */}
        {analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm shadow-stone-900/[0.02] flex items-center gap-4">
              <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-xl shrink-0"><TrendingUp className="w-5 h-5" /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total revenue</p>
                <p className="text-xl font-bold text-stone-900 truncate">₹{analytics.totalRevenue.toLocaleString()}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm shadow-stone-900/[0.02] flex items-center gap-4">
              <div className="bg-stone-100 text-stone-600 p-2.5 rounded-xl shrink-0"><Check className="w-5 h-5" /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Confirmed bookings</p>
                <p className="text-xl font-bold text-stone-900">{analytics.totalBookings}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm shadow-stone-900/[0.02] flex items-center gap-4">
              <div className="bg-indigo-100 text-indigo-600 p-2.5 rounded-xl shrink-0"><Bot className="w-5 h-5" /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">AI-sourced bookings</p>
                <p className="text-xl font-bold text-stone-900">{analytics.bySource.agent.bookings}</p>
              </div>
            </div>
            <button
              onClick={() => setDecisionFilter('rejected')}
              className="text-left bg-white p-5 rounded-2xl border border-stone-200 shadow-sm shadow-stone-900/[0.02] flex items-center gap-4 hover:border-rose-300 transition-colors"
            >
              <div className="bg-rose-100 text-rose-600 p-2.5 rounded-xl shrink-0"><ShieldX className="w-5 h-5" /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Guardrail blocks</p>
                <p className="text-xl font-bold text-stone-900">{totalRejections}</p>
              </div>
            </button>
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm shadow-stone-900/[0.02] flex items-center gap-4" title="Guardrail rejections + rate limits + duplicate-request protection — every failure this system absorbed cleanly instead of erroring out.">
              <div className="bg-amber-100 text-amber-600 p-2.5 rounded-xl shrink-0"><Gauge className="w-5 h-5" /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Failures handled gracefully</p>
                <p className="text-xl font-bold text-stone-900">{analytics.gracefulFailures.total}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm shadow-stone-900/[0.02] flex items-center gap-4">
              <div className="bg-blue-100 text-blue-600 p-2.5 rounded-xl shrink-0"><Sparkles className="w-5 h-5" /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">AI reasoning events</p>
                <p className="text-xl font-bold text-stone-900">{analytics.aiReasoningEvents}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {analytics && (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm shadow-stone-900/[0.02] p-6">
              <h2 className="text-sm font-semibold text-stone-900 mb-1 flex items-center gap-1.5"><Users2 className="w-4 h-4 text-indigo-500" /> Revenue: human vs. AI concierge</h2>
              <p className="text-xs text-stone-500 mb-5">Who's actually closing the sale.</p>
              <RevenueSplitBar bySource={analytics.bySource} />
            </div>
          )}

          {analytics && totalRejections > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm shadow-stone-900/[0.02] p-6">
              <h2 className="text-sm font-semibold text-stone-900 mb-1">Guardrail rejections by category</h2>
              <p className="text-xs text-stone-500 mb-5">Every blocked booking, broken down by which check stopped it.</p>
              <RejectionBarChart breakdown={analytics.rejectionsBreakdown} />
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm shadow-stone-900/[0.02] p-4 mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reasons..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          </div>
          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            <option value="">All actors</option>
            <option value="human">Human (Web)</option>
            <option value="agent">API Agent</option>
            <option value="system">System Core</option>
          </select>
          <select
            value={decisionFilter}
            onChange={(e) => setDecisionFilter(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
          >
            <option value="">All decisions</option>
            <option value="approved">Approved</option>
            <option value="rejected">Blocked</option>
            <option value="processed">AI reasoning</option>
            <option value="fallback">Fallback</option>
          </select>
          <button
            onClick={() => setLive((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-xl border transition-colors ${live ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-stone-200 text-stone-500 hover:text-stone-900'}`}
          >
            <Radio className={`w-3.5 h-3.5 ${live ? 'animate-pulse' : ''}`} /> {live ? 'Live' : 'Go live'}
          </button>
          <button onClick={() => fetchAll()} className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 bg-white border border-stone-200 px-3 py-2.5 rounded-xl transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button onClick={exportCsv} className="flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 bg-white border border-stone-200 px-3 py-2.5 rounded-xl transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl shadow-sm shadow-stone-900/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-stone-500 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Decision</th>
                  <th className="px-6 py-4">Reason & Trace</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr><td colSpan="6" className="text-center py-14 text-stone-400 text-sm">Loading audit trail...</td></tr>
                ) : filteredLogs.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-14 text-stone-400 text-sm">No matching activity — try clearing filters, or book a trek to populate the audit trail.</td></tr>
                ) : filteredLogs.map(log => {
                  const actor = ACTOR_META[log.actor] || ACTOR_META.human;
                  const decision = DECISION_META[log.decision] || DECISION_META.rejected;
                  const ActorIcon = actor.icon;
                  const DecisionIcon = decision.icon;
                  return (
                    <tr key={log._id} className="hover:bg-stone-50/60 transition-colors align-top">
                      <td className="px-6 py-4 text-stone-500 whitespace-nowrap text-xs">
                        <span className="flex items-center gap-1"><Clock3 className="w-3 h-3" /> {new Date(log.createdAt).toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${actor.cls}`}>
                          <ActorIcon className="w-3.5 h-3.5" /> {actor.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-stone-900 capitalize">{actionLabel(log.action)}</p>
                        {log.amount != null && <p className="text-stone-500 text-xs mt-0.5">₹{log.amount.toLocaleString()}</p>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`flex items-center gap-1 font-medium ${decision.cls}`}>
                          <DecisionIcon className="w-4 h-4" /> {decision.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-stone-600 max-w-md">
                        <p className="font-medium text-stone-800">{log.reason}</p>
                        <TraceChips trace={log.trace} />
                        <DetailToggle detail={log.detail} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {log.correlationId && (
                          <button
                            onClick={() => setTraceId(log.correlationId)}
                            className="flex items-center gap-1 text-[11px] font-semibold text-stone-400 hover:text-emerald-600 transition-colors"
                          >
                            <Route className="w-3.5 h-3.5" /> Trace
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!loading && logs.length >= limit && (
            <div className="p-4 border-t border-stone-100 text-center">
              <button
                onClick={() => setLimit((l) => l + 200)}
                className="text-xs font-semibold text-stone-500 hover:text-stone-900"
              >
                Load more
              </button>
            </div>
          )}
        </div>

      </div>

      {traceId && <TraceModal correlationId={traceId} onClose={() => setTraceId(null)} />}
    </div>
  );
}
