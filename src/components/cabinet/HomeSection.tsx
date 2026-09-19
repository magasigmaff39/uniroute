import React from 'react';
import { ArrowRight, Check, GraduationCap, HandCoins, Gauge, CalendarClock, ListChecks, PenLine, Briefcase, Trophy, Lock, ClipboardList, ChartLine, GitCompare, Plus } from 'lucide-react';
import type { ApplicantProfile, DeadlineItem, DiagnosticResult, EssayDraft, NavTarget, University, UserTask } from '../../types';
import type { UserAccount } from '../../lib/auth';
import type { Completeness, NextStep } from '../../utils/profileInsights';
import { CORE_FACTS } from '../../utils/profileInsights';
import { sortDeadlines } from '../../utils/deadlines';
import { essayProgress, ESSAY_STAGES } from '../../utils/essay';
import { useI18n } from '../../i18n/I18nContext';
import { UniversityCrest } from '../ui/UniversityCrest';
import { StatusBadge, daysText } from '../planner/ui';

interface HomeSectionProps {
  user: UserAccount;
  profile: ApplicantProfile;
  completeness: Completeness;
  diagnostic: DiagnosticResult;
  next: NextStep;
  grants: { withGrant: number; total: number };
  universities: University[];
  deadlines: DeadlineItem[];
  tasks: UserTask[];
  portfolioCount: number;
  essay: EssayDraft | null;
  favoriteOlympiads: number;
  onNavigate: (target: NavTarget) => void;
  onOpenEssay: () => void;
}

type IconType = React.FC<{ className?: string }>;

/** Profile completeness as a ring in the brand colour. */
const Ring: React.FC<{ value: number }> = ({ value }) => {
  const r = 34;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative w-[84px] h-[84px] shrink-0">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={r} strokeWidth="7" fill="none" className="stroke-slate-100 dark:stroke-zinc-800" />
        <circle
          cx="40"
          cy="40"
          r={r}
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          className="stroke-blue-600 dark:stroke-blue-400"
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.2,0.8,0.2,1)' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold text-slate-950 dark:text-white tabular-nums">{Math.round(v)}%</span>
    </div>
  );
};

/** The road from the logo, drawn faintly in the corner of the "next step" card. */
const RoadMotif: React.FC = () => (
  <svg viewBox="0 0 320 180" className="absolute -right-6 -bottom-8 w-[300px] h-auto pointer-events-none text-blue-600 dark:text-blue-400 opacity-[0.09] dark:opacity-[0.12]" aria-hidden>
    <path d="M10 170 C 90 170, 110 95, 175 88 S 270 60, 305 12" fill="none" stroke="currentColor" strokeWidth="30" strokeLinecap="round" />
    <path d="M10 170 C 90 170, 110 95, 175 88 S 270 60, 305 12" fill="none" stroke="white" strokeWidth="3" strokeDasharray="12 12" strokeLinecap="round" className="dark:stroke-[#0a1019]" />
  </svg>
);

/** A card of the home dashboard: a title with a link to its section and the content. */
const Widget: React.FC<{ icon: IconType; title: string; action: string; onAction: () => void; children: React.ReactNode }> = ({ icon: Icon, title, action, onAction, children }) => (
  <section className="ar-card p-5 flex flex-col">
    <div className="flex items-center justify-between gap-3 mb-4">
      <h2 className="text-[15px] font-semibold text-slate-900 dark:text-white inline-flex items-center gap-2.5 min-w-0">
        <span className="ar-icon-tile !w-8 !h-8 !rounded-lg">
          <Icon className="w-4 h-4" />
        </span>
        <span className="truncate">{title}</span>
      </h2>
      <button type="button" onClick={onAction} className="ar-link text-[13px] shrink-0 min-h-8 px-1">
        {action} <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
    <div className="flex-1">{children}</div>
  </section>
);

/** «Главная»: the next step, the path, key numbers and a dashboard of dates, tasks, universities and tools. */
export const HomeSection: React.FC<HomeSectionProps> = ({ user, profile, completeness, diagnostic, next, grants, universities, deadlines, tasks, portfolioCount, essay, favoriteOlympiads, onNavigate, onOpenEssay }) => {
  const { t } = useI18n();
  const testPassed = Boolean(profile.assessmentLevel);

  // Test → a complete profile → own universities → a preparation plan.
  const profileDone = completeness.missing.filter((f) => f !== 'documents' && f !== 'targetUniversities').length === 0;
  const ownUniversities = Boolean(completeness.sources.targetUniversities && completeness.sources.targetUniversities !== 'auto');
  const path: { key: string; done: boolean; target: NavTarget }[] = [
    { key: 'home.path.test', done: testPassed, target: { section: 'profile', flow: testPassed ? 'result' : 'test' } },
    { key: 'home.path.profile', done: profileDone, target: { section: 'profile' } },
    { key: 'home.path.universities', done: ownUniversities, target: { section: 'universities', sub: 'pick' } },
    { key: 'home.path.plan', done: tasks.length > 0, target: { section: 'tasks' } },
  ];
  const currentIndex = path.findIndex((p) => !p.done);
  const doneSteps = path.filter((p) => p.done).length;

  const stats: { icon: IconType; label: string; value: string; target: NavTarget }[] = [
    { icon: Gauge, label: t('home.stat.readiness'), value: `${diagnostic.readiness.overall}%`, target: { section: 'analysis', sub: 'readiness' } },
    { icon: GraduationCap, label: t('home.stat.universities'), value: String(profile.targetUniversityIds?.length || 0), target: { section: 'universities', sub: 'list' } },
    { icon: HandCoins, label: t('home.stat.grants'), value: t('home.stat.grantsValue', { n: grants.withGrant, total: grants.total }), target: { section: 'grants' } },
  ];

  const upcoming = sortDeadlines(deadlines.filter((d) => ['urgent', 'soon', 'upcoming'].includes(d.status)), 'date').slice(0, 4);
  const doneTasks = tasks.filter((x) => x.status === 'done').length;
  const openTasks = tasks
    .filter((x) => x.status !== 'done')
    .sort((a, b) => (a.dueDate && b.dueDate ? (a.dueDate < b.dueDate ? -1 : 1) : a.dueDate ? -1 : b.dueDate ? 1 : 0))
    .slice(0, 3);
  const taskPercent = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;
  const essayStages = essayProgress(essay);

  // Before the test: what the cabinet will open (every tile leads to the test).
  const locked: { icon: IconType; key: string; target: NavTarget }[] = [
    { icon: GraduationCap, key: 'home.locked.universities', target: { section: 'universities' } },
    { icon: ChartLine, key: 'home.locked.analysis', target: { section: 'analysis' } },
    { icon: CalendarClock, key: 'home.locked.deadlines', target: { section: 'deadlines' } },
    { icon: ListChecks, key: 'home.locked.tasks', target: { section: 'tasks' } },
    { icon: Trophy, key: 'home.locked.olympiads', target: { section: 'olympiads' } },
    { icon: Briefcase, key: 'home.locked.portfolio', target: { section: 'portfolio' } },
  ];

  const tools: { icon: IconType; tile: string; title: string; text: string; value: React.ReactNode; onClick: () => void; footer?: React.ReactNode }[] = [
    {
      icon: PenLine,
      tile: '!bg-violet-50 !text-violet-600 dark:!bg-violet-500/12 dark:!text-violet-300',
      title: t('nav.essay'),
      text: t(essayStages ? 'home.w.essay.progress' : 'home.w.essay.start', { n: essayStages }),
      value: `${essayStages}/${ESSAY_STAGES.length}`,
      onClick: onOpenEssay,
      footer: (
        <span className="flex gap-1 mt-4" aria-hidden>
          {ESSAY_STAGES.map((s, i) => (
            <span key={s} className={`flex-1 h-1.5 rounded-full ${i < essayStages ? 'bg-violet-500' : 'bg-slate-100 dark:bg-zinc-800'}`} />
          ))}
        </span>
      ),
    },
    {
      icon: Briefcase,
      tile: '',
      title: t('nav.section.portfolio'),
      text: t(portfolioCount ? 'home.w.portfolio.compare' : 'home.w.portfolio.empty'),
      value: portfolioCount,
      onClick: () => onNavigate({ section: 'portfolio', sub: portfolioCount ? 'compare' : 'entries' }),
    },
    {
      icon: Trophy,
      tile: '!bg-amber-50 !text-amber-600 dark:!bg-amber-500/12 dark:!text-amber-300',
      title: t('nav.section.olympiads'),
      text: t(favoriteOlympiads ? 'home.w.olympiads.favorites' : 'home.w.olympiads.empty'),
      value: favoriteOlympiads,
      onClick: () => onNavigate({ section: 'olympiads' }),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="animate-fadeInUp">
        <p className="ar-kicker mb-1.5">{t('home.kicker')}</p>
        <h1 className="text-2xl sm:text-[28px] leading-tight font-bold text-slate-950 dark:text-white">{t('home.hello', { name: user.firstName })}</h1>
        <p className="text-sm sm:text-[15px] text-slate-500 dark:text-zinc-400 mt-2 max-w-2xl leading-relaxed">{t(testPassed ? 'home.lead' : 'home.lead.noTest')}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fadeInUp-delay-1">
        <section className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/[0.07] p-5 sm:p-7">
          <RoadMotif />
          <div className="relative max-w-xl">
            <p className="ar-kicker">{t('home.nextLabel')}</p>
            <h2 className="text-xl sm:text-[22px] leading-snug font-semibold text-slate-950 dark:text-white mt-1.5">{t(`${next.key}.title`, next.vars)}</h2>
            <p className="text-sm text-slate-600 dark:text-zinc-300 mt-2 leading-relaxed">{t(`${next.key}.text`, next.vars)}</p>
            <button type="button" onClick={() => onNavigate(next.target)} className="ar-btn ar-btn-primary ar-btn-lg mt-6 group">
              {!testPassed && <ClipboardList className="w-4 h-4" />}
              {t(`${next.key}.cta`)}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </section>

        <button type="button" onClick={() => onNavigate({ section: 'profile' })} className="ar-card p-5 sm:p-6 flex items-center gap-5 text-left group">
          <Ring value={completeness.percent} />
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold text-slate-900 dark:text-white">{t('home.profileFilled')}</span>
            <span className="block text-[13px] text-slate-500 dark:text-zinc-400 mt-1 leading-snug">{t('home.factsKnown', { known: completeness.known.length, total: CORE_FACTS.length })}</span>
            <span className="ar-link text-[13px] mt-3">
              {t('home.openCabinet')} <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </span>
        </button>
      </div>

      {!testPassed ? (
        <section className="ar-card p-5 sm:p-6 animate-fadeInUp-delay-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('home.locked.title')}</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">{t('home.locked.text')}</p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
            {locked.map(({ icon: Icon, key, target }) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => onNavigate(target)}
                  className="w-full h-full flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3.5 text-left hover:border-[var(--line-strong)] hover:bg-[var(--surface-raised)] transition-colors group"
                >
                  <span className="w-10 h-10 rounded-lg bg-white dark:bg-zinc-800 border border-[var(--line)] text-slate-400 dark:text-zinc-500 flex items-center justify-center shrink-0 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-slate-900 dark:text-white">{t(key)}</span>
                    <span className="block text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t(`${key}.hint`)}</span>
                  </span>
                  <Lock className="w-4 h-4 text-slate-300 dark:text-zinc-600 shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <>
          <section className="ar-card p-5 sm:p-6 animate-fadeInUp-delay-2">
            <div className="flex items-center justify-between gap-3 mb-5">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('home.path')}</h2>
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 tabular-nums">
                {doneSteps} / {path.length}
              </span>
            </div>
            <ol className="grid grid-cols-1 sm:grid-cols-4 gap-1 sm:gap-3">
              {path.map((step, i) => {
                const current = i === currentIndex;
                const last = i === path.length - 1;
                return (
                  <li key={step.key} className="relative">
                    {!last && <span aria-hidden className={`hidden sm:block absolute top-4 left-11 right-0 h-0.5 rounded-full ${step.done ? 'bg-emerald-400/70' : 'bg-slate-200 dark:bg-zinc-800'}`} />}
                    <button
                      type="button"
                      onClick={() => onNavigate(step.target)}
                      aria-current={current ? 'step' : undefined}
                      className="relative w-full flex sm:flex-col items-center sm:items-start gap-3 rounded-xl p-2 -m-2 text-left hover:bg-slate-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-semibold shrink-0 ${
                          step.done
                            ? 'bg-emerald-500 text-white'
                            : current
                              ? 'bg-blue-600 text-white shadow-[0_0_0_4px_rgb(14_100_210_/_0.15)]'
                              : 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        {step.done ? <Check className="w-4 h-4" /> : i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white leading-snug">{t(step.key)}</span>
                        <span className={`block text-xs mt-0.5 ${current ? 'text-blue-600 dark:text-blue-300 font-medium' : 'text-slate-500 dark:text-zinc-400'}`}>
                          {t(step.done ? 'home.status.done' : current ? 'home.status.current' : 'home.status.todo')}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fadeInUp-delay-3">
            {stats.map(({ icon: Icon, label, value, target }) => (
              <button key={label} type="button" onClick={() => onNavigate(target)} className="ar-card p-5 text-left group">
                <span className="flex items-start justify-between gap-3">
                  <span className="text-[13px] font-medium text-slate-500 dark:text-zinc-400 leading-snug">{label}</span>
                  <Icon className="w-[18px] h-[18px] text-slate-400 dark:text-zinc-500 shrink-0 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors" />
                </span>
                <span className="block font-display text-[28px] leading-none font-bold text-slate-950 dark:text-white tabular-nums mt-4">{value}</span>
              </button>
            ))}
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <Widget icon={CalendarClock} title={t('home.w.deadlines')} action={t('home.w.all')} onAction={() => onNavigate({ section: 'deadlines' })}>
              {upcoming.length ? (
                <ul className="space-y-3.5">
                  {upcoming.map((d) => {
                    const uni = universities.find((u) => u.id === d.universityId);
                    return (
                      <li key={d.id} className="flex items-start gap-3">
                        {uni ? (
                          <UniversityCrest uni={uni} size={32} rounded="rounded-lg" />
                        ) : (
                          <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/12 dark:text-amber-300 flex items-center justify-center shrink-0">
                            <Trophy className="w-4 h-4" />
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-white leading-snug">{d.title ?? t(d.titleKey || '', d.titleVars)}</p>
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-zinc-400 mt-1">
                            <StatusBadge status={d.status} t={t} />
                            <span>
                              {uni ? `${uni.shortName} · ` : ''}
                              {daysText(t, d.daysLeft)}
                            </span>
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">{t('home.w.deadlines.empty')}</p>
              )}
            </Widget>

            <Widget icon={ListChecks} title={t('home.w.tasks')} action={t('home.w.all')} onAction={() => onNavigate({ section: 'tasks' })}>
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-zinc-400 mb-2">
                <span>{t('tasks.progressOf', { done: doneTasks, total: tasks.length })}</span>
                <span className="tabular-nums font-semibold text-slate-900 dark:text-white">{taskPercent}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-700" style={{ width: `${Math.max(3, taskPercent)}%` }} />
              </div>
              {openTasks.length ? (
                <ul className="space-y-2.5 mt-4">
                  {openTasks.map((task) => (
                    <li key={task.id} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-zinc-200">
                      <span className="mt-0.5 w-4 h-4 rounded-full border-2 border-slate-300 dark:border-zinc-600 shrink-0" aria-hidden />
                      <span className="flex-1 min-w-0 leading-snug">{task.title}</span>
                      {task.timeliness === 'overdue' && <span className="ar-badge ar-badge-rose shrink-0">{t('tasks.timeliness.overdue')}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-4 leading-relaxed">{t(tasks.length ? 'tasks.allDone' : 'home.w.tasks.empty')}</p>
              )}
            </Widget>

            <Widget icon={GraduationCap} title={t('home.w.universities')} action={t('home.w.all')} onAction={() => onNavigate({ section: 'universities' })}>
              {universities.length ? (
                <>
                  <ul className="space-y-2.5">
                    {universities.slice(0, 4).map((u) => (
                      <li key={u.id} className="flex items-center gap-3">
                        <UniversityCrest uni={u} size={32} rounded="rounded-lg" />
                        <span className="flex-1 min-w-0 text-sm font-medium text-slate-900 dark:text-white truncate">{u.shortName}</span>
                        <span className="text-xs text-slate-500 dark:text-zinc-400 shrink-0">
                          {u.flag} {u.city}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {universities.length > 4 && <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2.5">{t('home.w.more', { n: universities.length - 4 })}</p>}
                  <div className="flex flex-wrap gap-2 mt-4">
                    {universities.length >= 2 && (
                      <button type="button" onClick={() => onNavigate({ section: 'universities', sub: 'compare' })} className="ar-btn ar-btn-secondary ar-btn-sm">
                        <GitCompare className="w-3.5 h-3.5" /> {t('unis.toCompare', { n: universities.length })}
                      </button>
                    )}
                    <button type="button" onClick={() => onNavigate({ section: 'universities', sub: 'pick' })} className="ar-btn ar-btn-quiet ar-btn-sm">
                      <Plus className="w-3.5 h-3.5" /> {t('uni.add.title')}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">{t('analysis.list.emptyText')}</p>
              )}
            </Widget>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {tools.map(({ icon: Icon, tile, title, text, value, onClick, footer }) => (
              <button key={title} type="button" onClick={onClick} className="ar-card p-5 text-left flex flex-col">
                <span className="flex items-center justify-between gap-3">
                  <span className={`ar-icon-tile ${tile}`}>
                    <Icon className="w-[18px] h-[18px]" />
                  </span>
                  <span className="font-display text-xl font-bold tabular-nums text-slate-950 dark:text-white">{value}</span>
                </span>
                <span className="block text-[15px] font-semibold text-slate-900 dark:text-white mt-4">{title}</span>
                <span className="block text-[13px] text-slate-500 dark:text-zinc-400 mt-1 leading-snug">{text}</span>
                {footer}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
