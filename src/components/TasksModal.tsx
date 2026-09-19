import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, ListChecks, ListPlus, Plus, Loader2, Trash2, CheckCircle2, Circle, Clock, CalendarDays, AlertCircle } from 'lucide-react';
import type { ApplicantProfile, TaskCategory, TaskStatus, UserTask } from '../types';
import { tasksApi, ApiError, type TaskStats } from '../lib/api';
import { useI18n } from '../i18n/I18nContext';
import { useToast } from '../context/ToastContext';

interface TasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  profile: ApplicantProfile;
}

const CATEGORIES: TaskCategory[] = ['sat', 'ielts', 'unt', 'documents', 'essay', 'application', 'olympiad', 'portfolio', 'other'];

export const TasksModal: React.FC<TasksModalProps> = ({ isOpen, onClose, isAuthenticated, onOpenAuth, profile }) => {
  const { t } = useI18n();
  const { notify } = useToast();
  const [tasks, setTasks] = useState<UserTask[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('all');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('ielts');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const describeError = useCallback(
    (err: unknown) => (err instanceof ApiError ? (err.code === 'NETWORK' ? t('common.backendOffline') : err.message) : t('common.error')),
    [t],
  );

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const res = await tasksApi.list();
      setTasks(res.items);
      setStats(res.stats);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, describeError]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const visible = useMemo(
    () => tasks.filter((x) => (filter === 'all' ? true : filter === 'done' ? x.status === 'done' : x.status !== 'done')),
    [tasks, filter],
  );

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await tasksApi.create({ title: title.trim(), category, dueDate: dueDate || null });
      setTitle('');
      setDueDate('');
      await load();
    } catch (err) {
      notify(describeError(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const cycleStatus = async (task: UserTask) => {
    const next: TaskStatus = task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo';
    try {
      const updated = await tasksApi.update(task.id, { status: next });
      setTasks((prev) => prev.map((x) => (x.id === task.id ? updated : x)));
      const res = await tasksApi.list();
      setStats(res.stats);
    } catch (err) {
      notify(describeError(err), 'error');
    }
  };

  const remove = async (task: UserTask) => {
    try {
      await tasksApi.remove(task.id);
      await load();
    } catch (err) {
      notify(describeError(err), 'error');
    }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await tasksApi.generate(profile);
      setTasks(res.items);
      setStats(res.stats);
      notify(`+${res.created.length}`, 'success');
    } catch (err) {
      notify(describeError(err), 'error');
    } finally {
      setGenerating(false);
    }
  };

  const timelinessBadge = (task: UserTask) => {
    const map: Record<UserTask['timeliness'], string> = {
      done_on_time: 'ar-badge-green',
      done_late: 'ar-badge-amber',
      overdue: 'ar-badge-rose',
      upcoming: 'ar-badge-blue',
      no_deadline: '',
    };
    return <span className={`ar-badge ${map[task.timeliness]}`}>{t(`tasks.timeliness.${task.timeliness}`)}</span>;
  };

  const StatusIcon = ({ status }: { status: TaskStatus }) =>
    status === 'done' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : status === 'in_progress' ? <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <Circle className="w-5 h-5 text-slate-300 dark:text-zinc-600" />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-[2px] animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="tasks-modal-title">
      <div className="w-full max-w-3xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)] shadow-[var(--shadow-overlay)] animate-popIn">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--line)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="ar-icon-tile">
              <ListChecks className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 id="tasks-modal-title" className="text-lg font-semibold text-slate-900 dark:text-white leading-tight sm:truncate">{t('tasks.title')}</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">{t('tasks.subtitle')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="ar-btn ar-btn-icon shrink-0" aria-label={t('common.close')} title={t('common.close')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isAuthenticated ? (
          <div className="px-6 py-12 text-center flex flex-col items-center gap-4">
            <span className="ar-icon-tile w-12 h-12 rounded-2xl">
              <AlertCircle className="w-6 h-6" />
            </span>
            <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed max-w-sm">{t('common.loginRequired')}</p>
            <button type="button" onClick={() => { onClose(); onOpenAuth(); }} className="ar-btn ar-btn-primary">
              {t('header.loginRegister')}
            </button>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[
                  ['total', stats.total, 'text-slate-900 dark:text-white'],
                  ['done', stats.done, 'text-emerald-700 dark:text-emerald-300'],
                  ['onTime', stats.doneOnTime, 'text-emerald-700 dark:text-emerald-300'],
                  ['late', stats.doneLate, 'text-amber-700 dark:text-amber-300'],
                  ['overdue', stats.overdue, 'text-rose-700 dark:text-rose-300'],
                  ['onTimeRate', stats.onTimeRate === null ? '—' : `${stats.onTimeRate}%`, 'text-blue-700 dark:text-blue-300'],
                ].map(([key, value, cls]) => (
                  <div key={key as string} className="min-w-0 px-2 py-3 rounded-xl bg-slate-50 dark:bg-zinc-900/60 border border-[var(--line)] text-center">
                    <div className={`text-lg font-semibold tabular-nums ${cls}`}>{value as React.ReactNode}</div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium leading-snug">{t(`tasks.stats.${key}`)}</div>
                  </div>
                ))}
              </div>
            )}

            {/* New task */}
            <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-[var(--line)] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[minmax(0,1fr)_9rem_10rem_auto] gap-3 items-end">
              <div className="min-w-0 sm:col-span-2 md:col-span-1">
                <label className="ar-label" htmlFor="tasks-modal-new">{t('tasks.new')}</label>
                <input id="tasks-modal-new" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('tasks.titlePlaceholder')} className="ar-input" />
              </div>
              <div className="min-w-0">
                <label className="ar-label" htmlFor="tasks-modal-cat">{t('tasks.category')}</label>
                <select id="tasks-modal-cat" value={category} onChange={(e) => setCategory(e.target.value as TaskCategory)} className="ar-input">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{t(`tasks.cat.${c}`)}</option>
                  ))}
                </select>
              </div>
              <div className="min-w-0">
                <label className="ar-label" htmlFor="tasks-modal-due">{t('tasks.dueDate')}</label>
                <input id="tasks-modal-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="ar-input" />
              </div>
              <button type="submit" disabled={saving || !title.trim()} aria-busy={saving} className="ar-btn ar-btn-primary min-h-11 sm:col-span-2 md:col-span-1">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {t('common.add')}
              </button>
            </form>

            {/* Filters + generate */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['all', 'open', 'done'] as const).map((f) => (
                  <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f} className="ar-chip">
                    {t(`tasks.filter.${f}`)}
                  </button>
                ))}
              </div>
              <button type="button" onClick={generate} disabled={generating} aria-busy={generating} className="ar-btn ar-btn-secondary ar-btn-sm min-h-9">
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListPlus className="w-4 h-4 text-blue-600 dark:text-blue-300" />}
                {t('tasks.generate')}
              </button>
            </div>

            {/* List */}
            {error && (
              <div className="ar-notice ar-notice-error" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> <span className="min-w-0">{error}</span>
              </div>
            )}
            {loading && (
              <div className="text-sm text-slate-500 dark:text-zinc-400 flex items-center gap-2" aria-live="polite">
                <Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading')}
              </div>
            )}
            {!loading && visible.length === 0 && <p className="text-sm text-slate-500 dark:text-zinc-400 text-center py-6">{t('tasks.empty')}</p>}
            <div className="space-y-2">
              {visible.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${task.status === 'done' ? 'bg-slate-50 dark:bg-zinc-900/40 border-[var(--line)]' : 'bg-[var(--surface-raised)] border-[var(--line)] hover:border-[var(--line-strong)]'}`}
                >
                  <button
                    type="button"
                    onClick={() => cycleStatus(task)}
                    className="shrink-0 w-9 h-9 -mt-2 -ml-1.5 -mr-1 flex items-center justify-center rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-zinc-800"
                    title={t(`tasks.status.${task.status}`)}
                    aria-label={t(`tasks.status.${task.status}`)}
                  >
                    <StatusIcon status={task.status} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium break-words ${task.status === 'done' ? 'line-through text-slate-400 dark:text-zinc-500' : 'text-slate-900 dark:text-white'}`}>{task.title}</div>
                    {task.description && <div className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">{task.description}</div>}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="ar-badge">{t(`tasks.cat.${task.category}`)}</span>
                      {timelinessBadge(task)}
                      {task.dueDate && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-zinc-400">
                          <CalendarDays className="w-3.5 h-3.5" /> {task.dueDate}
                        </span>
                      )}
                      {task.completedAt && <span className="text-xs text-slate-500 dark:text-zinc-400">✓ {task.completedAt.slice(0, 10)}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(task)}
                    className="ar-btn ar-btn-icon w-9 h-9 -mt-1.5 -mr-1.5 shrink-0 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-300 dark:hover:bg-rose-500/10"
                    title={t('common.delete')}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
