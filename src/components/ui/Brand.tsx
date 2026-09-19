import React from 'react';

/** The UniRoute mark (U + R with the road turning into an arrow). Transparent PNG, works on light and dark. */
export const BrandMark: React.FC<{ className?: string }> = ({ className = 'h-7' }) => (
  <img src="/brand/uniroute-mark.png" alt="" aria-hidden width={720} height={406} draggable={false} className={`${className} w-auto shrink-0 select-none`} />
);

/** Mark + wordmark; the tagline is the lockup line under the name ("Education Navigation"). */
export const BrandLogo: React.FC<{ tagline?: string; size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ tagline, size = 'md', className = '' }) => {
  const mark = size === 'lg' ? 'h-10' : size === 'sm' ? 'h-6' : 'h-7';
  const name = size === 'lg' ? 'text-[22px]' : size === 'sm' ? 'text-[15px]' : 'text-[17px]';
  return (
    <span className={`inline-flex items-center gap-2.5 min-w-0 ${className}`}>
      <BrandMark className={mark} />
      <span className="min-w-0 text-left">
        <span className={`block font-display font-bold tracking-[-0.02em] leading-none text-slate-950 dark:text-white ${name}`}>UniRoute</span>
        {tagline && <span className="block mt-1 text-[11px] font-medium leading-none text-slate-500 dark:text-zinc-400 truncate">{tagline}</span>}
      </span>
    </span>
  );
};
