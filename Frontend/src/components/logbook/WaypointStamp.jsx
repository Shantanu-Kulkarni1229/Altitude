import React from 'react';

const TONES = {
  flare: { ring: 'border-flare-500', text: 'text-flare-600', bg: 'bg-flare-50' },
  pine: { ring: 'border-pine-500', text: 'text-pine-700', bg: 'bg-pine-50' },
  rust: { ring: 'border-rust-500', text: 'text-rust-600', bg: 'bg-rust-50' },
  ink: { ring: 'border-ink-700', text: 'text-ink-800', bg: 'bg-paper-100' },
  canvas: { ring: 'border-canvas-400', text: 'text-paper-100', bg: 'bg-canvas-800' }
};

/**
 * A rubber-stamped waypoint marker — used for step numbers, itinerary days,
 * and map pins. Slightly rotated and double-ringed to read as stamped ink
 * rather than a flat numbered chip.
 */
export default function WaypointStamp({ n, tone = 'flare', size = 'md', rotate = -4, className = '' }) {
  const c = TONES[tone] || TONES.flare;
  const dims = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm';
  // The caller decides positioning (inline vs. an absolutely-placed pin); only
  // fall back to `relative` when they didn't, so the two utilities never both
  // land in the class list where Tailwind's stylesheet order — not source
  // order — would silently pick a winner.
  const position = /\babsolute\b/.test(className) ? '' : 'relative';

  return (
    <span
      className={`${position} inline-flex items-center justify-center shrink-0 rounded-full border-2 ${c.ring} ${c.bg} ${dims} ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <span className={`absolute inset-[3px] rounded-full border ${c.ring} opacity-40`} />
      <span className={`font-mono font-semibold ${c.text} tabular`}>{n}</span>
    </span>
  );
}
