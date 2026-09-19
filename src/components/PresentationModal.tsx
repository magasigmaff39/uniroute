import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { X, ChevronLeft, ChevronRight, Compass, Target, Route, Zap, Cpu, Lightbulb, Award } from 'lucide-react';

interface PresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Shared slide building blocks (brand blue system, light surfaces, dark-mode pairs).
const PANEL = 'rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)]';
const CARD = 'rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)] shadow-[var(--shadow-card)]';
const CARD_TITLE = 'font-semibold text-sm text-slate-900 dark:text-white';
const BODY = 'text-xs sm:text-[13px] text-slate-600 dark:text-zinc-400 leading-relaxed';
const BRAND_TINT = 'bg-blue-50/70 border border-blue-100 dark:bg-blue-500/10 dark:border-blue-500/20';

const buildSlides = (t: (key: string) => string) => [
  {
    number: 1,
    title: 'UniRoute AI (Вектор Поступления)',
    subtitle: 'AI-сервис построения персонального маршрута поступления в университеты',
    category: 'Титульный слайд • LOCUSCASE2',
    content: (
      <div className="space-y-6 text-center max-w-2xl mx-auto py-4 sm:py-6">
        <div className="inline-flex max-w-full items-center gap-2 px-3 py-1 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 dark:bg-blue-500/10 dark:border-blue-500/20 dark:text-blue-300 text-[11px] sm:text-xs font-semibold font-mono">
          <span>{t('Официальный кейс 02 • Код сабмита: LOCUSCASE2')}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">
          UniRoute <span className="text-blue-600 dark:text-blue-400">AI</span>
        </h1>
        <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-400 leading-relaxed">
          {t('«Превращаем профиль, оценки и бюджет абитуриента в понятный маршрут: куда поступать, почему это подходит и что делать прямо сейчас».')}
        </p>
        <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-[13px]">
          <div className={`p-3.5 ${PANEL} font-medium text-slate-700 dark:text-zinc-300`}>
            {t('🎯 1 Полный путь от анкеты до плана')}
          </div>
          <div className={`p-3.5 ${PANEL} font-medium text-slate-700 dark:text-zinc-300`}>
            {t('💎 Сильный UX/UI и дизайн-система')}
          </div>
          <div className={`p-3.5 ${PANEL} font-medium text-slate-700 dark:text-zinc-300`}>
            {t('💰 Фокус на 100% гранты (РК и Мир)')}
          </div>
        </div>
      </div>
    )
  },
  {
    number: 2,
    title: 'Проблема: Лабиринт поступления и информационный шум',
    subtitle: 'Абитуриенту нужен маршрут, а не еще один список из 100 университетов',
    category: 'Проблема',
    content: (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
        <div className={`p-5 ${CARD} space-y-3`}>
          <div className="ar-icon-tile flex text-sm font-semibold tabular-nums">1</div>
          <h4 className={CARD_TITLE}>{t('Информационный хаос')}</h4>
          <p className={BODY}>
            {t('Требования, дедлайны и правила разбросаны по десяткам разрозненных сайтов. Школьник тратит недели на поиск, но не понимает, кому верить.')}
          </p>
        </div>

        <div className={`p-5 ${CARD} space-y-3`}>
          <div className="ar-icon-tile flex text-sm font-semibold tabular-nums">2</div>
          <h4 className={CARD_TITLE}>{t('Слепые рекомендации')}</h4>
          <p className={BODY}>
            {t('Существующие каталоги выдают безликие списки вузов без объяснения причин. Нет ответа на вопрос: «Почему этот вариант подходит именно мне с моим GPA и $0 бюджета?»')}
          </p>
        </div>

        <div className={`p-5 ${CARD} space-y-3`}>
          <div className="ar-icon-tile flex text-sm font-semibold tabular-nums">3</div>
          <h4 className={CARD_TITLE}>{t('Паралич действия')}</h4>
          <p className={BODY}>
            {t('Десятки предстоящих экзаменов и документов вызывают стресс и прокрастинацию. Абитуриент не знает, какое действие предпринять на текущей неделе.')}
          </p>
        </div>
      </div>
    )
  },
  {
    number: 3,
    title: 'Наше решение: UniRoute AI',
    subtitle: 'Персональный AI-навигатор со сквозным 7-шаговым маршрутом',
    category: 'Решение',
    content: (
      <div className="space-y-4 py-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-5 ${CARD} space-y-2.5`}>
            <span className="ar-icon-tile flex"><Compass className="w-[18px] h-[18px]" /></span>
            <h4 className={CARD_TITLE}>{t('Интеллектуальная диагностика')}</h4>
            <p className={BODY}>
              {t('Мгновенный расчет индекса готовности (Readiness Index), определение сильных сторон (Superpowers) и выявление критических узких мест (Bottlenecks).')}
            </p>
          </div>

          <div className={`p-5 ${CARD} space-y-2.5`}>
            <span className="ar-icon-tile flex"><Target className="w-[18px] h-[18px]" /></span>
            <h4 className={CARD_TITLE}>{t('Объяснимый подбор (Explainable AI)')}</h4>
            <p className={BODY}>
              {t('Разбивка на эшелоны: Dream, Target и Safety. Человеческое обоснование каждого выбора с учетом точных баллов и финансовой стратегии.')}
            </p>
          </div>

          <div className={`p-5 ${CARD} space-y-2.5`}>
            <span className="ar-icon-tile flex"><Route className="w-[18px] h-[18px]" /></span>
            <h4 className={CARD_TITLE}>{t('Динамический Roadmap')}</h4>
            <p className={BODY}>
              {t('Хронологический таймлайн с фильтрами по экзаменам, документам, эссе и дедлайнам с сохранением прогресса в реальном времени.')}
            </p>
          </div>

          <div className={`p-5 ${CARD} space-y-2.5`}>
            <span className="ar-icon-tile flex"><Zap className="w-[18px] h-[18px]" /></span>
            <h4 className={CARD_TITLE}>{t('Один четкий шаг прямо сейчас')}</h4>
            <p className={BODY}>
              {t('Фокус недели: интерактивный чеклист, готовый шаблон письма учителю за рекомендацией и конструктор структуры эссе.')}
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    number: 4,
    title: 'Пользовательский путь (The 7-Step Journey)',
    subtitle: 'Сквозной и непрерывный сценарий без тупиков и лишних кликов',
    category: 'UX/UI & Архитектура',
    content: (
      <div className="space-y-4 py-2">
        <ol className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
          {[
            { step: '1. Вход', desc: 'Ценность и тест-пресеты' },
            { step: '2. Профиль', desc: 'Умная анкета за 2 мин' },
            { step: '3. Диагностика', desc: 'Паспорт и готовность' },
            { step: '4. Подбор', desc: 'Dream / Target / Safety' },
            { step: '5. Сравнение', desc: 'Сравнение 2+ вузов' },
            { step: '6. Roadmap', desc: 'Персональный план' },
            { step: '7. Действие', desc: 'Шаг недели + шаблоны' },
          ].map((s, i) => (
            <li key={i} className={`p-3 rounded-xl ${BRAND_TINT} flex flex-col justify-center gap-1 min-w-0`}>
              <span className="w-6 h-6 mx-auto rounded-full bg-blue-600 dark:bg-blue-500 text-white font-semibold text-xs flex items-center justify-center tabular-nums">
                {i + 1}
              </span>
              <div className="font-semibold text-slate-900 dark:text-white text-xs break-words">{s.step}</div>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">{s.desc}</div>
            </li>
          ))}
        </ol>

        <div className={`p-4 ${PANEL} ${BODY} space-y-1`}>
          <span className="font-semibold text-slate-900 dark:text-white block">{t('✨ UX/UI достижения:')}</span>
          <p>{t('• Пользователь на каждом экране четко понимает текущее положение, предыдущие действия и следующий шаг.')}</p>
          <p>{t('• Полная адаптивность под экраны мобильных устройств и планшетов.')}</p>
          <p>{t('• Мгновенная реактивность: при изменении бюджета или баллов весь маршрут синхронно перестраивается.')}</p>
        </div>
      </div>
    )
  },
  {
    number: 5,
    title: 'AI Diagnostic Engine & Explainable Matching',
    subtitle: 'Прозрачные алгоритмы вместо галлюцинаций и скрытых черных ящиков',
    category: 'Технологии & Алгоритмы',
    content: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 text-xs sm:text-[13px]">
        <div className={`p-5 ${CARD} space-y-3 min-w-0`}>
          <h4 className={`${CARD_TITLE} flex items-center gap-2`}>
            <Cpu className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{t('Формула готовности (Readiness Index)')}</span>
          </h4>
          <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
            {t('Взвешенный многофакторный скоринг:')}
          </p>
          <div className="p-3 rounded-xl bg-[var(--surface-subtle)] border border-[var(--line)] font-mono text-[11px] sm:text-xs text-slate-700 dark:text-zinc-300 leading-normal break-words">
            Readiness = (Academic × 0.35) + (Language × 0.25) + (Portfolio × 0.25) + (Financial × 0.15)
          </div>
          <p className="text-slate-500 dark:text-zinc-400">
            {t('Исключает завышенные ожидания и честно предупреждает о дефиците баллов до подачи документов.')}
          </p>
        </div>

        <div className={`p-5 ${CARD} space-y-3 min-w-0`}>
          <h4 className={`${CARD_TITLE} flex items-center gap-2`}>
            <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{t('Персонализированные объяснения')}</span>
          </h4>
          <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
            {t('Для каждого рекомендованного университета динамически формируется блок «Почему подходит именно вам», сопоставляющий бюджет семьи ($0 / грант), результаты SAT/IELTS/ЕНТ и олимпиадные дипломы.')}
          </p>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/25 leading-relaxed">
            {t('«Подходит, так как ваш GPA 3.9 и IELTS 7.5 полностью закрывают академический порог, а бюджет $0 компенсируется 100% стипендией KISS / грантом МНВО РК».')}
          </div>
        </div>
      </div>
    )
  },
  {
    number: 6,
    title: 'Технический стек и надежность данных',
    subtitle: 'Быстрый, легкий и отказоустойчивый веб-сервис',
    category: 'Архитектура',
    content: (
      <div className="space-y-4 py-2 text-xs sm:text-[13px]">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className={`p-4 ${PANEL} text-center space-y-1 min-w-0`}>
            <span className="block font-mono font-semibold text-blue-700 dark:text-blue-300 text-sm sm:text-base break-words">React 19</span>
            <div className="text-slate-500 dark:text-zinc-400 text-xs">{t('Компонентная модель')}</div>
          </div>
          <div className={`p-4 ${PANEL} text-center space-y-1 min-w-0`}>
            <span className="block font-mono font-semibold text-blue-700 dark:text-blue-300 text-sm sm:text-base break-words">TypeScript</span>
            <div className="text-slate-500 dark:text-zinc-400 text-xs">{t('100% строгая типизация')}</div>
          </div>
          <div className={`p-4 ${PANEL} text-center space-y-1 min-w-0`}>
            <span className="block font-mono font-semibold text-blue-700 dark:text-blue-300 text-sm sm:text-base break-words">Vite + Tailwind v4</span>
            <div className="text-slate-500 dark:text-zinc-400 text-xs">{t('Мгновенная скорость и UI')}</div>
          </div>
          <div className={`p-4 ${PANEL} text-center space-y-1 min-w-0`}>
            <span className="block font-mono font-semibold text-blue-700 dark:text-blue-300 text-sm sm:text-base break-words">Cloud Functions</span>
            <div className="text-slate-500 dark:text-zinc-400 text-xs">{t('Node 22 + Gemini 3.5')}</div>
          </div>
        </div>

        <div className={`p-5 ${PANEL} space-y-2`}>
          <span className="font-semibold text-slate-900 dark:text-white block">{t('Верифицированная база данных: 91 учебное заведение и 49 олимпиад:')}</span>
          <p className="text-slate-600 dark:text-zinc-400 leading-relaxed">
            {t('Включает 77 ведущих университетов (NU, AITU, MIT, Stanford, KAIST, TUM...), 6 прикладных колледжей (AITU College, КБТУ, AlmaU, George Brown, Seneca) с траекториями сокращенного бакалавриата 2+2, и 8 элитных школ/лицеев (НИШ, РФМШ, БИЛ, Haileybury, Quantum) с грантами «Өркен» и стипендиями Sixth Form.')}
          </p>
        </div>
      </div>
    )
  },
  {
    number: 7,
    title: 'Преимущества перед аналогами и потенциал развития',
    subtitle: 'Отличие от безликих чатов и каталогов',
    category: 'Бизнес и Масштабирование',
    content: (
      <div className="space-y-4 py-2 text-xs sm:text-[13px]">
        <div className="overflow-x-auto rounded-2xl border border-[var(--line)]">
          <table className="w-full min-w-[36rem] text-left">
            <thead className="bg-[var(--surface-subtle)] border-b border-[var(--line)]">
              <tr>
                <th className="p-3 font-semibold text-slate-600 dark:text-zinc-400">{t('Критерий')}</th>
                <th className="p-3 font-semibold text-slate-500 dark:text-zinc-500">{t('Обычные каталоги вузов')}</th>
                <th className="p-3 font-semibold text-slate-500 dark:text-zinc-500">{t('Обычный AI-чат (ChatGPT)')}</th>
                <th className="p-3 font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-500/10">UniRoute AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="p-3 font-medium text-slate-800 dark:text-zinc-200">{t('Формат результата')}</td>
                <td className="p-3 text-slate-500 dark:text-zinc-400">{t('Простыня ссылок')}</td>
                <td className="p-3 text-slate-500 dark:text-zinc-400">{t('Длинная стена текста')}</td>
                <td className="p-3 font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/40 dark:bg-blue-500/5">{t('Интерактивный 7-шаговый маршрут')}</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-slate-800 dark:text-zinc-200">{t('Объяснение «Почему подходит»')}</td>
                <td className="p-3 text-slate-500 dark:text-zinc-400">{t('Отсутствует')}</td>
                <td className="p-3 text-slate-500 dark:text-zinc-400">{t('Часто абстрактное / вымышленное')}</td>
                <td className="p-3 font-semibold text-emerald-700 dark:text-emerald-400 bg-blue-50/40 dark:bg-blue-500/5">{t('Точный расчет по баллам и грантам')}</td>
              </tr>
              <tr>
                <td className="p-3 font-medium text-slate-800 dark:text-zinc-200">{t('Действие на эту неделю')}</td>
                <td className="p-3 text-slate-500 dark:text-zinc-400">{t('Нет')}</td>
                <td className="p-3 text-slate-500 dark:text-zinc-400">{t('Общие советы')}</td>
                <td className="p-3 font-semibold text-blue-700 dark:text-blue-300 bg-blue-50/40 dark:bg-blue-500/5">{t('Шаг #1 + чеклист + шаблоны писем')}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-slate-500 dark:text-zinc-400 text-center italic">
          {t('Потенциал B2B партнерств со школами (НИШ, БИЛ) и профориентационными центрами Центральной Азии.')}
        </p>
      </div>
    )
  },
  {
    number: 8,
    title: 'Итоги проекта и готовность к внедрению',
    subtitle: 'LOCUS Startup Hackathon 2026 • Кейс 02',
    category: 'Финал & Сабмит',
    content: (
      <div className="space-y-6 text-center max-w-xl mx-auto py-4">
        <span className="ar-icon-tile flex mx-auto w-14 h-14 rounded-2xl">
          <Award className="w-7 h-7" />
        </span>

        <div className="space-y-2">
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {t('Кейс 02 полностью реализован!')}
          </h3>
          <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
            {t('Создан самостоятельный работающий веб-сервис с авторской дизайн-системой, полным 7-шаговым пользовательским сценарием, высокой реактивностью и готовыми инструментами для абитуриента.')}
          </p>
        </div>

        <div className={`p-4 rounded-2xl ${BRAND_TINT} text-xs sm:text-[13px] font-medium text-slate-700 dark:text-zinc-300 space-y-1`}>
          <div>{t('Код участия кейса:')}<strong className="font-mono font-semibold text-blue-700 dark:text-blue-300">LOCUSCASE2</strong></div>
          <div>{t('Платформа подачи:')}<strong className="font-mono font-semibold text-blue-700 dark:text-blue-300">aistartify.com</strong></div>
        </div>
      </div>
    )
  }
];

export const PresentationModal: React.FC<PresentationModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();
  const SLIDES = buildSlides(t);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight' || e.key === 'Space') {
        setCurrentSlideIndex((prev) => Math.min(SLIDES.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, SLIDES.length]);

  if (!isOpen) return null;

  const currentSlide = SLIDES[currentSlideIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/40 backdrop-blur-[2px] animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="presentation-slide-title"
        className="w-full max-w-4xl flex flex-col overflow-hidden max-h-[calc(100dvh-1rem)] sm:max-h-[min(90dvh,calc(100dvh-3rem))] bg-[var(--surface-raised)] rounded-2xl border border-[var(--line)] shadow-[var(--shadow-overlay)] animate-popIn"
      >

        {/* Modal Top Bar */}
        <div className="shrink-0 pl-4 pr-2.5 sm:pl-6 sm:pr-4 py-3 border-b border-[var(--line)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="ar-badge ar-badge-blue tabular-nums shrink-0">
              Слайд {currentSlide.number} из {SLIDES.length}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 truncate hidden sm:inline">
              {t(currentSlide.category)}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            title={t('common.close')}
            className="ar-btn ar-btn-icon shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Slide Body */}
        <div className="p-4 sm:p-10 overflow-y-auto flex-1 min-h-0 flex flex-col">
          <div className="my-auto">
            <div className="space-y-1.5 mb-6">
              <h2 id="presentation-slide-title" className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight [text-wrap:balance]">
                {t(currentSlide.title)}
              </h2>
              <p className="text-sm text-slate-500 dark:text-zinc-400">
                {t(currentSlide.subtitle)}
              </p>
            </div>

            <div key={currentSlideIndex} className="py-2 animate-fadeIn">
              {currentSlide.content}
            </div>
          </div>
        </div>

        {/* Slide Footer Navigation */}
        <div className="shrink-0 px-4 sm:px-6 py-3 border-t border-[var(--line)] bg-[var(--surface-subtle)] flex items-center justify-between gap-3">
          <div className="flex items-center flex-wrap min-w-0">
            {SLIDES.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlideIndex(idx)}
                aria-label={`Слайд ${idx + 1}`}
                aria-current={idx === currentSlideIndex ? 'step' : undefined}
                title={`Слайд ${idx + 1}`}
                className="group h-8 px-1 flex items-center rounded-md"
              >
                <span
                  className={`block h-2 rounded-full transition-all ${
                    idx === currentSlideIndex ? 'w-6 bg-blue-600 dark:bg-blue-500' : 'w-2 bg-slate-300 group-hover:bg-slate-400 dark:bg-zinc-700 dark:group-hover:bg-zinc-500'
                  }`}
                />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentSlideIndex === 0}
              aria-label={t('common.back')}
              title={t('common.back')}
              className="ar-btn ar-btn-secondary w-10 h-10 p-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentSlideIndex((prev) => Math.min(SLIDES.length - 1, prev + 1))}
              disabled={currentSlideIndex === SLIDES.length - 1}
              aria-label={t('common.next')}
              title={t('common.next')}
              className="ar-btn ar-btn-primary w-10 h-10 p-0"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
