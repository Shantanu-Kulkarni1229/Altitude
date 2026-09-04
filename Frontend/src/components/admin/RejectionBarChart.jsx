import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { REJECTION_CATEGORIES } from './auditFormat';

// Sequential, single-hue horizontal bar chart — rust because these are
// guardrail rejections, matching the "Blocked" color used across the admin
// dashboard. Magnitude comparison across a handful of categories: one hue,
// more-is-longer, sorted descending, value labeled at the tip.
export default function RejectionBarChart({ breakdown }) {
  const data = useMemo(() => {
    return REJECTION_CATEGORIES
      .map((c) => ({ ...c, value: breakdown[c.key] || 0 }))
      .sort((a, b) => b.value - a.value);
  }, [breakdown]);

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div
          key={d.key}
          className="flex items-center gap-3"
          title={`${d.value} booking${d.value === 1 ? '' : 's'} blocked by the ${d.label.toLowerCase()} guardrail`}
        >
          <span className="w-32 shrink-0 text-sm text-ink-600 font-mono">{d.label}</span>
          <div className="flex-1 h-5 bg-rust-50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-rust-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max((d.value / max) * 100, d.value > 0 ? 3 : 0)}%` }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <span className="w-6 shrink-0 text-sm font-semibold text-ink-900 text-right font-mono tabular">{d.value}</span>
        </div>
      ))}
    </div>
  );
}
