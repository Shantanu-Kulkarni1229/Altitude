import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Route, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../lib/api';
import { DECISION_META, actionLabel } from './auditFormat';

export function TraceChips({ trace }) {
  if (!trace || trace.length === 0) return null;
  return (
    <div className="mt-2 text-xs flex gap-1.5 flex-wrap font-mono">
      {trace.map((t, idx) => (
        <span key={idx} className={`px-1.5 py-0.5 rounded-md ${t.passed ? 'bg-pine-50 text-pine-700 border border-pine-200' : 'bg-rust-50 text-rust-700 border border-rust-200 font-semibold'}`}>
          {t.check}: {t.passed ? 'Pass' : 'Fail'}
        </span>
      ))}
    </div>
  );
}

export function DetailToggle({ detail }) {
  const [open, setOpen] = useState(false);
  if (!detail || Object.keys(detail).length === 0) return null;
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] font-medium text-ink-400 hover:text-ink-800 flex items-center gap-1 transition-colors"
      >
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        {open ? 'Hide' : 'Show'} technical detail
      </button>
      <AnimatePresence>
        {open && (
          <motion.pre
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-1.5 bg-canvas-950 text-pine-300 text-[11px] rounded-lg p-3 overflow-x-auto overflow-hidden max-w-md font-mono"
          >
            {JSON.stringify(detail, null, 2)}
          </motion.pre>
        )}
      </AnimatePresence>
    </div>
  );
}

// Full conversation-to-payment journey for one correlationId, chronological —
// this is "explainable" made literal: one customer's whole story, start to finish.
export default function TraceModal({ correlationId, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/v1/audit?correlationId=${encodeURIComponent(correlationId)}`)
      .then(({ data }) => setLogs([...data.data].reverse()))
      .finally(() => setLoading(false));
  }, [correlationId]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas-950/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="bg-paper-50 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-paper-200 flex justify-between items-start shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-canvas-950 text-white flex items-center justify-center shrink-0">
              <Route className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-ink-900 font-display">Full journey trace</h3>
              <p className="text-[11px] text-ink-400 font-mono">{correlationId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-800 hover:bg-paper-200 rounded-full p-1.5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <p className="text-center text-ink-400 text-sm py-10">Loading trace...</p>
          ) : logs.length === 0 ? (
            <p className="text-center text-ink-400 text-sm py-10">No events found for this id.</p>
          ) : (
            // Each entry renders as a carbon-copy sheet — a duplicate slip
            // peeking out behind the one on top of it, so reading down the
            // stack literally means flipping back through earlier copies.
            <div className="space-y-7">
              {logs.map((log, i) => {
                const meta = DECISION_META[log.decision] || DECISION_META.approved;
                const Icon = meta.icon;
                const tilt = i % 2 === 0 ? -0.6 : 0.6;
                return (
                  <motion.div
                    key={log._id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.06 }}
                    className="relative flex gap-3"
                  >
                    <div className={`relative w-8 h-8 rounded-full border-4 border-paper-50 flex items-center justify-center shrink-0 shadow-sm z-10 ${meta.cls} bg-paper-50`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="relative flex-1 min-w-0">
                      <div
                        className="absolute inset-0 top-1.5 rounded-lg bg-paper-200 border border-paper-300"
                        style={{ transform: `rotate(${tilt * 2}deg) translateX(3px)` }}
                        aria-hidden="true"
                      />
                      <div
                        className="absolute inset-0 top-1 rounded-lg bg-paper-100 border border-paper-300"
                        style={{ transform: `rotate(${tilt}deg) translateX(1.5px)` }}
                        aria-hidden="true"
                      />
                      <div className="relative bg-paper-50 border border-paper-300 rounded-lg px-3.5 py-3 shadow-sm">
                        <p className="text-[11px] text-ink-400 mb-0.5 font-mono">{new Date(log.createdAt).toLocaleString()} · {actionLabel(log.action)}</p>
                        <p className="text-sm font-medium text-ink-900">{log.reason}</p>
                        <TraceChips trace={log.trace} />
                        <DetailToggle detail={log.detail} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
