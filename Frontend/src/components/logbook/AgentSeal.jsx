import React from 'react';
import { Bot } from 'lucide-react';

/**
 * The mark that identifies AI-agent-attributed activity — a small rotated,
 * double-ringed wax-seal cartouche (matching WaypointStamp's stamped
 * language) rather than a borrowed accent hue, so "who did this" reads from
 * shape/iconography and survives on any background (dark canvas or paper).
 */
export default function AgentSeal({ label = 'Altia', size = 'sm', className = '' }) {
  const dims = size === 'sm' ? 'text-[10px] pl-1.5 pr-2.5 py-1 gap-1' : 'text-xs pl-2 pr-3 py-1.5 gap-1.5';
  const iconBox = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <span
      className={`relative inline-flex items-center ${dims} rounded-full border-2 border-seal-600 bg-seal-100 text-seal-700 font-semibold ${className}`}
      style={{ transform: 'rotate(-3deg)' }}
    >
      <span className="absolute inset-[2px] rounded-full border border-seal-600 opacity-30 pointer-events-none" />
      <span className={`relative shrink-0 rounded-full bg-seal-700 text-seal-100 flex items-center justify-center ${iconBox}`}>
        <Bot className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      </span>
      <span className="relative">{label}</span>
    </span>
  );
}
