import React from 'react';
import { Plus, Trash2, ArrowRight, GitCompare } from 'lucide-react';
import type { ApplicantProfile, NavTarget, University } from '../../types';
import { useI18n } from '../../i18n/I18nContext';
import { UniversityCrest } from '../ui/UniversityCrest';
import { SectionHeader, SectionTabs } from '../cabinet/ui';

export type UniTab = 'list' | 'pick' | 'compare';

interface UniversitiesSectionProps {
  profile: ApplicantProfile;
  myUniversities: University[];
  tab: UniTab;
  onTabChange: (tab: UniTab) => void;
  pick: React.ReactNode;
  compare: React.ReactNode;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onNavigate: (target: NavTarget) => void;
}

/** «Университеты»: the applicant's list, the system's picks and the comparison — one page, three tabs. */
export const UniversitiesSection: React.FC<UniversitiesSectionProps> = ({ profile, myUniversities, tab, onTabChange, pick, compare, onAdd, onRemove, onNavigate }) => {
  const { t } = useI18n();
  return (
    <div className="space-y-5 py-2 sm:py-4">
      <SectionHeader kicker={t('nav.section.universities')} title={t('unis.title')} subtitle={t('unis.subtitle')} />
      <SectionTabs<UniTab>
        value={tab}
        onChange={onTabChange}
        items={[
          { id: 'list', label: t('unis.tab.list', { n: myUniversities.length }) },
          { id: 'pick', label: t('universities.tab.pick') },
          // The comparison always holds exactly the selected universities.
          { id: 'compare', label: myUniversities.length ? `${t('universities.tab.compare')} (${myUniversities.length})` : t('universities.tab.compare') },
        ]}
      />

      {tab === 'list' && (
        <div className="space-y-2.5 animate-fadeIn">
          {myUniversities.map((u) => {
            const plan = profile.universityPlans?.[u.id];
            return (
              <div key={u.id} className="ar-card pl-3.5 pr-2 sm:pl-4 py-3 flex items-center gap-3">
                <UniversityCrest uni={u} size={40} rounded="rounded-xl" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{u.name}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                    {u.flag} {u.country}
                    {plan?.program || plan?.year ? ` · ${[plan.program, plan.year].filter(Boolean).join(' · ')}` : ''}
                  </p>
                </div>
                <button type="button" onClick={() => onRemove(u.id)} aria-label={t('uni.remove')} title={t('uni.remove')} className="ar-btn ar-btn-icon shrink-0 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
          {myUniversities.length === 0 && (
            <div className="ar-card px-5 py-8 text-center">
              <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">{t('analysis.list.emptyText')}</p>
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={onAdd} className="ar-btn ar-btn-primary">
              <Plus className="w-4 h-4" /> {t('uni.add.title')}
            </button>
            {myUniversities.length > 0 && (
              <button type="button" onClick={() => onTabChange('compare')} className="ar-btn ar-btn-secondary">
                <GitCompare className="w-4 h-4" /> {t('unis.toCompare', { n: myUniversities.length })}
              </button>
            )}
            {myUniversities.length > 0 && (
              <button type="button" onClick={() => onNavigate({ section: 'analysis' })} className="ar-btn ar-btn-secondary">
                {t('unis.toAnalysis')} <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {tab === 'pick' && <div className="animate-fadeIn">{pick}</div>}
      {tab === 'compare' && <div className="animate-fadeIn">{compare}</div>}
    </div>
  );
};
