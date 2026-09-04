import React from 'react';
import { motion } from 'framer-motion';

/**
 * A brass instrument dial — renders a value against a limit the way an
 * expedition altimeter or pressure gauge would, needle physically leaning
 * toward the red zone as the ratio climbs, rather than a flat progress bar.
 */
export default function ThresholdGauge({ label, value, max, unit = '', size = 88, dark = false }) {
  const ratio = max > 0 ? Math.min(value / max, 1.15) : 0;
  const angle = -90 + ratio * 180; // -90deg (empty, left) to +90deg (full, right)
  const danger = ratio >= 0.9;
  const warn = ratio >= 0.7 && !danger;

  const needleColor = danger ? 'var(--color-rust-600)' : warn ? 'var(--color-brass-600)' : 'var(--color-pine-600)';
  const trackColor = dark ? 'var(--color-canvas-700)' : 'var(--color-brass-100)';

  return (
    <div className="flex flex-col items-center gap-1.5" style={{ width: size }}>
      <svg width={size} height={size * 0.62} viewBox="0 0 100 62">
        <path d="M 8 58 A 42 42 0 0 1 92 58" fill="none" stroke={trackColor} strokeWidth="7" strokeLinecap="round" />
        <path
          d="M 8 58 A 42 42 0 0 1 92 58"
          fill="none"
          stroke={danger ? 'var(--color-rust-500)' : warn ? 'var(--color-brass-500)' : 'var(--color-pine-500)'}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${ratio * 132} 132`}
        />
        <motion.g
          initial={{ rotate: -90 }}
          animate={{ rotate: angle }}
          transition={{ type: 'spring', stiffness: 90, damping: 14 }}
          style={{ transformOrigin: '50px 58px' }}
        >
          <line x1="50" y1="58" x2="50" y2="22" stroke={needleColor} strokeWidth="2.5" strokeLinecap="round" />
        </motion.g>
        <circle cx="50" cy="58" r="4" fill={needleColor} />
      </svg>
      <div className="text-center -mt-1">
        <p className={`font-mono text-xs font-semibold tabular ${dark ? 'text-paper-100' : 'text-ink-800'}`}>{value}{unit} <span className={dark ? 'text-canvas-400' : 'text-ink-400'}>/ {max}{unit}</span></p>
        <p className={`text-[10px] uppercase tracking-wide font-medium ${dark ? 'text-canvas-400' : 'text-ink-500'}`}>{label}</p>
      </div>
    </div>
  );
}
