import React, { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import {
  ArrowLeft,
  Copy,
  Check,
  FileText,
  Calendar,
  RotateCcw,
  Mail,
  Lightbulb
} from 'lucide-react';
import { RoadmapStep } from '../types';

interface Step7NextActionProps {
  currentStepData: {
    stepId: string;
    stepTitle: string;
    taskTitle: string;
    taskId: string;
    category: string;
    deadline: string;
    guidanceTip: string;
    totalTasks: number;
    completedTasks: number;
  };
  activeRoadmapStep?: RoadmapStep;
  onToggleSubtask: (stepId: string, subtaskId: string) => void;
  onBack: () => void;
  onRestart: () => void;
  onOpenEssayModal: () => void;
  onOpenCalendarModal: () => void;
  onOpenEmailModal: () => void;
  /** Inside «Анализ поступления»: the section supplies the title and the tabs replace back/next. */
  embedded?: boolean;
}

export const Step7NextAction: React.FC<Step7NextActionProps> = ({
  currentStepData,
  activeRoadmapStep,
  onToggleSubtask,
  onBack,
  onRestart,
  onOpenEssayModal,
  onOpenCalendarModal,
  onOpenEmailModal,
  embedded = false,
}) => {
  const { t, tx } = useI18n();
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);
  const [showRecommendationTemplate, setShowRecommendationTemplate] = useState<boolean>(false);

  const teacherEmailTemplate = `Уважаемый(ая) [Имя Отчество учителя],

Пишет Вам [Ваше Имя Фамилия], ученик(ца) [Ваш класс].

В этом учебном году я формирую пакет документов для поступления в университет по специальности [Ваше академическое направление].

Ваш курс по [Название предмета] сыграл ключевую роль в моем профессиональном самоопределении. Обращаюсь к Вам с просьбой выступить моим академическим рекомендателем и предоставить рекомендательное письмо для приемной комиссии.

Срок предоставления рекомендации: [Дата дедлайна].
Я подготовил(а) резюме своих учебных проектов и внеклассных достижений и готов(а) направить их для удобства подготовки письма.

Заранее признателен(на) за уделенное время.

С уважением,
[Ваше Имя Фамилия]
[Контактный телефон / Email]`;

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(tx(teacherEmailTemplate));
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2500);
  };

  return (
    <div className={embedded ? 'space-y-6' : 'space-y-6 py-4'}>

      {/* Header */}
      {!embedded && (
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[var(--line)]">
        <div className="min-w-0">
          <div className="ar-kicker mb-1">
            {t('steps.7.kicker')}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t('steps.7.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
            {t('steps.7.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onOpenEmailModal}
            className="ar-btn ar-btn-secondary ar-btn-sm max-w-full whitespace-normal text-left"
          >
            <Mail className="w-4 h-4" />
            <span>{t('Отправить план на Gmail (Google SMTP)')}</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="ar-btn ar-btn-quiet ar-btn-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('steps.7.restart')}</span>
          </button>
        </div>
      </div>
      )}

      {/* Hero Focal Card */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 dark:border-blue-500/20 dark:bg-blue-500/10 p-5 sm:p-7 space-y-5">

        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <span className="ar-badge bg-white text-blue-700 border border-blue-100 dark:text-blue-200 dark:border-blue-500/20">
            {t('Приоритетная задача недели')}
          </span>

          <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-400">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{t('Контрольный срок')}: <strong className="font-semibold text-slate-900 dark:text-white">{tx(currentStepData.deadline)}</strong></span>
          </span>
        </div>

        <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white leading-snug">
          {tx(currentStepData.stepTitle)}
        </h3>

        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-blue-100 dark:border-blue-500/20 space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-[0.06em] flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300" />
            <span>{t('Рекомендация по выполнению:')}</span>
          </span>
          <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
            {tx(currentStepData.guidanceTip)}
          </p>
        </div>

        {/* Subtasks with interactive check */}
        {activeRoadmapStep && (
          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-[0.06em] block">
              {t('Контрольные действия:')}
            </span>
            <div className="space-y-2">
              {activeRoadmapStep.subtasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  role="checkbox"
                  aria-checked={task.isCompleted}
                  onClick={() => onToggleSubtask(activeRoadmapStep.id, task.id)}
                  className="w-full text-left min-h-12 px-3.5 py-3 rounded-xl border border-[var(--line)] bg-white dark:bg-zinc-900 hover:border-[var(--line-strong)] hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition flex items-center justify-between gap-3"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition
                      ${task.isCompleted ? 'bg-blue-600 border-blue-600 text-white dark:bg-blue-500 dark:border-blue-500' : 'border-slate-300 dark:border-zinc-600'}`}>
                      {task.isCompleted && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <span className={`text-sm font-medium ${task.isCompleted ? 'line-through text-slate-400 dark:text-zinc-500' : 'text-slate-800 dark:text-zinc-100'}`}>
                      {tx(task.title)}
                    </span>
                  </span>

                  <span className={`ar-badge shrink-0 ${task.isCompleted ? 'ar-badge-green' : ''}`}>
                    {t(task.isCompleted ? 'Выполнено' : 'Отметить')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Actionable Micro-Tools Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Tool 1: Recommendation Letter Template */}
        <div className="ar-card p-5 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <span className="ar-icon-tile">
              <Mail className="w-[18px] h-[18px]" />
            </span>
            <h4 className="text-base font-semibold text-slate-900 dark:text-white pt-1">
              {t('Запрос рекомендательного письма')}
            </h4>
            <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
              {t('Деловой шаблон официального обращения к учителю или научному руководителю.')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowRecommendationTemplate(!showRecommendationTemplate)}
            aria-expanded={showRecommendationTemplate}
            className="ar-btn ar-btn-secondary w-full"
          >
            <FileText className="w-4 h-4" />
            <span>{t(showRecommendationTemplate ? 'Скрыть шаблон' : 'Открыть шаблон письма')}</span>
          </button>
        </div>

        {/* Tool 2: Essay Architect */}
        <div className="ar-card p-5 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <span className="ar-icon-tile">
              <FileText className="w-[18px] h-[18px]" />
            </span>
            <h4 className="text-base font-semibold text-slate-900 dark:text-white pt-1">
              {t('Структура мотивационного эссе')}
            </h4>
            <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
              {t('Модульный план Personal Statement для зарубежных университетов и NU.')}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenEssayModal}
            className="ar-btn ar-btn-secondary w-full"
          >
            <FileText className="w-4 h-4" />
            <span>{t('Структура эссе')}</span>
          </button>
        </div>

        {/* Tool 3: Calendar & ICS */}
        <div className="ar-card p-5 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <span className="ar-icon-tile">
              <Calendar className="w-[18px] h-[18px]" />
            </span>
            <h4 className="text-base font-semibold text-slate-900 dark:text-white pt-1">
              {t('Сводный календарь контрольных дат')}
            </h4>
            <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
              {t('График дедлайнов приемных кампаний с возможностью экспорта в календарь.')}
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenCalendarModal}
            className="ar-btn ar-btn-secondary w-full"
          >
            <Calendar className="w-4 h-4" />
            <span>{t('График дедлайнов')}</span>
          </button>
        </div>

      </div>

      {/* Expandable Teacher Email Template Box */}
      {showRecommendationTemplate && (
        <div className="ar-card p-5 sm:p-6 space-y-4 animate-fadeIn">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-base font-semibold text-slate-900 dark:text-white min-w-0">
              {t('Шаблон обращения за академической рекомендацией:')}
            </h4>
            <button
              type="button"
              onClick={handleCopyTemplate}
              className="ar-btn ar-btn-primary ar-btn-sm"
            >
              {copiedTemplate ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{t(copiedTemplate ? 'Скопировано' : 'Копировать')}</span>
            </button>
          </div>

          <pre className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-[var(--line)] font-sans text-sm text-slate-700 dark:text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">
            {tx(teacherEmailTemplate)}
          </pre>
        </div>
      )}

      {/* Navigation */}
      {!embedded && (
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 pt-5 border-t border-[var(--line)]">
        <button
          type="button"
          onClick={onBack}
          className="ar-btn ar-btn-secondary w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('steps.7.back')}</span>
        </button>

        <button
          type="button"
          onClick={onRestart}
          className="ar-btn ar-btn-primary w-full sm:w-auto"
        >
          <span>{t('steps.7.next')}</span>
        </button>
      </div>
      )}

    </div>
  );
};
