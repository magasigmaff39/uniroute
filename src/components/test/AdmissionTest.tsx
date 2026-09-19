// «Тест абитуриента» — the single test that replaced the express and the detailed test. Step by step the
// applicant tells the system about themselves (name, school, GPA, exams, achievements, goals, universities);
// every answer lands in the profile, and the AI verdict follows right after the last step.
import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, UserRound, School, Languages, Trophy, Target, GraduationCap, Lightbulb, Search, X, Check, ClipboardList } from 'lucide-react';
import type { ApplicantProfile, DiagnosticResult, NavTarget, PortfolioItem, ProfileFact } from '../../types';
import type { UserAccount } from '../../lib/auth';
import { withAnswers, type Completeness } from '../../utils/profileInsights';
import { UNIVERSITY_DATABASE } from '../../data/universities';
import { pickTargetUniversities } from '../../../shared/logic/match.js';
import { useI18n } from '../../i18n/I18nContext';
import { FactEditor, type Patch } from '../profile/fields';
import { PortfolioList } from '../profile/PortfolioList';
import { UniversityCrest } from '../ui/UniversityCrest';
import { TestAnalyzing, TestResult } from './TestResult';

type StepId = 'about' | 'school' | 'exams' | 'achievements' | 'goals' | 'universities' | 'extra';
type ListBlock = 'achievements' | 'projects' | 'experience';

interface StepDef {
  id: StepId;
  icon: React.FC<{ className?: string }>;
  facts: ProfileFact[];
  /** Portfolio lists shown on the step (signed-in applicants only — entries are stored on the server) */
  lists?: ListBlock[];
  /** Facts that must be answered before «Далее» */
  required: ProfileFact[];
}

const STEPS: StepDef[] = [
  { id: 'about', icon: UserRound, facts: ['name', 'birthDate', 'location'], required: ['name'] },
  { id: 'school', icon: School, facts: ['grade', 'schoolType', 'schoolName', 'gpa', 'profileSubjects'], required: ['grade', 'gpa'] },
  { id: 'exams', icon: Languages, facts: ['english', 'exams', 'otherExams'], required: ['english'] },
  { id: 'achievements', icon: Trophy, facts: ['olympiadLevel'], lists: ['achievements', 'projects'], required: ['olympiadLevel'] },
  { id: 'goals', icon: Target, facts: ['majors', 'careerGoal', 'regions', 'targetTrack', 'targetYear', 'budget'], required: ['majors', 'regions', 'targetYear', 'budget'] },
  { id: 'universities', icon: GraduationCap, facts: ['targetUniversities'], required: [] },
  { id: 'extra', icon: Lightbulb, facts: ['interests', 'skills', 'languages'], lists: ['experience'], required: [] },
];
const TEST_FACTS = STEPS.flatMap((s) => s.facts);

/** Profile fields behind each fact the test asks. */
const FACT_KEYS: Partial<Record<ProfileFact, (keyof ApplicantProfile)[]>> = {
  name: ['firstName', 'lastName', 'name'],
  birthDate: ['birthDate'],
  location: ['country', 'city'],
  grade: ['grade'],
  schoolType: ['schoolType'],
  schoolName: ['schoolName'],
  gpa: ['gpa', 'gpaScale'],
  profileSubjects: ['profileSubjects'],
  english: ['englishLevel', 'hasIelts', 'ieltsScore'],
  exams: ['hasSat', 'satScore', 'hasUnt', 'untScore'],
  otherExams: ['otherExams'],
  olympiadLevel: ['olympiadLevel'],
  majors: ['targetMajors'],
  careerGoal: ['careerGoal'],
  regions: ['targetRegions'],
  targetTrack: ['targetTrack'],
  targetYear: ['targetYear'],
  budget: ['budgetTier'],
  interests: ['interests'],
  skills: ['skills'],
  languages: ['languagesSpoken'],
  targetUniversities: ['targetUniversityIds', 'universityPlans'],
};

/** Free-text fields of the demo persona a fresh account starts from; the first test clears them. */
const PERSONA_ONLY: Partial<ApplicantProfile> = { profileSubjects: [], olympiadDetails: '', leadershipActivities: [], extracurriculars: [], careerGoal: '', personalNotes: '' };

const filled = (s?: string) => Boolean(s && s.trim());

/** Has the applicant actually answered this fact (as opposed to leaving the field empty)? */
function answered(fact: ProfileFact, p: ApplicantProfile): boolean {
  switch (fact) {
    case 'name':
      return filled(p.firstName ?? p.name);
    case 'birthDate':
      return filled(p.birthDate);
    case 'location':
      return filled(p.country) || filled(p.city);
    case 'grade':
      return Boolean(p.grade);
    case 'schoolType':
      return Boolean(p.schoolType);
    case 'schoolName':
      return filled(p.schoolName);
    case 'gpa':
      return Number(p.gpa) > 0;
    case 'profileSubjects':
      return (p.profileSubjects || []).length > 0;
    case 'english':
      return Boolean(p.englishLevel) || p.hasIelts;
    case 'exams':
      return true; // «сдавал(а) / не сдавал(а)» is an answer either way
    case 'otherExams':
      return (p.otherExams || []).some((e) => filled(e.name));
    case 'olympiadLevel':
      return Boolean(p.olympiadLevel);
    case 'majors':
      return (p.targetMajors || []).length > 0;
    case 'careerGoal':
      return filled(p.careerGoal);
    case 'regions':
      return (p.targetRegions || []).length > 0;
    case 'targetTrack':
      return Boolean(p.targetTrack);
    case 'targetYear':
      return Boolean(p.targetYear);
    case 'budget':
      return Boolean(p.budgetTier);
    case 'interests':
      return (p.interests || []).length > 0;
    case 'skills':
      return (p.skills || []).length > 0;
    case 'languages':
      return (p.languagesSpoken || []).length > 0;
    case 'targetUniversities':
      return (p.targetUniversityIds || []).length > 0;
    default:
      return false;
  }
}

/**
 * The form starts from what the applicant really told the system: facts nobody has given yet are shown empty
 * instead of the demo persona's values (a fresh account starts from a persona).
 */
function draftFrom(profile: ApplicantProfile, sources: Completeness['sources']): ApplicantProfile {
  const d = { ...profile } as ApplicantProfile & Record<string, unknown>;
  const unknown = (f: ProfileFact) => !sources[f];
  if (unknown('location')) Object.assign(d, { country: '', city: '' });
  if (unknown('grade')) d.grade = undefined as never;
  if (unknown('schoolType')) d.schoolType = undefined as never;
  if (unknown('schoolName')) d.schoolName = '';
  if (unknown('gpa')) d.gpa = 0;
  if (unknown('profileSubjects')) d.profileSubjects = [];
  if (unknown('english')) Object.assign(d, { englishLevel: undefined, hasIelts: false, ieltsScore: undefined });
  if (unknown('exams')) Object.assign(d, { hasSat: false, satScore: undefined, hasUnt: false, untScore: undefined });
  if (unknown('otherExams')) d.otherExams = [];
  if (unknown('olympiadLevel')) d.olympiadLevel = undefined as never;
  if (unknown('majors')) d.targetMajors = [];
  if (unknown('careerGoal')) d.careerGoal = '';
  if (unknown('regions')) d.targetRegions = [];
  if (unknown('targetYear')) d.targetYear = undefined as never;
  if (unknown('budget')) d.budgetTier = undefined as never;
  if (unknown('interests')) d.interests = [];
  if (unknown('skills')) d.skills = [];
  if (unknown('languages')) d.languagesSpoken = [];
  if (unknown('targetUniversities') || sources.targetUniversities === 'auto') d.targetUniversityIds = [];
  return d;
}

interface AdmissionTestProps {
  currentUser: UserAccount | null;
  profile: ApplicantProfile;
  completeness: Completeness;
  diagnostic: DiagnosticResult;
  portfolio: PortfolioItem[];
  initialPhase?: 'test' | 'result';
  onComplete: (profile: ApplicantProfile) => void;
  onPortfolioChange: (items: PortfolioItem[]) => void;
  /** Leave the test from its first step */
  onExit: () => void;
  onHome: () => void;
  onRegister?: () => void;
  onNavigate?: (target: NavTarget) => void;
}

export const AdmissionTest: React.FC<AdmissionTestProps> = ({
  currentUser,
  profile,
  completeness,
  diagnostic,
  portfolio,
  initialPhase = 'test',
  onComplete,
  onPortfolioChange,
  onExit,
  onHome,
  onRegister,
  onNavigate,
}) => {
  const { t } = useI18n();
  const [phase, setPhase] = useState<'test' | 'analyzing' | 'result'>(initialPhase === 'result' && profile.assessmentLevel ? 'result' : 'test');
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<ApplicantProfile>(() => draftFrom(profile, completeness.sources));
  const [tried, setTried] = useState(false);

  const step = STEPS[index];
  const last = index === STEPS.length - 1;
  const missing = step.required.filter((f) => !answered(f, draft));
  const set = (patch: Patch) => setDraft((d) => ({ ...d, ...patch }));

  const restart = () => {
    setDraft(draftFrom(profile, completeness.sources));
    setIndex(0);
    setTried(false);
    setPhase('test');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const finish = () => {
    // Only what was answered goes into the profile; empty optional fields keep the profile as it was.
    const patch: Partial<ApplicantProfile> = {};
    const answeredFacts = TEST_FACTS.filter((f) => answered(f, draft));
    for (const fact of answeredFacts) for (const key of FACT_KEYS[fact] || []) (patch as Record<string, unknown>)[key] = draft[key];
    let next = withAnswers(profile, patch, 'detailed');
    if (!profile.assessmentLevel) {
      for (const [key, value] of Object.entries(PERSONA_ONLY)) if (!(key in patch)) (next as unknown as Record<string, unknown>)[key] = value;
    }
    const sources = { ...(next.fieldSources || {}) };
    if (!answeredFacts.includes('targetUniversities')) {
      // No universities named: the system suggests a Safety / Target / Dream trio (never over an own list).
      const ownList = sources.targetUniversities && sources.targetUniversities !== 'auto';
      if (!ownList) {
        const picks = pickTargetUniversities(next, UNIVERSITY_DATABASE, { limit: 3 }).map((u) => u.id);
        if (picks.length >= 2) {
          next = { ...next, targetUniversityIds: picks };
          sources.targetUniversities = 'auto';
        }
      }
    }
    const now = new Date().toISOString();
    onComplete({ ...next, fieldSources: sources, assessmentLevel: 'detailed', assessmentUpdatedAt: now, detailedTestAt: now });
    setPhase('analyzing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    window.setTimeout(() => setPhase('result'), 2400);
  };

  const goNext = () => {
    if (missing.length) {
      setTried(true);
      return;
    }
    setTried(false);
    if (last) finish();
    else {
      setIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (phase === 'analyzing') return <TestAnalyzing />;
  if (phase === 'result') {
    return <TestResult currentUser={currentUser} profile={profile} diagnostic={diagnostic} onRetake={restart} onHome={onHome} onRegister={onRegister} onNavigate={onNavigate} />;
  }

  const Icon = step.icon;
  const optionalStep = step.required.length === 0;

  return (
    <div className="max-w-5xl mx-auto sm:py-2">
      {/* Header: what this is and where we are */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="ar-kicker inline-flex items-center gap-1.5">
            <ClipboardList className="w-4 h-4" /> {t('test.kicker')}
          </p>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">{t('test.tagline')}</p>
        </div>
        <span className="text-[13px] font-medium text-slate-500 dark:text-zinc-400 tabular-nums shrink-0">{t('wiz.step', { n: index + 1, total: STEPS.length })}</span>
      </div>

      <ol className="flex gap-1.5 mt-4 lg:hidden" aria-hidden>
        {STEPS.map((s, i) => (
          <li key={s.id} className={`flex-1 h-1.5 rounded-full transition-colors duration-500 ${i <= index ? 'bg-blue-600 dark:bg-blue-500' : 'bg-slate-200 dark:bg-zinc-800'}`} />
        ))}
      </ol>

      <div className="mt-5 lg:mt-6 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 lg:gap-8 items-start">
        {/* Desktop stepper: finished steps can be reopened */}
        <nav className="hidden lg:block sticky top-24" aria-label={t('test.kicker')}>
          <ol className="relative space-y-1">
            <span className="absolute left-[15px] top-4 bottom-4 w-px bg-[var(--line)]" aria-hidden />
            {STEPS.map((s, i) => {
              const done = i < index;
              const current = i === index;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    disabled={i > index}
                    onClick={() => setIndex(i)}
                    aria-current={current ? 'step' : undefined}
                    className={`relative w-full flex items-center gap-3 rounded-lg px-0 py-1.5 text-left text-sm transition-colors ${
                      current ? 'text-slate-950 dark:text-white font-semibold' : done ? 'text-slate-600 hover:text-slate-950 dark:text-zinc-300 dark:hover:text-white' : 'text-slate-400 dark:text-zinc-500 cursor-default'
                    }`}
                  >
                    <span
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ring-4 ring-[var(--bg)] transition-colors ${
                        done ? 'bg-emerald-500 text-white' : current ? 'bg-blue-600 text-white' : 'bg-[var(--surface-raised)] border border-[var(--line-strong)] text-slate-400 dark:text-zinc-500'
                      }`}
                    >
                      {done ? <Check className="w-4 h-4" /> : i + 1}
                    </span>
                    <span className="truncate">{t(`test.step.${s.id}`)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="min-w-0 space-y-4">
          <section key={step.id} className="ar-card p-5 sm:p-7 space-y-6 animate-fadeInUp">
            <div className="flex items-start gap-3.5">
              <span className="ar-icon-tile !w-11 !h-11 !rounded-xl">
                <Icon className="w-5 h-5" />
              </span>
              <div className="min-w-0 pt-0.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-950 dark:text-white leading-tight">{t(`test.step.${step.id}`)}</h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">{t(`test.step.${step.id}.hint`)}</p>
              </div>
            </div>

            <div className="h-px bg-[var(--line)]" aria-hidden />

            {step.id === 'universities' ? (
              <UniversityPicker draft={draft} set={set} />
            ) : (
              step.facts.map((fact) => (
                <div key={fact} className={`transition-shadow ${tried && missing.includes(fact) ? 'rounded-xl ring-2 ring-rose-400/70 ring-offset-4 ring-offset-[var(--surface-raised)]' : ''}`}>
                  <FactEditor fact={fact} value={draft} set={set} />
                </div>
              ))
            )}

            {currentUser &&
              step.lists?.map((block) => (
                <div key={block} className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                    {t(`fact.${block}`)} <span className="text-xs font-normal text-slate-400 dark:text-zinc-500">{t('pf.optional')}</span>
                  </p>
                  <PortfolioList block={block} items={portfolio} onChanged={onPortfolioChange} />
                </div>
              ))}

            {tried && missing.length > 0 && (
              <div className="ar-notice ar-notice-error animate-fadeIn" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{t('test.fillRequired', { list: missing.map((f) => t(`fact.${f}`)).join(', ') })}</span>
              </div>
            )}
          </section>

          <div className="ar-sticky-actions sticky bottom-0 z-20 -mx-4 px-4 py-3 border-t border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur-md sm:mx-0 sm:px-0 sm:border-0 sm:bg-transparent sm:backdrop-blur-none sm:static flex items-center justify-between gap-3">
            <button type="button" onClick={index === 0 ? onExit : () => setIndex((i) => i - 1)} className="ar-btn ar-btn-secondary">
              <ArrowLeft className="w-4 h-4" /> <span className="hidden min-[400px]:inline">{t(index === 0 ? 'test.exit' : 'common.back')}</span>
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {optionalStep && !last && (
                <button type="button" onClick={() => setIndex((i) => i + 1)} className="ar-btn ar-btn-quiet">
                  {t('wiz.skip')}
                </button>
              )}
              <button type="button" onClick={goNext} className="ar-btn ar-btn-primary !px-5 sm:!px-6 group">
                {last ? (
                  <>
                    {t('test.finish')} <Check className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    {t('wiz.next')} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Dream universities: the chosen regions and majors first, a name search over the whole base. */
const UniversityPicker: React.FC<{ draft: ApplicantProfile; set: (patch: Patch) => void }> = ({ draft, set }) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const selected = draft.targetUniversityIds || [];
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return UNIVERSITY_DATABASE.filter((u) => `${u.name} ${u.shortName} ${u.nativeName} ${u.city} ${u.country}`.toLowerCase().includes(q)).slice(0, 8);
    const track = draft.targetTrack && draft.targetTrack !== 'all' ? draft.targetTrack : 'university';
    return UNIVERSITY_DATABASE.filter((u) => (u.category || 'university') === track && (!draft.targetRegions?.length || draft.targetRegions.includes(u.region)))
      .map((u) => ({ u, fit: (u.supportedMajors || []).filter((m) => (draft.targetMajors || []).includes(m)).length }))
      .sort((a, b) => b.fit - a.fit || parseFloat(a.u.acceptanceRate) - parseFloat(b.u.acceptanceRate))
      .slice(0, 8)
      .map((x) => x.u);
  }, [query, draft.targetRegions, draft.targetMajors, draft.targetTrack]);

  const toggle = (id: string) => {
    const on = selected.includes(id);
    const plans = { ...(draft.universityPlans || {}) };
    if (on) delete plans[id];
    else plans[id] = { ...(plans[id] || {}), year: plans[id]?.year || draft.targetYear };
    set({ targetUniversityIds: on ? selected.filter((x) => x !== id) : [...selected, id], universityPlans: plans });
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('quick.universities.search')} className="ar-input !pl-10" />
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((id) => {
            const u = UNIVERSITY_DATABASE.find((x) => x.id === id);
            return u ? (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className="inline-flex items-center gap-1.5 h-8 pl-1 pr-2 rounded-full bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100 dark:bg-blue-500/12 dark:text-blue-100 dark:border-blue-500/30 dark:hover:bg-blue-500/20 text-xs font-semibold transition-colors animate-fadeIn"
              >
                <UniversityCrest uni={u} size={24} rounded="rounded-full" /> {u.shortName} <X className="w-3.5 h-3.5 opacity-60" />
              </button>
            ) : null;
          })}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {options.map((u) => {
          const on = selected.includes(u.id);
          return (
            <button
              key={u.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(u.id)}
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-[border-color,background-color,box-shadow] duration-150 ${
                on
                  ? 'border-blue-500 bg-blue-50/70 shadow-[inset_0_0_0_1px_var(--color-blue-500)] dark:border-blue-400 dark:bg-blue-500/10 dark:shadow-[inset_0_0_0_1px_var(--color-blue-400)]'
                  : 'border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-subtle)]'
              }`}
            >
              <UniversityCrest uni={u} size={36} rounded="rounded-lg" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-slate-900 dark:text-white truncate">{u.shortName}</span>
                <span className="block text-xs text-slate-500 dark:text-zinc-400 truncate">
                  {u.flag} {u.city}, {u.country}
                </span>
              </span>
              <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${on ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 dark:border-zinc-600 text-transparent'}`}>
                <Check className="w-3 h-3" />
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-slate-500 dark:text-zinc-400">{t('test.universities.note')}</p>
    </div>
  );
};
