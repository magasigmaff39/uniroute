// «+ Добавить университет»: find a university by name (or browse by country), pick the programme and the
// intake year, add it to the applicant's list. Used by the analysis, the universities page and the profile.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, ArrowLeft, Check, ChevronRight } from 'lucide-react';
import type { University } from '../../types';
import { UNIVERSITY_DATABASE } from '../../data/universities';
import { useI18n } from '../../i18n/I18nContext';
import { UniversityCrest } from '../ui/UniversityCrest';
import { Chips, Field, TextInput } from '../profile/fields';
import { admissionYears } from '../../utils/years';

interface AddUniversityDialogProps {
  open: boolean;
  onClose: () => void;
  existingIds: string[];
  defaultYear: string;
  onAdd: (id: string, plan: { program?: string; year?: string }) => void;
}

const COUNTRIES = Array.from(new Set(UNIVERSITY_DATABASE.map((u) => u.country))).sort((a, b) => a.localeCompare(b, 'ru'));

export const AddUniversityDialog: React.FC<AddUniversityDialogProps> = ({ open, onClose, existingIds, defaultYear, onAdd }) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
  const [picked, setPicked] = useState<University | null>(null);
  const [program, setProgram] = useState('');
  const [customProgram, setCustomProgram] = useState('');
  const [year, setYear] = useState(defaultYear);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setCountry('');
    setPicked(null);
    setProgram('');
    setCustomProgram('');
    setYear(defaultYear);
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return UNIVERSITY_DATABASE.filter((u) => (!country || u.country === country) && (!q || `${u.name} ${u.shortName} ${u.nativeName} ${u.city}`.toLowerCase().includes(q))).slice(0, 40);
  }, [query, country]);

  if (!open) return null;

  const add = () => {
    if (!picked) return;
    const finalProgram = program === '__other' ? customProgram.trim() : program;
    onAdd(picked.id, { program: finalProgram || undefined, year });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/40 backdrop-blur-[2px] animate-fadeIn" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={t('uni.add.title')} className="w-full sm:max-w-xl max-h-[calc(100dvh-2rem)] sm:max-h-[min(44rem,calc(100dvh-3rem))] flex flex-col overflow-hidden rounded-2xl bg-[var(--surface-raised)] border border-[var(--line)] shadow-[var(--shadow-overlay)] animate-popIn">
        <div className="pl-4 pr-2 sm:pl-5 sm:pr-3 py-2.5 border-b border-[var(--line)] flex items-center gap-1.5 shrink-0">
          {picked && (
            <button type="button" onClick={() => setPicked(null)} aria-label={t('common.back')} className="ar-btn ar-btn-icon -ml-2 shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <h2 className="flex-1 min-w-0 truncate text-lg font-semibold text-slate-900 dark:text-white">{picked ? picked.shortName : t('uni.add.title')}</h2>
          <button type="button" onClick={onClose} aria-label={t('common.close')} className="ar-btn ar-btn-icon shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!picked ? (
          <>
            <div className="p-4 sm:p-5 space-y-2.5 border-b border-[var(--line)] shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input ref={inputRef} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('uni.add.search')} aria-label={t('uni.add.search')} className="ar-input pl-10" />
              </div>
              <select value={country} onChange={(e) => setCountry(e.target.value)} className="ar-input" aria-label={t('uni.add.country')}>
                <option value="">{t('uni.add.allCountries')}</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <ul className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 sm:p-3 space-y-0.5">
              {results.map((u) => {
                const added = existingIds.includes(u.id);
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      disabled={added}
                      onClick={() => {
                        setPicked(u);
                        setProgram(u.flagshipPrograms[0] || '');
                      }}
                      className="group w-full flex items-center gap-3 px-2.5 sm:px-3 py-2.5 rounded-xl text-left transition hover:bg-slate-50 dark:hover:bg-zinc-800/50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
                    >
                      <UniversityCrest uni={u} size={36} rounded="rounded-lg" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-slate-900 dark:text-white truncate">{u.name}</span>
                        <span className="block text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                          {u.flag} {u.city}, {u.country}
                        </span>
                      </span>
                      {added ? (
                        <span className="ar-badge ar-badge-green shrink-0">
                          <Check className="w-3.5 h-3.5" /> {t('uni.add.already')}
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 shrink-0 text-slate-300 group-hover:text-slate-500 dark:text-zinc-600 dark:group-hover:text-zinc-400 transition" />
                      )}
                    </button>
                  </li>
                );
              })}
              {results.length === 0 && <li className="px-3 py-8 text-sm text-center text-slate-500 dark:text-zinc-400">{t('uni.add.nothing')}</li>}
            </ul>
          </>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-5">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-[var(--line)]">
                <UniversityCrest uni={picked} size={44} rounded="rounded-xl" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{picked.name}</p>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    {picked.flag} {picked.city}, {picked.country}
                  </p>
                </div>
              </div>
              <Field label={t('uni.add.program')} hint={t('uni.add.programHint')} optional>
                <select value={program} onChange={(e) => setProgram(e.target.value)} className="ar-input">
                  <option value="">{t('uni.add.programAny')}</option>
                  {picked.flagshipPrograms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                  <option value="__other">{t('uni.add.programOther')}</option>
                </select>
                {program === '__other' && <TextInput value={customProgram} onChange={setCustomProgram} placeholder={t('uni.add.programOtherPh')} />}
              </Field>
              <Field label={t('fact.targetYear')}>
                <Chips options={admissionYears(defaultYear)} value={year} onChange={setYear} label={(y) => y} />
              </Field>
            </div>
            <div className="shrink-0 px-4 sm:px-5 py-3.5 border-t border-[var(--line)] bg-[var(--surface-raised)]">
              <button type="button" onClick={add} className="ar-btn ar-btn-primary ar-btn-lg w-full">
                {t('uni.add.confirm')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
