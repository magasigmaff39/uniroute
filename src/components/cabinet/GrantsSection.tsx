import React, { useMemo } from 'react';
import { Wallet, HandCoins, Lightbulb, CheckCircle2, AlertCircle, Pencil, ArrowRight, Plus, Info } from 'lucide-react';
import type { ApplicantProfile, NavTarget, University, UploadedDocument } from '../../types';
import { analyzeUniversity, type Completeness } from '../../utils/profileInsights';
import { useI18n } from '../../i18n/I18nContext';
import { UniversityCrest } from '../ui/UniversityCrest';
import { SectionHeader } from './ui';

interface GrantsSectionProps {
  /** Profile with everything accumulated (answers + portfolio) */
  profile: ApplicantProfile;
  completeness: Completeness;
  documents: UploadedDocument[];
  portfolioCount: number;
  universities: University[];
  /** true when `universities` is the applicant's own list, false for system picks */
  ownList: boolean;
  onNavigate: (target: NavTarget) => void;
  onAddUniversity: () => void;
}

const BUDGET_CAP: Record<ApplicantProfile['budgetTier'], number> = { grant_only: 0, up_to_5k: 5000, up_to_15k: 15000, above_25k: Number.POSITIVE_INFINITY };
const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** «Гранты»: for each university — is there full funding, a rough grant range and the cost against the budget. */
export const GrantsSection: React.FC<GrantsSectionProps> = ({ profile, completeness, documents, portfolioCount, universities, ownList, onNavigate, onAddUniversity }) => {
  const { t, tx } = useI18n();
  const rows = useMemo(
    () => universities.map((uni) => ({ uni, a: analyzeUniversity(profile, uni, { sources: completeness.sources, documents, portfolioCount }) })),
    [profile, universities, completeness.sources, documents, portfolioCount],
  );
  const withGrant = rows.filter((r) => r.uni.hasFullGrantOrScholarship).length;

  // Up to three things that would move the estimate, derived from the same inputs.
  const tips: { key: string; vars?: Record<string, number>; target?: NavTarget }[] = [];
  const needData = rows.some((r) => r.a.grant.reasonKey === 'grant.reason.needData');
  if (needData) tips.push({ key: 'grants.tip.data', target: { section: 'profile', flow: 'fill' } });
  const untNeeded = rows.filter((r) => r.a.grant.reasonKey === 'grant.reason.needUnt').map((r) => r.uni.minUnt || 0);
  if (untNeeded.length) tips.push({ key: 'grants.tip.unt', vars: { n: Math.min(...untNeeded) } });
  if (!profile.hasIelts && rows.some((r) => r.uni.region !== 'kazakhstan')) tips.push({ key: 'grants.tip.ielts' });
  if (profile.olympiadLevel === 'none' || profile.olympiadLevel === 'school') tips.push({ key: 'grants.tip.olympiad', target: { section: 'profile', block: 'achievements' } });
  if (profile.budgetTier === 'grant_only' && withGrant < rows.length) tips.push({ key: 'grants.tip.grantOnly', target: { section: 'universities', sub: 'pick' } });

  return (
    <div className="space-y-6 py-2 sm:py-4">
      <SectionHeader kicker={t('nav.section.grants')} title={t('grants.title')} subtitle={t('grants.subtitle')} />

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="ar-card p-5 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="ar-icon-tile">
              <Wallet className="w-5 h-5" />
            </span>
            <button type="button" onClick={() => onNavigate({ section: 'profile', block: 'admission' })} className="ar-btn ar-btn-quiet ar-btn-sm -mr-2">
              <Pencil className="w-3.5 h-3.5" /> {t('cabinet.edit')}
            </button>
          </div>
          <p className="text-lg font-semibold text-slate-900 dark:text-white mt-3 leading-tight">{t(`quick.budget.${profile.budgetTier}`)}</p>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{t('grants.budget')}</p>
        </div>
        <div className="ar-card p-5 min-w-0">
          <span className="ar-icon-tile">
            <HandCoins className="w-5 h-5" />
          </span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-3 tabular-nums leading-tight">
            {withGrant} <span className="text-sm font-medium text-slate-500 dark:text-zinc-400">/ {rows.length}</span>
          </p>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">{t('grants.withGrant')}</p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t(ownList ? 'grants.list.own' : 'grants.list.matched')}</h2>
          <button type="button" onClick={onAddUniversity} className="ar-btn ar-btn-secondary ar-btn-sm min-h-9">
            <Plus className="w-4 h-4" /> {t('uni.add.title')}
          </button>
        </div>

        <ul className="space-y-3">
          {rows.map(({ uni, a }) => {
            const fits = uni.tuitionUSDPerYear <= BUDGET_CAP[profile.budgetTier];
            return (
              <li key={uni.id} className="ar-card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <UniversityCrest uni={uni} size={44} rounded="rounded-xl" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white break-words">{uni.shortName}</p>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                          {uni.flag} {uni.city}, {uni.country}
                        </p>
                      </div>
                      <span className="shrink-0 text-right">
                        <span className="block text-lg font-semibold tabular-nums leading-tight text-slate-900 dark:text-white">
                          {!a.grant.available ? '—' : a.grant.range ? `${a.grant.range[0]}–${a.grant.range[1]}%` : '?'}
                        </span>
                        <span className="block text-[11px] text-slate-500 dark:text-zinc-400">{t('grants.rangeLabel')}</span>
                      </span>
                    </div>

                    <p className="text-sm font-medium text-slate-800 dark:text-zinc-200 mt-3">
                      {uni.hasFullGrantOrScholarship ? t(`grants.aid.${uni.financialAidType}`) : t('grants.level.none')}
                      {uni.hasFullGrantOrScholarship && uni.scholarshipName ? <span className="font-normal text-slate-500 dark:text-zinc-400"> · {uni.scholarshipName}</span> : null}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">{t(a.grant.reasonKey, a.grant.reasonVars)}</p>
                    {uni.hasFullGrantOrScholarship && uni.scholarshipDescription && <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">{tx(uni.scholarshipDescription)}</p>}

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 pt-3 border-t border-[var(--line)] text-xs text-slate-500 dark:text-zinc-400">
                      <span>{t('grants.admission', { n: a.admission })}</span>
                      <span>{t('grants.cost', { tuition: usd(uni.tuitionUSDPerYear), living: usd(uni.livingCostUSDPerYear) })}</span>
                      <span className={`ar-badge ${fits ? 'ar-badge-green' : ''}`}>
                        {fits ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {t(fits ? 'grants.fits' : 'grants.notFits')}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {tips.length > 0 && (
        <section className="ar-card p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span className="ar-icon-tile w-8 h-8">
              <Lightbulb className="w-4.5 h-4.5" />
            </span>
            {t('grants.tips')}
          </h2>
          <ul className="mt-3 divide-y divide-[var(--line)]">
            {tips.slice(0, 3).map((tip) => (
              <li key={tip.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-x-4 gap-y-1 py-2.5 first:pt-0 last:pb-0 text-sm text-slate-700 dark:text-zinc-300">
                <span className="leading-relaxed min-w-0">{t(tip.key, tip.vars)}</span>
                {tip.target && (
                  <button type="button" onClick={() => onNavigate(tip.target!)} className="ar-link shrink-0 self-start sm:self-auto min-h-8 text-sm">
                    {t('grants.tipGo')} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {t('grants.disclaimer')}
      </p>
    </div>
  );
};
