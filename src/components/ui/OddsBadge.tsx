import React from 'react';

export type OddsLevel = 'high' | 'medium' | 'boost';

export function scoreToOdds(matchScore: number): OddsLevel {
  if (matchScore >= 85) return 'high';
  if (matchScore >= 70) return 'medium';
  return 'boost';
}

const LABELS: Record<OddsLevel, { title: string; className: string }> = {
  high: {
    title: 'High',
    className: 'ar-badge-green',
  },
  medium: {
    title: 'Medium',
    className: 'ar-badge-amber',
  },
  boost: {
    title: 'Boost Needed',
    className: 'ar-badge-rose',
  },
};

export const OddsBadge: React.FC<{ score: number; className?: string }> = ({ score, className = '' }) => {
  const odds = scoreToOdds(score);
  const meta = LABELS[odds];
  return (
    <span className={`ar-badge gap-1.5 ${meta.className} ${className}`}>
      <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full shrink-0 ${odds === 'high' ? 'bg-emerald-500' : odds === 'medium' ? 'bg-amber-500' : 'bg-rose-500'}`} />
      {meta.title}
    </span>
  );
};
