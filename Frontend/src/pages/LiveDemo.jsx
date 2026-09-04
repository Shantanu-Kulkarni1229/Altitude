import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Square, Terminal, Sparkles } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

export default function LiveDemo() {
  const [demos, setDemos] = useState([]);
  const [selectedDemo, setSelectedDemo] = useState('');
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const esRef = useRef(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/v1/demo/list`).then(({ data }) => {
      setDemos(data.data);
      if (data.data.length > 0) setSelectedDemo(data.data[0].id);
    }).catch(() => {});

    return () => esRef.current?.close();
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const runDemo = () => {
    if (!selectedDemo || status === 'running') return;
    setLogs([]);
    setStatus('running');

    const es = new EventSource(`${API_BASE_URL}/api/v1/demo/stream?demoId=${encodeURIComponent(selectedDemo)}`);
    esRef.current = es;

    es.addEventListener('start', (e) => {
      const { label } = JSON.parse(e.data);
      setLogs((prev) => [...prev, `$ Running: ${label}`, '']);
    });

    es.addEventListener('log', (e) => {
      const { line } = JSON.parse(e.data);
      setLogs((prev) => [...prev, line]);
    });

    es.addEventListener('done', (e) => {
      const { code } = JSON.parse(e.data);
      setLogs((prev) => [...prev, '', `[process exited with code ${code}]`]);
      setStatus('done');
      es.close();
    });

    es.addEventListener('error', (e) => {
      if (e.data) {
        const { message } = JSON.parse(e.data);
        setLogs((prev) => [...prev, `[error] ${message}`]);
      } else {
        setLogs((prev) => [...prev, '[connection lost — the server may be waking up from an idle sleep on free hosting; try again in a moment]']);
      }
      setStatus('error');
      es.close();
    });
  };

  const stopDemo = () => {
    esRef.current?.close();
    setStatus('idle');
    setLogs((prev) => [...prev, '', '[stopped by user]']);
  };

  return (
    <div className="bg-paper-100 min-h-screen pb-24 pt-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
          <h1 className="font-display text-3xl font-bold text-ink-900 mb-1 tracking-tight">Live agent demo</h1>
          <p className="text-ink-500">Run a real autonomous buyer against this merchant, right now.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
          <div className="mb-6 flex items-start gap-2 text-xs text-ink-600 bg-paper-50 border border-paper-300 rounded-lg px-4 py-3">
            <Sparkles className="w-4 h-4 text-flare-500 shrink-0 mt-0.5" />
            <span>
              This runs the <strong>actual</strong> scripts from this repo's <code className="bg-paper-200 px-1 py-0.5 rounded font-mono">Backend/scripts/</code> folder, server-side, and streams their real stdout here.
              Nothing is faked — the "MCP buyer" option is a genuinely separate client process talking to a real MCP server over stdio, and the "AI buyer" options hit the real guardrail-gated booking API.
            </span>
          </div>

          <div className="bg-paper-50 rounded-lg border border-paper-300 shadow-sm p-5 mb-6 flex flex-col sm:flex-row gap-3 sm:items-center">
            <select
              value={selectedDemo}
              onChange={(e) => setSelectedDemo(e.target.value)}
              disabled={status === 'running'}
              className="flex-1 bg-paper-100 border border-paper-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-flare-500/40 disabled:opacity-50"
            >
              {demos.map((d) => (
                <option key={d.id} value={d.id}>{d.label}</option>
              ))}
            </select>

            {status === 'running' ? (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={stopDemo}
                className="flex items-center justify-center gap-2 bg-rust-600 hover:bg-rust-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                <Square className="w-4 h-4" /> Stop
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={runDemo}
                disabled={!selectedDemo}
                className="flex items-center justify-center gap-2 bg-flare-500 hover:bg-flare-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" /> Run demo
              </motion.button>
            )}
          </div>

          <div className="bg-canvas-950 rounded-lg border border-canvas-800 shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-canvas-800 flex items-center gap-2 text-canvas-400 text-xs font-medium font-mono">
              <Terminal className="w-3.5 h-3.5" />
              live output
              {status === 'running' && (
                <span className="flex items-center gap-1 ml-auto text-pine-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-pine-400 animate-pulse" /> running
                </span>
              )}
              {status === 'done' && <span className="ml-auto text-pine-400">finished</span>}
              {status === 'error' && <span className="ml-auto text-rust-400">error</span>}
            </div>
            <div className="p-4 h-[480px] overflow-y-auto font-mono text-[13px] leading-relaxed text-paper-200 whitespace-pre-wrap break-words">
              {logs.length === 0 ? (
                <span className="text-canvas-500">Pick a demo above and hit "Run demo" — output streams here in real time.</span>
              ) : (
                logs.map((line, i) => <div key={i}>{line}</div>)
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
