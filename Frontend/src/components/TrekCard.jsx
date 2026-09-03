import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Users } from 'lucide-react';

const difficultyColors = {
  easy: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  moderate: 'bg-amber-100 text-amber-800 border-amber-200',
  hard: 'bg-orange-100 text-orange-800 border-orange-200',
  extreme: 'bg-rose-100 text-rose-800 border-rose-200'
};

export default function TrekCard({ trek, compact = false }) {
  const urgency = trek.slotsRemaining <= 3;

  if (compact) {
    return (
      <Link to={`/trek/${trek.trekId}`} className="flex gap-3 p-3 rounded-xl border border-stone-200 bg-white hover:border-emerald-300 hover:shadow-sm transition-all group">
        <img src={trek.coverPhoto} alt={trek.name} className="w-20 h-20 object-cover rounded-lg group-hover:scale-105 transition-transform duration-300" />
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <h4 className="font-semibold text-stone-900 text-sm leading-tight mb-1 truncate">{trek.name}</h4>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${difficultyColors[trek.difficulty]}`}>
              {trek.difficulty}
            </span>
            <span className="text-xs text-stone-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {trek.durationDays ? `${trek.durationDays}d` : trek.duration}
            </span>
          </div>
          <p className="text-sm font-semibold text-stone-900">₹{trek.basePrice.toLocaleString()}</p>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/trek/${trek.trekId}`} className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-stone-300 hover:shadow-xl hover:shadow-stone-900/[0.08] hover:-translate-y-0.5 transition-all duration-300">
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        <img src={trek.coverPhoto} alt={trek.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        <div className="absolute top-4 left-4">
          <span className={`text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-md ${difficultyColors[trek.difficulty]}`}>
            {trek.difficulty}
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-stone-900 line-clamp-1 tracking-tight">{trek.name}</h3>
        </div>

        <div className="flex items-center text-sm text-stone-500 gap-4 mb-4">
          <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {trek.region}</span>
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {trek.durationDays ? `${trek.durationDays} days` : trek.duration}</span>
        </div>

        <div className="mt-auto pt-4 border-t border-stone-100 flex items-end justify-between">
          <div>
            <p className="text-xs text-stone-500 mb-0.5">Starting from</p>
            <p className="text-lg font-bold text-stone-900">₹{trek.basePrice.toLocaleString()}</p>
          </div>
          {trek.slotsRemaining !== undefined && (
            <div className={`flex items-center gap-1.5 text-sm font-medium ${urgency ? 'text-rose-600' : 'text-stone-600'}`}>
              <Users className="w-4 h-4" />
              {trek.slotsRemaining} {trek.slotsRemaining === 1 ? 'spot' : 'spots'} left
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
