import React, { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import {
  ArrowRight,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  Download,
  Lightbulb,
  Mail,
  Target,
  Filter,
} from 'lucide-react';
import { RoadmapStep, ApplicantProfile } from '../types';
import { UNIVERSITY_DATABASE } from '../data/universities';

interface Step6RoadmapProps {
  roadmap: RoadmapStep[];
  profile?: ApplicantProfile;
  onToggleSubtask: (stepId: string, subtaskId: string) => void;
  onNext: () => void;
  onBack: () => void;
  onExportRoadmap: () => void;
  onOpenEmailModal: () => void;
  /** Inside «Анализ поступления»: the section supplies the title and the tabs replace back/next. */
  embedded?: boolean;
}

export const Step6Roadmap: React.FC<Step6RoadmapProps> = ({
  roadmap,
  profile,
  onToggleSubtask,
  onNext,
  onBack,
  onExportRoadmap,
  onOpenEmailModal,
  embedded = false,
}) => {
  const { t, tx } = useI18n();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const allSubtasks = roadmap.flatMap(s => s.subtasks);
  const completedCount = allSubtasks.filter(t => t.isCompleted).length;
  const totalCount = allSubtasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const filteredSteps = roadmap.filter(s => {
    if (selectedCategory === 'all') return true;
    return s.category === selectedCategory;
  });

  const getCategoryBadge = (category: RoadmapStep['category']) => {
    switch (category) {
      case 'exams':
        return <span className="ar-badge">{t('Экзамены')}</span>;
      case 'documents':
        return <span className="ar-badge">{t('Документы')}</span>;
      case 'essay':
        return <span className="ar-badge">{t('Мотивация')}</span>;
      case 'deadlines':
        return <span className="ar-badge">{t('Дедлайн')}</span>;
      default:
        return <span className="ar-badge">{t('Активность')}</span>;
    }
  };

  return (
    <div className={embedded ? 'space-y-6' : 'space-y-6 py-4'}>

      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 ${embedded ? '' : 'pb-5 border-b border-[var(--line)]'}`}>
        {!embedded && (
        <div className="min-w-0">
          <div className="ar-kicker mb-1">
            {t('steps.6.kicker')}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t('steps.6.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
            {t('steps.6.subtitle')}
          </p>
        </div>
        )}

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onOpenEmailModal}
            className="ar-btn ar-btn-secondary ar-btn-sm max-w-full whitespace-normal text-left"
            title={t('Отправить полную маршрутную карту на Gmail')}
          >
            <Mail className="w-4 h-4" />
            <span>{t('Отправить на Gmail (Google SMTP)')}</span>
          </button>

          <button
            type="button"
            onClick={onExportRoadmap}
            className="ar-btn ar-btn-secondary ar-btn-sm"
          >
            <Download className="w-4 h-4" />
            <span>{t('Экспорт (.txt)')}</span>
          </button>
        </div>
      </div>

      {/* Target Goal Banner (if primary target institution is set) */}
      {(() => {
        const primaryId = profile?.targetUniversityIds?.[0];
        const primaryTarget = primaryId ? UNIVERSITY_DATABASE.find((u) => u.id === primaryId) : null;
        if (!primaryTarget) return null;
        return (
          <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/10 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-3 min-w-0">
              <span className="ar-icon-tile bg-white border border-blue-100 dark:border-blue-500/20">
                <Target className="w-[18px] h-[18px]" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  {t('roadmap.targetGoalNotice')}
                </p>
                <h4 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  {primaryTarget.name} ({primaryTarget.shortName})
                </h4>
              </div>
            </div>
            <span className="ar-badge bg-white text-blue-700 border border-blue-100 dark:text-blue-200 dark:border-blue-500/20 shrink-0">
              {primaryTarget.category === 'school' ? t('category.school') : primaryTarget.category === 'college' ? t('category.college') : t('category.university')}
            </span>
          </div>
        );
      })()}

      {/* Progress Card Bar */}
      <div className="ar-card p-5 sm:p-6 space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('Прогресс выполнения контрольных точек')}</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{t('Завершено')} {completedCount} из {totalCount} регламентных действий</p>
          </div>
          <span className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white leading-none shrink-0">{progressPercent}%</span>
        </div>

        <div className="ar-progress">
          <span style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-zinc-400 mr-1.5">
          <Filter className="w-3.5 h-3.5" />
          <span>{t('Фильтр этапов:')}</span>
        </div>
        {[
          { id: 'all', label: 'Все задачи' },
          { id: 'exams', label: 'Экзамены и тесты' },
          { id: 'documents', label: 'Документы и выписки' },
          { id: 'essay', label: 'Мотивационные эссе' },
          { id: 'deadlines', label: 'Подача и конкурсы' },
        ].map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedCategory(c.id)}
            aria-pressed={selectedCategory === c.id}
            className="ar-chip"
          >
            {t(c.label)}
          </button>
        ))}
      </div>

      {/* Timeline Steps */}
      <div className="space-y-4">
        {filteredSteps.map((step, index) => {
          const stepCompleted = step.subtasks.every(t => t.isCompleted);

          return (
            <div
              key={step.id}
              className={`ar-card p-5 sm:p-6 space-y-4 ${stepCompleted ? 'border-emerald-200 dark:border-emerald-500/25' : ''}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-[var(--line)]">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-semibold text-xs tabular-nums shrink-0
                    ${stepCompleted ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-200'}`}>
                    {stepCompleted ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {tx(step.title)}
                    </h3>
                    {getCategoryBadge(step.category)}
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300 font-medium self-start sm:self-auto shrink-0 bg-slate-50 dark:bg-zinc-800/40 px-2.5 py-1 rounded-lg border border-[var(--line)]">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{tx(step.targetDate)}</span>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                {tx(step.description)}
              </p>

              {step.guidanceTip && (
                <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/10 text-sm text-slate-700 dark:text-zinc-300 flex items-start gap-2.5">
                  <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-300 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{tx(step.guidanceTip)}</span>
                </div>
              )}

              {/* Actionable Subtasks */}
              <div className="pt-1 space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 dark:text-zinc-400 block">
                  {t('Контрольные задачи:')}
                </span>
                <div className="space-y-1.5">
                  {step.subtasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      role="checkbox"
                      aria-checked={task.isCompleted}
                      onClick={() => onToggleSubtask(step.id, task.id)}
                      className={`w-full text-left min-h-11 px-3 py-2.5 rounded-xl border transition flex items-center gap-3
                        ${task.isCompleted
                          ? 'bg-slate-50 dark:bg-zinc-800/40 border-[var(--line)] text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
                          : 'bg-white dark:bg-zinc-900 border-[var(--line)] text-slate-800 dark:text-zinc-200 hover:border-[var(--line-strong)] hover:bg-slate-50 dark:hover:bg-zinc-800/50'}`}
                    >
                      {task.isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span className={`text-sm leading-snug ${task.isCompleted ? 'line-through' : ''}`}>
                        {tx(task.title)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          );
        })}
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
          <span>{t('steps.6.back')}</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          className="ar-btn ar-btn-primary w-full sm:w-auto"
        >
          <span>{t('steps.6.next')}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      )}

    </div>
  );
};
