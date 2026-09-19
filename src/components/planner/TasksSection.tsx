import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, Circle, Clock, Loader2, Plus, ListPlus, Trash2, CalendarDays, FileText, Trophy, CalendarClock, ListChecks, AlertCircle } from 'lucide-react';
import type { ApplicantProfile, DeadlineItem, NavTarget, TaskCategory, University, UserTask } from '../../types';
import type { Planner } from '../../hooks/usePlanner';
import type { TasksStore } from '../../hooks/useTasks';
import { buildDeadlines, sortDeadlines } from '../../utils/deadlines';
import { daysLeft } from '../../../shared/logic/dates.js';
import { OLYMPIAD_BY_ID } from '../../../shared/data/olympiads.js';
import { UNIVERSITY_BY_ID } from '../../data/universities';
import { useI18n } from '../../i18n/I18nContext';
import { useToast } from '../../context/ToastContext';
import { UniversityCrest } from '../ui/UniversityCrest';
import { EmptyState, SectionHeader } from '../cabinet/ui';
import { StatTile, chipCls, daysText, describeApiError, formatDate } from './ui';

interface TasksSectionProps {
  profile: ApplicantProfile;
  universities: University[];
  planner: Planner;
  tasks: TasksStore;
  onNavigate: (target: NavTarget) => void;
  onOpenEssay: () => void;
}

const CATEGORIES: TaskCategory[] = ['documents', 'essay', 'portfolio', 'ielts', 'sat', 'unt', 'application', 'olympiad', 'other'];

/** Typical admission tasks: one tap fills the form, the applicant only picks the university and the date. */
const TEMPLATES: { key: string; category: TaskCategory; deadline?: string }[] = [
  { key: 'docs', category: 'documents', deadline: 'docs' },
  { key: 'essay', category: 'essay', deadline: 'app' },
  { key: 'portfolio', category: 'portfolio', deadline: 'app' },
  { key: 'language', category: 'ielts', deadline: 'lang' },
  { key: 'recommendation', category: 'documents', deadline: 'docs' },
  { key: 'submit', category: 'application', deadline: 'app' },
  { key: 'extraDocs', category: 'documents', deadline: 'docs' },
];

type Filter = 'open' | 'all' | 'done';
const emptyForm = { title: '', category: 'documents' as TaskCategory, dueDate: '', universityId: '', deadlineKey: '', olympiadId: '' };

/** «Задачи»: the applicant's preparation checklist, linked to universities, deadlines and olympiads. */
export const TasksSection: React.FC<TasksSectionProps> = ({ profile, universities, planner, tasks, onNavigate, onOpenEssay }) => {
  const { t, lang } = useI18n();
  const { notify } = useToast();
  const [filter, setFilter] = useState<Filter>('open');
  const [uniFilter, setUniFilter] = useState('all');
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const deadlines = useMemo(() => buildDeadlines({ profile, universities, planner: planner.planner }), [profile, universities, planner.planner]);
  const deadlineById = useMemo(() => new Map(deadlines.map((d) => [d.id, d])), [deadlines]);
  const deadlineTitle = (d: DeadlineItem) => d.title ?? t(d.titleKey || '', d.titleVars);
  const openDeadlines = useMemo(() => sortDeadlines(deadlines.filter((d) => d.date && ['urgent', 'soon', 'upcoming'].includes(d.status)), 'date'), [deadlines]);

  const list = tasks.tasks;
  const done = list.filter((x) => x.status === 'done').length;
  const inProgress = list.filter((x) => x.status === 'in_progress').length;
  const overdue = list.filter((x) => x.timeliness === 'overdue').length;
  const percent = list.length ? Math.round((done / list.length) * 100) : 0;

  const byUniversity = useMemo(() => {
    const rows = universities.map((u) => {
      const own = list.filter((x) => x.universityId === u.id);
      return { uni: u, total: own.length, done: own.filter((x) => x.status === 'done').length };
    });
    return rows.filter((r) => r.total > 0);
  }, [universities, list]);

  const visible = useMemo(
    () =>
      list.filter(
        (x) =>
          (filter === 'all' || (filter === 'done' ? x.status === 'done' : x.status !== 'done')) &&
          (uniFilter === 'all' || (uniFilter === 'none' ? !x.universityId : x.universityId === uniFilter)),
      ),
    [list, filter, uniFilter],
  );

  const pickDeadline = (key: string, next = form) => {
    const d = deadlineById.get(key);
    setForm({ ...next, deadlineKey: key, dueDate: next.dueDate || (d?.date && (d.daysLeft ?? -1) >= 0 ? d.date : ''), universityId: d?.universityId || next.universityId, olympiadId: d?.olympiadId || next.olympiadId });
  };

  const applyTemplate = (tpl: (typeof TEMPLATES)[number]) => {
    const next = { ...form, title: t(`tasks.tpl.${tpl.key}`), category: tpl.category, deadlineKey: '', dueDate: '' };
    const key = next.universityId && tpl.deadline ? `${next.universityId}:${tpl.deadline}` : '';
    if (key && deadlineById.has(key)) pickDeadline(key, next);
    else setForm(next);
    titleRef.current?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      await tasks.create({
        title: form.title.trim(),
        category: form.category,
        dueDate: form.dueDate || null,
        universityId: form.universityId || null,
        deadlineKey: form.deadlineKey || null,
        olympiadId: form.olympiadId || null,
        source: 'manual',
      });
      setForm({ ...emptyForm, universityId: form.universityId });
      notify(t('tasks.added'), 'success');
    } catch (err) {
      notify(describeApiError(t, err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (task: UserTask, status: UserTask['status']) => {
    setBusyId(task.id);
    try {
      await tasks.update(task.id, { status });
    } catch (err) {
      notify(describeApiError(t, err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (task: UserTask) => {
    setBusyId(task.id);
    try {
      await tasks.remove(task.id);
    } catch (err) {
      notify(describeApiError(t, err), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await tasks.generate(profile);
      notify(t('tasks.generated', { n: res.created.length }), 'success');
    } catch (err) {
      notify(describeApiError(t, err), 'error');
    } finally {
      setGenerating(false);
    }
  };

  const timelinessTone: Record<UserTask['timeliness'], string> = {
    done_on_time: 'ar-badge-green',
    done_late: 'ar-badge-amber',
    overdue: 'ar-badge-rose',
    upcoming: 'ar-badge-blue',
    no_deadline: '',
  };

  const favoriteOlympiads = planner.planner.favoriteOlympiadIds.map((id) => OLYMPIAD_BY_ID.get(id)).filter((o): o is NonNullable<typeof o> => Boolean(o));
  const loadError = tasks.error ? describeApiError(t, tasks.error) : null;

  return (
    <div className="space-y-5 py-2 sm:py-4">
      <SectionHeader
        kicker={t('nav.section.tasks')}
        title={t('tasks.page.title')}
        subtitle={t('tasks.page.subtitle')}
        aside={
          <button type="button" onClick={generate} disabled={generating} aria-busy={generating} className="ar-btn ar-btn-secondary">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListPlus className="w-4 h-4 text-blue-600 dark:text-blue-300" />} {t('tasks.generate')}
          </button>
        }
      />

      {/* Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3">
        <div className="ar-card p-4 sm:p-5 space-y-4 min-w-0">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('tasks.progress')}</h2>
              <p className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">{percent}%</p>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 text-right">{t('tasks.progressOf', { done, total: list.length })}</p>
          </div>
          <div className="ar-progress" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={t('tasks.progress')}>
            <span style={{ width: `${Math.max(3, Math.min(100, percent))}%` }} />
          </div>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
            <StatTile label={t('tasks.stats.open')} value={list.length - done} />
            <StatTile label={t('tasks.status.in_progress')} value={inProgress} tone="text-blue-700 dark:text-blue-300" />
            <StatTile label={t('tasks.stats.overdue')} value={overdue} tone={overdue ? 'text-rose-600 dark:text-rose-400' : undefined} />
            <StatTile label={t('tasks.stats.onTimeRate')} value={tasks.stats?.onTimeRate === null || !tasks.stats ? '—' : `${tasks.stats.onTimeRate}%`} tone="text-emerald-700 dark:text-emerald-300" />
          </div>
        </div>
        <div className="ar-card p-4 sm:p-5 min-w-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-3">{t('tasks.byUniversity')}</h2>
          {byUniversity.length ? (
            <ul className="space-y-3">
              {byUniversity.map(({ uni, total, done: d }) => (
                <li key={uni.id} className="flex items-center gap-2.5">
                  <UniversityCrest uni={uni} size={28} rounded="rounded-lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-700 dark:text-zinc-200">
                      <span className="truncate">{uni.shortName}</span>
                      <span className="tabular-nums text-slate-500 dark:text-zinc-400">{d}/{total}</span>
                    </div>
                    <div className="ar-progress h-1.5 mt-1.5">
                      <span style={{ width: `${Math.round((d / total) * 100)}%` }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">{t('tasks.byUniversity.empty')}</p>
          )}
        </div>
      </div>

      {/* New task */}
      <form onSubmit={submit} className="ar-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-slate-600 dark:text-zinc-400 mr-1">{t('tasks.templates')}:</span>
          {TEMPLATES.map((tpl) => (
            <button key={tpl.key} type="button" onClick={() => applyTemplate(tpl)} className="ar-chip">
              <Plus className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" /> {t(`tasks.tpl.${tpl.key}`)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr] gap-x-3 gap-y-4">
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <label className="ar-label" htmlFor="task-title">{t('tasks.new')}</label>
            <input id="task-title" ref={titleRef} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('tasks.titlePlaceholder')} className="ar-input" maxLength={200} />
          </div>
          <div className="min-w-0">
            <label className="ar-label" htmlFor="task-cat">{t('tasks.category')}</label>
            <select id="task-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as TaskCategory })} className="ar-input">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(`tasks.cat.${c}`)}</option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="ar-label" htmlFor="task-due">{t('tasks.dueDate')}</label>
            <input id="task-due" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="ar-input" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-4">
          <div className="min-w-0">
            <label className="ar-label" htmlFor="task-uni">{t('tasks.link.university')}</label>
            <select id="task-uni" value={form.universityId} onChange={(e) => setForm({ ...form, universityId: e.target.value, deadlineKey: '' })} className="ar-input">
              <option value="">{t('tasks.link.none')}</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>{u.shortName}</option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="ar-label" htmlFor="task-deadline">{t('tasks.link.deadline')}</label>
            <select id="task-deadline" value={form.deadlineKey} onChange={(e) => (e.target.value ? pickDeadline(e.target.value) : setForm({ ...form, deadlineKey: '' }))} className="ar-input">
              <option value="">{t('tasks.link.none')}</option>
              {openDeadlines
                .filter((d) => !form.universityId || d.universityId === form.universityId)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {[d.universityId ? UNIVERSITY_BY_ID.get(d.universityId)?.shortName : null, deadlineTitle(d), formatDate(d.date, lang, { day: 'numeric', month: 'short' })].filter(Boolean).join(' · ')}
                  </option>
                ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="ar-label" htmlFor="task-olymp">{t('tasks.link.olympiad')}</label>
            <select id="task-olymp" value={form.olympiadId} onChange={(e) => setForm({ ...form, olympiadId: e.target.value })} className="ar-input" disabled={!favoriteOlympiads.length}>
              <option value="">{favoriteOlympiads.length ? t('tasks.link.none') : t('tasks.link.noFavorites')}</option>
              {favoriteOlympiads.map((o) => (
                <option key={o.id} value={o.id}>{o.shortName}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end border-t border-[var(--line)] pt-4">
          <button type="submit" disabled={saving || !form.title.trim()} aria-busy={saving} className="ar-btn ar-btn-primary w-full sm:w-auto">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {t('tasks.addTask')}
          </button>
        </div>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(['open', 'all', 'done'] as Filter[]).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className={chipCls(filter === f)}>
            {t(`tasks.filter.${f}`)}
            <span className="opacity-60 tabular-nums">{f === 'all' ? list.length : f === 'done' ? done : list.length - done}</span>
          </button>
        ))}
        <select value={uniFilter} onChange={(e) => setUniFilter(e.target.value)} className="ar-input w-full sm:w-auto sm:max-w-xs min-h-10 py-2 sm:ml-auto" aria-label={t('tasks.link.university')}>
          <option value="all">{t('dl.allUniversities')}</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>{u.shortName}</option>
          ))}
          <option value="none">{t('dl.noUniversity')}</option>
        </select>
      </div>

      {loadError && (
        <div className="ar-notice ar-notice-error" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span className="min-w-0">{loadError}</span>
        </div>
      )}
      {tasks.loading && !list.length && (
        <div className="text-sm text-slate-500 dark:text-zinc-400 flex items-center gap-2 justify-center py-6" aria-live="polite">
          <Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading')}
        </div>
      )}

      {!tasks.loading && !list.length && !loadError ? (
        <EmptyState icon={<ListChecks className="w-6 h-6" />} title={t('tasks.empty.title')} text={t('tasks.empty.text')} cta={t('tasks.generate')} onClick={generate} />
      ) : visible.length === 0 && list.length ? (
        <p className="text-sm text-slate-500 dark:text-zinc-400 text-center py-6">{filter === 'open' ? t('tasks.allDone') : t('dl.noMatches')}</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((task) => {
            const uni = task.universityId ? UNIVERSITY_BY_ID.get(task.universityId) : null;
            const deadline = task.deadlineKey ? deadlineById.get(task.deadlineKey) : null;
            const olympiad = task.olympiadId ? OLYMPIAD_BY_ID.get(task.olympiadId) : null;
            const isDone = task.status === 'done';
            const left = daysLeft(task.dueDate);
            return (
              <li key={task.id} className={`ar-card p-3 sm:p-4 flex items-start gap-3 ${isDone ? 'opacity-75' : ''}`}>
                <button
                  type="button"
                  onClick={() => setStatus(task, isDone ? 'todo' : 'done')}
                  disabled={busyId === task.id}
                  aria-busy={busyId === task.id}
                  role="checkbox"
                  aria-checked={isDone}
                  aria-label={isDone ? t('tasks.markOpen') : t('tasks.markDone')}
                  title={isDone ? t('tasks.markOpen') : t('tasks.markDone')}
                  className="shrink-0 w-9 h-9 -mt-2 -ml-1.5 -mr-1 flex items-center justify-center rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800 disabled:cursor-progress"
                >
                  {busyId === task.id ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : isDone ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : task.status === 'in_progress' ? <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <Circle className="w-5 h-5 text-slate-300 dark:text-zinc-600" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold break-words ${isDone ? 'line-through text-slate-400 dark:text-zinc-500' : 'text-slate-900 dark:text-white'}`}>{task.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="ar-badge">{t(`tasks.cat.${task.category}`)}</span>
                    <span className={`ar-badge ${timelinessTone[task.timeliness]}`}>{t(`tasks.timeliness.${task.timeliness}`)}</span>
                    {task.dueDate && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400">
                        <CalendarDays className="w-3.5 h-3.5" /> {formatDate(task.dueDate, lang, { day: 'numeric', month: 'short', year: 'numeric' })}
                        {!isDone && left !== null && <span className={left < 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}> · {daysText(t, left)}</span>}
                      </span>
                    )}
                  </div>
                  {(uni || deadline || olympiad) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {uni && (
                        <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--line)] py-0.5 pl-1 pr-2.5 text-xs font-medium text-slate-700 dark:text-zinc-200">
                          <UniversityCrest uni={uni} size={16} rounded="rounded" /> <span className="truncate">{uni.shortName}</span>
                        </span>
                      )}
                      {deadline && (
                        <button type="button" onClick={() => onNavigate({ section: 'deadlines' })} className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--line)] px-2.5 py-0.5 text-xs text-slate-600 transition-colors hover:border-[var(--line-strong)] hover:bg-slate-50 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-zinc-800/50 dark:hover:text-white">
                          <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">
                            {deadlineTitle(deadline)}
                            {deadline.date && ` · ${formatDate(deadline.date, lang, { day: 'numeric', month: 'short' })}`}
                          </span>
                        </button>
                      )}
                      {olympiad && (
                        <button type="button" onClick={() => onNavigate({ section: 'olympiads' })} className="inline-flex max-w-full items-center gap-1 rounded-full border border-[var(--line)] px-2.5 py-0.5 text-xs text-slate-600 transition-colors hover:border-[var(--line-strong)] hover:bg-slate-50 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-zinc-800/50 dark:hover:text-white">
                          <Trophy className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{olympiad.shortName}</span>
                        </button>
                      )}
                    </div>
                  )}
                  {!isDone && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      <button type="button" onClick={() => setStatus(task, task.status === 'in_progress' ? 'todo' : 'in_progress')} disabled={busyId === task.id} className="ar-link min-h-8 text-xs disabled:opacity-50 disabled:cursor-not-allowed">
                        <Clock className="w-3.5 h-3.5" /> {task.status === 'in_progress' ? t('tasks.stopProgress') : t('tasks.startProgress')}
                      </button>
                      {task.category === 'essay' && (
                        <button type="button" onClick={onOpenEssay} className="ar-link min-h-8 text-xs">
                          <FileText className="w-3.5 h-3.5" /> {t('tasks.openEssay')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => remove(task)} disabled={busyId === task.id} className="ar-btn ar-btn-icon w-9 h-9 -mt-1.5 -mr-1.5 shrink-0 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-300 dark:hover:bg-rose-500/10" title={t('common.delete')} aria-label={t('common.delete')}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
