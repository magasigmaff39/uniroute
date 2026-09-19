import React, { useEffect, useState } from 'react';
import type { University } from '../../types';
import { crestUrl, crestMonogram, crestPalette } from '../../data/crests';

type CrestUni = Pick<University, 'id' | 'name' | 'shortName' | 'links' | 'officialPortalUrl'>;

interface UniversityCrestProps {
  uni: CrestUni;
  /** Rendered box size in px (the emblem is fetched at 128 px and scaled down). */
  size?: number;
  className?: string;
  /** Tailwind radius class for the frame. */
  rounded?: string;
  /** Draw the white frame with a hairline border (default) or just the emblem. */
  framed?: boolean;
}

/** Heraldic shield with the university's initials — shown until the real emblem loads, or when it cannot. */
const ShieldFallback: React.FC<{ uni: CrestUni; size: number }> = ({ uni, size }) => {
  // A solid shield in the university's own colour — calmer than a gradient at small sizes.
  const [a] = crestPalette(uni.id);
  const mono = crestMonogram(uni);
  const fontSize = mono.length >= 3 ? 20 : 26;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className="block">
      <path d="M32 6 L54 12 V32 C54 45 44 54 32 59 C20 54 10 45 10 32 V12 Z" fill={a} />
      <path d="M32 10 L50 15 V32 C50 43 41.5 50.5 32 55 C22.5 50.5 14 43 14 32 V15 Z" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" />
      <text x="32" y="38" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontWeight="800" fontSize={fontSize} fill="#fff" letterSpacing="-0.5">
        {mono}
      </text>
    </svg>
  );
};

/**
 * Coat of arms of a university. Shows the official emblem (favicon of the official site) on a white
 * frame, with a monogram shield while it loads and when the network blocks it.
 */
export const UniversityCrest: React.FC<UniversityCrestProps> = ({ uni, size = 40, className = '', rounded = 'rounded-xl', framed = true }) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const src = crestUrl(uni);
  const inner = Math.round(size * (framed ? 0.72 : 1));
  // The emblems are drawn for a light background, so the frame stays light in the dark theme too.
  const frame = framed ? 'bg-white border border-slate-200 shadow-xs dark:!bg-zinc-50 dark:border-zinc-700' : '';

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  return (
    <span
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden ${rounded} ${frame} ${className}`}
      style={{ width: size, height: size }}
      title={uni.name}
    >
      {(!loaded || failed) && (
        <span className="absolute inset-0 flex items-center justify-center">
          <ShieldFallback uni={uni} size={inner} />
        </span>
      )}
      {src && !failed && (
        <img
          src={src}
          alt={`${uni.shortName || uni.name} — герб`}
          width={inner}
          height={inner}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`relative object-contain transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          style={{ width: inner, height: inner }}
        />
      )}
    </span>
  );
};
