import React, { useId } from 'react';

/**
 * The hand-plotted route line — this world's organizing spine, used in place
 * of a rule/divider. `wobble` controls how much hand-drawn imperfection the
 * path carries; `vertical` renders it as a page-height spine instead of a
 * horizontal divider.
 */
export default function RouteLine({ className = '', tone = 'canvas', vertical = false, wobble = 6 }) {
  const id = useId();
  const strokeColor = {
    canvas: 'var(--color-canvas-500)',
    paper: 'var(--color-ink-400)',
    flare: 'var(--color-flare-500)'
  }[tone] || tone;

  if (vertical) {
    const points = [
      `M 4 0`,
      `C ${4 - wobble} 40, ${4 + wobble} 90, 4 140`,
      `S ${4 - wobble} 220, 4 260`
    ].join(' ');
    return (
      <svg className={`route-line ${className}`} width="8" height="260" viewBox="0 0 8 260" preserveAspectRatio="none" fill="none" aria-hidden="true">
        <path d={points} stroke={strokeColor} strokeWidth="1.5" strokeLinecap="round" style={{ '--route-length': 420 }} />
      </svg>
    );
  }

  return (
    <svg className={`route-line w-full ${className}`} height="14" viewBox="0 0 400 14" preserveAspectRatio="none" fill="none" aria-hidden="true">
      <path
        d={`M 0 7 C 60 ${7 - wobble}, 100 ${7 + wobble}, 160 6 S 260 ${7 - wobble}, 320 8 S 380 6, 400 7`}
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        style={{ '--route-length': 520 }}
      />
    </svg>
  );
}
