import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Trophy, Loader2, Target, Search, ExternalLink, CalendarPlus, Briefcase, Globe, MapPin, Wifi, AlertTriangle, ChevronDown, ChevronUp, Star, ListChecks, CalendarClock } from 'lucide-react';
import type { ApplicantProfile, Olympiad, OlympiadAdvice, PortfolioItemInput, UserTask } from '../types';
import { olympiadsApi, tasksApi, ApiError, type NewTask } from '../lib/api';
import { nextRegistrationDeadline, daysLeft } from '../../shared/logic/dates.js';
import { useI18n } from '../i18n/I18nContext';
import { useToast } from '../context/ToastContext';
import { Markdown } from './ui/Markdown';
import { useProgressCaptions } from '../hooks/useProgressCaptions';
import { daysText, formatDate } from './planner/ui';

interface OlympiadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  profile: ApplicantProfile;
  onAddToPortfolio: (draft: Partial<PortfolioItemInput>) => void;
  /** `page` renders inline as the «Олимпиады» cabinet section (no overlay, no close button). */
  variant?: 'modal' | 'page';
  /** Favourites: their registration dates appear in «Дедлайны». */
  favoriteIds?: string[];
  onToggleFavorite?: (id: string) => void;
  /** Tasks of the applicant — to show which olympiads already have one. */
  tasks?: UserTask[];
  onCreateTask?: (task: NewTask) => Promise<unknown>;
  onOpenTasks?: () => void;
  onOpenDeadlines?: () => void;
}

type Tab = 'forYou' | 'catalog' | 'favorites' | 'strategy';

const MONTHS_RU = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_KK = ['қаң', 'ақп', 'нау', 'сәу', 'мам', 'мау', 'шіл', 'там', 'қыр', 'қаз', 'қар', 'жел'];

export const OlympiadsModal: React.FC<OlympiadsModalProps> = ({
  isOpen,
  onClose,
  isAuthenticated,
  onOpenAuth,
  profile,
  onAddToPortfolio,
  variant = 'modal',
  favoriteIds = [],
  onToggleFavorite,
  tasks,
  onCreateTask,
  onOpenTasks,
  onOpenDeadlines,
}) => {
  const isPage = variant === 'page';
  const { t, lang } = useI18n();
  const { notify } = useToast();
  const [tab, setTab] = useState<Tab>('forYou');
  const [catalog, setCatalog] = useState<Olympiad[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; label: string }[]>([]);
  const [categories, setCategories] = useState<Record<string, string>>({});
  const [recommended, setRecommended] = useState<Olympiad[]>([]);
  const [calendar, setCalendar] = useState<{ month: string; items: { id: string; shortName: string; phase: string; url: string }[] }[]>([]);
  const [advice, setAdvice] = useState<OlympiadAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [advising, setAdvising] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('');
  const [region, setRegion] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);

  const monthNames = lang === 'en' ? MONTHS_EN : lang === 'kk' ? MONTHS_KK : MONTHS_RU;

  const adviceCaption = useProgressCaptions(advising, [t('progress.reading'), t('progress.olympiads'), t('progress.plan'), t('progress.finishing')]);

  const describeError = useCallback(
    (err: unknown) => (err instanceof ApiError ? (err.code === 'NETWORK' ? t('common.backendOffline') : err.message) : err instanceof Error ? err.message : t('common.error')),
    [t],
  );

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    Promise.all([olympiadsApi.list(), olympiadsApi.recommend(profile, 14)])
      .then(([list, rec]) => {
        setCatalog(list.items);
        setSubjects(list.subjects);
        setCategories(list.categories);
        setRecommended(rec.items);
        setCalendar(rec.calendar);
      })
      .catch((err) => setError(describeError(err)))
      .finally(() => setLoading(false));
  }, [isOpen, profile, describeError]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return catalog.filter((o) => {
      if (subject && !o.subjects.includes(subject)) return false;
      if (category && o.category !== category) return false;
      if (region && o.region !== region) return false;
      if (onlineOnly && !o.online) return false;
      if (query && !`${o.name} ${o.shortName} ${o.nameEn} ${o.organizer} ${o.description}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [catalog, q, subject, category, region, onlineOnly]);

  // Favourites, soonest registration first (the catalogue gives months, so the date is approximate).
  const favorites = useMemo(
    () =>
      catalog
        .filter((o) => favoriteIds.includes(o.id))
        .map((o) => ({ o, deadline: nextRegistrationDeadline(o.timeline.registration) }))
        .sort((a, b) => (a.deadline && b.deadline ? (a.deadline < b.deadline ? -1 : 1) : a.deadline ? -1 : b.deadline ? 1 : 0)),
    [catalog, favoriteIds],
  );

  // Close the overlay on Escape.
  useEffect(() => {
    if (!isOpen || isPage) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isPage, onClose]);

  if (!isOpen) return null;

  const tabs: Tab[] = onToggleFavorite ? ['forYou', 'catalog', 'favorites', 'strategy'] : ['forYou', 'catalog', 'strategy'];
  const taskFor = (o: Olympiad) => tasks?.find((x) => x.olympiadId === o.id);

  const runAdvice = async () => {
    setAdvising(true);
    setError(null);
    try {
      setAdvice(await olympiadsApi.advice(profile, lang, 8));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setAdvising(false);
    }
  };

  const addRegistrationTask = async (o: Olympiad) => {
    if (!isAuthenticated) {
      notify(t('common.loginRequired'), 'info');
      onOpenAuth();
      return;
    }
    try {
      // Due by the end of the registration window when the catalogue gives one, else the next active month.
      const due = nextRegistrationDeadline(o.timeline.registration) || nextActiveDate(o.monthsActive);
      const task: NewTask = { title: `${t('olympiads.registerFor')} ${o.shortName}`, description: `${o.timeline.registration}. ${o.officialUrl}`, category: 'olympiad', dueDate: due, source: 'olympiads', olympiadId: o.id, deadlineKey: `olymp:${o.id}` };
      if (onCreateTask) await onCreateTask(task);
      else await tasksApi.create(task);
      notify(t('olympiads.taskAdded'), 'success');
    } catch (err) {
      notify(describeError(err), 'error');
    }
  };

  const toPortfolio = (o: Olympiad) => {
    if (!isAuthenticated) {
      notify(t('common.loginRequired'), 'info');
      onOpenAuth();
      return;
    }
    onAddToPortfolio({
      type: o.category === 'olympiad' ? 'olympiad' : 'competition',
      title: o.shortName,
      organization: o.organizer,
      level: o.level === 'international' ? 'international' : o.level === 'republican' ? 'republican' : o.level === 'regional' ? 'regional' : o.level === 'city' ? 'city' : 'school',
      subjects: o.subjects,
      olympiadId: o.id,
      links: [o.officialUrl],
    });
  };

  const recognitionBar = (o: Olympiad) => {
    const regions = profile.targetRegions?.length ? profile.targetRegions : ['kazakhstan', 'usa_canada', 'europe', 'asia'];
    const map: Record<string, keyof Olympiad['recognition']> = { kazakhstan: 'kazakhstan', usa_canada: 'usa', europe: 'europe', asia: 'asia' };
    return (
      <div className="flex flex-wrap gap-1.5">
        {regions.map((r) => {
          const v = o.recognition[map[r]];
          return (
            <span key={r} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
              {t(`region.${r}`)}{' '}
              <span className="tracking-tight text-blue-600 dark:text-blue-400">
                {'●'.repeat(v)}
                <span className="text-slate-300 dark:text-zinc-600">{'●'.repeat(5 - v)}</span>
              </span>
            </span>
          );
        })}
      </div>
    );
  };

  const Card = ({ o, showFit }: { o: Olympiad; showFit?: boolean }) => {
    const open = expanded === o.id;
    const favorite = favoriteIds.includes(o.id);
    const regDeadline = nextRegistrationDeadline(o.timeline.registration);
    const left = daysLeft(regDeadline);
    const linkedTask = taskFor(o);
    return (
      <div className="ar-card p-4 min-w-0 hover:border-[var(--line-strong)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <span className="ar-badge ar-badge-blue">{categories[o.category] || o.category}</span>
              <span className="ar-badge">{t(`olympiads.level.${o.level}`)}</span>
              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-zinc-400">
                {o.online ? <Wifi className="w-3.5 h-3.5" /> : o.region === 'kazakhstan' ? <MapPin className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                {t(`olympiads.region.${o.region}`)}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">{t('olympiads.grades')} {o.grades[0]}–{o.grades[o.grades.length - 1]}</span>
            </div>
            <div className="text-sm font-semibold text-slate-900 dark:text-white leading-snug break-words">{o.shortName}</div>
            <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{o.organizer}</div>
          </div>
          <div className="flex items-start gap-2 shrink-0">
            {showFit && o.fit !== undefined && (
              <div className="text-right">
                <div className="text-xl font-semibold tabular-nums text-slate-900 dark:text-white leading-none">
                  {o.fit}
                  <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">%</span>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">{t('olympiads.fit')}</div>
              </div>
            )}
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(o.id)}
                aria-pressed={favorite}
                aria-label={favorite ? t('olympiads.unfavorite') : t('olympiads.favorite')}
                title={favorite ? t('olympiads.unfavorite') : t('olympiads.favorite')}
                className={`ar-btn ar-btn-icon w-9 h-9 -mt-1 -mr-1 ${favorite ? 'text-amber-500 bg-amber-50 hover:text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-500/10 dark:hover:text-amber-300 dark:hover:bg-amber-500/15' : 'text-slate-400 hover:text-amber-500 dark:text-zinc-500 dark:hover:text-amber-400'}`}
              >
                <Star className="w-4.5 h-4.5" fill={favorite ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-zinc-400 mt-2.5 leading-relaxed">{o.description}</p>
        {o.benefits[0] && (
          <p className="text-sm text-slate-600 dark:text-zinc-400 mt-1.5 leading-relaxed">
            <span className="font-medium text-slate-900 dark:text-white">{t('olympiads.admissionBenefit')}:</span> {o.benefits[0]}
          </p>
        )}
        {showFit && o.reasons?.length ? (
          <ul className="mt-2 space-y-1">
            {o.reasons.slice(0, 3).map((r, i) => (
              <li key={i} className="text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5 leading-relaxed">
                <span className="mt-1.5 w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-xs">
          {[
            [t('olympiads.registration'), o.timeline.registration],
            [t('olympiads.finals'), o.timeline.finals],
            [t('olympiads.cost'), o.cost],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 px-2.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/50">
              <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-zinc-400">{label}</div>
              <div className="text-slate-800 dark:text-zinc-200 mt-0.5 break-words">{value}</div>
            </div>
          ))}
        </div>
        {regDeadline && (
          <p className={`mt-2.5 text-xs flex items-start gap-1.5 ${left !== null && left <= 14 ? 'text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-zinc-400'}`}>
            <CalendarClock className="w-3.5 h-3.5 shrink-0 mt-px" />
            <span className="min-w-0">
              {t('olympiads.regDeadline')}: <strong className="font-semibold">{formatDate(regDeadline, lang)}</strong> · {daysText(t, left)}{' '}
              <span className="text-slate-500 dark:text-zinc-500">({t('dl.src.approximate').toLowerCase()})</span>
            </span>
          </p>
        )}

        <div className="mt-3">{recognitionBar(o)}</div>

        {open && (
          <div className="mt-3 space-y-2.5 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed border-t border-[var(--line)] pt-3 animate-fadeIn">
            <div><span className="font-semibold text-slate-800 dark:text-zinc-200">{t('olympiads.eligibility')}:</span> {o.eligibility}</div>
            <div><span className="font-semibold text-slate-800 dark:text-zinc-200">{t('olympiads.stages')}:</span> {o.timeline.stages}</div>
            <div>
              <div className="font-semibold text-slate-800 dark:text-zinc-200 mb-0.5">{t('olympiads.benefits')}</div>
              <ul className="list-disc pl-4 space-y-0.5">{o.benefits.map((b, i) => <li key={i}>{b}</li>)}</ul>
            </div>
            <div className="px-3 py-2.5 rounded-xl border border-blue-100 bg-blue-50/60 text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-100">
              <span className="font-semibold">{t('olympiads.tips')}:</span> {o.tips}
            </div>
            <div className="text-slate-500 dark:text-zinc-400">
              {t('olympiads.difficulty')}: <span className="text-amber-500">{'★'.repeat(o.difficulty)}</span>
              <span className="text-slate-300 dark:text-zinc-600">{'★'.repeat(5 - o.difficulty)}</span> · {t('olympiads.format')}: {t(`olympiads.fmt.${o.format}`)} · {o.languages.join('/')}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <a href={o.officialUrl} target="_blank" rel="noreferrer" className="ar-btn ar-btn-primary ar-btn-sm">
            <ExternalLink className="w-4 h-4" /> {t('olympiads.site')}
          </a>
          {linkedTask ? (
            <button type="button" onClick={onOpenTasks} className="ar-btn ar-btn-secondary ar-btn-sm text-emerald-700 dark:text-emerald-300">
              <ListChecks className="w-4 h-4" /> {t('dl.taskLinked', { status: t(`tasks.status.${linkedTask.status}`) })}
            </button>
          ) : (
            <button type="button" onClick={() => addRegistrationTask(o)} className="ar-btn ar-btn-secondary ar-btn-sm">
              <CalendarPlus className="w-4 h-4" /> {t('olympiads.addTask')}
            </button>
          )}
          <button type="button" onClick={() => toPortfolio(o)} className="ar-btn ar-btn-secondary ar-btn-sm">
            <Briefcase className="w-4 h-4" /> {t('olympiads.addPortfolio')}
          </button>
          <button type="button" onClick={() => setExpanded(open ? null : o.id)} aria-expanded={open} className="ar-btn ar-btn-quiet ar-btn-sm ml-auto">
            {open ? <>{t('common.hide')} <ChevronUp className="w-4 h-4" /></> : <>{t('common.details')} <ChevronDown className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    );
  };

  const tabLabel = (k: Tab) => (k === 'favorites' ? `${t('olympiads.tab.favorites')}${favoriteIds.length ? ` · ${favoriteIds.length}` : ''}` : t(`olympiads.tab.${k}`));

  return (
    <div
      className={isPage ? 'py-2 sm:py-4' : 'fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-[2px] animate-fadeIn'}
      role={isPage ? undefined : 'dialog'}
      aria-modal={isPage ? undefined : true}
      aria-label={t('olympiads.title')}
      onMouseDown={(e) => {
        if (!isPage && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)] ${
          isPage ? 'shadow-[var(--shadow-card)]' : 'max-w-5xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] shadow-[var(--shadow-overlay)] animate-popIn'
        }`}
      >
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--line)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="ar-icon-tile">
              <Trophy className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 className={`${isPage ? 'text-base' : 'text-lg'} font-semibold text-slate-900 dark:text-white leading-tight sm:truncate`}>{t('olympiads.title')}</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                {t('olympiads.subtitle')} · <span className="tabular-nums">{catalog.length}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden md:flex items-center rounded-xl border border-[var(--line)] bg-slate-100 dark:bg-zinc-900 p-1">
              {tabs.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  aria-pressed={tab === k}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    tab === k ? 'bg-white text-slate-900 shadow-sm dark:bg-zinc-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                  }`}
                >
                  {tabLabel(k)}
                </button>
              ))}
            </div>
            {!isPage && (
              <button type="button" onClick={onClose} className="ar-btn ar-btn-icon" aria-label={t('common.close')} title={t('common.close')}>
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        <div className="md:hidden px-4 sm:px-6 pt-3 grid grid-cols-2 gap-2 shrink-0">
          {tabs.map((k) => (
            <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k} className="ar-chip justify-center min-h-10 min-w-0 text-center">
              <span className="truncate">{tabLabel(k)}</span>
            </button>
          ))}
        </div>

        <div className={`p-4 sm:p-6 space-y-4 text-xs ${isPage ? '' : 'flex-1 min-h-0 overflow-y-auto'}`}>
          {tab === 'favorites' && !loading && (
            <>
              <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">{t('olympiads.favoritesHint')}</p>
              {favorites.length === 0 ? (
                <div className="px-6 py-10 rounded-2xl border border-dashed border-[var(--line-strong)] flex flex-col items-center text-center gap-3">
                  <span className="ar-icon-tile w-12 h-12 rounded-2xl">
                    <Star className="w-6 h-6" />
                  </span>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('olympiads.favoritesEmpty')}</p>
                  <button type="button" onClick={() => setTab('forYou')} className="ar-btn ar-btn-secondary ar-btn-sm">{t('olympiads.tab.forYou')}</button>
                </div>
              ) : (
                <>
                  <ul className="ar-card divide-y divide-[var(--line)] overflow-hidden">
                    {favorites.map(({ o, deadline }) => {
                      const left = daysLeft(deadline);
                      const linked = taskFor(o);
                      return (
                        <li key={o.id} className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{o.shortName}</p>
                            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                              {t('olympiads.registration')}: {o.timeline.registration} · {t('olympiads.finals')}: {o.timeline.finals}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <span className={`text-xs font-semibold ${left !== null && left <= 14 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-zinc-300'}`}>
                              {deadline ? `${formatDate(deadline, lang, { day: 'numeric', month: 'short', year: 'numeric' })} · ${daysText(t, left)}` : t('dl.days.none')}
                            </span>
                            {linked ? (
                              <button type="button" onClick={onOpenTasks} className="ar-btn ar-btn-secondary ar-btn-sm text-emerald-700 dark:text-emerald-300">
                                <ListChecks className="w-4 h-4" /> {t(`tasks.status.${linked.status}`)}
                              </button>
                            ) : (
                              <button type="button" onClick={() => addRegistrationTask(o)} className="ar-btn ar-btn-secondary ar-btn-sm">
                                <CalendarPlus className="w-4 h-4" /> {t('olympiads.addTask')}
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {onOpenDeadlines && (
                    <button type="button" onClick={onOpenDeadlines} className="ar-link text-sm min-h-9">
                      <CalendarClock className="w-4 h-4" /> {t('olympiads.toDeadlines')}
                    </button>
                  )}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{favorites.map(({ o }) => <Card key={o.id} o={o} />)}</div>
                </>
              )}
            </>
          )}
          {error && (
            <div className="ar-notice ar-notice-error" role="alert">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <span className="min-w-0">{error}</span>
            </div>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400 justify-center py-6" aria-live="polite">
              <Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading')}
            </div>
          )}

          {tab === 'forYou' && !loading && (
            <>
              <div className="p-4 rounded-2xl border border-[var(--line)] bg-slate-50 dark:bg-zinc-900/60">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{t('olympiads.calendarTitle')}</h4>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-12 gap-1.5">
                  {calendar.map((m) => {
                    const mi = Number(m.month.slice(5)) - 1;
                    return (
                      <div
                        key={m.month}
                        className={`min-w-0 rounded-lg p-1.5 border text-center ${m.items.length ? 'bg-[var(--surface-raised)] border-[var(--line)]' : 'bg-transparent border-dashed border-[var(--line-strong)]'}`}
                      >
                        <div className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 uppercase">{monthNames[mi]}</div>
                        <div className="mt-1 space-y-0.5">
                          {m.items.slice(0, 3).map((it) => (
                            <a
                              key={it.id}
                              href={it.url}
                              target="_blank"
                              rel="noreferrer"
                              title={it.shortName}
                              className={`block truncate text-[11px] leading-4 rounded px-1 py-0.5 transition-colors ${
                                it.phase === 'registration'
                                  ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                              }`}
                            >
                              {it.shortName}
                            </a>
                          ))}
                          {m.items.length > 3 && <div className="text-[11px] text-slate-500 dark:text-zinc-400">+{m.items.length - 3}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-600 dark:bg-blue-500 inline-block" /> {t('olympiads.phaseRegistration')}</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-200 dark:bg-zinc-700 inline-block" /> {t('olympiads.phaseActive')}</span>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">{t('olympiads.forYouHint')}</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{recommended.map((o) => <Card key={o.id} o={o} showFit />)}</div>
            </>
          )}

          {tab === 'catalog' && !loading && (
            <>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative basis-full sm:basis-auto sm:flex-1 sm:min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('olympiads.search')} aria-label={t('olympiads.search')} className="ar-input min-h-10 py-2 pl-9" />
                </div>
                <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label={t('olympiads.allSubjects')} className="ar-input min-h-10 py-2 flex-1 min-w-[9rem] sm:flex-none sm:w-auto">
                  <option value="">{t('olympiads.allSubjects')}</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label={t('olympiads.allCategories')} className="ar-input min-h-10 py-2 flex-1 min-w-[9rem] sm:flex-none sm:w-auto">
                  <option value="">{t('olympiads.allCategories')}</option>
                  {Object.entries(categories).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
                <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label={t('olympiads.allRegions')} className="ar-input min-h-10 py-2 flex-1 min-w-[9rem] sm:flex-none sm:w-auto">
                  <option value="">{t('olympiads.allRegions')}</option>
                  {['kazakhstan', 'cis', 'international', 'online'].map((r) => <option key={r} value={r}>{t(`olympiads.region.${r}`)}</option>)}
                </select>
                <label className="inline-flex items-center gap-2 min-h-10 px-1 text-sm text-slate-700 dark:text-zinc-300 cursor-pointer">
                  <input type="checkbox" checked={onlineOnly} onChange={(e) => setOnlineOnly(e.target.checked)} className="w-4 h-4 rounded accent-blue-600 cursor-pointer" /> {t('olympiads.onlineOnly')}
                </label>
              </div>
              <div className="text-sm text-slate-500 dark:text-zinc-400">
                {t('olympiads.found')}: <strong className="font-semibold tabular-nums text-slate-900 dark:text-white">{filtered.length}</strong>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{filtered.map((o) => <Card key={o.id} o={o} />)}</div>
            </>
          )}

          {tab === 'strategy' && !loading && (
            <>
              <div className="p-4 sm:p-5 rounded-2xl border border-blue-100 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/10 space-y-3">
                <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">{t('olympiads.strategyIntro')}</p>
                <button type="button" onClick={runAdvice} disabled={advising} aria-busy={advising} className="ar-btn ar-btn-primary w-full whitespace-normal text-center">
                  {advising ? <><Loader2 className="w-4 h-4 animate-spin" /> {adviceCaption || t('ai.analyze.running')}</> : <><Target className="w-4 h-4" /> {t('olympiads.buildStrategy')}</>}
                </button>
              </div>
              {advice && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="ar-card p-4 sm:p-5 text-sm"><Markdown text={advice.summary} /></div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {advice.picks.map((p, i) => (
                      <div key={p.id} className="ar-card p-4 space-y-2 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 text-sm font-semibold text-slate-900 dark:text-white break-words">
                            {i + 1}.{' '}
                            <a href={p.url} target="_blank" rel="noreferrer" className="hover:text-blue-700 hover:underline underline-offset-2 dark:hover:text-blue-300">{p.name}</a>
                          </div>
                          <span className="ar-badge ar-badge-blue shrink-0 max-w-[50%] whitespace-normal">{p.targetResult}</span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">{p.why}</p>
                        <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed"><span className="font-semibold text-slate-800 dark:text-zinc-200">{t('olympiads.whenToRegister')}:</span> {p.whenToRegister}</p>
                        <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed"><span className="font-semibold text-slate-800 dark:text-zinc-200">{t('olympiads.prepPlan')}:</span> {p.prepPlan}</p>
                        {(() => {
                          const o = catalog.find((x) => x.id === p.id);
                          return o ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              <button type="button" onClick={() => addRegistrationTask(o)} className="ar-btn ar-btn-secondary ar-btn-sm">
                                <CalendarPlus className="w-4 h-4" /> {t('olympiads.addTask')}
                              </button>
                              <button type="button" onClick={() => toPortfolio(o)} className="ar-btn ar-btn-secondary ar-btn-sm">
                                <Briefcase className="w-4 h-4" /> {t('olympiads.addPortfolio')}
                              </button>
                            </div>
                          ) : null;
                        })()}
                      </div>
                    ))}
                  </div>
                  {advice.yearPlan && (
                    <div className="ar-card p-4 sm:p-5 text-sm">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">{t('olympiads.yearPlan')}</h4>
                      <Markdown text={advice.yearPlan} compact />
                    </div>
                  )}
                  {advice.warnings?.length > 0 && (
                    <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10">
                      <h4 className="flex items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-200 mb-1.5">
                        <AlertTriangle className="w-4 h-4 shrink-0" /> {t('olympiads.warnings')}
                      </h4>
                      <ul className="list-disc pl-5 text-sm text-amber-900 dark:text-amber-100 space-y-1 leading-relaxed">{advice.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
                    </div>
                  )}
                  <div className="text-[11px] text-slate-500 dark:text-zinc-500">{advice.model}</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function nextActiveDate(months: number[]): string | null {
  if (!months?.length) return null;
  const now = new Date();
  const cur = now.getMonth() + 1;
  let best = 13;
  for (const m of months) {
    const d = (m - cur + 12) % 12;
    if (d < best) best = d;
  }
  const target = new Date(now.getFullYear(), now.getMonth() + best, 15);
  return target.toISOString().slice(0, 10);
}
