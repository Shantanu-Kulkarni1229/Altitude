import React from 'react';

/**
 * "Thinking" indicator for the concierge chat — a waypoint stamp travels
 * along a hand-plotted route, on the same visual language as the Home hero
 * and RouteLine, rather than a generic three-dot bounce.
 */
export default function RouteThinking() {
  const path = 'M4 14 C 16 4, 24 24, 38 12 S 58 2, 72 13';

  return (
    <div className="flex items-center gap-2.5" aria-live="polite" aria-label="Altia is thinking">
      <svg width="76" height="20" viewBox="0 0 76 20" fill="none">
        <path d={path} stroke="var(--color-paper-300)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="1 5" />
        <circle r="3.5" fill="var(--color-flare-500)">
          <animateMotion dur="1.6s" repeatCount="indefinite" path={path} />
          <animate attributeName="opacity" values="0.5;1;0.5" dur="1.6s" repeatCount="indefinite" />
        </circle>
      </svg>
      <span className="text-[11px] font-mono text-ink-400">plotting a route…</span>
    </div>
  );
}
