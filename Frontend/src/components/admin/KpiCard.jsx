import React from 'react';
import { motion } from 'framer-motion';

const TONE = {
  pine: 'bg-pine-100 text-pine-700',
  ink: 'bg-paper-200 text-ink-600',
  seal: 'bg-seal-100 text-seal-600',
  rust: 'bg-rust-100 text-rust-600',
  brass: 'bg-brass-100 text-brass-600',
  flare: 'bg-flare-100 text-flare-600'
};

// Stat tile: label, value, icon-in-tone-chip, reused across every admin
// page. `as` lets a tile double as a button (e.g. "Guardrail blocks" jumps
// into the Audit Trail pre-filtered).
export default function KpiCard({ icon: Icon, tone = 'ink', label, value, hint, as = 'div', onClick, index = 0 }) {
  const Comp = as === 'button' ? motion.button : motion.div;
  return (
    <Comp
      type={as === 'button' ? 'button' : undefined}
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      title={hint}
      className={`text-left bg-paper-50 p-5 rounded-lg border border-paper-300 shadow-sm shadow-canvas-950/[0.02] flex items-center gap-4 ${
        as === 'button' ? 'hover:border-ink-400 hover:shadow-md transition-[border,box-shadow] cursor-pointer' : ''
      }`}
    >
      <div className={`p-2.5 rounded-lg shrink-0 ${TONE[tone]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-ink-500 uppercase tracking-wide break-words">{label}</p>
        <p className="text-xl font-bold text-ink-900 truncate font-mono tabular">{value}</p>
      </div>
    </Comp>
  );
}
