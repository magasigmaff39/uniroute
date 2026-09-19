import React, { useMemo, useState } from 'react';
import { CalendarClock, CalendarPlus, Check, Download, ExternalLink, ListPlus, ListChecks, Plus, Trash2, Info, CalendarRange } from 'lucide-react';
import type { ApplicantProfile, DeadlineItem, DeadlineKind, NavTarget, University } from '../../types';
import type { Planner } from '../../hooks/usePlanner';
import type { TasksStore } from '../../hooks/useTasks';
import { buildDeadlines, sortDeadlines, type DeadlineSort } from '../../utils/deadlines';
import { toIcsDate } from '../../utils/dates';
import { KNOWLEDGE_BASE_INTAKE } from '../../utils/years';
import { UNIVERSITY_BY_ID } from '../../data/universities';
import { useI18n } from '../../i18n/I18nContext';
import { useToast } from '../../context/ToastContext';
import { UniversityCrest } from '../ui/UniversityCrest';
import { EmptyState, SectionHeader } from '../cabinet/ui';
import { STATUS_TONE, StatusBadge, StatTile, chipCls, daysText, describeApiError, formatDate } from './ui';

interface DeadlinesSectionProps {
  profile: ApplicantProfile;
  universities: University[];
  planner: Planner;
  tasks: TasksStore;
  onNavigate: (target: NavTarget) => void;
  onAddUniversity: () => void;
  /** The calendar of every university in the knowledge base */
  onOpenCalendar: () => void;
}

const KINDS: DeadlineKind[] = ['application', 'documents', 'scholarship', 'exam', 'olympiad', 'other'];

/** «Дедлайны»: every date that matters, soonest first, with days left and a status. */
export const DeadlinesSection: React.FC<DeadlinesSectionProps> = ({ profile, universities, planner, tasks, onNavigate, onAddUniversity, onOpenCalendar }) => {
  const { t, tx, lang } = useI18n();
  const { notify } = useToast();
  const [kind, setKind] = useState<'all' | DeadlineKind>('all');
  const [uniFilter, setUniFilter] = useState<string>('all');
  const [sort, setSort] = useState<DeadlineSort>('nearest');
  const [showDone, setShowDone] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<{ title: string; date: string; kind: DeadlineKind; universityId: string; note: string }>({ title: '', date: '', kind: 'other', universityId: '', note: '' });
  const [creating, setCreating] = useState<string | null>(null);

  const items = useMemo(() => buildDeadlines({ profile, universities, planner: planner.planner }), [profile, universities, planner.planner]);
  const uniName = (id: string | null) => (id ? UNIVERSITY_BY_ID.get(id)?.shortName || id : '');
  const titleOf = (d: DeadlineItem) => d.title ?? t(d.titleKey || '', d.titleVars);

  const visible = useMemo(
    () =>
      sortDeadlines(
        items.filter((d) => (kind === 'all' || d.kind === kind) && (uniFilter === 'all' || (uniFilter === 'none' ? !d.universityId : d.universityId === uniFilter)) && (showDone || d.status !== 'done')),
        sort,
        uniName,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, kind, uniFilter, sort, showDone],
  );

  const open = items.filter((d) => ['urgent', 'soon', 'upcoming'].includes(d.status));
  const next = sortDeadlines(open, 'date')[0];
  const counts = { urgent: items.filter((d) => d.status === 'urgent').length, passed: items.filter((d) => d.status === 'passed').length, done: items.filter((d) => d.status === 'done').length };

  // A task counts for a date when it was created for it, or (for an olympiad) linked to the same olympiad.
  const linkedTasks = (d: DeadlineItem) => tasks.tasks.filter((x) => x.deadlineKey === d.id || (d.olympiadId && x.olympiadId === d.olympiadId));

  const createTask = async (d: DeadlineItem) => {
    setCreating(d.id);
    try {
      const uni = d.universityId ? UNIVERSITY_BY_ID.get(d.universityId) : null;
      await tasks.create({
        title: `${titleOf(d)}${uni ? ` — ${uni.shortName}` : ''}`.slice(0, 200),
        category: d.taskCategory,
        dueDate: d.date && (d.daysLeft ?? -1) >= 0 ? d.date : null,
        description: d.url,
        universityId: d.universityId,
        deadlineKey: d.id,
        olympiadId: d.olympiadId ?? null,
        source: 'deadlines',
      });
      notify(t('dl.taskCreated'), 'success');
    } catch (err) {
      notify(describeApiError(t, err), 'error');
    } finally {
      setCreating(null);
    }
  };

  const addCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    planner.addCustomDeadline({ title: form.title.trim(), date: form.date, kind: form.kind, universityId: form.universityId || null, note: form.note.trim() });
    setForm({ title: '', date: '', kind: 'other', universityId: '', note: '' });
    setFormOpen(false);
    notify(t('dl.added'), 'success');
  };

  const exportIcs = () => {
    let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//UniRoute//Deadlines//RU\r\nCALSCALE:GREGORIAN\r\n';
    for (const d of visible) {
      if (!d.date || d.status === 'done') continue;
      const start = toIcsDate(new Date(`${d.date}T00:00:00Z`));
      const end = toIcsDate(new Date(Date.parse(`${d.date}T00:00:00Z`) + 86_400_000));
      const summary = `${uniName(d.universityId) ? `${uniName(d.universityId)} — ` : ''}${titleOf(d)}`.replace(/[,;]/g, ' ');
      ics += `BEGIN:VEVENT\r\nUID:${d.id.replace(/[^a-z0-9:_-]/gi, '_')}@admitroute\r\nSUMMARY:${summary}\r\n${d.url ? `URL:${d.url}\r\n` : ''}DTSTART;VALUE=DATE:${start}\r\nDTEND;VALUE=DATE:${end}\r\nBEGIN:VALARM\r\nTRIGGER:-P7D\r\nACTION:DISPLAY\r\nDESCRIPTION:${summary}\r\nEND:VALARM\r\nEND:VEVENT\r\n`;
    }
    ics += 'END:VCALENDAR\r\n';
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'uniroute_deadlines.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const nothingTracked = !universities.length && !planner.planner.favoriteOlympiadIds.length && !planner.planner.customDeadlines.length;

  return (
    <div className="space-y-5 py-2 sm:py-4">
      <SectionHeader
        kicker={t('nav.section.deadlines')}
        title={t('dl.title')}
        subtitle={t('dl.subtitle')}
        aside={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setFormOpen((v) => !v)} aria-expanded={formOpen} className="ar-btn ar-btn-primary">
              <Plus className="w-4 h-4" /> {t('dl.add')}
            </button>
            <button type="button" onClick={exportIcs} disabled={!open.length} className="ar-btn ar-btn-secondary">
              <Download className="w-4 h-4" /> {t('dl.export')}
            </button>
          </div>
        }
      />

      {formOpen && (
        <form onSubmit={addCustom} className="ar-card p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-x-3 gap-y-4 items-end animate-fadeIn">
          <div className="min-w-0 sm:col-span-2 lg:col-span-1">
            <label className="ar-label" htmlFor="dl-title">{t('dl.form.title')}</label>
            <input id="dl-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('dl.form.titlePh')} className="ar-input" maxLength={160} required autoFocus />
          </div>
          <div className="min-w-0">
            <label className="ar-label" htmlFor="dl-date">{t('dl.form.date')}</label>
            <input id="dl-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="ar-input" required />
          </div>
          <div className="min-w-0">
            <label className="ar-label" htmlFor="dl-kind">{t('dl.form.kind')}</label>
            <select id="dl-kind" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as DeadlineKind })} className="ar-input">
              {KINDS.map((k) => (
                <option key={k} value={k}>{t(`dl.kind.${k}`)}</option>
              ))}
            </select>
          </div>
          <div className="min-w-0">
            <label className="ar-label" htmlFor="dl-uni">{t('dl.form.university')}</label>
            <select id="dl-uni" value={form.universityId} onChange={(e) => setForm({ ...form, universityId: e.target.value })} className="ar-input">
              <option value="">{t('dl.noUniversity')}</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>{u.shortName}</option>
              ))}
            </select>
          </div>
          <div className="min-w-0 sm:col-span-2 lg:col-span-3">
            <label className="ar-label" htmlFor="dl-note">{t('dl.form.note')}</label>
            <input id="dl-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="ar-input" maxLength={300} />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <button type="button" onClick={() => setFormOpen(false)} className="ar-btn ar-btn-secondary min-h-11 flex-1">{t('common.cancel')}</button>
            <button type="submit" disabled={!form.title.trim() || !form.date} className="ar-btn ar-btn-primary min-h-11 flex-1">{t('dl.form.save')}</button>
          </div>
        </form>
      )}

      {nothingTracked && !formOpen ? (
        <EmptyState icon={<CalendarClock className="w-6 h-6" />} title={t('dl.empty.title')} text={t('dl.empty.text')} cta={t('dl.empty.cta')} onClick={onAddUniversity} />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <StatTile
              label={t('dl.stat.next')}
              value={next ? daysText(t, next.daysLeft) : t('dl.stat.none')}
              hint={next ? `${uniName(next.universityId) ? `${uniName(next.universityId)} · ` : ''}${titleOf(next)}` : undefined}
              tone={next?.status === 'urgent' ? 'text-rose-600 dark:text-rose-400' : undefined}
            />
            <StatTile label={t('dl.stat.urgent')} value={counts.urgent} tone={counts.urgent ? 'text-rose-600 dark:text-rose-400' : undefined} />
            <StatTile label={t('dl.stat.open')} value={open.length} />
            <StatTile label={t('dl.stat.passedDone')} value={`${counts.passed} / ${counts.done}`} hint={t('dl.stat.passedDoneHint')} />
          </div>

          {Number(profile.targetYear) > KNOWLEDGE_BASE_INTAKE && (
            <p className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm leading-relaxed text-slate-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-zinc-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 dark:text-blue-300 shrink-0 mt-0.5" />
              <span className="min-w-0">{t('dl.laterYear', { year: profile.targetYear, campaign: `${KNOWLEDGE_BASE_INTAKE - 1}/${String(KNOWLEDGE_BASE_INTAKE).slice(2)}` })}</span>
            </p>
          )}

          <div className="ar-card p-3 sm:p-4 space-y-3">
            <div className="flex gap-1.5 overflow-x-auto hide-scrollbar -mx-1 px-1 py-0.5" role="group" aria-label={t('dl.form.kind')}>
              {(['all', ...KINDS] as const).map((k) => (
                <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={chipCls(kind === k)}>
                  {k === 'all' ? t('dl.filter.all') : t(`dl.kind.${k}`)}
                  <span className="opacity-60 tabular-nums">{k === 'all' ? items.length : items.filter((d) => d.kind === k).length}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={uniFilter} onChange={(e) => setUniFilter(e.target.value)} className="ar-input w-auto max-w-full min-h-10 py-2" aria-label={t('dl.form.university')}>
                <option value="all">{t('dl.allUniversities')}</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>{u.shortName}</option>
                ))}
                <option value="none">{t('dl.noUniversity')}</option>
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value as DeadlineSort)} className="ar-input w-auto max-w-full min-h-10 py-2" aria-label={t('dl.sort')}>
                <option value="nearest">{t('dl.sort.nearest')}</option>
                <option value="date">{t('dl.sort.date')}</option>
                <option value="university">{t('dl.sort.university')}</option>
              </select>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-zinc-300 px-1 min-h-10 cursor-pointer">
                <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="w-4 h-4 rounded accent-blue-600 cursor-pointer" />
                {t('dl.showDone')}
              </label>
              <button type="button" onClick={onOpenCalendar} className="ar-link ml-auto min-h-10 text-sm">
                <CalendarRange className="w-4 h-4" /> {t('dl.allCalendar')}
              </button>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-zinc-400 text-center py-8">{t('dl.noMatches')}</p>
          ) : (
            <ul className="space-y-2.5">
              {visible.map((d) => {
                const uni = d.universityId ? UNIVERSITY_BY_ID.get(d.universityId) : null;
                const linked = linkedTasks(d);
                const passed = d.status === 'passed';
                const done = d.status === 'done';
                const [dd, mm, yy] = d.date ? [formatDate(d.date, lang, { day: 'numeric' }), formatDate(d.date, lang, { month: 'short' }), d.date.slice(0, 4)] : ['—', '', ''];
                return (
                  <li key={d.id} className={`ar-card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${passed || done ? 'opacity-80' : ''}`}>
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-14 shrink-0 rounded-xl border text-center py-1.5 ${STATUS_TONE[d.status]}`} aria-hidden>
                        <div className={`text-lg font-semibold leading-none tabular-nums ${passed ? 'line-through' : ''}`}>{dd}</div>
                        <div className="text-[11px] font-semibold uppercase mt-1">{mm}</div>
                        <div className="text-[11px] opacity-70">{yy}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={d.status} t={t} />
                          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-zinc-400">{t(`dl.kind.${d.kind}`)}</span>
                          <span className={`inline-flex items-center rounded-full border px-2 py-px text-[11px] font-medium ${d.source === 'official' ? 'border-emerald-200 text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300' : 'border-[var(--line)] text-slate-500 dark:text-zinc-400'}`}>
                            {t(`dl.src.${d.source}`)}
                          </span>
                        </div>
                        <p className={`text-sm font-semibold text-slate-900 dark:text-white mt-1.5 break-words ${passed ? 'line-through decoration-slate-400' : ''}`}>{titleOf(d)}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500 dark:text-zinc-400">
                          {uni && (
                            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-zinc-200">
                              <UniversityCrest uni={uni} size={18} rounded="rounded" /> {uni.shortName}
                            </span>
                          )}
                          {d.date && <span>{formatDate(d.date, lang)}</span>}
                          <span className={`font-semibold ${d.status === 'urgent' ? 'text-rose-600 dark:text-rose-400' : d.status === 'soon' ? 'text-amber-700 dark:text-amber-400' : ''}`}>{done ? '' : daysText(t, d.daysLeft)}</span>
                        </div>
                        {d.note && <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">{tx(d.note)}</p>}
                        {d.satisfied && !d.manualDone && <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mt-1">{t('dl.satisfied')}</p>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 sm:justify-end shrink-0">
                      {!d.satisfied && (
                        <button type="button" onClick={() => planner.setDeadlineDone(d.id, !d.manualDone)} aria-pressed={d.manualDone} className="ar-chip">
                          <Check className="w-4 h-4" /> {d.manualDone ? t('dl.status.done') : t('dl.markDone')}
                        </button>
                      )}
                      {linked.length ? (
                        <button type="button" onClick={() => onNavigate({ section: 'tasks' })} className="ar-btn ar-btn-secondary ar-btn-sm min-h-9">
                          <ListChecks className="w-4 h-4" /> {t('dl.taskLinked', { status: t(`tasks.status.${linked[0].status}`) })}
                        </button>
                      ) : (
                        !done && (
                          <button type="button" onClick={() => createTask(d)} disabled={creating === d.id} aria-busy={creating === d.id} className="ar-btn ar-btn-secondary ar-btn-sm min-h-9">
                            <ListPlus className="w-4 h-4" /> {t('dl.addTask')}
                          </button>
                        )
                      )}
                      {d.url && (
                        <a href={d.url} target="_blank" rel="noreferrer" title={t('dl.portal')} aria-label={t('dl.portal')} className="ar-btn ar-btn-icon w-9 h-9">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {d.source === 'custom' && (
                        <button type="button" onClick={() => planner.removeCustomDeadline(d.id.replace(/^custom:/, ''))} title={t('dl.remove')} aria-label={t('dl.remove')} className="ar-btn ar-btn-icon w-9 h-9 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-300 dark:hover:bg-rose-500/10">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onNavigate({ section: 'olympiads' })} className="ar-btn ar-btn-secondary">
              <CalendarPlus className="w-4 h-4" /> {t('dl.olympiadsLink', { n: planner.planner.favoriteOlympiadIds.length })}
            </button>
            <button type="button" onClick={onAddUniversity} className="ar-btn ar-btn-secondary">
              <Plus className="w-4 h-4" /> {t('uni.add.title')}
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {t('dl.disclaimer')}
          </p>
        </>
      )}
    </div>
  );
};
