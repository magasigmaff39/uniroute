import React, { useMemo, useState } from 'react';
import { Plus, GitCompare, ChevronDown, ChevronRight, Trash2, CheckCircle2, AlertTriangle, HelpCircle, ExternalLink, ListChecks, Calendar, ArrowRight, Info } from 'lucide-react';
import type { ApplicantProfile, NavTarget, University, UploadedDocument } from '../../types';
import { analyzeUniversity, type Completeness, type UniversityAnalysis } from '../../utils/profileInsights';
import { DOCUMENT_CHECKLIST } from '../../../shared/data/admissionsKnowledge.js';
import { useI18n } from '../../i18n/I18nContext';
import { UniversityCrest } from '../ui/UniversityCrest';
import { SectionHeader, SectionTabs } from './ui';

export type AnalysisTab = 'universities' | 'readiness' | 'plan' | 'next';

interface AnalysisSectionProps {
  profile: ApplicantProfile;
  effectiveProfile: ApplicantProfile;
  completeness: Completeness;
  portfolioCount: number;
  documents: UploadedDocument[];
  docs: { required: number; uploadedRequired: number } | null;
  universities: University[];
  tab: AnalysisTab;
  onTabChange: (tab: AnalysisTab) => void;
  readiness: React.ReactNode;
  plan: React.ReactNode;
  nextAction: React.ReactNode;
  onNavigate: (target: NavTarget) => void;
  onAddUniversity: () => void;
  onRemoveUniversity: (id: string) => void;
  onCompare: (ids: string[]) => void;
  onOpenTasks: () => void;
  onOpenDeadlines: () => void;
}

const DOC_TITLE = Object.fromEntries(DOCUMENT_CHECKLIST.map((d) => [d.kind, d.title])) as Record<string, string>;
const TIER_TONE: Record<string, string> = {
  Safety: 'ar-badge-green',
  Target: 'ar-badge-blue',
  Dream: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200',
};

/** «Анализ поступления»: the applicant's own list of universities, each analysed against the single profile. */
export const AnalysisSection: React.FC<AnalysisSectionProps> = (props) => {
  const { profile, effectiveProfile, completeness, portfolioCount, documents, docs, universities, tab, onTabChange, readiness, plan, nextAction, onNavigate, onAddUniversity, onRemoveUniversity, onCompare, onOpenTasks, onOpenDeadlines } = props;
  const { t } = useI18n();

  const rows = useMemo(
    () => universities.map((uni) => ({ uni, a: analyzeUniversity(effectiveProfile, uni, { sources: completeness.sources, documents, portfolioCount }) })),
    [universities, effectiveProfile, completeness.sources, documents, portfolioCount],
  );

  const basis = [
    { label: t('analysis.src.profile'), value: t('analysis.src.profileValue', { n: completeness.percent }), target: { section: 'profile' } as NavTarget },
    { label: t('analysis.src.portfolio'), value: t('analysis.src.portfolioValue', { n: portfolioCount }), target: { section: 'profile', block: 'achievements' } as NavTarget },
    { label: t('analysis.src.docs'), value: docs ? t('analysis.src.docsValue', { done: docs.uploadedRequired, total: docs.required }) : '—', target: { section: 'documents' } as NavTarget },
  ];

  return (
    <div className="space-y-5 py-2 sm:py-4">
      <SectionHeader kicker={t('nav.section.analysis')} title={t('analysis.title')} subtitle={t('analysis.subtitle')} />

      <div className="flex flex-wrap gap-2">
        {basis.map((b) => (
          <button key={b.label} type="button" onClick={() => onNavigate(b.target)} className="group inline-flex items-center gap-2 min-h-10 px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] text-xs shadow-[var(--shadow-card)] hover:border-[var(--line-strong)] hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition">
            <span className="font-medium text-slate-500 dark:text-zinc-400">{b.label}:</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{b.value}</span>
            <ChevronRight className="w-3.5 h-3.5 -mr-0.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-300 transition" />
          </button>
        ))}
      </div>

      <SectionTabs<AnalysisTab>
        value={tab}
        onChange={onTabChange}
        items={[
          { id: 'universities', label: t('analysis.tab.universities', { n: universities.length }) },
          { id: 'readiness', label: t('analysis.tab.readiness') },
          { id: 'plan', label: t('analysis.tab.plan') },
          { id: 'next', label: t('analysis.tab.next') },
        ]}
      />

      {tab === 'universities' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onAddUniversity} className="ar-btn ar-btn-primary">
              <Plus className="w-4 h-4" /> {t('uni.add.title')}
            </button>
            {universities.length >= 2 && (
              <button type="button" onClick={() => onCompare(universities.map((u) => u.id))} className="ar-btn ar-btn-secondary">
                <GitCompare className="w-4 h-4" /> {t('analysis.compare')}
              </button>
            )}
          </div>

          {rows.length === 0 ? (
            <div className="ar-card px-6 py-10 text-center">
              <p className="text-base font-semibold text-slate-900 dark:text-white">{t('analysis.list.empty')}</p>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">{t('analysis.list.emptyText')}</p>
            </div>
          ) : (
            rows.map(({ uni, a }) => <UniversityCard key={uni.id} uni={uni} a={a} plan={profile.universityPlans?.[uni.id]} onRemove={() => onRemoveUniversity(uni.id)} onNavigate={onNavigate} />)
          )}

          <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed flex items-start gap-1.5">
            <Info className="w-3.5 h-3.5 shrink-0 mt-px" /> {t('analysis.disclaimer')}
          </p>
        </div>
      )}

      {tab === 'readiness' && <div className="animate-fadeIn">{readiness}</div>}

      {tab === 'plan' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onOpenTasks} className="ar-btn ar-btn-secondary ar-btn-sm">
              <ListChecks className="w-4 h-4" /> {t('analysis.tasks')}
            </button>
            <button type="button" onClick={onOpenDeadlines} className="ar-btn ar-btn-secondary ar-btn-sm">
              <Calendar className="w-4 h-4" /> {t('analysis.deadlines')}
            </button>
          </div>
          {plan}
        </div>
      )}

      {tab === 'next' && <div className="animate-fadeIn">{nextAction}</div>}
    </div>
  );
};

const CheckList: React.FC<{ tone: 'met' | 'improve' | 'missing'; title: string; items: { key: string; vars?: Record<string, string | number> }[]; extra?: React.ReactNode }> = ({ tone, title, items, extra }) => {
  const { t } = useI18n();
  if (!items.length) return null;
  const Icon = tone === 'met' ? CheckCircle2 : tone === 'improve' ? AlertTriangle : HelpCircle;
  const color = tone === 'met' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'improve' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-zinc-400';
  return (
    <div>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.06em] mb-2 ${color}`}>{title}</p>
      <ul className="space-y-1.5">
        {items.map((c) => (
          <li key={c.key} className="flex items-start gap-2 text-sm text-slate-700 dark:text-zinc-200">
            <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${color}`} /> <span>{t(c.key, c.vars)}</span>
          </li>
        ))}
      </ul>
      {extra}
    </div>
  );
};

const UniversityCard: React.FC<{ uni: University; a: UniversityAnalysis; plan?: { program?: string; year?: string }; onRemove: () => void; onNavigate: (t: NavTarget) => void }> = ({ uni, a, plan, onRemove, onNavigate }) => {
  const { t, tx } = useI18n();
  const [open, setOpen] = useState(false);
  const uploaded = (kind: string) => !a.missingDocs.includes(kind as UniversityAnalysis['missingDocs'][number]);

  return (
    <article className="ar-card overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <UniversityCrest uni={uni} size={44} rounded="rounded-xl" />
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-snug">{uni.shortName}</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
              {uni.flag} {uni.city}, {uni.country}
              {plan?.program || plan?.year ? ` · ${[plan.program, plan.year].filter(Boolean).join(' · ')}` : ''}
            </p>
          </div>
          <span className={`ar-badge shrink-0 ${TIER_TONE[a.tier] ?? ''}`}>{t(`uni.tier.${a.tier}`)}</span>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <Stat label={t('analysis.match')} value={a.matchPercent === null ? '—' : `${a.matchPercent}%`} />
          <Stat label={t('analysis.admission')} value={`~${a.admission}%`} />
          <Stat
            label={t('analysis.grantRange')}
            value={!a.grant.available ? t('analysis.grant.none') : a.grant.range ? `${a.grant.range[0]}–${a.grant.range[1]}%` : t('analysis.grant.unknown')}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4">
          <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="ar-btn ar-btn-secondary flex-1 sm:flex-none">
            {t(open ? 'analysis.less' : 'analysis.more')} <ChevronDown className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          <button type="button" onClick={onRemove} className="ar-btn ar-btn-quiet hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300">
            <Trash2 className="w-4 h-4" /> {t('uni.remove')}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[var(--line)] p-4 sm:p-5 space-y-5 bg-[var(--surface-subtle)] animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <CheckList tone="met" title={t('analysis.met')} items={a.met} />
            <CheckList tone="improve" title={t('analysis.improve')} items={a.improve} />
            <CheckList
              tone="missing"
              title={t('analysis.missing')}
              items={a.missing}
              extra={
                a.missing.length > 0 && <div className="mt-2 flex flex-wrap gap-x-4">
                  {a.missing.some((c) => c.key !== 'req.docs.missing') && (
                    <button type="button" onClick={() => onNavigate({ section: 'profile', flow: 'fill' })} className="ar-link min-h-8 text-xs">
                      {t('analysis.fillMissing')} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {a.missingDocs.length > 0 && (
                    <button type="button" onClick={() => onNavigate({ section: 'documents' })} className="ar-link min-h-8 text-xs">
                      {t('pf.docs.open')} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              }
            />
          </div>

          {plan?.program && <p className="text-xs text-slate-500 dark:text-zinc-400">{t('analysis.programNote', { program: plan.program })}</p>}

          <Detail title={t('analysis.req')}>
            <ul className="space-y-1 text-sm text-slate-700 dark:text-zinc-200">
              <li>· {t('analysis.req.gpa', { n: uni.minGpa })}</li>
              {uni.minIelts > 0 && <li>· {t('analysis.req.ielts', { n: uni.minIelts })}</li>}
              {uni.minSat && <li>· {t('analysis.req.sat', { n: uni.minSat })}</li>}
              {uni.minUnt && <li>· {t('analysis.req.unt', { n: uni.minUnt })}</li>}
              <li>· {t('analysis.req.acceptance', { n: uni.acceptanceRate })}</li>
              {uni.stats?.internationalShare && <li>· {t('analysis.req.international', { n: uni.stats.internationalShare })}</li>}
              {uni.admissionRequirements.map((r) => (
                <li key={r}>· {tx(r)}</li>
              ))}
            </ul>
          </Detail>

          {(uni.requiredDocuments || []).length > 0 && (
            <Detail title={t('analysis.docs')}>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                {(uni.requiredDocuments || []).map((k) => (
                  <li key={k} className="flex items-center gap-2 text-slate-700 dark:text-zinc-200">
                    {uploaded(k) ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <HelpCircle className="w-4 h-4 text-slate-300 shrink-0" />}
                    {t(DOC_TITLE[k] || k)}
                  </li>
                ))}
              </ul>
            </Detail>
          )}

          <Detail title={t('analysis.deadlinesTitle')}>
            <ul className="space-y-1 text-sm text-slate-700 dark:text-zinc-200">
              {uni.earlyDeadline && <li>· {tx(uni.earlyDeadline)}</li>}
              <li>· {tx(uni.regularDeadline)}</li>
            </ul>
          </Detail>

          <Detail title={t('analysis.funding')}>
            <div className="space-y-1.5 text-sm text-slate-700 dark:text-zinc-200">
              <p>
                <b>{t(uni.hasFullGrantOrScholarship ? 'analysis.funding.full' : 'analysis.funding.noFull')}</b>
                {uni.hasFullGrantOrScholarship && ` · ${t(`grants.aid.${uni.financialAidType}`)}`}
              </p>
              {uni.scholarshipName && <p className="font-semibold">{uni.scholarshipName}</p>}
              {uni.scholarshipDescription && <p className="text-slate-600 dark:text-zinc-300">{tx(uni.scholarshipDescription)}</p>}
              <p className="text-slate-600 dark:text-zinc-300">{t('analysis.funding.cost', { tuition: `$${uni.tuitionUSDPerYear.toLocaleString('en-US')}`, living: `$${uni.livingCostUSDPerYear.toLocaleString('en-US')}` })}</p>
              <p className="rounded-xl bg-[var(--surface-raised)] border border-[var(--line)] px-3.5 py-2.5 mt-2">
                <b className="font-semibold text-slate-900 dark:text-white">{t('analysis.grantRange')}: </b>
                {a.grant.range ? `${a.grant.range[0]}–${a.grant.range[1]}%` : '—'}
                <span className="block text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  {t(a.grant.reasonKey, a.grant.reasonVars)} {a.grant.range ? t('analysis.grantDisclaimer') : ''}
                </span>
              </p>
            </div>
          </Detail>

          <a href={uni.officialPortalUrl} target="_blank" rel="noreferrer" className="ar-link min-h-8 text-sm">
            {t('analysis.official')} <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </article>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-[var(--line)] px-2.5 sm:px-3 py-2 sm:py-2.5 min-w-0">
    <p className="text-[11px] sm:text-xs font-medium text-slate-500 dark:text-zinc-400 leading-tight">{label}</p>
    <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tabular-nums mt-1 leading-snug break-words">{value}</p>
  </div>
);

const Detail: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-zinc-400 mb-2">{title}</p>
    {children}
  </div>
);
