// University news: Google News RSS (no API key) → normalised headlines, cached in SQLite.
// The AI layer summarises these together with a live web-search pass (groq/compound).
import { cacheGet, cacheSet } from '../db/store.js';
import { config } from '../config.js';

const UA = 'Mozilla/5.0 (compatible; UniRouteBot/1.0; +https://uniroute.local)';

function decodeEntities(s) {
  return String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, '')
    .trim();
}

/** Very small RSS 2.0 parser — enough for Google News feeds. */
export function parseRss(xml) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) && items.length < 40) {
    const block = m[1];
    const pick = (tag) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i').exec(block);
      return r ? decodeEntities(r[1]) : '';
    };
    const title = pick('title');
    if (!title) continue;
    items.push({
      title,
      link: pick('link'),
      pubDate: pick('pubDate'),
      source: pick('source'),
      description: pick('description').slice(0, 300),
    });
  }
  return items;
}

async function fetchFeed(query, lang) {
  const hl = lang === 'ru' ? 'ru' : lang === 'kk' ? 'kk' : 'en-US';
  const gl = lang === 'en' ? 'US' : 'KZ';
  const ceid = lang === 'ru' ? 'KZ:ru' : lang === 'kk' ? 'KZ:kk' : 'US:en';
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, text/xml' }, signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`Google News ${res.status}`);
  return parseRss(await res.text());
}

/**
 * Headlines for a university: English + Russian feeds merged, de-duplicated, newest first.
 * @returns {Promise<{items: Array, fetchedAt: string, cached: boolean}>}
 */
export async function getUniversityNews(uni, { limit = 12 } = {}) {
  const key = `news:${uni.id}`;
  const cached = await cacheGet(key);
  if (cached) return { ...cached, cached: true };

  const queries = [
    { q: `"${uni.name}" admissions OR students OR ranking OR scholarship`, lang: 'en' },
    { q: `${uni.shortName || uni.name} университет`, lang: 'ru' },
  ];
  const results = await Promise.allSettled(queries.map(({ q, lang }) => fetchFeed(q, lang)));
  const merged = [];
  const seen = new Set();
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const item of r.value) {
      const k = item.title.toLowerCase().slice(0, 80);
      if (seen.has(k)) continue;
      seen.add(k);
      merged.push({ ...item, ts: Date.parse(item.pubDate) || 0 });
    }
  }
  merged.sort((a, b) => b.ts - a.ts);
  const items = merged.slice(0, limit).map(({ ts, ...rest }) => rest);
  const payload = { items, fetchedAt: new Date().toISOString(), cached: false };
  if (items.length) cacheSet(key, payload, config.cache.newsMs).catch(() => {});
  return payload;
}

/** Sector-wide headlines (visa policy, rankings, grants) used by the assistant's context. */
export async function getSectorNews(region = 'all', lang = 'ru') {
  const key = `news:sector:${region}:${lang}`;
  const cached = await cacheGet(key);
  if (cached) return { ...cached, cached: true };
  const queries = {
    kazakhstan: lang === 'ru' ? 'ЕНТ гранты университеты Казахстан' : 'Kazakhstan universities grants UNT',
    usa_canada: 'international students US universities visa admissions 2026',
    europe: 'international students Europe universities tuition scholarship 2026',
    asia: 'KAIST HKUST NUS international admissions scholarship 2026',
    all: lang === 'ru' ? 'поступление в университет 2026 абитуриенты' : 'university admissions 2026 international students',
  };
  let items = [];
  try {
    items = await fetchFeed(queries[region] || queries.all, lang === 'kk' ? 'ru' : lang);
  } catch {
    items = [];
  }
  const payload = { items: items.slice(0, 10), fetchedAt: new Date().toISOString(), cached: false };
  if (items.length) cacheSet(key, payload, config.cache.newsMs).catch(() => {});
  return payload;
}
