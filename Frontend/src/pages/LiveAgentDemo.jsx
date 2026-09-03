import React, { useState, useEffect, useRef } from 'react';
import { Bot, Play, Square, Terminal, Sparkles } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

export default function LiveAgentDemo() {
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
    <div className="bg-stone-50 min-h-screen pb-24 pt-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-stone-900 text-white flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Live Agent Demo</h1>
            <p className="text-stone-500 text-sm">Watch a real AI agent discover, decide, reserve, and pay against this merchant — right now, no terminal needed.</p>
          </div>
        </div>

        <div className="mb-6 flex items-start gap-2 text-xs text-stone-500 bg-white border border-stone-200 rounded-xl px-4 py-3">
          <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>
            This runs the <strong>actual</strong> scripts from this repo's <code className="bg-stone-100 px-1 py-0.5 rounded">Backend/scripts/</code> folder, server-side, and streams their real stdout here.
            Nothing is faked for this page — the "MCP buyer" option is a genuinely separate client process talking to a real MCP server over stdio, and the "AI buyer" options hit the real guardrail-gated booking API.
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-5 mb-6 flex flex-col sm:flex-row gap-3 sm:items-center">
          <select
            value={selectedDemo}
            onChange={(e) => setSelectedDemo(e.target.value)}
            disabled={status === 'running'}
            className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50"
          >
            {demos.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>

          {status === 'running' ? (
            <button
              onClick={stopDemo}
              className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              <Square className="w-4 h-4" /> Stop
            </button>
          ) : (
            <button
              onClick={runDemo}
              disabled={!selectedDemo}
              className="flex items-center justify-center gap-2 bg-stone-950 hover:bg-stone-800 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4" /> Run demo
            </button>
          )}
        </div>

        <div className="bg-stone-950 rounded-2xl border border-stone-800 shadow-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-800 flex items-center gap-2 text-stone-400 text-xs font-medium">
            <Terminal className="w-3.5 h-3.5" />
            live output
            {status === 'running' && (
              <span className="flex items-center gap-1 ml-auto text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> running
              </span>
            )}
            {status === 'done' && <span className="ml-auto text-emerald-400">finished</span>}
            {status === 'error' && <span className="ml-auto text-rose-400">error</span>}
          </div>
          <div className="p-4 h-[480px] overflow-y-auto font-mono text-[13px] leading-relaxed text-stone-200 whitespace-pre-wrap break-words">
            {logs.length === 0 ? (
              <span className="text-stone-600">Pick a demo above and hit "Run demo" — output streams here in real time.</span>
            ) : (
              logs.map((line, i) => <div key={i}>{line}</div>)
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}
