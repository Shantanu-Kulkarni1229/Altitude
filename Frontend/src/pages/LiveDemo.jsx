import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Square, Terminal, Sparkles, Bot, Share2, HeartPulse, Wallet,
  Compass, Lock, CreditCard, ScrollText, Circle, Check, Clock3
} from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

// Client-side framing only — every fact here (what each script does) is
// drawn from actually reading Backend/scripts/*.js, never invented. Falls
// back to a generic card if the backend ever adds an id not listed here, so
// nothing breaks silently.
const DEMO_META = {
  'ai-buyer': {
    icon: Bot, tone: 'flare',
    blurb: 'Full autonomous cycle: discovers the catalog, decides on a trek, reserves a slot, and pays — no human in the loop.'
  },
  'ai-buyer-fail-fitness': {
    icon: HeartPulse, tone: 'rust',
    blurb: 'Deliberately mismatched fitness level — watch the guardrail block it before any payment order even exists.'
  },
  'ai-buyer-fail-budget': {
    icon: Wallet, tone: 'rust',
    blurb: "Deliberately over the customer's budget — watch the guardrail reject it cleanly, no partial charge."
  },
  'mcp-buyer': {
    icon: Share2, tone: 'seal',
    blurb: 'A genuinely separate process talking over MCP — zero shared code, zero shared secrets. Proves real external interop.'
  }
};
const DEFAULT_META = { icon: Terminal, tone: 'ink' };

// Every script prints "[n] TITLE" before each phase (see Backend/scripts/*.js
// step()) — this is real structure in the actual output, not a guess. The
// leading verb picks the icon; unrecognized verbs still render, just plainer.
const STEP_RE = /^\[(\d+)\]\s*(.+)$/;
const VERB_META = {
  DISCOVER: { icon: Compass, tone: 'seal' },
  DECIDE: { icon: Sparkles, tone: 'seal' },
  RESERVE: { icon: Lock, tone: 'brass' },
  PAY: { icon: CreditCard, tone: 'flare' },
  AUDIT: { icon: ScrollText, tone: 'pine' }
};
function verbMeta(title) {
  const verb = title.split(/[\s—]/)[0]?.toUpperCase();
  return VERB_META[verb] || { icon: Circle, tone: 'ink' };
}

// Terminal lines get light, honest color-coding from keywords the scripts
// actually print — never rewritten, just tinted.
function TerminalLine({ line }) {
  if (STEP_RE.test(line)) {
    return <div className="text-flare-400 font-semibold mt-2">{line}</div>;
  }
  if (/^-{10,}$/.test(line)) return <div className="text-canvas-700">{line}</div>;
  if (/\bPASS\b|finished successfully|Reserved\.|Payment verified/.test(line)) {
    return <div className="text-pine-400">{line}</div>;
  }
  if (/\bFAIL\b|REJECTED|rejected|error/i.test(line)) {
    return <div className="text-rust-400">{line}</div>;
  }
  if (/^(AI reasoning|Concierge|Concierge \(via MCP\))/.test(line)) {
    return <div className="text-seal-300">{line}</div>;
  }
  return <div>{line}</div>;
}

function ElapsedTimer({ running, startedAt }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    setNow(Date.now()); // update immediately on start, don't wait for the first tick
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [running]);
  if (!startedAt) return null;
  const secs = Math.max(0, (now - startedAt) / 1000).toFixed(1);
  return <span className="font-mono tabular text-[11px] text-canvas-400 flex items-center gap-1"><Clock3 className="w-3 h-3" /> {secs}s</span>;
}

export default function LiveDemo() {
  const [demos, setDemos] = useState([]);
  const [selectedDemo, setSelectedDemo] = useState('');
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | running | done | error
  const [exitCode, setExitCode] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
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

  const steps = useMemo(() => {
    const found = [];
    logs.forEach((line) => {
      const m = line.match(STEP_RE);
      if (m) found.push({ n: Number(m[1]), title: m[2].trim() });
    });
    return found;
  }, [logs]);

  const outcome = useMemo(() => {
    if (status !== 'done' && status !== 'error') return null;
    const text = logs.join('\n');
    if (status === 'error' || (exitCode !== null && exitCode !== 0)) {
      return { kind: 'error', label: 'RUN FAILED', tone: 'rust' };
    }
    if (/documented, honest boundary/.test(text)) {
      return { kind: 'boundary', label: 'HONEST BOUNDARY REACHED', tone: 'brass' };
    }
    if (/deliberate rejection demo|REJECTED by guardrail/.test(text)) {
      return { kind: 'guarded', label: 'GUARDRAIL BLOCKED — AS DESIGNED', tone: 'rust' };
    }
    if (/finished successfully/.test(text)) {
      return { kind: 'success', label: 'RUN COMPLETE', tone: 'pine' };
    }
    return { kind: 'success', label: 'RUN COMPLETE', tone: 'pine' };
  }, [status, logs, exitCode]);

  const runDemo = () => {
    if (!selectedDemo || status === 'running') return;
    setLogs([]);
    setExitCode(null);
    setStatus('running');
    setStartedAt(Date.now());

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
      setExitCode(code);
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
    <div className="bg-canvas-950 min-h-screen pb-24 pt-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-8">
          <h1 className="font-display text-4xl font-bold text-paper-50 mb-1 tracking-tight">Watch an AI buy a trek</h1>
          <p className="text-canvas-300">A real autonomous AI agent, transacting against this merchant — guardrail checks, payment, and audit trail, live, right now.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
          <div className="mb-6 flex items-start gap-2 text-xs text-canvas-300 bg-canvas-900 border border-canvas-700 rounded-lg px-4 py-3">
            <Sparkles className="w-4 h-4 text-flare-400 shrink-0 mt-0.5" />
            <span>
              This runs the <strong className="text-paper-100">actual</strong> scripts from this repo's <code className="bg-canvas-800 px-1 py-0.5 rounded font-mono text-paper-200">Backend/scripts/</code> folder, server-side, and streams their real stdout here.
              Nothing is faked — the "MCP buyer" option is a genuinely separate client process talking to a real MCP server over stdio, and the "AI buyer" options hit the real guardrail-gated booking API.
            </span>
          </div>

          {/* Demo picker — one card per real, whitelisted script */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {demos.map((d) => {
              const meta = DEMO_META[d.id] || DEFAULT_META;
              const Icon = meta.icon;
              const active = selectedDemo === d.id;
              const toneCls = {
                flare: 'border-flare-500 bg-flare-500/10',
                rust: 'border-rust-500 bg-rust-500/10',
                seal: 'border-seal-600 bg-seal-600/15',
                ink: 'border-canvas-500 bg-canvas-800'
              }[meta.tone];
              const iconCls = {
                flare: 'text-flare-400', rust: 'text-rust-400', seal: 'text-seal-100', ink: 'text-canvas-300'
              }[meta.tone];
              return (
                <motion.button
                  key={d.id}
                  type="button"
                  whileTap={{ scale: 0.98 }}
                  disabled={status === 'running'}
                  onClick={() => setSelectedDemo(d.id)}
                  className={`text-left p-4 rounded-lg border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                    active ? toneCls : 'border-canvas-800 bg-canvas-900 hover:border-canvas-600'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-canvas-950 ${active ? iconCls : 'text-canvas-400'}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <p className="font-semibold text-paper-50 text-sm leading-tight">{d.label}</p>
                  </div>
                  {meta.blurb && <p className="text-xs text-canvas-400 leading-relaxed">{meta.blurb}</p>}
                </motion.button>
              );
            })}
          </div>

          <div className="flex justify-end mb-6">
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

          {/* Live step tracker — parsed straight from the real "[n] TITLE"
              lines the script prints, not a pre-scripted fake timeline */}
          <AnimatePresence>
            {steps.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="mb-6 overflow-hidden"
              >
                <div className="bg-canvas-900 border border-canvas-700 rounded-lg p-5">
                  <div className="flex items-center gap-0 overflow-x-auto pb-1">
                    {steps.map((s, i) => {
                      const isLast = i === steps.length - 1;
                      const isDone = !isLast || status === 'done';
                      const meta = verbMeta(s.title);
                      const Icon = isDone ? Check : meta.icon;
                      return (
                        <React.Fragment key={s.n}>
                          {i > 0 && (
                            <motion.div
                              initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.4 }}
                              className="h-px w-8 sm:w-14 bg-canvas-600 shrink-0 origin-left"
                            />
                          )}
                          <motion.div
                            initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                            className="flex flex-col items-center gap-1.5 shrink-0"
                            title={s.title}
                          >
                            <span className={`relative w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isDone ? 'border-pine-500 bg-pine-500/15 text-pine-400' : `border-flare-500 bg-flare-500/15 text-flare-400`
                            }`}>
                              {!isDone && <span className="absolute inset-0 rounded-full border-2 border-flare-400 animate-ping opacity-40" />}
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="text-[10px] font-mono text-canvas-400 max-w-[70px] text-center leading-tight truncate">
                              {s.title.split(/[\s—]/)[0]}
                            </span>
                          </motion.div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-canvas-950 rounded-lg border border-canvas-800 shadow-xl overflow-hidden relative">
            <div className="px-4 py-3 border-b border-canvas-800 flex items-center gap-2 text-canvas-400 text-xs font-medium font-mono">
              <Terminal className="w-3.5 h-3.5" />
              live output
              <ElapsedTimer running={status === 'running'} startedAt={startedAt} />
              {status === 'running' && (
                <span className="flex items-center gap-1 ml-auto text-pine-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-pine-400 animate-pulse" /> running
                </span>
              )}
              {status === 'done' && <span className="ml-auto text-pine-400">finished</span>}
              {status === 'error' && <span className="ml-auto text-rust-400">error</span>}
            </div>
            <div className="p-4 h-[420px] overflow-y-auto font-mono text-[13px] leading-relaxed text-paper-200 whitespace-pre-wrap break-words">
              {logs.length === 0 ? (
                <span className="text-canvas-500">Pick a demo above and hit "Run demo" — output streams here in real time.</span>
              ) : (
                logs.map((line, i) => <TerminalLine key={i} line={line} />)
              )}
              <div ref={logEndRef} />
            </div>

            {/* Outcome stamp — presses in once the run ends */}
            <AnimatePresence>
              {outcome && (
                <motion.div
                  initial={{ opacity: 0, scale: 1.4, rotate: -8 }}
                  animate={{ opacity: 1, scale: 1, rotate: -6 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                  className="absolute top-4 right-4 pointer-events-none"
                >
                  <div className={`px-4 py-2 rounded-lg border-4 font-display font-bold text-sm tracking-wide backdrop-blur-sm bg-canvas-950/85 ${
                    outcome.tone === 'pine' ? 'border-pine-400 text-pine-400' :
                    outcome.tone === 'rust' ? 'border-rust-400 text-rust-400' :
                    'border-brass-400 text-brass-400'
                  }`}>
                    {outcome.label}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
