// Small, plain editors for every profile fact. The profile blocks, «Заполнить профиль» and the detailed test
// all use these, so a fact looks and behaves the same wherever it is asked.
import React, { useState } from 'react';
import { Plus, X, Trash2 } from 'lucide-react';
import type { ApplicantProfile, EducationGrade, EnglishLevel, IntendedMajor, OtherExam, ProfileFact, TargetRegion } from '../../types';
import { REQUIRED_FACTS } from '../../utils/profileInsights';
import { useI18n } from '../../i18n/I18nContext';
import { EXTRA_CHIPS, GRADE_LABELS, SCHOOL_LABELS } from '../cabinet/facts';
import { admissionYears } from '../../utils/years';

export type Patch = Partial<ApplicantProfile>;
export interface EditorProps {
  /** Profile with the pending edits applied */
  value: ApplicantProfile;
  set: (patch: Patch) => void;
}

const MAJORS: IntendedMajor[] = ['cs_ai', 'software_eng', 'data_science', 'robotics', 'business_finance', 'economics', 'medicine_bio', 'international_law', 'media_design', 'engineering', 'natural_sciences', 'humanities', 'education', 'linguistics'];
const REGIONS: TargetRegion[] = ['kazakhstan', 'europe', 'asia', 'usa_canada'];
const GRADES: EducationGrade[] = ['grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12', 'college', 'gap_year'];
const CEFR: EnglishLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const IELTS_SCORES = [4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9];

// ---------------------------------------------------------------------------
// Building blocks

export const Field: React.FC<{ fact?: ProfileFact; label: string; hint?: string; optional?: boolean; children: React.ReactNode }> = ({ fact, label, hint, optional, children }) => {
  const { t } = useI18n();
  const required = fact ? REQUIRED_FACTS.includes(fact) : false;
  return (
    <div className="space-y-2">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{label}</span>
          {required ? (
            <span className="text-xs font-medium text-rose-600 dark:text-rose-400">{t('pf.required')}</span>
          ) : optional ? (
            <span className="text-xs text-slate-400 dark:text-zinc-500">{t('pf.optional')}</span>
          ) : null}
        </div>
        {hint && <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      {children}
    </div>
  );
};

/** Tap-to-choose pills; `multi` toggles, otherwise single choice. */
export function Chips<T extends string>({ options, value, onChange, label, multi, max }: { options: readonly T[]; value: T | T[] | undefined; onChange: (v: any) => void; label: (v: T) => string; multi?: boolean; max?: number }) {
  const selected = (o: T) => (multi ? ((value as T[]) || []).includes(o) : value === o);
  const toggle = (o: T) => {
    if (!multi) return onChange(o);
    const list = (value as T[]) || [];
    if (list.includes(o)) onChange(list.filter((x) => x !== o));
    else if (!max || list.length < max) onChange([...list, o]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={selected(o)}
          onClick={() => toggle(o)}
          className="ar-chip min-h-10 px-3.5 text-sm"
        >
          {label(o)}
        </button>
      ))}
    </div>
  );
}

export const TextInput: React.FC<{ value: string | undefined; onChange: (v: string) => void; placeholder?: string; type?: string; list?: string; min?: number; max?: number; step?: number; autoComplete?: string }> = ({ value, onChange, ...rest }) => (
  <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="ar-input" {...rest} />
);

/** A list of short strings: chips with ×, an input with «+ Добавить», optional quick suggestions. */
export const TagsInput: React.FC<{ value: string[] | undefined; onChange: (v: string[]) => void; placeholder: string; suggestions?: string[] }> = ({ value = [], onChange, placeholder, suggestions = [] }) => {
  const { t } = useI18n();
  const [text, setText] = useState('');
  const add = (raw: string) => {
    const items = raw.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean);
    const next = [...value];
    for (const it of items) if (!next.some((x) => x.toLowerCase() === it.toLowerCase())) next.push(it);
    onChange(next);
    setText('');
  };
  const free = suggestions.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()));
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <span key={v} className="inline-flex items-center gap-0.5 pl-3 pr-1 h-8 rounded-lg bg-blue-50 text-blue-800 dark:bg-blue-500/12 dark:text-blue-100 text-sm font-medium animate-fadeIn">
              {v}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`${t('pf.remove')} ${v}`} className="w-6 h-6 rounded-md flex items-center justify-center text-blue-400 hover:text-blue-900 hover:bg-blue-100 dark:text-blue-300/70 dark:hover:text-white dark:hover:bg-blue-500/20 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (text.trim()) add(text);
            }
          }}
          placeholder={placeholder}
          className="ar-input flex-1 min-w-0"
        />
        <button type="button" onClick={() => text.trim() && add(text)} disabled={!text.trim()} aria-label={t('pf.add')} className="ar-btn ar-btn-secondary !min-h-11 !px-3.5 shrink-0">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">{t('pf.add')}</span>
        </button>
      </div>
      {free.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {free.slice(0, 8).map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="h-8 px-2.5 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-300 border border-dashed border-slate-300 dark:border-zinc-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50/60 dark:hover:border-blue-400/60 dark:hover:text-blue-200 dark:hover:bg-blue-500/10 transition-colors">
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** One exam score with a «сдавал(а)» switch. */
const ScoreRow: React.FC<{ label: string; hint: string; has: boolean; score?: number; onChange: (has: boolean, score?: number) => void; options?: number[]; min?: number; max?: number; step?: number }> = ({
  label,
  hint,
  has,
  score,
  onChange,
  options,
  min,
  max,
  step,
}) => {
  const { t } = useI18n();
  return (
    <div className={`rounded-xl border p-3.5 space-y-3 transition-colors ${has ? 'border-blue-200 bg-blue-50/40 dark:border-blue-500/25 dark:bg-blue-500/[0.05]' : 'border-[var(--line)]'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{label}</p>
          <p className="text-xs text-slate-500 dark:text-zinc-400">{hint}</p>
        </div>
        <div className="flex p-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 shrink-0" role="group">
          {[false, true].map((v) => (
            <button
              key={String(v)}
              type="button"
              aria-pressed={has === v}
              onClick={() => onChange(v, v ? score : undefined)}
              className={`h-8 px-3 rounded-md text-xs font-semibold transition-colors ${has === v ? 'bg-white dark:bg-zinc-950 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'}`}
            >
              {t(v ? 'pf.exam.taken' : 'pf.exam.notTaken')}
            </button>
          ))}
        </div>
      </div>
      {has &&
        (options ? (
          <select value={score ?? ''} onChange={(e) => onChange(true, Number(e.target.value))} className="ar-input">
            <option value="" disabled>
              {t('pf.exam.pick')}
            </option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        ) : (
          <input type="number" inputMode="numeric" min={min} max={max} step={step} value={score ?? ''} onChange={(e) => onChange(true, e.target.value === '' ? undefined : Number(e.target.value))} placeholder={`${min}–${max}`} className="ar-input" />
        ))}
    </div>
  );
};

const OtherExamsEditor: React.FC<{ value: OtherExam[] | undefined; onChange: (v: OtherExam[]) => void }> = ({ value = [], onChange }) => {
  const { t } = useI18n();
  const update = (id: string, patch: Partial<OtherExam>) => onChange(value.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const add = (name = '') => onChange([...value, { id: `ex_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, name, score: '' }]);
  return (
    <div className="space-y-2">
      {value.map((e) => (
        <div key={e.id} className="flex gap-2">
          <input value={e.name} onChange={(ev) => update(e.id, { name: ev.target.value })} placeholder={t('pf.exam.otherName')} className="ar-input flex-1 min-w-0" />
          <input value={e.score} onChange={(ev) => update(e.id, { score: ev.target.value })} placeholder={t('pf.exam.otherScore')} className="ar-input w-24 sm:w-32" />
          <button type="button" onClick={() => onChange(value.filter((x) => x.id !== e.id))} aria-label={t('pf.remove')} className="ar-btn ar-btn-icon !w-11 !h-11 shrink-0 hover:!text-rose-600 hover:!bg-rose-50 dark:hover:!text-rose-300 dark:hover:!bg-rose-500/10">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => add()} className="ar-btn ar-btn-secondary ar-btn-sm">
          <Plus className="w-3.5 h-3.5" /> {t('pf.exam.addOther')}
        </button>
        {['TOEFL', 'ACT', 'Duolingo English Test', 'AP', 'IB', 'A-Level']
          .filter((n) => !value.some((e) => e.name.toLowerCase() === n.toLowerCase()))
          .map((n) => (
            <button key={n} type="button" onClick={() => add(n)} className="h-8 px-2.5 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-300 border border-dashed border-slate-300 dark:border-zinc-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50/60 dark:hover:border-blue-400/60 dark:hover:text-blue-200 dark:hover:bg-blue-500/10 transition-colors">
              + {n}
            </button>
          ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// One editor per fact

const COUNTRIES = ['Казахстан', 'Узбекистан', 'Кыргызстан', 'Россия', 'Таджикистан', 'Туркменистан', 'Азербайджан', 'Монголия'];
const SUBJECTS = ['Математика', 'Физика', 'Информатика', 'Химия', 'Биология', 'Английский язык', 'История', 'География', 'Экономика'];
const INTERESTS = ['Робототехника', 'Искусственный интеллект', 'Программирование', 'Математика', 'Наука', 'Бизнес', 'Дизайн', 'Медицина', 'Экология', 'Дебаты'];
const SKILLS = ['Python', 'C++', 'JavaScript', 'Arduino', '3D-моделирование', 'Анализ данных', 'Публичные выступления', 'Английский', 'Работа в команде'];
const LANGUAGES = ['Казахский', 'Русский', 'Английский', 'Турецкий', 'Немецкий', 'Китайский', 'Корейский'];

export function FactEditor({ fact, value: v, set }: EditorProps & { fact: ProfileFact }) {
  const { t } = useI18n();
  const first = v.firstName ?? v.name.split(' ')[0] ?? '';
  const last = v.lastName ?? v.name.split(' ').slice(1).join(' ');

  switch (fact) {
    case 'name':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field fact="name" label={t('pf.firstName')}>
            <TextInput value={first} onChange={(x) => set({ firstName: x, lastName: last })} autoComplete="given-name" />
          </Field>
          <Field label={t('pf.lastName')}>
            <TextInput value={last} onChange={(x) => set({ firstName: first, lastName: x })} autoComplete="family-name" />
          </Field>
        </div>
      );
    case 'birthDate':
      return (
        <Field label={t('fact.birthDate')} hint={t('pf.birthDate.hint')} optional>
          <TextInput type="date" value={v.birthDate} onChange={(x) => set({ birthDate: x })} />
        </Field>
      );
    case 'age':
      return (
        <Field fact="age" label={t('fact.age')} hint={v.birthDate ? t('pf.age.fromBirth') : undefined}>
          <TextInput type="number" min={10} max={30} value={String(v.age || '')} onChange={(x) => set({ age: Number(x) || v.age })} />
        </Field>
      );
    case 'location':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field fact="location" label={t('pf.country')}>
            <TextInput value={v.country} onChange={(x) => set({ country: x })} list="pf-countries" />
            <datalist id="pf-countries">
              {COUNTRIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label={t('pf.city')}>
            <TextInput value={v.city} onChange={(x) => set({ city: x })} />
          </Field>
        </div>
      );
    case 'grade':
      return (
        <Field fact="grade" label={t('fact.grade')}>
          <Chips options={GRADES} value={v.grade} onChange={(x: EducationGrade) => set({ grade: x })} label={(g) => t(GRADE_LABELS[g])} />
        </Field>
      );
    case 'schoolType':
      return (
        <Field fact="schoolType" label={t('fact.schoolType')}>
          <Chips options={Object.keys(SCHOOL_LABELS) as ApplicantProfile['schoolType'][]} value={v.schoolType} onChange={(x) => set({ schoolType: x })} label={(s) => t(SCHOOL_LABELS[s])} />
        </Field>
      );
    case 'schoolName':
      return (
        <Field label={t('fact.schoolName')} optional>
          <TextInput value={v.schoolName} onChange={(x) => set({ schoolName: x })} placeholder={t('pf.schoolName.ph')} />
        </Field>
      );
    case 'gpa':
      return (
        <Field fact="gpa" label={t('fact.gpa')} hint={t('pf.gpa.hint')}>
          <div className="flex gap-2">
            <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-zinc-800 shrink-0" role="group">
              {(['5.0', '4.0'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={v.gpaScale === s}
                  onClick={() => set({ gpaScale: s, gpa: s === v.gpaScale ? v.gpa : s === '4.0' ? Math.round((v.gpa / 5) * 4 * 100) / 100 : Math.round((v.gpa / 4) * 5 * 100) / 100 })}
                  className={`h-9 px-3 rounded-lg text-xs font-semibold transition-colors ${v.gpaScale === s ? 'bg-white dark:bg-zinc-950 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'}`}
                >
                  {t('pf.gpa.scale', { n: s })}
                </button>
              ))}
            </div>
            <input
              type="number"
              inputMode="decimal"
              step={0.01}
              min={1}
              max={Number(v.gpaScale)}
              value={v.gpa || ''}
              placeholder={v.gpaScale === '4.0' ? '3.6' : '4.5'}
              onChange={(e) => set({ gpa: Math.min(Number(v.gpaScale), Math.max(0, Number(e.target.value) || 0)), gpaScale: v.gpaScale })}
              className="ar-input flex-1 min-w-0"
            />
          </div>
        </Field>
      );
    case 'profileSubjects':
      return (
        <Field fact="profileSubjects" label={t('fact.profileSubjects')} hint={t('pf.subjects.hint')}>
          <TagsInput value={v.profileSubjects} onChange={(x) => set({ profileSubjects: x })} placeholder={t('pf.subjects.ph')} suggestions={SUBJECTS} />
        </Field>
      );
    case 'english':
      return (
        <Field fact="english" label={t('pf.englishLevel')} hint={t('pf.englishLevel.hint')}>
          <Chips options={CEFR} value={v.englishLevel} onChange={(x: EnglishLevel) => set({ englishLevel: x })} label={(l) => l} />
        </Field>
      );
    case 'exams':
      return (
        <div className="space-y-2.5">
          <ScoreRow label="IELTS" hint={t('pf.ielts.hint')} has={v.hasIelts} score={v.ieltsScore} options={IELTS_SCORES} onChange={(has, score) => set({ hasIelts: has, ieltsScore: has ? score ?? 6.5 : undefined })} />
          <ScoreRow label="SAT" hint={t('pf.sat.hint')} has={v.hasSat} score={v.satScore} min={400} max={1600} step={10} onChange={(has, score) => set({ hasSat: has, satScore: has ? score : undefined })} />
          <ScoreRow label={t('fact.value.unt')} hint={t('pf.unt.hint')} has={v.hasUnt} score={v.untScore} min={0} max={140} step={1} onChange={(has, score) => set({ hasUnt: has, untScore: has ? score : undefined })} />
        </div>
      );
    case 'otherExams':
      return (
        <Field label={t('fact.otherExams')} hint={t('pf.otherExams.hint')} optional>
          <OtherExamsEditor value={v.otherExams} onChange={(x) => set({ otherExams: x })} />
        </Field>
      );
    case 'olympiadLevel':
      return (
        <Field fact="olympiadLevel" label={t('fact.olympiadLevel')} hint={t('pf.olympiad.hint')}>
          <Chips options={['none', 'school', 'city', 'republican', 'international'] as const} value={v.olympiadLevel} onChange={(x) => set({ olympiadLevel: x })} label={(l) => t(`quick.olympiad.${l}`)} />
        </Field>
      );
    case 'extracurriculars':
      return (
        <Field label={t('fact.extracurriculars')} optional>
          <Chips options={EXTRA_CHIPS.map((c) => c.id)} value={v.extracurriculars} multi onChange={(x: string[]) => set({ extracurriculars: x })} label={(id) => t(EXTRA_CHIPS.find((c) => c.id === id)!.label)} />
        </Field>
      );
    case 'interests':
      return (
        <Field fact="interests" label={t('fact.interests')}>
          <TagsInput value={v.interests} onChange={(x) => set({ interests: x })} placeholder={t('pf.interests.ph')} suggestions={INTERESTS} />
        </Field>
      );
    case 'skills':
      return (
        <Field label={t('fact.skills')} optional>
          <TagsInput value={v.skills} onChange={(x) => set({ skills: x })} placeholder={t('pf.skills.ph')} suggestions={SKILLS} />
        </Field>
      );
    case 'languages':
      return (
        <Field label={t('fact.languages')} optional>
          <TagsInput value={v.languagesSpoken} onChange={(x) => set({ languagesSpoken: x })} placeholder={t('pf.languages.ph')} suggestions={LANGUAGES} />
        </Field>
      );
    case 'majors':
      return (
        <Field fact="majors" label={t('fact.majors')}>
          <Chips options={MAJORS} value={v.targetMajors} multi max={5} onChange={(x: IntendedMajor[]) => x.length && set({ targetMajors: x })} label={(m) => t(`quick.major.${m}`)} />
        </Field>
      );
    case 'regions':
      return (
        <Field fact="regions" label={t('fact.regions')}>
          <Chips options={REGIONS} value={v.targetRegions} multi onChange={(x: TargetRegion[]) => x.length && set({ targetRegions: x })} label={(r) => t(`region.${r}`)} />
        </Field>
      );
    case 'targetYear':
      return (
        <Field fact="targetYear" label={t('fact.targetYear')} hint={t('pf.targetYear.hint')}>
          <Chips options={admissionYears(v.targetYear)} value={v.targetYear} onChange={(x: string) => set({ targetYear: x })} label={(y) => y} />
        </Field>
      );
    case 'targetTrack':
      return (
        <Field label={t('fact.targetTrack')} optional>
          <Chips options={['university', 'college', 'school', 'all'] as const} value={v.targetTrack || 'university'} onChange={(x) => set({ targetTrack: x })} label={(x) => t(`profile.track.${x}`)} />
        </Field>
      );
    case 'budget':
      return (
        <Field fact="budget" label={t('fact.budget')} hint={t('pf.budget.hint')}>
          <Chips options={['grant_only', 'up_to_5k', 'up_to_15k', 'above_25k'] as const} value={v.budgetTier} onChange={(x) => set({ budgetTier: x })} label={(b) => t(`quick.budget.${b}`)} />
        </Field>
      );
    case 'careerGoal':
      return (
        <Field fact="careerGoal" label={t('fact.careerGoal')}>
          <TextInput value={v.careerGoal} onChange={(x) => set({ careerGoal: x })} placeholder={t('profile.careerGoalPh')} />
        </Field>
      );
    case 'careerPlans':
      return (
        <Field label={t('fact.careerPlans')} optional>
          <textarea value={v.careerPlans ?? ''} onChange={(e) => set({ careerPlans: e.target.value })} rows={3} placeholder={t('pf.careerPlans.ph')} className="ar-input" />
        </Field>
      );
    case 'preferences':
      return (
        <div className="space-y-4">
          <Field label={t('profile.climate')} optional>
            <Chips options={['any', 'warm', 'cold', 'mild'] as const} value={v.climatePreference || 'any'} onChange={(x) => set({ climatePreference: x })} label={(c) => t(`profile.climate.${c}`)} />
          </Field>
          <Field label={t('profile.city')} optional>
            <Chips options={['any', 'megacity', 'mid_city', 'campus_town'] as const} value={v.cityPreference || 'any'} onChange={(x) => set({ cityPreference: x })} label={(c) => t(`profile.city.${c}`)} />
          </Field>
          <Field label={t('profile.health')} optional>
            <TextInput value={v.healthNotes} onChange={(x) => set({ healthNotes: x })} placeholder={t('profile.healthPh')} />
          </Field>
          <Field label={t('profile.diet')} optional>
            <TextInput value={v.dietaryNeeds} onChange={(x) => set({ dietaryNeeds: x })} placeholder={t('profile.dietPh')} />
          </Field>
          <Field label={t('profile.notes')} optional>
            <textarea value={v.personalNotes ?? ''} onChange={(e) => set({ personalNotes: e.target.value })} rows={3} placeholder={t('profile.notesPh')} className="ar-input" />
          </Field>
        </div>
      );
    default:
      return null;
  }
}
