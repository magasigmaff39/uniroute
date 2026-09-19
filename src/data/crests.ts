// University coats of arms / emblems. Each record in the shared knowledge base carries only an emoji
// `logo`, so the real emblem is taken from the university's official site (its favicon is the crest
// in practically every case) through Google's favicon service, which serves 128 px renders and does
// not require an API key. Drop a file into `public/crests/<id>.png|svg` and register it here to
// override a poor favicon with a proper crest.
import type { University } from '../types';

/** Explicit crest sources (absolute URL or a path under `public/`). Take precedence over favicons. */
const CREST_OVERRIDES: Record<string, string> = {};

/** Hosts whose favicon lives elsewhere than `links.website` (e.g. only the `www.` host answers). */
const DOMAIN_OVERRIDES: Record<string, string> = {
  kaznpu: 'www.kaznpu.kz',
  bocconi: 'www.unibocconi.it',
  polito: 'www.polito.it',
  utokyo: 'www.u-tokyo.ac.jp',
  tsinghua: 'www.tsinghua.edu.cn',
  kaist: 'www.kaist.ac.kr',
};

export function crestDomain(uni: Pick<University, 'id' | 'links' | 'officialPortalUrl'>): string {
  if (DOMAIN_OVERRIDES[uni.id]) return DOMAIN_OVERRIDES[uni.id];
  const source = uni.links?.website || uni.officialPortalUrl;
  try {
    return new URL(source).hostname;
  } catch {
    return '';
  }
}

export function crestUrl(uni: Pick<University, 'id' | 'links' | 'officialPortalUrl'>, size = 128): string {
  if (CREST_OVERRIDES[uni.id]) return CREST_OVERRIDES[uni.id];
  const host = crestDomain(uni);
  return host ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}` : '';
}

/** Up to three initials for the heraldic fallback ("Nazarbayev University" → "NU", "KAIST" → "KA"). */
export function crestMonogram(uni: Pick<University, 'shortName' | 'name'>): string {
  const words = (uni.shortName || uni.name).replace(/[()]/g, ' ').split(/[\s-]+/).filter(Boolean);
  const initials = words.filter((w) => /^[A-Za-zА-Яа-яЁёӘәІіҢңҒғҮүҰұҚқӨөҺһ]/.test(w)).map((w) => w[0].toUpperCase());
  if (initials.length >= 2) return initials.slice(0, 3).join('');
  return (words[0] || '?').slice(0, 2).toUpperCase();
}

const PALETTES = [
  ['#1d4ed8', '#0ea5e9'],
  ['#7c3aed', '#c026d3'],
  ['#b91c1c', '#f97316'],
  ['#047857', '#10b981'],
  ['#0f172a', '#334155'],
  ['#9a3412', '#d97706'],
  ['#0e7490', '#22d3ee'],
  ['#4338ca', '#6366f1'],
];

/** Stable two-colour gradient per university for the fallback shield. */
export function crestPalette(id: string): [string, string] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const [a, b] = PALETTES[h % PALETTES.length];
  return [a, b];
}
