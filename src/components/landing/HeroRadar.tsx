import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext';
import { UNIVERSITY_DATABASE } from '../../data/universities';
import { UniversityCrest } from '../ui/UniversityCrest';
import { BrandMark } from '../ui/Brand';

/**
 * Title-page chart: the applicant in the centre, universities on three rings by the chance of admission
 * (safety → target → reach). A thin line sweeps round; the university it passes is highlighted, gets a short
 * label and fills the readout below. Plain chart styling in the site's own theme — no glow, no tilt.
 *
 * Timing lives in CSS (index.css, `.radar-*`, one sweep = --radar-period); every node's animation is offset by
 * its angle so it fires exactly when the line passes. The readout reads the sweep's own animation clock.
 */
type Tier = 'safety' | 'target' | 'reach';

const PERIOD = 10; // seconds per sweep — passed to CSS as --radar-period
const RING: Record<Tier, number> = { safety: 0.34, target: 0.6, reach: 0.84 };
const TONE: Record<Tier, { rgb: string; dot: string; text: string }> = {
  safety: { rgb: '28 163 108', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
  target: { rgb: '14 100 210', dot: 'bg-blue-600 dark:bg-blue-400', text: 'text-blue-600 dark:text-blue-300' },
  reach: { rgb: '212 139 15', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
};

// Sorted by angle (clockwise from the top): the order in which the line reaches them.
const TARGETS: { id: string; angle: number; tier: Tier; chance: number }[] = [
  { id: 'nu', angle: 0, tier: 'target', chance: 71 },
  { id: 'kaist', angle: 40, tier: 'reach', chance: 36 },
  { id: 'aitu', angle: 80, tier: 'safety', chance: 92 },
  { id: 'eth', angle: 120, tier: 'target', chance: 46 },
  { id: 'mit', angle: 160, tier: 'reach', chance: 6 },
  { id: 'kimep', angle: 200, tier: 'safety', chance: 89 },
  { id: 'hkust', angle: 240, tier: 'target', chance: 58 },
  { id: 'nus', angle: 280, tier: 'reach', chance: 24 },
  { id: 'kbtu', angle: 320, tier: 'safety', chance: 84 },
];

const PROFILE = ['GPA 4.6', 'IELTS 7.0', 'SAT 1450'];

const polar = (angle: number, r: number) => {
  const a = (angle * Math.PI) / 180;
  return { x: 50 + r * 50 * Math.sin(a), y: 50 - r * 50 * Math.cos(a) };
};

const UNI_BY_ID = new Map(UNIVERSITY_DATABASE.map((u) => [u.id, u]));
const NODES = TARGETS.map((n) => ({ ...n, uni: UNI_BY_ID.get(n.id), pos: polar(n.angle, RING[n.tier]) })).filter((n) => n.uni);

export const HeroRadar: React.FC = () => {
  const { t } = useI18n();
  const sweepRef = useRef<HTMLDivElement>(null);
  const [hit, setHit] = useState(0);

  // The readout follows the sweep: the last university it passed.
  useEffect(() => {
    const id = window.setInterval(() => {
      const time = sweepRef.current?.getAnimations?.()[0]?.currentTime;
      if (typeof time !== 'number') return;
      const angle = (((time / 1000) % PERIOD) / PERIOD) * 360;
      let idx = NODES.length - 1;
      NODES.forEach((n, i) => {
        if (n.angle <= angle) idx = i;
      });
      setHit(idx);
    }, 150);
    return () => window.clearInterval(id);
  }, []);

  const delay = (angle: number) => `${-(PERIOD * (1 - angle / 360)).toFixed(3)}s`;
  const current = NODES[hit] ?? NODES[0];

  return (
    <div className="ar-card w-full max-w-[500px] mx-auto lg:ml-auto overflow-hidden select-none" style={{ ['--radar-period' as string]: `${PERIOD}s` }}>
      {/* Header */}
      <div className="px-5 sm:px-6 pt-5">
        <p className="text-[15px] font-semibold text-slate-900 dark:text-white">{t('landing.radar.title')}</p>
        <p className="text-[13px] text-slate-500 dark:text-zinc-400 mt-0.5">{t('landing.radar.subtitle')}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className="text-xs text-slate-500 dark:text-zinc-400 mr-0.5">{t('landing.radar.profile')}</span>
          {PROFILE.map((p) => (
            <span key={p} className="h-6 px-2 rounded-md bg-slate-100 dark:bg-zinc-800 text-xs font-medium tabular-nums text-slate-700 dark:text-zinc-200 flex items-center">
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative mx-auto mt-3 w-full max-w-[380px] aspect-square px-4" role="img" aria-label={t('landing.radar.aria')}>
        <div className="relative w-full h-full">
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden>
            {[RING.safety, RING.target, RING.reach].map((r) => (
              <circle key={r} cx="50" cy="50" r={r * 50} fill="none" className="stroke-slate-200 dark:stroke-zinc-800" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            ))}
            <circle cx="50" cy="50" r="48" fill="none" className="stroke-slate-200 dark:stroke-zinc-800" strokeWidth="1" strokeDasharray="2 4" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* The sweep: a thin line with a faint trail */}
          <div ref={sweepRef} className="radar-sweep absolute inset-[2%] rounded-full" aria-hidden />

          {/* The applicant */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-[var(--surface-raised)] border border-[var(--line-strong)] shadow-sm flex items-center justify-center" aria-hidden>
            <BrandMark className="h-4" />
          </div>

          {/* Universities */}
          {NODES.map((n) => {
            const d = delay(n.angle);
            const horiz = n.pos.x < 36 ? 'left-0' : n.pos.x > 64 ? 'right-0' : 'left-1/2 -translate-x-1/2';
            // Labels point away from the centre, except on the outer ring where they turn inwards to stay inside.
            const outward = n.tier !== 'reach';
            const vert = (n.pos.y < 50) === outward ? 'bottom-full mb-1.5' : 'top-full mt-1.5';
            return (
              <div key={n.id} className="absolute" style={{ left: `${n.pos.x}%`, top: `${n.pos.y}%` }}>
                <div className="group relative -translate-x-1/2 -translate-y-1/2">
                  <span className="radar-node block rounded-lg" style={{ animationDelay: d, boxShadow: `0 0 0 1.5px rgb(${TONE[n.tier].rgb} / 0.7)` }}>
                    <UniversityCrest uni={n.uni!} size={30} rounded="rounded-lg" />
                  </span>
                  <span
                    className={`radar-label pointer-events-none absolute z-10 ${horiz} ${vert} whitespace-nowrap rounded-md border border-[var(--line)] bg-[var(--surface-raised)] px-1.5 py-0.5 text-[11px] leading-tight shadow-sm group-hover:!opacity-100 group-hover:!transform-none`}
                    style={{ animationDelay: d }}
                  >
                    <span className="font-medium text-slate-800 dark:text-zinc-100">{n.uni!.shortName}</span>{' '}
                    <span className={`font-semibold tabular-nums ${TONE[n.tier].text}`}>{n.chance}%</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-5 mt-2 text-xs text-slate-600 dark:text-zinc-400">
        {(['safety', 'target', 'reach'] as Tier[]).map((tier) => (
          <li key={tier} className="inline-flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${TONE[tier].dot}`} aria-hidden />
            {t(`landing.radar.tier.${tier}`)} <span className="text-slate-400 dark:text-zinc-500">{t(`landing.radar.range.${tier}`)}</span>
          </li>
        ))}
      </ul>

      {/* Readout: what the sweep passed last */}
      {current && (
        <div className="mt-4 border-t border-[var(--line)] bg-[var(--surface-subtle)] px-5 sm:px-6 py-3.5">
          <div className="flex items-center gap-3">
            <UniversityCrest uni={current.uni!} size={34} rounded="rounded-lg" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                <span className="sm:hidden">{current.uni!.shortName}</span>
                <span className="hidden sm:inline">{current.uni!.name}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                {t(`landing.radar.tier.${current.tier}`)} · {current.uni!.city}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className={`font-display text-xl font-bold leading-none tabular-nums ${TONE[current.tier].text}`}>{current.chance}%</p>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">{t('landing.radar.chance')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
