import React, { useMemo, useState } from 'react';
import { Briefcase, CheckCircle2, AlertTriangle, HelpCircle, Plus, MessageSquareText, Loader2, Info, ListPlus, Star, ArrowRight, Target, Lightbulb, FileText, Trophy } from 'lucide-react';
import type { ApplicantProfile, NavTarget, PortfolioFeedback, PortfolioItem, PortfolioItemInput, PortfolioItemType, University, UploadedDocument } from '../../types';
import type { TasksStore } from '../../hooks/useTasks';
import { matchPortfolio, rankRelevantItems, developmentAreas, type PortfolioCheck, type PortfolioSignalId, type DevelopmentArea } from '../../../shared/logic/portfolioMatch.js';
import { FIELD_RUBRICS, fieldForMajors } from '../../../shared/data/portfolioRubrics.js';
import { DOCUMENT_CHECKLIST } from '../../../shared/data/admissionsKnowledge.js';
import { portfolioApi } from '../../lib/api';
import { useI18n } from '../../i18n/I18nContext';
import { useToast } from '../../context/ToastContext';
import { useProgressCaptions } from '../../hooks/useProgressCaptions';
import { UniversityCrest } from '../ui/UniversityCrest';
import { Markdown } from '../ui/Markdown';
import { EmptyState, SectionHeader, SectionTabs } from '../cabinet/ui';
import { describeApiError } from '../planner/ui';

export type PortfolioTab = 'entries' | 'compare' | 'feedback';

interface PortfolioSectionProps {
  profile: ApplicantProfile;
  /** Profile plus what the portfolio proves (olympiad level, leadership, activities) */
  effectiveProfile: ApplicantProfile;
  universities: University[];
  items: PortfolioItem[];
  documents: UploadedDocument[];
  tasks: TasksStore;
  initialTab?: PortfolioTab;
  /** The entries editor with the rubric evaluation (the existing portfolio page) */
  entries: React.ReactNode;
  /** Opens the entries editor with a prefilled form */
  onAddItem: (draft: Partial<PortfolioItemInput>) => void;
  onNavigate: (target: NavTarget) => void;
  onAddUniversity: () => void;
}

const DOC_TITLE = Object.fromEntries(DOCUMENT_CHECKLIST.map((d) => [d.kind, d.title])) as Record<string, string>;

/** The kinds of achievements the applicant can list, as the brief names them. */
const CATEGORIES: { id: string; types: PortfolioItemType[]; add: PortfolioItemType }[] = [
  { id: 'olympiads', types: ['olympiad'], add: 'olympiad' },
  { id: 'projects', types: ['project'], add: 'project' },
  { id: 'research', types: ['research', 'publication'], add: 'research' },
  { id: 'competitions', types: ['competition'], add: 'competition' },
  { id: 'certificates', types: ['course'], add: 'course' },
  { id: 'volunteering', types: ['volunteering'], add: 'volunteering' },
  { id: 'leadership', types: ['leadership'], add: 'leadership' },
  { id: 'extracurricular', types: ['sport', 'art', 'internship'], add: 'sport' },
  { id: 'other', types: ['other'], add: 'other' },
];

const SIGNAL_ADD_TYPE: Record<PortfolioSignalId, PortfolioItemType> = {
  olympiads: 'olympiad',
  research: 'research',
  projects: 'project',
  competitions: 'competition',
  leadership: 'leadership',
  community: 'volunteering',
  creative: 'art',
  certificates: 'course',
  extracurricular: 'sport',
};

const STATUS_STYLE = {
  met: { icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400' },
  partial: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400' },
  missing: { icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400' },
  unknown: { icon: HelpCircle, color: 'text-slate-400 dark:text-zinc-500' },
} as const;

const ALIGN_TONE = {
  strong: 'ar-badge-green',
  partial: 'ar-badge-amber',
  weak: 'ar-badge-rose',
} as const;

/** Title inside a card of this section. */
const CARD_TITLE = 'text-base font-semibold text-slate-900 dark:text-white';

/** «Портфолио»: the entries, their comparison with the published criteria of the selected universities, and AI feedback. */
export const PortfolioSection: React.FC<PortfolioSectionProps> = ({ profile, effectiveProfile, universities, items, documents, tasks, initialTab, entries, onAddItem: openEntryForm, onNavigate, onAddUniversity }) => {
  const { t, tx, lang } = useI18n();
  const { notify } = useToast();
  const activeItems = useMemo(() => items.filter((it) => !it.excluded), [items]);
  const [tab, setTab] = useState<PortfolioTab>(initialTab || (activeItems.length ? 'compare' : 'entries'));
  // Adding an achievement always happens in the entries editor, with the form prefilled.
  const onAddItem = (draft: Partial<PortfolioItemInput>) => {
    openEntryForm(draft);
    setTab('entries');
  };
  const [feedback, setFeedback] = useState<PortfolioFeedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const caption = useProgressCaptions(loading, [t('progress.reading'), t('progress.universities'), t('progress.plan'), t('progress.finishing')]);

  const targets = useMemo(() => universities.slice(0, 6), [universities]);
  const field = fieldForMajors(effectiveProfile.targetMajors);
  const fieldTitle = FIELD_RUBRICS[field]?.title || field;
  const matches = useMemo(() => targets.map((u) => ({ uni: u, m: matchPortfolio(effectiveProfile, items, documents, u) })), [targets, effectiveProfile, items, documents]);
  const relevant = useMemo(() => rankRelevantItems(effectiveProfile, items, targets), [effectiveProfile, items, targets]);
  const areas = useMemo(() => developmentAreas(matches.map((x) => x.m), items), [matches, items]);
  const nameOf = (id: string) => universities.find((u) => u.id === id)?.shortName || id;

  const checkLabel = (c: PortfolioCheck) => {
    if (c.group === 'portfolio') return t(`pc.signal.${c.signal}`);
    if (c.group === 'documents') return c.id === 'interview' ? t('pc.check.interview') : t(DOC_TITLE[c.docKind || ''] || c.docKind || '');
    return t(`pc.check.${c.id}`, { min: c.min ?? '' });
  };

  const runFeedback = async () => {
    setLoading(true);
    setError(null);
    try {
      setFeedback(await portfolioApi.feedback({ universityIds: targets.map((u) => u.id), profile, language: lang }));
    } catch (err) {
      setError(describeApiError(t, err));
    } finally {
      setLoading(false);
    }
  };

  const recommendationsToTasks = async () => {
    if (!feedback?.recommendations.length) return;
    try {
      const res = await tasks.bulkCreate(feedback.recommendations.map((r) => ({ title: r.title.slice(0, 200), description: r.detail, category: 'portfolio', source: 'portfolio-feedback' })));
      notify(t('pfb.tasksAdded', { n: res.created.length }), 'success');
    } catch (err) {
      notify(describeApiError(t, err), 'error');
    }
  };

  const academicName = (id: string) => (id === 'major' ? t('pc.check.major') : id === 'unt' ? t('pc.unt') : id.toUpperCase());
  const areaTitle = (a: DevelopmentArea) =>
    a.kind === 'signal'
      ? t(a.status === 'missing' ? 'pc.area.missing' : 'pc.area.partial', { name: t(`pc.signal.${a.id}`) })
      : a.kind === 'academic'
        ? t(a.status === 'missing' ? 'pc.area.academicMissing' : 'pc.area.academic', { name: academicName(a.id) })
        : t(`pc.area.${a.kind}`);
  const areaHint = (a: DevelopmentArea) =>
    a.kind === 'signal' ? t(`pc.hint.${a.id}`) : a.kind === 'academic' ? t(a.id === 'major' ? 'pc.hint.major' : a.status === 'missing' ? 'pc.hint.academicMissing' : 'pc.hint.academic') : t(`pc.hint.${a.kind}`);
  const areaAction = (a: DevelopmentArea) => {
    if (a.kind === 'signal') {
      if (a.id === 'olympiads' || a.id === 'competitions') return { label: t('pc.action.olympiads'), run: () => onNavigate({ section: 'olympiads' }) };
      return { label: t('pc.action.add'), run: () => onAddItem({ type: SIGNAL_ADD_TYPE[a.id as PortfolioSignalId] }) };
    }
    if (a.kind === 'academic') return { label: t('pc.action.tasks'), run: () => onNavigate({ section: 'tasks' }) };
    return { label: t('pc.action.edit'), run: () => setTab('entries') };
  };

  const disclaimer = (
    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed flex items-start gap-1.5">
      <Info className="w-3.5 h-3.5 shrink-0 mt-px" /> {t('pc.disclaimer')}
    </p>
  );

  const noUniversities = (
    <EmptyState icon={<Target className="w-6 h-6" />} title={t('pc.noUnis.title')} text={t('pc.noUnis.text')} cta={t('uni.add.title')} onClick={onAddUniversity} />
  );

  return (
    <div className="space-y-5 py-2 sm:py-4">
      <SectionHeader kicker={t('nav.section.portfolio')} title={t('pc.title')} subtitle={t('pc.subtitle')} />
      <SectionTabs<PortfolioTab>
        value={tab}
        onChange={setTab}
        items={[
          { id: 'entries', label: t('pc.tab.entries', { n: activeItems.length }) },
          { id: 'compare', label: t('pc.tab.compare') },
          { id: 'feedback', label: t('pc.tab.feedback') },
        ]}
      />

      {tab === 'entries' && <div className="animate-fadeIn">{entries}</div>}

      {tab === 'compare' && (
        <div className="space-y-4 animate-fadeIn">
          {/* What the applicant has listed, by the kinds the committees read */}
          <div className="ar-card p-4 sm:p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-3">
              <h3 className={CARD_TITLE}>{t('pc.have.title')}</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">{t('pc.have.hint')}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2">
              {CATEGORIES.map((c) => {
                const n = activeItems.filter((it) => c.types.includes(it.type)).length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onAddItem({ type: c.add })}
                    className={`group min-w-0 rounded-xl border px-3 py-2.5 text-left transition-colors hover:border-slate-400 hover:bg-slate-50 dark:hover:border-zinc-600 dark:hover:bg-zinc-800/50 ${
                      n ? 'border-[var(--line)] bg-[var(--surface-raised)]' : 'border-dashed border-[var(--line-strong)]'
                    }`}
                    title={t('pc.have.add')}
                  >
                    <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 leading-tight break-words">{t(`pc.cat.${c.id}`)}</p>
                    <p className="flex items-center justify-between mt-1">
                      <span className={`text-lg font-semibold tabular-nums ${n ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-zinc-600'}`}>{n}</span>
                      <Plus className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-blue-600 dark:group-hover:text-blue-300" />
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {!targets.length ? (
            noUniversities
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {matches.map(({ uni, m }) => {
                  const met = m.checks.filter((c) => c.status === 'met');
                  const gaps = m.checks.filter((c) => c.status === 'missing' || c.status === 'partial');
                  const unknown = m.checks.filter((c) => c.status === 'unknown');
                  return (
                    <article key={uni.id} className="ar-card p-4 sm:p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <UniversityCrest uni={uni} size={40} rounded="rounded-xl" />
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{uni.shortName}</h3>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 truncate">{uni.name}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white leading-tight">{m.coverage === null ? '—' : `${m.coverage}%`}</p>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400">{t('pc.coverage')}</p>
                        </div>
                      </div>
                      <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-zinc-800" aria-hidden>
                        <div className="bg-emerald-500" style={{ width: `${(m.met / Math.max(1, m.met + m.partial + m.missing)) * 100}%` }} />
                        <div className="bg-amber-400" style={{ width: `${(m.partial / Math.max(1, m.met + m.partial + m.missing)) * 100}%` }} />
                        <div className="bg-rose-400" style={{ width: `${(m.missing / Math.max(1, m.met + m.partial + m.missing)) * 100}%` }} />
                      </div>
                      <CheckGroup title={t('pc.group.met')} tone="met" checks={met} label={checkLabel} t={t} tx={tx} />
                      <CheckGroup title={t('pc.group.gaps')} tone="missing" checks={gaps} label={checkLabel} t={t} tx={tx} />
                      <CheckGroup title={t('pc.group.unknown')} tone="unknown" checks={unknown} label={checkLabel} t={t} tx={tx} />
                    </article>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="ar-card p-4 sm:p-5 min-w-0">
                  <h3 className={`${CARD_TITLE} flex items-start gap-2`}>
                    <Star className="w-4 h-4 shrink-0 mt-1 text-amber-500" /> {t('pc.relevant.title', { field: tx(fieldTitle) })}
                  </h3>
                  {relevant.length ? (
                    <ol className="mt-3 space-y-3">
                      {relevant.slice(0, 5).map((r, i) => (
                        <li key={r.id} className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-zinc-800 text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums text-slate-700 dark:text-zinc-200">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{r.title}</p>
                              <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-zinc-400">{r.score}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 dark:bg-zinc-800 mt-1.5 overflow-hidden">
                              <div className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-[width] duration-700" style={{ width: `${r.score}%` }} />
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {r.reasons.map((reason) => (
                                <span key={reason} className={`ar-badge whitespace-normal ${reason === 'no_proof' ? 'ar-badge-amber' : ''}`}>
                                  {reason === 'valued' ? t('pc.reason.valued', { list: r.valuedBy.map(nameOf).join(', ') }) : t(`pc.reason.${reason}`)}
                                </span>
                              ))}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">{t('pc.relevant.empty')}</p>
                  )}
                </div>

                <div className="ar-card p-4 sm:p-5 min-w-0">
                  <h3 className={`${CARD_TITLE} flex items-start gap-2`}>
                    <Lightbulb className="w-4 h-4 shrink-0 mt-1 text-blue-600 dark:text-blue-400" /> {t('pc.develop.title')}
                  </h3>
                  {areas.length ? (
                    <ul className="mt-3 space-y-2.5">
                      {areas.slice(0, 6).map((a) => {
                        const action = areaAction(a);
                        return (
                          <li key={`${a.kind}:${a.id}`} className="rounded-xl border border-[var(--line)] p-3">
                            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                              <p className={`min-w-0 text-sm font-semibold ${a.status === 'missing' ? 'text-rose-700 dark:text-rose-300' : 'text-amber-800 dark:text-amber-300'}`}>{areaTitle(a)}</p>
                              <button type="button" onClick={action.run} className="ar-link shrink-0 text-xs min-h-6">
                                {action.label} <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">{areaHint(a)}</p>
                            {a.universities.length > 0 && <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{t(a.kind === 'academic' ? 'pc.area.required' : 'pc.area.for', { list: a.universities.map(nameOf).join(', ') })}</p>}
                            {a.items?.length ? <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{t('pc.area.items', { list: a.items.map((x) => `«${x.title}»`).join(', ') })}</p> : null}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">{t('pc.develop.empty')}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                <button type="button" onClick={() => setTab('feedback')} className="ar-btn ar-btn-primary">
                  <MessageSquareText className="w-4 h-4" /> {t('pfb.run')}
                </button>
                <button type="button" onClick={() => onNavigate({ section: 'universities', sub: 'compare' })} className="ar-btn ar-btn-secondary">
                  {t('pc.toCompare')} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
          {disclaimer}
        </div>
      )}

      {tab === 'feedback' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="ar-card p-4 sm:p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="ar-icon-tile">
                  <MessageSquareText className="w-[18px] h-[18px]" />
                </span>
                <div className="min-w-0">
                  <h3 className={CARD_TITLE}>{t('pfb.title')}</h3>
                  <p className="text-sm text-slate-600 dark:text-zinc-400 mt-0.5 max-w-2xl leading-relaxed">{t('pfb.intro')}</p>
                </div>
              </div>
              <button type="button" onClick={runFeedback} disabled={loading || !targets.length} aria-busy={loading} className="ar-btn ar-btn-primary w-full sm:w-auto shrink-0">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquareText className="w-4 h-4" />} {loading ? caption || t('pfb.running') : feedback ? t('common.retry') : t('pfb.run')}
              </button>
            </div>
            {targets.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-500 dark:text-zinc-400">{t('pfb.for')}:</span>
                {targets.map((u) => (
                  <span key={u.id} className="inline-flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--surface-subtle)] text-xs font-semibold text-slate-700 dark:text-zinc-200">
                    <UniversityCrest uni={u} size={16} rounded="rounded" /> {u.shortName}
                  </span>
                ))}
              </div>
            )}
            {!activeItems.length && (
              <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" /> {t('pfb.noItems')}
              </p>
            )}
            {error && (
              <div className="ar-notice ar-notice-error" role="alert">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="min-w-0">{error}</span>
              </div>
            )}
          </div>

          {!targets.length && noUniversities}

          {feedback && (
            <div className="space-y-3 animate-fadeIn">
              <div className="ar-card p-4 sm:p-5">
                <Markdown text={feedback.summary} />
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-3">{feedback.model === 'offline-rules' ? t('pfb.offline') : feedback.model}</p>
              </div>

              {feedback.perUniversity.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {feedback.perUniversity.map((p) => {
                    const uni = universities.find((u) => u.id === p.id);
                    return (
                      <div key={p.id} className="ar-card p-4 flex items-start gap-3 min-w-0">
                        {uni && <UniversityCrest uni={uni} size={32} rounded="rounded-lg" />}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{uni?.shortName || p.id}</p>
                            <span className={`ar-badge ${ALIGN_TONE[p.alignment]}`}>{t(`pfb.align.${p.alignment}`)}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">{p.comment}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <FeedbackList title={t('pfb.strengths')} tone="emerald" items={feedback.strengths.map((s) => ({ main: s.text, sub: s.items.length ? s.items.map((x) => `«${x}»`).join(', ') : '' }))} />
                <FeedbackList title={t('pfb.gaps')} tone="amber" items={feedback.gaps.map((g) => ({ main: g.text, sub: g.why }))} />
                <FeedbackList title={t('pfb.relevant')} icon={<Trophy className="w-3.5 h-3.5" />} items={feedback.relevant.map((r) => ({ main: r.title, sub: r.why }))} />
                <FeedbackList title={t('pfb.develop')} icon={<Lightbulb className="w-3.5 h-3.5" />} items={feedback.develop.map((d) => ({ main: d.text, sub: d.how }))} />
                <FeedbackList title={t('pfb.addDocuments')} icon={<FileText className="w-3.5 h-3.5" />} items={feedback.addDocuments.map((x) => ({ main: x }))} />
                <FeedbackList title={t('pfb.addActivities')} icon={<Briefcase className="w-3.5 h-3.5" />} items={feedback.addActivities.map((x) => ({ main: x }))} />
              </div>

              {feedback.recommendations.length > 0 && (
                <div className="ar-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <h3 className={CARD_TITLE}>{t('pfb.recommendations')}</h3>
                    <button type="button" onClick={recommendationsToTasks} className="ar-btn ar-btn-secondary ar-btn-sm">
                      <ListPlus className="w-4 h-4" /> {t('pfb.toTasks')}
                    </button>
                  </div>
                  <ul className="space-y-2.5">
                    {feedback.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span
                          className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${r.priority === 'high' ? 'bg-rose-500' : r.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-300 dark:bg-zinc-600'}`}
                          title={t(`pfb.priority.${r.priority}`)}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{r.title}</p>
                          {r.detail && <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed mt-0.5">{r.detail}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {disclaimer}
        </div>
      )}
    </div>
  );
};

const CheckGroup: React.FC<{
  title: string;
  tone: 'met' | 'missing' | 'unknown';
  checks: PortfolioCheck[];
  label: (c: PortfolioCheck) => string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tx: (text: string | undefined | null) => string;
}> = ({ title, tone, checks, label, t, tx }) => {
  if (!checks.length) return null;
  return (
    <div>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 ${STATUS_STYLE[tone].color}`}>{title}</p>
      <ul className="space-y-1.5">
        {checks.map((c) => {
          const style = STATUS_STYLE[c.status];
          const Icon = style.icon;
          return (
            <li key={c.id} className="flex items-start gap-2 text-sm text-slate-700 dark:text-zinc-200">
              <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${style.color}`} />
              <div className="min-w-0">
                <p>
                  {label(c)}
                  {c.status === 'partial' && <span className="text-xs text-amber-700 dark:text-amber-300"> · {t('pc.status.partial')}</span>}
                  {c.group === 'academic' && c.id !== 'major' && <span className="text-xs text-slate-500 dark:text-zinc-400"> · {c.value !== null && c.value !== undefined ? t('pc.value', { value: c.value }) : t('pc.valueNone')}</span>}
                </p>
                {c.evidence.length > 0 && <p className="text-xs text-slate-500 dark:text-zinc-400">{t('pc.evidence')}: {c.evidence.map((e) => `«${e.title}»`).join(', ')}</p>}
                {c.source && <p className="text-xs text-slate-500 dark:text-zinc-400 italic">{t('pc.source')}: «{tx(c.source)}»</p>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

const FeedbackList: React.FC<{ title: string; items: { main: string; sub?: string }[]; tone?: 'emerald' | 'amber'; icon?: React.ReactNode }> = ({ title, items, tone, icon }) => {
  if (!items.length) return null;
  const box =
    tone === 'emerald'
      ? 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/25'
      : tone === 'amber'
        ? 'bg-amber-50/70 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/25'
        : 'bg-[var(--surface-raised)] border-[var(--line)] shadow-[var(--shadow-card)]';
  const head = tone === 'emerald' ? 'text-emerald-800 dark:text-emerald-300' : tone === 'amber' ? 'text-amber-800 dark:text-amber-300' : 'text-slate-500 dark:text-zinc-400';
  return (
    <div className={`rounded-2xl border p-4 min-w-0 ${box}`}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.06em] mb-2 inline-flex items-center gap-1.5 ${head}`}>
        {icon}
        {title}
      </p>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-slate-800 dark:text-zinc-100 leading-relaxed">
            {it.main}
            {it.sub && <span className="block text-xs text-slate-600 dark:text-zinc-400 mt-0.5">{it.sub}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
};
