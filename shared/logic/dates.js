// Parses the human-readable Russian deadline strings stored in the knowledge base
// ("01 ноября 2026 (ED)", "13–20 июля 2027 (грант)", "15 января 2027") into real dates.
// Shared by the frontend calendar (.ics export) and the backend task generator.
const MONTHS = {
  январ: 0, феврал: 1, март: 2, апрел: 3, ма: 4, июн: 5, июл: 6, август: 7, сентябр: 8, октябр: 9, ноябр: 10, декабр: 11,
};

/** @returns {Date | null} */
export function parseRuDeadline(text) {
  if (!text) return null;
  // "13–20 июля 2027" → the last day of a range is the hard deadline
  const m = /(\d{1,2})(?:\s*[–-]\s*(\d{1,2}))?\s+([а-яё]+)\s+(\d{4})/i.exec(text);
  if (!m) return null;
  const day = Number(m[2] || m[1]);
  const word = m[3].toLowerCase();
  // "ма" must not swallow "март"
  const key = Object.keys(MONTHS).find((k) => word.startsWith(k) && (k !== 'ма' || !word.startsWith('март')));
  if (key === undefined) return null;
  const d = new Date(Date.UTC(Number(m[4]), MONTHS[key], day));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** ISO date (YYYY-MM-DD) or null. */
export function parseRuDeadlineIso(text) {
  const d = parseRuDeadline(text);
  return d ? d.toISOString().slice(0, 10) : null;
}

export const toIcsDate = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');

export function daysUntil(d) {
  if (!d) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

/** Month index (0–11) of a Russian month word in any case form, or null. */
export function ruMonthIndex(word) {
  const w = String(word || '').toLowerCase();
  const key = Object.keys(MONTHS).find((k) => w.startsWith(k) && (k !== 'ма' || (!w.startsWith('март') && w.length <= 3)));
  return key === undefined ? null : MONTHS[key];
}

const todayUtc = (today) => {
  const t = today instanceof Date ? today : new Date(today || Date.now());
  return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
};

/** Whole days from today (local calendar day) to an ISO date; negative when the date has passed. */
export function daysLeft(iso, today = new Date()) {
  if (!iso) return null;
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return Math.round((Date.UTC(y, m - 1, d) - todayUtc(today)) / 86_400_000);
}

/**
 * "документы до 1 марта" inside a longer deadline string: the day and month after a keyword, in the year of
 * the main date (or the following year when that would put it before the main date's month).
 * @returns {string | null} ISO date
 */
export function parseRuDayMonth(text, baseYear) {
  const m = /(\d{1,2})\s+([а-яё]+)(?:\s+(\d{4}))?/i.exec(String(text || ''));
  if (!m) return null;
  const month = ruMonthIndex(m[2]);
  if (month === null) return null;
  const year = Number(m[3]) || Number(baseYear);
  if (!year) return null;
  const d = new Date(Date.UTC(year, month, Number(m[1])));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// Season words used by the olympiad catalogue ("весна–лето") → the month the season ends in.
const SEASON_END = { зима: 1, зимой: 1, зимы: 1, весна: 4, весной: 4, весны: 4, лето: 7, летом: 7, лета: 7, осень: 10, осенью: 10, осени: 10 };

const endOfMonthIso = (year, month) => new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10);

/**
 * Nearest upcoming end of a registration window written in words: "сентябрь–октябрь", "до конца марта",
 * "подача до 15 июня", "Early Action — ноябрь, Regular — январь". The catalogue gives months, not exact
 * dates, so the result is an approximation (the last day of the window) and null when there is no window
 * at all ("через сборную", "постоянно").
 * @returns {string | null} ISO date
 */
export function nextRegistrationDeadline(text, today = new Date()) {
  const src = String(text || '').toLowerCase();
  if (!src) return null;
  const now = todayUtc(today);
  const year = new Date(now).getUTCFullYear();
  const upcoming = (iso) => (Date.parse(iso) >= now ? iso : null);
  const rollYear = (makeIso) => upcoming(makeIso(year)) || makeIso(year + 1);

  // An explicit day: "до 15 июня", "до 1 апреля".
  const exact = /(?:до|по)\s+(\d{1,2})\s+([а-яё]+)(?:\s+(\d{4}))?/.exec(src);
  if (exact && ruMonthIndex(exact[2]) !== null) {
    const month = ruMonthIndex(exact[2]);
    const day = Number(exact[1]);
    if (exact[3]) return new Date(Date.UTC(Number(exact[3]), month, day)).toISOString().slice(0, 10);
    return rollYear((y) => new Date(Date.UTC(y, month, day)).toISOString().slice(0, 10));
  }

  // Months and seasons; the first word of a range ("сентябрь–октябрь") only opens the window.
  const ends = [];
  const tokenRe = /[а-яё]+/g;
  let m;
  while ((m = tokenRe.exec(src))) {
    const word = m[0];
    const month = ruMonthIndex(word) ?? SEASON_END[word] ?? null;
    if (month === null) continue;
    const rest = src.slice(m.index + word.length);
    const opensRange = /^\s*[–—-]\s*([а-яё]+)/.exec(rest);
    if (opensRange && (ruMonthIndex(opensRange[1]) !== null || SEASON_END[opensRange[1]] !== undefined)) continue;
    ends.push(month);
  }
  if (!ends.length) return null;
  return ends.map((month) => rollYear((y) => endOfMonthIso(y, month))).sort()[0];
}
