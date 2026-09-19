import React, { useMemo, useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { ArrowRight, ArrowLeft, Coins, Check, AlertCircle, Calendar, GraduationCap, Building, ShieldCheck, Briefcase, ScanSearch, Loader2, ExternalLink, Percent, Thermometer, X, Plus, GitCompare, Info, HelpCircle, Scale, FileText, Award } from 'lucide-react';
import type { ApplicantProfile, ComparisonDimensionKey, ComparisonInsights, University } from '../types';
import { aiApi, ApiError } from '../lib/api';
import { estimateWithProjections } from '../../shared/logic/chance.js';
import { Markdown } from './ui/Markdown';
import { UniversityCrest } from './ui/UniversityCrest';
import { useProgressCaptions } from '../hooks/useProgressCaptions';

interface Step5ComparisonProps {
  allUniversities: University[];
  /** The applicant's selected universities — the same list as «Мой список», in the order they were chosen */
  selectedIds: string[];
  /** Removes a university from the selection (and so from the comparison) */
  onToggleUni: (id: string) => void;
  onAddUniversity: () => void;
  onPick: () => void;
  onNext: () => void;
  onBack: () => void;
  profile: ApplicantProfile;
  isAuthenticated: boolean;
}

/** The AI compares at most this many universities at once (the matrix shows all of them). */
const AI_LIMIT = 6;

const DIMENSION_ICON: Record<ComparisonDimensionKey, React.ReactNode> = {
  requirements: <FileText className="w-4 h-4" />,
  deadlines: <Calendar className="w-4 h-4" />,
  cost: <Coins className="w-4 h-4" />,
  scholarships: <Award className="w-4 h-4" />,
  exams: <GraduationCap className="w-4 h-4" />,
  portfolio: <Briefcase className="w-4 h-4" />,
  profileFit: <Scale className="w-4 h-4" />,
};

export const Step5Comparison: React.FC<Step5ComparisonProps> = ({ allUniversities, selectedIds, onToggleUni, onAddUniversity, onPick, onNext, onBack, profile }) => {
  const { t, tx, lang } = useI18n();
  // Exactly the selected universities, in the applicant's order — nothing is substituted when the list is short.
  const activeUnis = useMemo(() => selectedIds.map((id) => allUniversities.find((u) => u.id === id)).filter((u): u is University => Boolean(u)), [selectedIds, allUniversities]);

  const [insights, setInsights] = useState<ComparisonInsights | null>(null);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Column under the pointer: tinted with the accent so the eye can follow it without losing contrast.
  const [hoverCol, setHoverCol] = useState<string | null>(null);

  const chances = useMemo(() => Object.fromEntries(activeUnis.map((u) => [u.id, estimateWithProjections(profile, u)])), [activeUnis, profile]);
  const aiIds = activeUnis.slice(0, AI_LIMIT).map((u) => u.id);
  // The analysis belongs to a set of universities; after the set changes it has to be run again.
  const insightsStale = Boolean(insights) && insights!.universityIds.join(',') !== aiIds.join(',');

  const compareCaption = useProgressCaptions(comparing, [t('progress.reading'), t('progress.universities'), t('progress.chances'), t('progress.finishing')]);

  const describeError = (err: unknown) => (err instanceof ApiError ? (err.code === 'NETWORK' ? t('common.backendOffline') : err.message) : t('common.error'));

  const runInsights = async () => {
    setComparing(true);
    setError(null);
    try {
      setInsights(await aiApi.compareInsights(aiIds, profile, lang));
    } catch (err) {
      setError(describeError(err));
    } finally {
      setComparing(false);
    }
  };

  const rowHead = (icon: React.ReactNode, label: string) => (
    <td className="p-4 sm:p-5 font-semibold text-slate-800 dark:text-zinc-200 bg-slate-50/50 dark:bg-zinc-800/20 align-top">
      <div className="flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </div>
    </td>
  );

  /** Props for every cell of a university column: hover tracking and the column tint. */
  const col = (id: string, className = '') => ({
    className: `${className} ${hoverCol === id ? 'ar-compare-col' : ''}`,
    onMouseEnter: () => setHoverCol(id),
  });

  const shortName = (id: string) => activeUnis.find((u) => u.id === id)?.shortName || id;

  return (
    <div className="space-y-6 py-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-[var(--line)]">
        <div className="min-w-0">
          <div className="ar-kicker mb-1">{t('steps.5.kicker')}</div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{t('steps.5.title')}</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">{t('steps.5.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 self-start sm:max-w-[55%] sm:justify-end">
          <span className="text-xs text-slate-500 dark:text-zinc-400 mr-1">{t('compare.selected', { n: activeUnis.length })}:</span>
          {activeUnis.map((u) => (
            <span key={u.id} className="inline-flex items-center gap-1.5 min-h-8 pl-1 pr-0.5 rounded-lg border border-[var(--line-strong)] bg-[var(--surface-raised)] text-xs font-semibold text-slate-800 dark:text-zinc-200">
              <UniversityCrest uni={u} size={22} rounded="rounded-md" />
              <span>{u.shortName}</span>
              <button type="button" onClick={() => onToggleUni(u.id)} aria-label={t('compare.remove', { name: u.shortName })} title={t('compare.remove', { name: u.shortName })} className="w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-300 transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
          <button type="button" onClick={onAddUniversity} className="ar-btn ar-btn-secondary ar-btn-sm">
            <Plus className="w-4 h-4" /> {t('compare.add')}
          </button>
        </div>
      </div>

      {activeUnis.length === 0 ? (
        <div className="ar-card px-6 py-12 text-center flex flex-col items-center">
          <span className="ar-icon-tile w-12 h-12 rounded-xl">
            <GitCompare className="w-5 h-5" />
          </span>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mt-4">{t('compare.empty.title')}</h3>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1.5 max-w-md leading-relaxed">{t('compare.empty.text')}</p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            <button type="button" onClick={onPick} className="ar-btn ar-btn-primary">{t('compare.empty.pick')}</button>
            <button type="button" onClick={onAddUniversity} className="ar-btn ar-btn-secondary">
              <Plus className="w-4 h-4" /> {t('uni.add.title')}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* AI: differences explained by facts and the profile — no ranking */}
          <div className="ar-card p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <span className="ar-icon-tile">
                  <ScanSearch className="w-[18px] h-[18px]" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('compare.insights.title')}</h3>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mt-0.5 max-w-2xl leading-relaxed">{t('compare.insights.hint')}</p>
                  {activeUnis.length > AI_LIMIT && <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{t('compare.insights.limit', { n: AI_LIMIT })}</p>}
                </div>
              </div>
              <button type="button" onClick={runInsights} disabled={comparing || activeUnis.length < 2} aria-busy={comparing} className="ar-btn ar-btn-primary shrink-0 w-full sm:w-auto">
                {comparing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> {compareCaption || t('ai.analyze.running')}
                  </>
                ) : (
                  <>
                    <ScanSearch className="w-4 h-4" /> {insights && !insightsStale ? t('common.retry') : t('compare.insights.run')}
                  </>
                )}
              </button>
            </div>
            {activeUnis.length < 2 && <p className="text-xs text-slate-500 dark:text-zinc-400 mt-3">{t('compare.insights.needTwo')}</p>}
            {insightsStale && <p className="text-xs text-amber-700 dark:text-amber-300 mt-3">{t('compare.insights.stale')}</p>}
            {error && (
              <p role="alert" className="ar-notice ar-notice-error mt-3">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </p>
            )}
            {insights && (
              <div className={`mt-5 space-y-3 text-sm ${insightsStale ? 'opacity-60' : ''}`}>
                {insights.overview && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-[var(--line)]">
                    <Markdown text={insights.overview} />
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {insights.dimensions.map((d) => (
                    <div key={d.key} className="p-4 rounded-xl border border-[var(--line)] space-y-2 min-w-0">
                      <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
                        <span className="text-blue-600 dark:text-blue-300">{DIMENSION_ICON[d.key]}</span> {t(`compare.dim.${d.key}`)}
                      </div>
                      <p className="text-slate-700 dark:text-zinc-300 leading-relaxed">{d.summary}</p>
                      <ul className="space-y-1.5">
                        {d.notes.map((n) => (
                          <li key={n.id} className="flex items-start gap-2">
                            <span className="ar-badge shrink-0 mt-px">{shortName(n.id)}</span>
                            <span className="text-slate-600 dark:text-zinc-400 leading-relaxed">{n.text}</span>
                          </li>
                        ))}
                      </ul>
                      {d.consider && <p className="text-xs leading-relaxed text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-lg px-3 py-2">{d.consider}</p>}
                    </div>
                  ))}
                </div>
                {(insights.tradeoffs.length > 0 || insights.questions.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {insights.tradeoffs.length > 0 && (
                      <div className="p-4 rounded-xl border border-[var(--line)]">
                        <div className="text-[11px] uppercase tracking-[0.06em] font-semibold text-slate-500 dark:text-zinc-400 mb-2 flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5" /> {t('compare.insights.tradeoffs')}
                        </div>
                        <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-zinc-300 marker:text-slate-400">
                          {insights.tradeoffs.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {insights.questions.length > 0 && (
                      <div className="p-4 rounded-xl border border-[var(--line)]">
                        <div className="text-[11px] uppercase tracking-[0.06em] font-semibold text-slate-500 dark:text-zinc-400 mb-2 flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5" /> {t('compare.insights.questions')}
                        </div>
                        <ul className="list-disc pl-4 space-y-1 text-slate-700 dark:text-zinc-300 marker:text-slate-400">
                          {insights.questions.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {insights.dataGaps.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/25">
                    <div className="text-[11px] uppercase tracking-[0.06em] font-semibold text-amber-800 dark:text-amber-300 mb-1.5">{t('compare.insights.gaps')}</div>
                    <ul className="list-disc pl-4 text-amber-900 dark:text-amber-200 space-y-0.5">
                      {insights.dataGaps.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-slate-500 dark:text-zinc-400 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-px" /> {t('compare.insights.disclaimer')} · {insights.model === 'offline-rules' ? t('pfb.offline') : insights.model}
                </p>
              </div>
            )}
          </div>

          {activeUnis.length === 1 && <p className="text-xs text-slate-500 dark:text-zinc-400 -mt-3">{t('compare.onlyOne')}</p>}

          {/* Matrix */}
          <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)] shadow-[var(--shadow-card)]" onMouseLeave={() => setHoverCol(null)}>
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-[var(--line)] bg-slate-50 dark:bg-zinc-800/30">
                  <th className="p-4 sm:p-5 w-1/4 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-zinc-400 align-bottom" onMouseEnter={() => setHoverCol(null)}>
                    {t('compare.criterion')}
                  </th>
                  {activeUnis.map((uni) => (
                    <th key={uni.id} {...col(uni.id, 'p-4 sm:p-5 text-slate-900 dark:text-white align-top font-normal')}>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="ar-badge">{uni.city}</span>
                          <span className="text-xs font-semibold tabular-nums text-slate-600 dark:text-zinc-300">{uni.matchScore}% Match</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <UniversityCrest uni={uni} size={40} />
                          <div className="min-w-0">
                            <h4 className="font-semibold text-base leading-tight text-slate-900 dark:text-white">{uni.shortName}</h4>
                            <p className="text-xs text-slate-500 dark:text-zinc-400">{uni.country}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <span className="ar-badge">{uni.fitTier} Tier</span>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-xs">
                <tr className="ar-compare-row">
                  {rowHead(<Percent className="w-4 h-4 text-slate-500" />, t('compare.row.chance'))}
                  {activeUnis.map((uni) => {
                    const c = chances[uni.id];
                    return (
                      <td key={uni.id} {...col(uni.id, 'p-4 sm:p-5 align-top')}>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white leading-none">{c.probability}%</span>
                          <span className="text-xs text-slate-500 mb-0.5">{c.tier}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 mt-2.5 overflow-hidden">
                          <div className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-[width] duration-500" style={{ width: `${c.probability}%` }} />
                        </div>
                        <ul className="mt-2.5 space-y-0.5 text-xs text-slate-600">
                          {c.factors.slice(0, 3).map((f, i) => (
                            <li key={i} className={f.impact >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>
                              {f.impact >= 0 ? '+' : ''}
                              {f.impact} · {f.note}
                            </li>
                          ))}
                        </ul>
                      </td>
                    );
                  })}
                </tr>

                <tr className="ar-compare-row">
                  {rowHead(<Coins className="w-4 h-4 text-slate-500" />, t('compare.row.finance'))}
                  {activeUnis.map((uni) => (
                    <td key={uni.id} {...col(uni.id, 'p-4 sm:p-5 space-y-1 align-top')}>
                      <div className="font-semibold text-slate-900 dark:text-white text-sm">{uni.hasFullGrantOrScholarship ? t('compare.fullFunding') : `$${uni.tuitionUSDPerYear.toLocaleString()} / ${t('compare.perYear')}`}</div>
                      <div className="text-xs text-slate-500">
                        {t('compare.living')}: ${uni.livingCostUSDPerYear.toLocaleString()} / {t('compare.perYear')}
                      </div>
                      <div className="text-slate-800 dark:text-zinc-200 font-medium">{tx(uni.scholarshipName)}</div>
                      <div className="text-slate-500 text-xs leading-relaxed">{tx(uni.scholarshipDescription)}</div>
                    </td>
                  ))}
                </tr>

                <tr className="ar-compare-row">
                  {rowHead(<GraduationCap className="w-4 h-4 text-slate-500" />, t('compare.row.thresholds'))}
                  {activeUnis.map((uni) => (
                    <td key={uni.id} {...col(uni.id, 'p-4 sm:p-5 space-y-1.5 align-top')}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">GPA:</span>
                        <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{uni.minGpa} / 4.0</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">IELTS:</span>
                        <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{uni.minIelts}+</span>
                      </div>
                      {uni.minSat && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">SAT:</span>
                          <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{uni.minSat}+</span>
                        </div>
                      )}
                      {uni.minUnt && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">ЕНТ:</span>
                          <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{uni.minUnt}+</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100 dark:border-zinc-800">
                        <span className="text-slate-500">{t('compare.acceptance')}:</span>
                        <span className="font-semibold tabular-nums text-slate-700 dark:text-zinc-200">{uni.acceptanceRate}</span>
                      </div>
                      {uni.admissions?.testPolicy && <div className="text-xs text-slate-500">{tx(uni.admissions.testPolicy)}</div>}
                    </td>
                  ))}
                </tr>

                <tr className="ar-compare-row">
                  {rowHead(<ShieldCheck className="w-4 h-4 text-slate-500" />, t('compare.row.life'))}
                  {activeUnis.map((uni) => (
                    <td key={uni.id} {...col(uni.id, 'p-4 sm:p-5 space-y-1.5 text-xs align-top')}>
                      {uni.campus && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{t('compare.safety')}:</span>
                          <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{uni.campus.neighborhoodSafety}/10</span>
                        </div>
                      )}
                      {uni.stats?.internationalShare !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{t('compare.intl')}:</span>
                          <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{uni.stats.internationalShare}</span>
                        </div>
                      )}
                      {uni.stats?.graduateEmployment !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500">{t('compare.employment')}:</span>
                          <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{uni.stats.graduateEmployment}</span>
                        </div>
                      )}
                      {uni.environment && (
                        <div className="flex items-start gap-1.5 text-slate-600 dark:text-zinc-400 pt-1.5 border-t border-slate-100 dark:border-zinc-800">
                          <Thermometer className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />
                          <span>{tx(uni.environment.climate.split(':')[0])}</span>
                        </div>
                      )}
                    </td>
                  ))}
                </tr>

                <tr className="ar-compare-row">
                  {rowHead(<Calendar className="w-4 h-4 text-slate-500" />, t('compare.row.deadlines'))}
                  {activeUnis.map((uni) => (
                    <td key={uni.id} {...col(uni.id, 'p-4 sm:p-5 space-y-1.5 align-top')}>
                      {uni.earlyDeadline && (
                        <div>
                          <span className="text-[11px] font-medium text-slate-500 block">Early:</span>
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">{tx(uni.earlyDeadline)}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-[11px] font-medium text-slate-500 block">{t('compare.regularRound')}:</span>
                        <span className="font-semibold text-slate-900 dark:text-white">{tx(uni.regularDeadline)}</span>
                      </div>
                      <a href={uni.officialPortalUrl} target="_blank" rel="noreferrer" className="ar-link text-xs pt-1">
                        <ExternalLink className="w-3 h-3" /> {t('common.officialPortal')}
                      </a>
                    </td>
                  ))}
                </tr>

                <tr className="ar-compare-row">
                  {rowHead(<Briefcase className="w-4 h-4 text-slate-500" />, t('compare.row.programs'))}
                  {activeUnis.map((uni) => (
                    <td key={uni.id} {...col(uni.id, 'p-4 sm:p-5 align-top')}>
                      <div className="flex flex-wrap gap-1">
                        {uni.flagshipPrograms.slice(0, 5).map((p) => (
                          <span key={p} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs">
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>

                <tr className="ar-compare-row">
                  {rowHead(<Building className="w-4 h-4 text-slate-500" />, t('compare.row.advantages'))}
                  {activeUnis.map((uni) => (
                    <td key={uni.id} {...col(uni.id, 'p-4 sm:p-5 align-top')}>
                      <ul className="space-y-1.5">
                        {uni.advantages.map((adv, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-slate-700 dark:text-zinc-300 leading-snug">
                            <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span>{tx(adv)}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>

                <tr className="ar-compare-row">
                  {rowHead(<AlertCircle className="w-4 h-4 text-slate-500" />, t('compare.row.cautions'))}
                  {activeUnis.map((uni) => (
                    <td key={uni.id} {...col(uni.id, 'p-4 sm:p-5 align-top')}>
                      <ul className="space-y-1.5">
                        {uni.cautions.map((c, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-slate-600 dark:text-zinc-400 leading-snug">
                            <span className="text-amber-500 shrink-0 font-bold">•</span>
                            <span>{tx(c)}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-5 border-t border-[var(--line)]">
        <button type="button" onClick={onBack} className="ar-btn ar-btn-secondary w-full sm:w-auto">
          <ArrowLeft className="w-4 h-4" />
          <span>{t('steps.5.back')}</span>
        </button>
        <button type="button" onClick={onNext} className="ar-btn ar-btn-primary w-full sm:w-auto">
          <span>{t('steps.5.next')}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
