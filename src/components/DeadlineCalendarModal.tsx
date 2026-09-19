import React, { useState } from 'react';
import { useI18n } from '../i18n/I18nContext';
import { X, Calendar, Download, Filter, ExternalLink } from 'lucide-react';
import { UniversityCrest } from './ui/UniversityCrest';
import { getUniversityById } from '../data/universities';
import { UNIVERSITY_DATABASE } from '../data/universities';
import { parseRuDeadline, toIcsDate, daysUntil } from '../utils/dates';

interface DeadlineCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeadlineCalendarModal: React.FC<DeadlineCalendarModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t, tx } = useI18n();
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  if (!isOpen) return null;

  const events = UNIVERSITY_DATABASE.flatMap(uni => {
    const list = [];
    if (uni.earlyDeadline) {
      list.push({
        id: `${uni.id}-early`,
        uniId: uni.id,
        uniName: uni.name,
        shortName: uni.shortName,
        type: 'Ранний прием (Early Round)',
        deadline: uni.earlyDeadline,
        country: uni.country,
        region: uni.region,
        portalUrl: uni.officialPortalUrl,
        isEarly: true,
      });
    }
    list.push({
      id: `${uni.id}-regular`,
      uniId: uni.id,
      uniName: uni.name,
      shortName: uni.shortName,
      type: 'Основной раунд / Грантовый конкурс',
      deadline: uni.regularDeadline,
      country: uni.country,
      region: uni.region,
      portalUrl: uni.officialPortalUrl,
      isEarly: false,
    });
    return list;
  });

  const filteredEvents = events
    .map((ev) => ({ ...ev, date: parseRuDeadline(ev.deadline) }))
    .filter((ev) => (selectedRegion === 'all' ? true : ev.region === selectedRegion))
    .sort((a, b) => (a.date?.getTime() ?? Infinity) - (b.date?.getTime() ?? Infinity));

  const generateIcsFile = () => {
    let icsContent = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//UniRoute//Admission Deadlines//RU\r\nCALSCALE:GREGORIAN\r\n`;

    filteredEvents.forEach(ev => {
      if (!ev.date) return; // skip deadlines without a parseable date (e.g. "rolling")
      const start = toIcsDate(ev.date);
      const end = toIcsDate(new Date(ev.date.getTime() + 86_400_000));
      const uid = `${ev.id}@admitroute`;
      icsContent += `BEGIN:VEVENT\r\nUID:${uid}\r\nSUMMARY:${ev.shortName} — ${tx(ev.type)}\r\nDESCRIPTION:Срок подачи в ${ev.uniName}: ${tx(ev.deadline)}. Портал: ${ev.portalUrl}\r\nURL:${ev.portalUrl}\r\nSTATUS:CONFIRMED\r\nDTSTART;VALUE=DATE:${start}\r\nDTEND;VALUE=DATE:${end}\r\nBEGIN:VALARM\r\nTRIGGER:-P7D\r\nACTION:DISPLAY\r\nDESCRIPTION:Через неделю дедлайн ${ev.shortName}\r\nEND:VALARM\r\nEND:VEVENT\r\n`;
    });

    icsContent += `END:VCALENDAR\r\n`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'admit_deadlines.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-[2px] animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="deadline-calendar-title"
    >
      <div className="w-full max-w-3xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-raised)] shadow-[var(--shadow-overlay)] animate-popIn">

        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-[var(--line)] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="ar-icon-tile">
              <Calendar className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h3 id="deadline-calendar-title" className="text-lg font-semibold text-slate-900 dark:text-white leading-tight">
                {t('Календарный регламент контрольных сроков')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {t('Сроки ранней и регулярной подачи в университеты')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ar-btn ar-btn-icon shrink-0"
            aria-label={t('Закрыть')}
            title={t('Закрыть')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-4 sm:px-6 py-3 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto hide-scrollbar py-0.5" role="group">
            <Filter className="w-4 h-4 text-slate-400 dark:text-zinc-500 mr-0.5 shrink-0" aria-hidden />
            {[
              { id: 'all', label: 'Все юрисдикции' },
              { id: 'kazakhstan', label: 'Казахстан' },
              { id: 'europe', label: 'Европа' },
              { id: 'asia', label: 'Азия' },
              { id: 'usa_canada', label: 'США / Канада' },
            ].map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRegion(r.id)}
                aria-pressed={selectedRegion === r.id}
                className="ar-chip shrink-0 whitespace-nowrap"
              >
                {t(r.label)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={generateIcsFile}
            className="ar-btn ar-btn-secondary ar-btn-sm min-h-9"
          >
            <Download className="w-4 h-4" />
            <span>{t('Экспорт в iCal (.ics)')}</span>
          </button>
        </div>

        {/* List of Deadlines */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          {filteredEvents.map(ev => (
            <div
              key={ev.id}
              className="p-3 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--surface-raised)] transition-colors hover:border-[var(--line-strong)] hover:bg-slate-50 dark:hover:bg-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                {(() => {
                  const uni = getUniversityById(ev.uniId);
                  return uni ? <UniversityCrest uni={uni} size={36} rounded="rounded-lg" /> : null;
                })()}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white break-words">{ev.uniName}</h4>
                    <span className={`ar-badge ${ev.isEarly ? 'ar-badge-blue' : ''}`}>
                      {tx(ev.type)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{ev.country}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pl-12 sm:pl-0">
                <div className="sm:text-right">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">{tx(ev.deadline)}</span>
                  {(() => {
                    const left = daysUntil(ev.date);
                    if (left === null) return <span className="text-xs text-slate-500 dark:text-zinc-400">{t('Официальный срок')}</span>;
                    if (left < 0) return <span className="text-xs text-slate-500 dark:text-zinc-400">{t('Прошёл')}</span>;
                    return <span className={`text-xs font-semibold ${left <= 30 ? 'text-rose-600 dark:text-rose-400' : left <= 90 ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-zinc-400'}`}>{t('через')} {left} дн.</span>;
                  })()}
                </div>

                <a
                  href={ev.portalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ar-btn ar-btn-icon w-9 h-9"
                  title={t('Портал подачи')}
                  aria-label={t('Портал подачи')}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-[var(--line)] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="ar-btn ar-btn-secondary"
          >
            {t('Закрыть')}
          </button>
        </div>

      </div>
    </div>
  );
};
