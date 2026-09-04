import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, RefreshCw, Download, Clock3, Route, Radio } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../lib/api';
import TraceModal, { TraceChips, DetailToggle } from '../../components/admin/TraceModal';
import { ACTOR_META, DECISION_META, actionLabel } from '../../components/admin/auditFormat';
import AgentSeal from '../../components/logbook/AgentSeal';

export default function AuditTrail() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [traceId, setTraceId] = useState(null);

  const actorFilter = searchParams.get('actor') || '';
  const decisionFilter = searchParams.get('decision') || '';
  const [search, setSearch] = useState('');
  const [limit, setLimit] = useState(200);

  const setFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const fetchAll = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit) });
      if (actorFilter) params.set('actor', actorFilter);
      if (decisionFilter) params.set('decision', decisionFilter);
      const { data } = await axios.get(`${API_BASE_URL}/api/v1/audit?${params.toString()}`);
      setLogs(data.data);
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

  return (
    <div>
      <div className="bg-paper-50 rounded-lg border border-paper-300 shadow-sm shadow-canvas-950/[0.02] p-4 mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reasons..."
            className="w-full bg-paper-100 border border-paper-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flare-500/40"
          />
        </div>
        <select
          value={actorFilter}
          onChange={(e) => setFilter('actor', e.target.value)}
          className="bg-paper-100 border border-paper-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flare-500/40"
        >
          <option value="">All actors</option>
          <option value="human">Human (Web)</option>
          <option value="agent">API Agent</option>
          <option value="system">System Core</option>
        </select>
        <select
          value={decisionFilter}
          onChange={(e) => setFilter('decision', e.target.value)}
          className="bg-paper-100 border border-paper-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-flare-500/40"
        >
          <option value="">All decisions</option>
          <option value="approved">Approved</option>
          <option value="rejected">Blocked</option>
          <option value="processed">AI reasoning</option>
          <option value="fallback">Fallback</option>
        </select>
        <button
          onClick={() => setLive((v) => !v)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2.5 rounded-lg border transition-colors ${live ? 'bg-pine-50 border-pine-200 text-pine-700' : 'bg-paper-50 border-paper-300 text-ink-500 hover:text-ink-900'}`}
        >
          <Radio className={`w-3.5 h-3.5 ${live ? 'animate-pulse' : ''}`} /> {live ? 'Live' : 'Go live'}
        </button>
        <button onClick={() => fetchAll()} className="flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900 bg-paper-50 border border-paper-300 px-3 py-2.5 rounded-lg transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
        <button onClick={exportCsv} className="flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900 bg-paper-50 border border-paper-300 px-3 py-2.5 rounded-lg transition-colors">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="bg-paper-50 border border-paper-300 rounded-lg shadow-sm shadow-canvas-950/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper-100 text-ink-500 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Time</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Decision</th>
                <th className="px-6 py-4">Reason & Trace</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan="6" className="px-6 py-4"><div className="h-4 bg-paper-200 rounded animate-pulse w-full max-w-md" /></td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-14 text-ink-400 text-sm">No matching activity — try clearing filters, or book a trek to populate the audit trail.</td></tr>
              ) : filteredLogs.map(log => {
                const actor = ACTOR_META[log.actor] || ACTOR_META.human;
                const decision = DECISION_META[log.decision] || DECISION_META.rejected;
                const ActorIcon = actor.icon;
                const DecisionIcon = decision.icon;
                return (
                  <tr key={log._id} className="hover:bg-paper-100/60 transition-colors align-top">
                    <td className="px-6 py-4 text-ink-500 whitespace-nowrap text-xs font-mono">
                      <span className="flex items-center gap-1"><Clock3 className="w-3 h-3" /> {new Date(log.createdAt).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.actor === 'agent' ? (
                        <AgentSeal label={actor.label} />
                      ) : (
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${actor.cls}`}>
                          <ActorIcon className="w-3.5 h-3.5" /> {actor.label}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-ink-900 capitalize">{actionLabel(log.action)}</p>
                      {log.amount != null && <p className="text-ink-500 text-xs mt-0.5 font-mono">₹{log.amount.toLocaleString()}</p>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`flex items-center gap-1 font-medium ${decision.cls}`}>
                        <DecisionIcon className="w-4 h-4" /> {decision.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-ink-600 max-w-md">
                      <p className="font-medium text-ink-800">{log.reason}</p>
                      <TraceChips trace={log.trace} />
                      <DetailToggle detail={log.detail} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {log.correlationId && (
                        <button
                          onClick={() => setTraceId(log.correlationId)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-ink-400 hover:text-flare-600 transition-colors"
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
          <div className="p-4 border-t border-paper-200 text-center">
            <button onClick={() => setLimit((l) => l + 200)} className="text-xs font-semibold text-ink-500 hover:text-ink-900">
              Load more
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {traceId && <TraceModal correlationId={traceId} onClose={() => setTraceId(null)} />}
      </AnimatePresence>
    </div>
  );
}
