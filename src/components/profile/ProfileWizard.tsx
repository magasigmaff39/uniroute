// Step-by-step filling of the profile. `detailed` is the detailed test: it asks only what the profile does not
// know yet (or knows only as a range from the start test). `fill` walks through every missing important fact.
// Each step saves on «Далее»; optional steps can be skipped and filled later in the profile.
import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ListChecks } from 'lucide-react';
import type { ApplicantProfile, PortfolioItem, ProfileBlockId, ProfileFact } from '../../types';
import { BLOCK_FACTS, BLOCK_ORDER, REQUIRED_FACTS, detailedGaps, isApprox, type Completeness } from '../../utils/profileInsights';
import { useI18n } from '../../i18n/I18nContext';
import { factValue } from '../cabinet/facts';
import { FactEditor, type Patch } from './fields';
import { PortfolioList } from './PortfolioList';
import { BLOCK_ICONS } from './blockIcons';

interface ProfileWizardProps {
  mode: 'detailed' | 'fill';
  profile: ApplicantProfile;
  completeness: Completeness;
  portfolio: PortfolioItem[];
  onSave: (patch: Patch) => void;
  onPortfolioChange: (items: PortfolioItem[]) => void;
  onFinish: () => void;
  onExit: () => void;
}

/** Asked elsewhere: documents have their own page, universities their own dialog. */
const NOT_IN_WIZARD: ProfileFact[] = ['documents', 'targetUniversities'];
const LIST_BLOCKS = ['achievements', 'projects', 'experience'] as const;

export const ProfileWizard: React.FC<ProfileWizardProps> = ({ mode, profile, completeness, portfolio, onSave, onPortfolioChange, onFinish, onExit }) => {
  const { t } = useI18n();

  // The plan is fixed when the wizard opens, so answering a question does not reshuffle the steps.
  const [steps] = useState<{ block: ProfileBlockId; facts: ProfileFact[] }[]>(() => {
    const wanted = (mode === 'detailed' ? detailedGaps(completeness) : completeness.missing).filter((f) => !NOT_IN_WIZARD.includes(f));
    return BLOCK_ORDER.map((block) => ({ block, facts: BLOCK_FACTS[block].filter((f) => wanted.includes(f)) })).filter((s) => s.facts.length);
  });
  const [index, setIndex] = useState(0);
  const [patch, setPatch] = useState<Patch>({});

  if (!steps.length) {
    return (
      <div className="max-w-xl mx-auto py-2 sm:py-6">
        <div className="ar-card px-6 py-10 text-center flex flex-col items-center">
          <span className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </span>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white mt-4 [text-wrap:balance]">{t('wiz.nothing.title')}</h1>
          <p className="text-sm text-slate-600 dark:text-zinc-400 mt-1.5 max-w-md leading-relaxed">{t('wiz.nothing.text')}</p>
          <button type="button" onClick={mode === 'detailed' ? onFinish : onExit} className="ar-btn ar-btn-primary mt-5">
            {t(mode === 'detailed' ? 'wiz.toAnalysis' : 'wiz.toProfile')}
          </button>
        </div>
      </div>
    );
  }

  const step = steps[index];
  const Icon = BLOCK_ICONS[step.block];
  const value = { ...profile, ...patch };
  const hasRequired = step.facts.some((f) => REQUIRED_FACTS.includes(f));
  const last = index === steps.length - 1;

  const commit = () => {
    if (Object.keys(patch).length) onSave(patch);
    setPatch({});
  };
  const next = () => {
    commit();
    if (last) onFinish();
    else {
      setIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  const skip = () => {
    setPatch({});
    if (last) onFinish();
    else setIndex((i) => i + 1);
  };

  return (
    <div className="max-w-2xl mx-auto py-2 sm:py-6 space-y-5">
      <div>
        <p className="ar-kicker inline-flex items-center gap-1.5">
          <ListChecks className="w-4 h-4" /> {t(mode === 'detailed' ? 'wiz.detailed.kicker' : 'wiz.fill.kicker')}
        </p>
        <p className="text-sm text-slate-600 dark:text-zinc-400 mt-1 leading-relaxed">{t(mode === 'detailed' ? 'wiz.detailed.lead' : 'wiz.fill.lead')}</p>
        <div className="flex items-center gap-3 mt-4">
          <ol className="flex-1 flex gap-1" aria-hidden>
            {steps.map((s, i) => (
              <li key={s.block} className={`flex-1 h-1.5 rounded-full transition-colors duration-300 ${i <= index ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-200 dark:bg-zinc-800'}`} />
            ))}
          </ol>
          <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 tabular-nums shrink-0">{t('wiz.step', { n: index + 1, total: steps.length })}</span>
        </div>
      </div>

      <section key={step.block} className="ar-card p-4 sm:p-7 space-y-5 animate-fadeInUp">
        <div className="flex items-center gap-3">
          <span className="ar-icon-tile w-10 h-10">
            <Icon className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white leading-snug">{t(`pf.block.${step.block}`)}</h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">{t(hasRequired ? 'wiz.requiredStep' : 'wiz.optionalStep')}</p>
          </div>
        </div>

        {step.facts.map((fact) => {
          const src = completeness.sources[fact];
          const isList = (LIST_BLOCKS as readonly string[]).includes(fact);
          return (
            <div key={fact} className="space-y-2">
              {isApprox(fact, src) && (
                <p className="text-xs leading-relaxed rounded-xl border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200 px-3 py-2">
                  {t('wiz.approx', { value: factValue(fact, profile, t) })}
                </p>
              )}
              {isList ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-800 dark:text-zinc-100">{t(`fact.${fact}`)}</p>
                  <PortfolioList block={fact as (typeof LIST_BLOCKS)[number]} items={portfolio} onChanged={onPortfolioChange} />
                </div>
              ) : (
                <FactEditor fact={fact} value={value} set={(p) => setPatch((prev) => ({ ...prev, ...p }))} />
              )}
            </div>
          );
        })}
      </section>

      {/* Phones: the main action on its own full-width row, «back» and «skip» below it. */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2">
        <button
          type="button"
          onClick={index === 0 ? onExit : () => setIndex((i) => i - 1)}
          className={`ar-btn ar-btn-secondary order-2 sm:order-none sm:mr-auto ${hasRequired ? 'col-span-2' : ''}`}
        >
          <ArrowLeft className="w-4 h-4" /> {t(index === 0 ? 'wiz.exit' : 'common.back')}
        </button>
        {!hasRequired && (
          <button type="button" onClick={skip} className="ar-btn ar-btn-quiet order-3 sm:order-none">
            {t('wiz.skip')}
          </button>
        )}
        <button type="button" onClick={next} className="ar-btn ar-btn-primary col-span-2 order-1 sm:order-none max-sm:min-h-11 sm:px-6">
          {t(last ? (mode === 'detailed' ? 'wiz.finishDetailed' : 'wiz.finish') : 'wiz.next')} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
