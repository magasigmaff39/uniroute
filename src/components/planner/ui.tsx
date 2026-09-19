import React from 'react';
import type { DeadlineStatus } from '../../types';
import { ApiError } from '../../lib/api';

type T = (key: string, vars?: Record<string, string | number>) => string;

/** Status colours shared by «Дедлайны», «Задачи» and «Олимпиады» (light and dark theme): tinted blocks such as the date tile. */
export const STATUS_TONE: Record<DeadlineStatus, string> = {
  urgent: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
  soon: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  upcoming: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-500/10 dark:text-blue-200 dark:border-blue-500/25',
  passed: 'bg-slate-50 text-slate-500 border-[var(--line)] dark:bg-zinc-900 dark:text-zinc-400',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  no_date: 'bg-slate-50 text-slate-600 border-[var(--line)] dark:bg-zinc-900 dark:text-zinc-300',
};

/** `ar-badge` tone for each status; passed and undated dates stay neutral. */
const BADGE_TONE: Record<DeadlineStatus, string> = {
  urgent: 'ar-badge-rose',
  soon: 'ar-badge-amber',
  upcoming: 'ar-badge-blue',
  done: 'ar-badge-green',
  passed: '',
  no_date: '',
};

export const StatusBadge: React.FC<{ status: DeadlineStatus; t: T }> = ({ status, t }) => (
  <span className={`ar-badge ${BADGE_TONE[status]}`}>{t(`dl.status.${status}`)}</span>
);

/** "через 12 дн." / "сегодня" / "3 дн. назад" / "дата уточняется". */
export function daysText(t: T, n: number | null) {
  if (n === null) return t('dl.days.none');
  if (n === 0) return t('dl.days.today');
  if (n === 1) return t('dl.days.tomorrow');
  return n > 0 ? t('dl.days.left', { n }) : t('dl.days.ago', { n: -n });
}

export const describeApiError = (t: T, err: unknown) => (err instanceof ApiError ? (err.code === 'NETWORK' ? t('common.backendOffline') : err.message) : t('common.error'));

export const StatTile: React.FC<{ label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: string }> = ({ label, value, hint, tone = 'text-slate-900 dark:text-white' }) => (
  <div className="ar-card px-4 py-3 min-w-0">
    <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 leading-snug">{label}</p>
    <p className={`text-lg sm:text-xl font-semibold tabular-nums mt-1 truncate ${tone}`}>{value}</p>
    {hint && <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">{hint}</p>}
  </div>
);

export const fieldLabelCls = 'ar-label';

/** Filter pill. The selected look comes from `aria-pressed` on the button, so the flag is not needed here. */
export const chipCls = (_on: boolean) => 'ar-chip shrink-0 whitespace-nowrap';

export const localeOf = (lang: string) => (lang === 'en' ? 'en-GB' : lang === 'kk' ? 'kk-KZ' : 'ru-RU');

export function formatDate(iso: string | null | undefined, lang: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  try {
    return new Intl.DateTimeFormat(localeOf(lang), { ...opts, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
  } catch {
    return iso.slice(0, 10);
  }
}
