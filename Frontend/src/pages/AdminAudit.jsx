import React, { useState, useEffect, useMemo } from 'react';
import { ShieldAlert, Bot, User, Check, X, TrendingUp, AlertTriangle, ShieldX, Sparkles } from 'lucide-react';
import axios from 'axios';

const REJECTION_CATEGORIES = [
  { key: 'fitness', label: 'Fitness' },
  { key: 'slots', label: 'Slot availability' },
  { key: 'budget', label: 'Budget' },
  { key: 'addonCap', label: 'Add-on cap' },
  { key: 'other', label: 'Other' }
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

export default function AdminAudit() {
  const [logs, setLogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        const [logsRes, analyticsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/v1/audit'),
          axios.get('http://localhost:5000/api/v1/analytics/summary')
        ]);
        setLogs(logsRes.data.data);
        setAnalytics(analyticsRes.data.data);
      } catch (error) {
        console.error('Error fetching audit data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAuditData();
  }, []);

  const aiSourcedBookings = logs.filter(
    (l) => l.actor === 'agent' && l.action === 'booking_attempt' && l.decision === 'approved'
  ).length;
  const totalRejections = analytics
    ? Object.values(analytics.rejectionsBreakdown).reduce((sum, n) => sum + n, 0)
    : 0;

  return (
    <div className="bg-stone-50 min-h-screen pb-24 pt-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex items-center gap-3 mb-8">
          <div className="w-11 h-11 rounded-2xl bg-stone-900 text-white flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Safety System Audit Log</h1>
            <p className="text-stone-500 text-sm">Immutable record of every booking decision, AI reasoning step, and guardrail intervention.</p>
          </div>
        </div>

        {/* KPI row */}
        {analytics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
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
                <p className="text-xl font-bold text-stone-900">{aiSourcedBookings}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm shadow-stone-900/[0.02] flex items-center gap-4">
              <div className="bg-rose-100 text-rose-600 p-2.5 rounded-xl shrink-0"><ShieldX className="w-5 h-5" /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Guardrail blocks</p>
                <p className="text-xl font-bold text-stone-900">{totalRejections}</p>
              </div>
            </div>
          </div>
        )}

        {/* Rejection breakdown chart */}
        {analytics && totalRejections > 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm shadow-stone-900/[0.02] p-6 mb-8">
            <h2 className="text-sm font-semibold text-stone-900 mb-1">Guardrail rejections by category</h2>
            <p className="text-xs text-stone-500 mb-5">Every blocked booking, broken down by which check stopped it.</p>
            <RejectionBarChart breakdown={analytics.rejectionsBreakdown} />
          </div>
        )}

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
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-14 text-stone-400 text-sm">Loading audit trail...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-14 text-stone-400 text-sm">No activity yet — book a trek to populate the audit trail.</td></tr>
                ) : logs.map(log => (
                  <tr key={log._id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-6 py-4 text-stone-500 whitespace-nowrap text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.actor === 'agent' ? (
                        <span className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full text-xs font-semibold w-fit">
                          <Bot className="w-3.5 h-3.5" /> API Agent
                        </span>
                      ) : log.actor === 'system' ? (
                        <span className="flex items-center gap-1.5 text-stone-600 bg-stone-100 px-2.5 py-1 rounded-full text-xs font-semibold w-fit">
                          <AlertTriangle className="w-3.5 h-3.5" /> System Core
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-stone-600 bg-stone-100 px-2.5 py-1 rounded-full text-xs font-semibold w-fit">
                          <User className="w-3.5 h-3.5" /> Human (Web)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-stone-900">{log.action}</p>
                      {log.amount != null && <p className="text-stone-500 text-xs mt-0.5">₹{log.amount.toLocaleString()}</p>}
                      <p className="text-stone-400 text-[10px] mt-1 font-mono">ID: {log.correlationId || log._id}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.decision === 'approved' ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                          <Check className="w-4 h-4" /> Approved
                        </span>
                      ) : log.decision === 'processed' ? (
                        <span className="flex items-center gap-1 text-blue-600 font-medium">
                          <Sparkles className="w-4 h-4" /> AI reasoning
                        </span>
                      ) : log.decision === 'fallback' ? (
                        <span className="flex items-center gap-1 text-amber-600 font-medium">
                          <AlertTriangle className="w-4 h-4" /> Fallback
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-600 font-medium">
                          <X className="w-4 h-4" /> Blocked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-stone-600 max-w-md">
                      <p className="font-medium text-stone-800">{log.reason}</p>
                      {log.trace && log.trace.length > 0 && (
                        <div className="mt-2 text-xs flex gap-1.5 flex-wrap">
                          {log.trace.map((t, idx) => (
                            <span key={idx} className={`px-1.5 py-0.5 rounded-md ${t.passed ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100 font-semibold'}`}>
                              {t.check}: {t.passed ? 'Pass' : 'Fail'}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
