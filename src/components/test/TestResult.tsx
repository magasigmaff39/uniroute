// Result of the applicant test: readiness, three realistic universities, the AI verdict and what to do next.
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, MessageSquareText, RotateCcw, LayoutDashboard, AlertCircle, ShieldCheck, Loader2, Gauge, Target, GraduationCap, CalendarClock, Briefcase, CheckCircle2, UserPlus } from 'lucide-react';
import type { ApplicantProfile, DiagnosticResult, FitTier, NavTarget } from '../../types';
import type { UserAccount } from '../../lib/auth';
import { aiApi, isNetworkError, type QuickVerdict } from '../../lib/api';
import { useI18n } from '../../i18n/I18nContext';
import { useProgressCaptions } from '../../hooks/useProgressCaptions';
import { UNIVERSITY_DATABASE } from '../../data/universities';
import { pickTargetUniversities } from '../../../shared/logic/match.js';
import { UniversityCrest } from '../ui/UniversityCrest';
import { renderInline } from '../ui/Markdown';

const TIER_TONE: Record<FitTier, string> = {
  Dream: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/25',
  Target: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/25',
  Safety: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25',
};

/** Readiness ring: brand blue on a light track (#0e64d2, #4f9af5 in the dark theme). */
const Ring: React.FC<{ value: number; size?: number }> = ({ value, size = 128 }) => {
  const r = 34;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - Math.max(0, Math.min(100, value)) / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 80 80" className="-rotate-90" style={{ width: size, height: size }} aria-hidden>
        <circle cx="40" cy="40" r={r} strokeWidth="7" fill="none" className="ring-track" />
        <circle
          cx="40"
          cy="40"
          r={r}
          strokeWidth="7"
          fill="none"
          className="stroke-blue-600 dark:stroke-blue-400"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={dash}
          style={{ transition: 'stroke-dashoffset 1100ms cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-slate-900 dark:text-white tabular-nums leading-none">{Math.round(value)}%</span>
      </div>
    </div>
  );
};

/** The pause between the last answer and the verdict. */
export const TestAnalyzing: React.FC = () => {
  const { t } = useI18n();
  const captions = useMemo(() => [t('quick.analyzing.1'), t('quick.analyzing.2'), t('quick.analyzing.3'), t('quick.analyzing.4')], [t]);
  const caption = useProgressCaptions(true, captions, 600);
  return (
    <div className="min-h-[60vh] flex items-center justify-center py-10">
      <div className="w-full max-w-md ar-card p-6 sm:p-8 text-center animate-fadeInUp" role="status" aria-live="polite">
        <span className="ar-icon-tile flex mx-auto w-14 h-14 rounded-2xl mb-5">
          <Loader2 className="w-6 h-6 animate-spin" />
        </span>
        <p className="ar-kicker">{t('test.kicker')}</p>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mt-1.5">{t('quick.analyzing.title')}</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2 min-h-[1.5rem] transition">{caption}</p>
        <div className="ar-progress h-1.5 mt-6">
          <span className="animate-quick-fill" />
        </div>
      </div>
    </div>
  );
};

interface TestResultProps {
  currentUser: UserAccount | null;
  profile: ApplicantProfile;
  diagnostic: DiagnosticResult;
  onRetake: () => void;
  /** Cabinet home for the signed-in applicant, the title page for a guest */
  onHome: () => void;
  /** Guests: save the result by creating an account */
  onRegister?: () => void;
  onNavigate?: (target: NavTarget) => void;
}

export const TestResult: React.FC<TestResultProps> = ({ currentUser, profile, diagnostic, onRetake, onHome, onRegister, onNavigate }) => {
  const { t, tx, lang } = useI18n();
  const picks = useMemo(() => pickTargetUniversities(profile, UNIVERSITY_DATABASE, { limit: 3 }), [profile]);
  const pickedUnis = useMemo(() => picks.map((p) => ({ pick: p, uni: UNIVERSITY_DATABASE.find((u) => u.id === p.id)! })).filter((x) => x.uni), [picks]);

  const [verdict, setVerdict] = useState<QuickVerdict | null>(null);
  const [verdictState, setVerdictState] = useState<'idle' | 'loading' | 'done' | 'offline'>('idle');
  const verdictKey = `${lang}:${profile.assessmentUpdatedAt || ''}`;

  useEffect(() => {
    if (!profile.assessmentLevel) return;
    let cancelled = false;
    const cacheKey = `admitroute_quick_verdict:${verdictKey}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setVerdict(JSON.parse(cached));
        setVerdictState('done');
        return;
      }
    } catch {
      /* ignore */
    }
    setVerdictState('loading');
    aiApi
      .quickVerdict(profile, lang)
      .then((res) => {
        if (cancelled) return;
        if (!res.verdict) {
          setVerdictState('offline');
          return;
        }
        setVerdict(res);
        setVerdictState('done');
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(res));
        } catch {
          /* ignore */
        }
      })
      .catch((err) => {
        if (cancelled) return;
        void isNetworkError(err);
        setVerdictState('offline');
      });
    return () => {
      cancelled = true;
    };
    // Re-run only when a new set of answers lands (assessmentUpdatedAt) or the language changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verdictKey]);

  const readiness = diagnostic.readiness;
  const bars: { key: string; value: number }[] = [
    { key: 'quick.bar.academic', value: readiness.academic },
    { key: 'quick.bar.language', value: readiness.language },
    { key: 'quick.bar.portfolio', value: readiness.portfolio },
    { key: 'quick.bar.finance', value: readiness.financialFeasibility },
  ];
  const insights = [
    ...diagnostic.bottlenecks.slice(0, 2).map((b) => ({ kind: 'risk' as const, title: b.title, text: b.action })),
    ...diagnostic.strengths.slice(0, 1).map((s) => ({ kind: 'strength' as const, title: s.title, text: s.desc })),
  ];

  const nextSteps: { icon: React.FC<{ className?: string }>; key: string; target: NavTarget }[] = [
    { icon: GraduationCap, key: 'test.next.universities', target: { section: 'universities', sub: 'pick' } },
    { icon: CalendarClock, key: 'test.next.deadlines', target: { section: 'deadlines' } },
    { icon: Briefcase, key: 'test.next.portfolio', target: { section: 'portfolio' } },
  ];

  return (
    <div className="space-y-5 sm:space-y-6 py-2 sm:py-4">
      {/* Hero: readiness on the left, the three picked universities on the right */}
      <section className="ar-card rounded-3xl p-5 sm:p-8 animate-fadeInUp">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          <div className="lg:col-span-7 min-w-0 space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <p className="ar-kicker">{t('quick.result.kicker')}</p>
                <span className="ar-badge ar-badge-amber">
                  <Gauge className="w-3.5 h-3.5" /> {t('quick.result.accuracy')}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-slate-900 dark:text-white [text-wrap:balance]">
                {profile.firstName || currentUser?.firstName ? `${profile.firstName || currentUser?.firstName}, ` : ''}
                {t('quick.result.title')}
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 leading-relaxed max-w-xl">{t('quick.result.subtitle')}</p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-7 pt-1">
              <Ring value={readiness.overall} />
              <ul className="flex-1 min-w-0 space-y-3 w-full">
                {bars.map((b) => (
                  <li key={b.key}>
                    <div className="flex items-center justify-between gap-3 text-xs font-medium text-slate-600 dark:text-zinc-400 mb-1.5">
                      <span className="min-w-0">{t(b.key)}</span>
                      <span className="tabular-nums font-semibold text-slate-900 dark:text-white">{Math.round(b.value)}%</span>
                    </div>
                    <div className="ar-progress h-1.5">
                      <span style={{ width: `${Math.max(3, b.value)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-5 min-w-0 border-t border-[var(--line)] pt-6 lg:border-t-0 lg:pt-0 lg:border-l lg:pl-8">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">{t('quick.result.picks')}</h2>
            <ul className="space-y-2.5">
              {pickedUnis.map(({ pick, uni }, i) => (
                <li
                  key={uni.id}
                  className="flex items-start gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3 animate-fadeInUp"
                  style={{ animationDelay: `${120 + i * 90}ms` }}
                >
                  <UniversityCrest uni={uni} size={44} rounded="rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{uni.shortName}</p>
                      <p className="shrink-0 text-xs font-semibold text-slate-900 dark:text-white tabular-nums">
                        ~{pick.probability}% <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">{t('quick.result.chance')}</span>
                      </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                      {uni.flag} {uni.city}, {uni.country}
                    </p>
                    <span className={`mt-1.5 inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${TIER_TONE[pick.tier]}`}>{t(`uni.tier.${pick.tier}`)}</span>
                  </div>
                </li>
              ))}
            </ul>
            {currentUser && onNavigate && (
              <button type="button" onClick={() => onNavigate({ section: 'universities', sub: 'pick' })} className="ar-btn ar-btn-secondary w-full mt-3">
                {t('quick.result.allUnis', { n: UNIVERSITY_DATABASE.length })} <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="ar-card p-5 sm:p-6 lg:col-span-7 min-w-0 animate-fadeInUp-delay-1">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="ar-icon-tile">
                <MessageSquareText className="w-[18px] h-[18px]" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">{t('quick.verdict.title')}</h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t('quick.verdict.sub')}</p>
              </div>
            </div>
            {verdict?.model && verdictState === 'done' && (
              <span className="hidden sm:inline-block ar-badge font-mono font-medium truncate max-w-[10rem]" title={verdict.model}>
                {verdict.model.split(':').pop()}
              </span>
            )}
          </div>

          {verdictState === 'loading' && (
            <div className="space-y-2.5" aria-live="polite">
              <div className="skeleton h-3.5 w-full" />
              <div className="skeleton h-3.5 w-11/12" />
              <div className="skeleton h-3.5 w-4/5" />
              <p className="text-xs text-slate-500 dark:text-zinc-400 pt-1 inline-flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('quick.verdict.loading')}
              </p>
            </div>
          )}

          {verdictState !== 'loading' && (
            <div className="space-y-4">
              <p className="text-sm leading-relaxed text-slate-700 dark:text-zinc-300">{verdictState === 'done' && verdict ? renderInline(verdict.verdict, 'qv') : tx(diagnostic.strategicAdvice)}</p>
              {verdictState === 'done' && verdict && verdict.focus.length > 0 && (
                <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {verdict.focus.map((f, i) => (
                    <li key={i} className="rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-3 text-xs sm:text-[13px] text-slate-700 dark:text-zinc-300 leading-snug">
                      <span className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-blue-600 dark:text-blue-400 mb-1">
                        {t('quick.verdict.focus')} {i + 1}
                      </span>
                      {renderInline(f, `qf${i}`)}
                    </li>
                  ))}
                </ul>
              )}
              {verdictState === 'offline' && (
                <p className="text-xs text-slate-500 dark:text-zinc-400 inline-flex items-start gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" /> {t('quick.verdict.offline')}
                </p>
              )}
            </div>
          )}
        </div>

        {/* What next: the cabinet tools for an account, saving the result for a guest */}
        <div className="lg:col-span-5 min-w-0 rounded-2xl border border-blue-100 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/10 p-5 sm:p-6 animate-fadeInUp-delay-2 flex flex-col">
          <p className="ar-kicker mb-1.5 inline-flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5" /> {t('test.next.kicker')}
          </p>
          {currentUser && onNavigate ? (
            <>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-snug">{t('test.next.title')}</h3>
              <ul className="mt-4 space-y-2">
                {nextSteps.map(({ icon: Icon, key, target }) => (
                  <li key={key}>
                    <button type="button" onClick={() => onNavigate(target)} className="ar-card group w-full flex items-center gap-3 px-3.5 py-3 text-left">
                      <span className="ar-icon-tile">
                        <Icon className="w-[18px] h-[18px]" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white">{t(key)}</span>
                        <span className="block text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t(`${key}.hint`)}</span>
                      </span>
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white leading-snug">{t('quick.guest.title')}</h3>
              <p className="text-sm text-slate-600 dark:text-zinc-400 mt-1.5 leading-relaxed">{t('quick.guest.subtitle')}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700 dark:text-zinc-300">
                {['test.guest.p1', 'test.guest.p2', 'test.guest.p3'].map((k) => (
                  <li key={k} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" /> <span className="min-w-0">{t(k)}</span>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={onRegister} className="ar-btn ar-btn-primary ar-btn-lg mt-6 w-full sm:w-auto sm:self-start">
                <UserPlus className="w-4 h-4" /> {t('auth.register')}
              </button>
            </>
          )}
        </div>
      </section>

      {insights.length > 0 && (
        <section className="space-y-3 animate-fadeInUp-delay-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('quick.insights')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {insights.map((ins, i) => (
              <div key={i} className="ar-card p-4 min-w-0">
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] mb-2 ${ins.kind === 'risk' ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                  {ins.kind === 'risk' ? <AlertCircle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  {t(ins.kind === 'risk' ? 'quick.insight.risk' : 'quick.insight.strength')}
                </span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">{tx(ins.title)}</p>
                <p className="text-xs sm:text-[13px] text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">{tx(ins.text)}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 pt-2">
        <button type="button" onClick={onRetake} className="ar-btn ar-btn-secondary w-full sm:w-auto">
          <RotateCcw className="w-4 h-4" /> {t('quick.result.retake')}
        </button>
        <button type="button" onClick={onHome} className="ar-btn ar-btn-secondary w-full sm:w-auto">
          <LayoutDashboard className="w-4 h-4" /> {t('quick.result.home')}
        </button>
      </div>
    </div>
  );
};
