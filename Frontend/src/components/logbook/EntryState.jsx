import React from 'react';
import { Check } from 'lucide-react';

/**
 * Sequential-entry state chip — done (stamped/ghosted), active (bright ink,
 * boxed), pending (dotted outline only). The grammar this world uses for any
 * ordered sequence: itinerary days, guardrail checks, checkout steps.
 */
export default function EntryState({ state, children }) {
  if (state === 'done') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-400 line-through decoration-ink-300">
        <Check className="w-3 h-3 text-pine-600 shrink-0" strokeWidth={3} />
        {children}
      </span>
    );
  }
  if (state === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-900 bg-flare-50 border border-flare-300 rounded px-2 py-1">
        {children}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-400 border border-dashed border-ink-300 rounded px-2 py-1">
      {children}
    </span>
  );
}
