import React from 'react';
import { useI18n } from '../i18n/I18nContext';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Languages,
  Trophy,
  Coins,
  FileText,
  Target
} from 'lucide-react';
import { ApplicantProfile, DiagnosticResult } from '../types';

interface Step3DiagnosticProps {
  profile: ApplicantProfile;
  diagnostic: DiagnosticResult;
  onNext: () => void;
  onBack: () => void;
  /** Inside «Анализ поступления»: the section supplies the title and the tabs replace back/next. */
  embedded?: boolean;
}

/** One readiness pillar: label, value, a solid brand bar and a caption. */
const Pillar: React.FC<{ icon: React.ReactNode; label: string; value: number; caption: React.ReactNode }> = ({ icon, label, value, caption }) => (
  <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-[var(--line)] space-y-2.5 min-w-0">
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="font-semibold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5 min-w-0">
        <span className="text-slate-500 dark:text-zinc-400 shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span className="font-semibold tabular-nums text-slate-900 dark:text-white shrink-0">{value}%</span>
    </div>
    <div className="ar-progress h-1.5">
      <span style={{ width: `${value}%` }} />
    </div>
    <p className="text-xs text-slate-500 dark:text-zinc-400">{caption}</p>
  </div>
);

export const Step3Diagnostic: React.FC<Step3DiagnosticProps> = ({
  profile,
  diagnostic,
  onNext,
  onBack,
  embedded = false,
}) => {
  const { t, tx } = useI18n();
  const { readiness, strengths, bottlenecks, strategicAdvice, recommendedCategoryFocus } = diagnostic;

  return (
    <div className={embedded ? 'space-y-6' : 'space-y-6 py-4'}>

      {/* Stage Header */}
      <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 ${embedded ? '' : 'pb-5 border-b border-[var(--line)]'}`}>
        {!embedded && (
        <div className="min-w-0">
          <div className="ar-kicker mb-1">
            {t('steps.3.kicker')}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t('steps.3.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
            {t('steps.3.subtitle')}
          </p>
        </div>
        )}

        <div className="self-start sm:self-auto inline-flex items-center gap-1.5 max-w-full px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-800 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-200">
          <Target className="w-3.5 h-3.5 shrink-0" />
          <span className="min-w-0">{t('Фокус стратегии')}: {tx(recommendedCategoryFocus)}</span>
        </div>
      </div>

      {/* Main Readiness Gauge + 4 Breakdown Pillars */}
      <div className="ar-card p-5 sm:p-6 space-y-6">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-6 border-b border-[var(--line)]">

          {/* Main Score Box */}
          <div className="flex items-center gap-4 sm:gap-5 min-w-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border border-blue-100 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/10 flex flex-col items-center justify-center shrink-0">
              <span className="text-2xl sm:text-3xl font-bold tabular-nums text-blue-700 dark:text-blue-200 leading-none">
                {readiness.overall}%
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 mt-1.5">
                {t('Индекс')}
              </span>
            </div>

            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold text-slate-900 dark:text-white">
                  {t(readiness.overall >= 80 ? 'Высокая конкурентоспособность' : readiness.overall >= 65 ? 'Сбалансированный профиль' : 'Требуется академическое усиление')}
                </span>
                <span className={`ar-badge ${readiness.overall >= 80 ? 'ar-badge-green' : readiness.overall >= 65 ? 'ar-badge-blue' : 'ar-badge-amber'}`}>
                  {readiness.overall >= 80 ? 'Tier 1' : readiness.overall >= 65 ? 'Tier 2' : 'Foundation'}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-zinc-400 max-w-lg leading-relaxed">
                {t('Сводная оценка сопоставляет текущий GPA ({gpa}), языковые сертификаты, олимпиадные результаты и финансовые ограничения с требованиями целевых программ.', { gpa: profile.gpa })}
              </p>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto shrink-0">
            <div className="flex-1 md:w-36 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-[var(--line)] text-center">
              <span className="text-xs text-slate-500 dark:text-zinc-400 block">{t('Статус')}</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white block mt-0.5">
                {t(profile.grade === 'grade_11' ? '11 класс' : '10 класс')}
              </span>
            </div>
            <div className="flex-1 md:w-36 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-[var(--line)] text-center">
              <span className="text-xs text-slate-500 dark:text-zinc-400 block">{t('Набор')}</span>
              <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white block mt-0.5">
                {profile.targetYear}
              </span>
            </div>
          </div>

        </div>

        {/* 4 Pillars Progress Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Pillar
            icon={<GraduationCap className="w-4 h-4" />}
            label={t('Академический')}
            value={readiness.academic}
            caption={<>GPA {profile.gpa} • {profile.hasSat ? `SAT ${profile.satScore}` : profile.hasUnt ? `ЕНТ ${profile.untScore}` : t('Тесты в процессе')}</>}
          />
          <Pillar
            icon={<Languages className="w-4 h-4" />}
            label={t('Языковой уровень')}
            value={readiness.language}
            caption={profile.hasIelts ? `IELTS ${profile.ieltsScore} Band` : t('Сертификат отсутствует')}
          />
          <Pillar
            icon={<Trophy className="w-4 h-4" />}
            label={t('Портфолио и конкурсы')}
            value={readiness.portfolio}
            caption={profile.olympiadLevel !== 'none' ? `${t('Олимпиада')}: ${profile.olympiadLevel}` : t('Базовое портфолио')}
          />
          <Pillar
            icon={<Coins className="w-4 h-4" />}
            label={t('Финансовый баланс')}
            value={readiness.financialFeasibility}
            caption={t(profile.budgetTier === 'grant_only' ? '100% Гранты и стипендии' : 'Частичное софинансирование')}
          />
        </div>

      </div>

      {/* Strengths & Bottlenecks Dual Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">

        {/* Left: Strengths */}
        <div className="ar-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="ar-icon-tile w-8 h-8 !bg-emerald-50 !text-emerald-600 dark:!bg-emerald-500/10 dark:!text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
            </span>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('Сильные стороны (Pros)')}</h3>
          </div>

          <div className="space-y-2.5">
            {strengths.map((item, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-[var(--line)] space-y-1">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {tx(item.title)}
                </h4>
                <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                  {tx(item.desc)}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Bottlenecks */}
        <div className="ar-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="ar-icon-tile w-8 h-8 !bg-amber-50 !text-amber-600 dark:!bg-amber-500/10 dark:!text-amber-300">
              <AlertCircle className="w-4 h-4" />
            </span>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{t('Зоны роста (Cons)')}</h3>
          </div>

          <div className="space-y-2.5">
            {bottlenecks.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-[var(--line)] space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white min-w-0">
                    {tx(item.title)}
                  </h4>
                  <span className={`ar-badge shrink-0 ${item.severity === 'high' ? 'ar-badge-rose' : 'ar-badge-amber'}`}>
                    {t(item.severity === 'high' ? 'Критично' : 'Внимание')}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                  {tx(item.desc)}
                </p>
                <div className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed bg-white dark:bg-zinc-900 px-3 py-2.5 rounded-lg border border-[var(--line)]">
                  <span className="font-semibold text-slate-900 dark:text-white">{t('Регламент:')}</span>{' '}
                  <span>{tx(item.action)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Strategic Advisor Note */}
      <div className="p-5 sm:p-6 rounded-2xl border border-blue-100 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/10 space-y-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <FileText className="w-4 h-4 text-blue-600 dark:text-blue-300 shrink-0" />
          <h3>{t('Экспертное заключение по профилю')}</h3>
        </div>
        <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
          {tx(strategicAdvice)}
        </p>
      </div>

      {/* Navigation */}
      {!embedded && (
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-5 border-t border-[var(--line)]">
        <button
          type="button"
          onClick={onBack}
          className="ar-btn ar-btn-secondary w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('steps.3.back')}</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="ar-btn ar-btn-primary w-full sm:w-auto"
        >
          <span>{t('steps.3.next')}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      )}

    </div>
  );
};
