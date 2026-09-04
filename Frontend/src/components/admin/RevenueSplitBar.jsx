import React from 'react';
import { motion } from 'framer-motion';

// Part-to-whole, two categories, categorical color (seal=agent-assisted
// revenue matches the AgentSeal mark used across the dashboard; ink=human)
// — the direct visual evidence for "AI grows revenue", not just "AI exists".
export default function RevenueSplitBar({ bySource }) {
  const humanRev = bySource.human.revenue;
  const agentRev = bySource.agent.revenue;
  const total = humanRev + agentRev;
  const agentPct = total > 0 ? Math.round((agentRev / total) * 100) : 0;

  return (
    <div>
      <div className="flex justify-between text-xs font-medium text-ink-500 mb-2 font-mono">
        <span>Human checkout — ₹{humanRev.toLocaleString()} ({bySource.human.bookings})</span>
        <span>AI concierge — ₹{agentRev.toLocaleString()} ({bySource.agent.bookings})</span>
      </div>
      <div className="h-4 rounded-full overflow-hidden bg-paper-200 flex">
        <motion.div
          className="h-full bg-ink-400"
          initial={{ width: 0 }}
          animate={{ width: `${100 - agentPct}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
        <motion.div
          className="h-full bg-seal-600"
          initial={{ width: 0 }}
          animate={{ width: `${agentPct}%` }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <p className="text-xs text-ink-500 mt-2">
        <strong className="text-seal-600">{agentPct}%</strong> of confirmed revenue was sourced by the AI concierge, not the plain web checkout.
      </p>
    </div>
  );
}
