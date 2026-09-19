import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowLeft,
  Coins,
  ExternalLink,
  GitCompare,
  Calendar,
  Check,
  Plus,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from 'lucide-react';
import { OddsBadge } from './ui/OddsBadge';
import { ApplicantProfile, FitTier, TargetRegion, University } from '../types';
import { UniversityDetails } from './UniversityDetails';
import { UniversityCrest } from './ui/UniversityCrest';
import { useI18n } from '../i18n/I18nContext';

interface Step4RecommendationsProps {
  universities: University[];
  profile: ApplicantProfile;
  /** The applicant's selected universities: «Мой список» and the comparison are one and the same list */
  selectedForCompare: string[];
  /** Selects / deselects a university (it appears in / disappears from the comparison at once) */
  onToggleCompare: (uniId: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export const Step4Recommendations: React.FC<Step4RecommendationsProps> = ({
  universities,
  profile,
  selectedForCompare,
  onToggleCompare,
  onNext,
  onBack,
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'university' | 'college' | 'school'>('all');
  const [activeTierFilter, setActiveTierFilter] = useState<'all' | FitTier>('all');
  const [activeRegionFilter, setActiveRegionFilter] = useState<'all' | TargetRegion>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(12);
  const { t, tx } = useI18n();

  const filteredUnis = universities.filter(uni => {
    if (activeCategoryFilter !== 'all' && (uni.category || 'university') !== activeCategoryFilter) return false;
    if (activeTierFilter !== 'all' && uni.fitTier !== activeTierFilter) return false;
    if (activeRegionFilter !== 'all' && uni.region !== activeRegionFilter) return false;
    return true;
  });

  const getTierBadge = (tier: FitTier) => {
    if (tier === 'Dream') {
      return (
        <span className="ar-badge bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200">
          {t('uni.tier.Dream')}
        </span>
      );
    }
    if (tier === 'Target') {
      return (
        <span className="ar-badge ar-badge-blue">
          {t('uni.tier.Target')}
        </span>
      );
    }
    return (
      <span className="ar-badge ar-badge-green">
        {t('uni.tier.Safety')}
      </span>
    );
  };

  const shownUnis = filteredUnis.slice(0, visibleCount);

  return (
    <div className="space-y-6 py-4">

      {/* Stage Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[var(--line)]">
        <div className="min-w-0">
          <div className="ar-kicker mb-1">
            {t('steps.4.kicker')}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t('steps.4.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
            {t('steps.4.subtitle')}
          </p>
        </div>

        {/* Compare count pill */}
        <div className="self-start sm:self-auto flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1 min-h-8 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-medium text-slate-600 dark:text-zinc-300">
            {t('steps.4.selected')} <strong className="font-semibold tabular-nums text-slate-900 dark:text-white">{selectedForCompare.length}</strong>
          </div>
          {selectedForCompare.length >= 1 && (
            <button
              type="button"
              onClick={onNext}
              className="ar-btn ar-btn-primary ar-btn-sm"
            >
              <GitCompare className="w-4 h-4" />
              <span>{t('steps.4.compare')} ({selectedForCompare.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar: Categories, Tiers & Regions */}
      <div className="ar-card p-3.5 sm:p-4 space-y-3">

        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-[var(--line)]">
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 mr-1">{t('steps.4.categoryFilter')}</span>
          {[
            { id: 'all', label: `${t('category.all')} (${universities.length})` },
            { id: 'university', label: `${t('category.university')} (${universities.filter(u => !u.category || u.category === 'university').length})` },
            { id: 'college', label: `${t('category.college')} (${universities.filter(u => u.category === 'college').length})` },
            { id: 'school', label: `${t('category.school')} (${universities.filter(u => u.category === 'school').length})` },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCategoryFilter(c.id as any)}
              aria-pressed={activeCategoryFilter === c.id}
              className="ar-chip"
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          {/* Tier Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 mr-1">{t('steps.4.tierFilter')}</span>
            {[
              { id: 'all', label: `${t('steps.4.all')} (${universities.length})` },
              { id: 'Dream', label: t('uni.tier.Dream') },
              { id: 'Target', label: t('uni.tier.Target') },
              { id: 'Safety', label: t('uni.tier.Safety') },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTierFilter(t.id as any)}
                aria-pressed={activeTierFilter === t.id}
                className="ar-chip"
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Region Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 mr-1">{t('steps.4.regionFilter')}</span>
            {[
              { id: 'all', label: t('steps.4.all') },
              { id: 'kazakhstan', label: t('region.kazakhstan') },
              { id: 'europe', label: t('region.europe') },
              { id: 'asia', label: t('region.asia') },
              { id: 'usa_canada', label: t('region.usa_canada') },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setActiveRegionFilter(r.id as any)}
                aria-pressed={activeRegionFilter === r.id}
                className="ar-chip"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* University Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {shownUnis.map((uni) => {
          const isCompared = selectedForCompare.includes(uni.id);
          const isExpanded = expandedId === uni.id;

          return (
            <div
              key={uni.id}
              className={`ar-card overflow-hidden flex flex-col justify-between min-w-0 ${isExpanded ? 'lg:col-span-2' : ''}
                ${isCompared ? 'border-blue-500 ring-1 ring-blue-500 dark:border-blue-400 dark:ring-blue-400' : ''}`}
            >
              <div className="p-5 sm:p-6 space-y-4">

                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <UniversityCrest uni={uni} size={48} rounded="rounded-xl" />
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-snug">
                        {uni.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        {uni.nativeName} • {uni.city}, {uni.country}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-1.5">
                    <div className="text-xs font-semibold tabular-nums text-slate-900 dark:text-white bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                      {uni.matchScore}% Match
                    </div>
                    <OddsBadge score={uni.matchScore} />
                  </div>
                </div>

                {/* Badges bar */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {getTierBadge(uni.fitTier)}
                  {uni.category === 'school' && (
                    <span className="ar-badge">
                      {t('category.school')}
                    </span>
                  )}
                  {uni.category === 'college' && (
                    <span className="ar-badge">
                      {t('category.college')}
                    </span>
                  )}
                  {(!uni.category || uni.category === 'university') && (
                    <span className="ar-badge">
                      {t('category.university')}
                    </span>
                  )}
                  {uni.gradeLevel && (
                    <span className="ar-badge whitespace-normal">
                      {uni.gradeLevel}
                    </span>
                  )}
                  {uni.nationalRank && (
                    <span className="ar-badge whitespace-normal">
                      {uni.nationalRank}
                    </span>
                  )}
                  {uni.hasFullGrantOrScholarship && (
                    <span className="ar-badge ar-badge-green">
                      <Coins className="w-3 h-3" />
                      <span>{t('100% Грант')}</span>
                    </span>
                  )}
                  {uni.campus && (
                    <span className="ar-badge" title={t('uni.safety')}>
                      <ShieldCheck className="w-3 h-3" />
                      <span className="tabular-nums">{uni.campus.neighborhoodSafety}/10</span>
                    </span>
                  )}
                </div>

                {/* Human-language "Why it fits" Box */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-[var(--line)] space-y-1.5">
                  <div className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    {t('Обоснование соответствия профилю:')}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-zinc-300">
                    {tx(uni.whyItFits)}
                  </p>
                </div>

                {/* Financial & Academic Requirements Row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="px-3 py-2.5 rounded-xl border border-[var(--line)] min-w-0">
                    <span className="text-xs text-slate-500 dark:text-zinc-400 block">{t('Финансирование')}</span>
                    <span className="font-semibold text-slate-900 dark:text-white truncate block text-sm mt-0.5" title={tx(uni.scholarshipName)}>
                      {tx(uni.scholarshipName)}
                    </span>
                  </div>

                  <div className="px-3 py-2.5 rounded-xl border border-[var(--line)] min-w-0">
                    <span className="text-xs text-slate-500 dark:text-zinc-400 block">{t('Пороговые баллы')}</span>
                    <span className="font-semibold text-slate-900 dark:text-white block text-sm mt-0.5">
                      IELTS {uni.minIelts}+ {uni.minSat ? `• SAT ${uni.minSat}+` : uni.minUnt ? `• ЕНТ ${uni.minUnt}+` : ''}
                    </span>
                  </div>
                </div>

                {/* Deadlines notice */}
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{t('Срок подачи')}: <strong className="font-semibold text-slate-800 dark:text-zinc-200">{tx(uni.regularDeadline)}</strong></span>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                    {t('Приемная кампания 2026/2027')}
                  </span>
                </div>

              </div>

              {/* Extended knowledge base: links, safety, equipment, projects, chance, AI news/social */}
              {isExpanded && <UniversityDetails uni={uni} profile={profile} />}

              {/* Bottom Action Footer */}
              <div className="px-5 sm:px-6 py-3.5 bg-[var(--surface-subtle)] border-t border-[var(--line)] flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-4">
                  <a
                    href={uni.officialPortalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 min-h-8 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition"
                  >
                    <span>{t('common.officialPortal')}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : uni.id)}
                    aria-expanded={isExpanded}
                    className="ar-link min-h-8 text-xs"
                  >
                    {isExpanded ? t('common.hide') : t('common.details')}
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* One choice: a selected university is on «Мой список» and in the comparison at the same time. */}
                <button
                  type="button"
                  onClick={() => onToggleCompare(uni.id)}
                  aria-pressed={isCompared}
                  title={t(isCompared ? 'uni.deselectHint' : 'uni.selectHint')}
                  className={`ar-btn ar-btn-sm ${isCompared ? 'ar-btn-primary' : 'ar-btn-secondary'}`}
                >
                  {isCompared ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{t(isCompared ? 'uni.selected' : 'uni.select')}</span>
                  {isCompared && <GitCompare className="w-4 h-4 opacity-80" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredUnis.length > visibleCount && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + 12)}
            className="ar-btn ar-btn-secondary"
          >
            <ChevronDown className="w-4 h-4" />
            +{filteredUnis.length - visibleCount}
          </button>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-5 border-t border-[var(--line)]">
        <button
          type="button"
          onClick={onBack}
          className="ar-btn ar-btn-secondary w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('steps.4.back')}</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="ar-btn ar-btn-primary w-full sm:w-auto"
        >
          <span>{t('steps.4.next')}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
