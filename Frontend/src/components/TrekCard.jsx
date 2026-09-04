import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Clock, Users } from 'lucide-react';
import WaypointStamp from './logbook/WaypointStamp';

const DIFFICULTY_TONE = {
  easy: { tone: 'pine', label: 'Easy' },
  moderate: { tone: 'brass', label: 'Moderate' },
  hard: { tone: 'flare', label: 'Hard' },
  extreme: { tone: 'rust', label: 'Extreme' }
};
const DIFFICULTY_CLS = {
  easy: 'bg-pine-50 text-pine-700 border-pine-200',
  moderate: 'bg-brass-100 text-brass-600 border-brass-400/50',
  hard: 'bg-flare-50 text-flare-700 border-flare-300',
  extreme: 'bg-rust-50 text-rust-700 border-rust-300'
};

const MotionLink = motion.create(Link);

export default function TrekCard({ trek, compact = false, index = 0 }) {
  const urgency = trek.slotsRemaining <= 3;
  const diff = DIFFICULTY_TONE[trek.difficulty] || DIFFICULTY_TONE.moderate;

  if (compact) {
    return (
      <MotionLink whileTap={{ scale: 0.98 }} to={`/trek/${trek.trekId}`} className="flex gap-3 p-3 rounded-lg border border-paper-300 bg-paper-50 hover:border-flare-400 hover:shadow-sm transition-all group">
        <img src={trek.coverPhoto} alt={trek.name} className="w-20 h-20 object-cover rounded-md grayscale-[15%] group-hover:scale-105 transition-transform duration-300" />
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <h4 className="font-semibold text-ink-900 text-sm leading-tight mb-1 truncate">{trek.name}</h4>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${DIFFICULTY_CLS[trek.difficulty]}`}>
              {diff.label}
            </span>
            <span className="text-xs text-ink-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {trek.durationDays ? `${trek.durationDays}d` : trek.duration}
            </span>
          </div>
          <p className="text-sm font-semibold text-ink-900 font-mono tabular">₹{trek.basePrice.toLocaleString()}</p>
        </div>
      </MotionLink>
    );
  }

  return (
    <MotionLink
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      to={`/trek/${trek.trekId}`}
      className="group relative flex flex-col bg-paper-50 rounded-lg overflow-hidden border border-paper-300 hover:border-flare-400 hover:shadow-xl hover:shadow-canvas-950/10 transition-colors"
    >
      <WaypointStamp n={String(index + 1).padStart(2, '0')} tone={diff.tone} size="sm" className="absolute top-3 left-3 z-10 shadow-sm" />

      <div className="relative aspect-[4/3] overflow-hidden bg-canvas-900">
        <img src={trek.coverPhoto} alt={trek.name} className="w-full h-full object-cover grayscale-[10%] contrast-[1.05] group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas-950/50 via-transparent to-transparent" />
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start gap-2 mb-2">
          <h3 className="text-lg font-bold text-ink-900 line-clamp-1 tracking-tight font-display">{trek.name}</h3>
          <span className={`shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${DIFFICULTY_CLS[trek.difficulty]}`}>
            {diff.label}
          </span>
        </div>

        <div className="flex items-center text-sm text-ink-500 gap-4 mb-4">
          <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {trek.region}</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {trek.durationDays ? `${trek.durationDays} days` : trek.duration}</span>
        </div>

        <div className="mt-auto pt-4 border-t border-dashed border-paper-300 flex items-end justify-between">
          <div>
            <p className="text-xs text-ink-500 mb-0.5">Starting from</p>
            <p className="text-lg font-bold text-ink-900 font-mono tabular">₹{trek.basePrice.toLocaleString()}</p>
          </div>
          {trek.slotsRemaining !== undefined && (
            <div className={`flex items-center gap-1.5 text-sm font-medium font-mono tabular ${urgency ? 'text-rust-600' : 'text-ink-600'}`}>
              <Users className="w-4 h-4" />
              {trek.slotsRemaining} {trek.slotsRemaining === 1 ? 'spot' : 'spots'}
            </div>
          )}
        </div>
      </div>
    </MotionLink>
  );
}
