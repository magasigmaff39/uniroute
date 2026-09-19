import React from 'react';

/** Title block every cabinet section starts with: where you are, what this page is for. */
export const SectionHeader: React.FC<{ kicker: string; title: string; subtitle?: string; aside?: React.ReactNode }> = ({ kicker, title, subtitle, aside }) => (
  <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-1">
    <div className="min-w-0">
      <p className="ar-kicker mb-1.5">{kicker}</p>
      <h1 className="text-2xl sm:text-[28px] leading-tight font-bold text-slate-950 dark:text-white [text-wrap:balance]">{title}</h1>
      {subtitle && <p className="text-sm sm:text-[15px] text-slate-500 dark:text-zinc-400 mt-2 max-w-2xl leading-relaxed">{subtitle}</p>}
    </div>
    {aside && <div className="shrink-0">{aside}</div>}
  </div>
);

/** Segmented tabs inside a section. */
export function SectionTabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string }[] }) {
  return (
    <div role="tablist" className="inline-flex max-w-full overflow-x-auto p-1 gap-0.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-[var(--line)] hide-scrollbar">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={`h-9 px-3.5 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] duration-150 ${
            value === item.id
              ? 'bg-white text-slate-950 shadow-sm dark:bg-zinc-800 dark:text-white'
              : 'text-slate-500 hover:text-slate-900 hover:bg-white/60 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800/50'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

/** Shown instead of a section that has nothing to compute from yet — one sentence and one button. */
export const EmptyState: React.FC<{ icon: React.ReactNode; title: string; text: string; cta: string; onClick: () => void }> = ({ icon, title, text, cta, onClick }) => (
  <div className="ar-card px-6 py-14 text-center flex flex-col items-center">
    <span className="ar-icon-tile !w-12 !h-12 !rounded-xl">{icon}</span>
    <h2 className="text-lg font-semibold text-slate-950 dark:text-white mt-4">{title}</h2>
    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1.5 max-w-md leading-relaxed">{text}</p>
    <button type="button" onClick={onClick} className="ar-btn ar-btn-primary mt-6">
      {cta}
    </button>
  </div>
);

/** Thin progress bar with a label and a percentage. */
export const Meter: React.FC<{ value: number; label?: string; tone?: 'blue' | 'emerald' }> = ({ value, label, tone = 'blue' }) => (
  <div>
    {label && (
      <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-zinc-400 mb-1.5">
        <span>{label}</span>
        <span className="tabular-nums font-semibold text-slate-900 dark:text-white">{Math.round(value)}%</span>
      </div>
    )}
    <div className="h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
      <div
        className={`h-full rounded-full transition-[width] duration-700 ${tone === 'emerald' ? 'bg-emerald-500' : 'bg-blue-600 dark:bg-blue-500'}`}
        style={{ width: `${Math.max(3, Math.min(100, value))}%` }}
      />
    </div>
  </div>
);
