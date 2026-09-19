// The single applicant profile: what the system already knows, where each fact came from, what is still
// missing, and the views every analysis is computed from (profile + portfolio + documents), so nothing the
// applicant said once has to be said again.
import type {
  ApplicantProfile,
  DocumentKind,
  FactSource,
  NavTarget,
  PortfolioItem,
  PortfolioItemType,
  ProfileBlockId,
  ProfileFact,
  University,
  UploadedDocument,
} from '../types';
import { estimateChance, normalizeGpa, parseAcceptanceRate } from '../../shared/logic/chance.js';

/** Which profile field belongs to which fact — editors use it to record who stated what. */
export const FIELD_TO_FACT: Partial<Record<keyof ApplicantProfile, ProfileFact>> = {
  name: 'name',
  firstName: 'name',
  lastName: 'name',
  birthDate: 'birthDate',
  age: 'age',
  country: 'location',
  city: 'location',
  grade: 'grade',
  targetTrack: 'targetTrack',
  schoolType: 'schoolType',
  schoolName: 'schoolName',
  gpa: 'gpa',
  gpaScale: 'gpa',
  profileSubjects: 'profileSubjects',
  englishLevel: 'english',
  hasIelts: 'english',
  ieltsScore: 'english',
  hasSat: 'exams',
  satScore: 'exams',
  hasUnt: 'exams',
  untScore: 'exams',
  otherExams: 'otherExams',
  olympiadLevel: 'olympiadLevel',
  olympiadDetails: 'olympiadDetails',
  leadershipActivities: 'leadership',
  extracurriculars: 'extracurriculars',
  interests: 'interests',
  skills: 'skills',
  targetMajors: 'majors',
  targetRegions: 'regions',
  budgetTier: 'budget',
  targetUniversityIds: 'targetUniversities',
  universityPlans: 'targetUniversities',
  targetYear: 'targetYear',
  careerGoal: 'careerGoal',
  careerPlans: 'careerPlans',
  languagesSpoken: 'languages',
  allergies: 'preferences',
  healthNotes: 'preferences',
  dietaryNeeds: 'preferences',
  climatePreference: 'preferences',
  cityPreference: 'preferences',
  personalNotes: 'preferences',
  advisorTone: 'preferences',
};

/** Applies an edit and records that these facts now come from `source`. */
export function withAnswers(profile: ApplicantProfile, patch: Partial<ApplicantProfile>, source: FactSource): ApplicantProfile {
  const fieldSources = { ...(profile.fieldSources || {}) };
  for (const key of Object.keys(patch) as (keyof ApplicantProfile)[]) {
    const fact = FIELD_TO_FACT[key];
    if (fact) fieldSources[fact] = source;
  }
  const next = { ...profile, ...patch, fieldSources };
  if ('firstName' in patch || 'lastName' in patch) next.name = `${next.firstName || ''} ${next.lastName || ''}`.trim() || next.name;
  if (patch.birthDate) {
    const age = ageFrom(patch.birthDate);
    if (age) next.age = age;
  }
  return next;
}

export function ageFrom(birthDate: string): number | null {
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) age -= 1;
  return age > 5 && age < 80 ? age : null;
}

// ---------------------------------------------------------------------------
// Portfolio entries are the itemised part of the profile.

export const BLOCK_ITEM_TYPES: Record<'achievements' | 'projects' | 'experience', PortfolioItemType[]> = {
  achievements: ['olympiad', 'competition', 'course', 'publication', 'sport', 'art'],
  projects: ['project', 'research'],
  experience: ['leadership', 'volunteering', 'internship', 'other'],
};
const itemsOf = (portfolio: PortfolioItem[], block: keyof typeof BLOCK_ITEM_TYPES) =>
  portfolio.filter((it) => !it.excluded && BLOCK_ITEM_TYPES[block].includes(it.type));

/** Everything besides the profile itself that tells the system about the applicant. */
export interface ProfileContext {
  /** Facts the registration form really asked (a Google sign-in only gives the name). */
  accountFacts: ProfileFact[];
  portfolio: PortfolioItem[];
  documents: UploadedDocument[];
}

export const QUICK_FACTS: ProfileFact[] = ['majors', 'regions', 'gpa', 'english', 'exams', 'olympiadLevel', 'budget'];
/** Needed for any analysis — asked first. */
export const REQUIRED_FACTS: ProfileFact[] = ['name', 'grade', 'gpa', 'english', 'exams', 'majors', 'regions', 'budget'];
/** Make the analysis precise; counted in completeness but can be added later. */
export const IMPORTANT_FACTS: ProfileFact[] = [
  'age',
  'location',
  'schoolType',
  'profileSubjects',
  'olympiadLevel',
  'achievements',
  'projects',
  'experience',
  'interests',
  'targetUniversities',
  'targetYear',
  'careerGoal',
  'documents',
];
export const CORE_FACTS: ProfileFact[] = [...REQUIRED_FACTS, ...IMPORTANT_FACTS];

export const BLOCK_FACTS: Record<ProfileBlockId, ProfileFact[]> = {
  personal: ['name', 'birthDate', 'age', 'location'],
  education: ['grade', 'schoolType', 'schoolName', 'gpa', 'profileSubjects'],
  admission: ['regions', 'majors', 'targetUniversities', 'targetYear', 'targetTrack', 'budget'],
  skills: ['english', 'interests', 'skills', 'languages'],
  exams: ['exams', 'otherExams'],
  achievements: ['olympiadLevel', 'achievements'],
  projects: ['projects'],
  experience: ['experience', 'extracurriculars'],
  goals: ['careerGoal', 'careerPlans'],
  documents: ['documents'],
  extra: ['preferences'],
};
export const BLOCK_ORDER = Object.keys(BLOCK_FACTS) as ProfileBlockId[];
export const blockOf = (fact: ProfileFact): ProfileBlockId => BLOCK_ORDER.find((b) => BLOCK_FACTS[b].includes(fact)) || 'extra';

function hasValue(p: ApplicantProfile, fact: ProfileFact): boolean {
  switch (fact) {
    case 'birthDate':
      return Boolean(p.birthDate);
    case 'location':
      return Boolean(p.country?.trim() || p.city?.trim());
    case 'schoolName':
      return Boolean(p.schoolName?.trim());
    case 'profileSubjects':
      return (p.profileSubjects || []).length > 0;
    case 'otherExams':
      return (p.otherExams || []).length > 0;
    case 'olympiadDetails':
      return Boolean(p.olympiadDetails?.trim());
    case 'leadership':
      return (p.leadershipActivities || []).length > 0;
    case 'extracurriculars':
      return (p.extracurriculars || []).length > 0;
    case 'interests':
      return (p.interests || []).length > 0;
    case 'skills':
      return (p.skills || []).length > 0;
    case 'careerGoal':
      return Boolean(p.careerGoal?.trim());
    case 'careerPlans':
      return Boolean(p.careerPlans?.trim());
    case 'languages':
      return (p.languagesSpoken || []).length > 0;
    case 'preferences':
      return Boolean(
        p.allergies?.trim() ||
          p.healthNotes?.trim() ||
          p.dietaryNeeds?.trim() ||
          p.personalNotes?.trim() ||
          (p.climatePreference && p.climatePreference !== 'any') ||
          (p.cityPreference && p.cityPreference !== 'any'),
      );
    default:
      return false;
  }
}

/**
 * Where a fact came from, or null while the system does not know it yet. A fresh account starts from a
 * demo persona, so before the first answer only what the registration form asked counts as known.
 */
export function factSource(profile: ApplicantProfile, fact: ProfileFact, ctx: ProfileContext): FactSource | null {
  const recorded = profile.fieldSources?.[fact];
  if (recorded) return recorded;
  if (ctx.accountFacts.includes(fact)) return 'registration';
  if (fact === 'achievements') return itemsOf(ctx.portfolio, 'achievements').length ? 'portfolio' : null;
  if (fact === 'projects') return itemsOf(ctx.portfolio, 'projects').length ? 'portfolio' : null;
  if (fact === 'experience') return itemsOf(ctx.portfolio, 'experience').length || (profile.leadershipActivities || []).length ? 'portfolio' : null;
  if (fact === 'documents') return ctx.documents.length ? 'profile' : null;
  if (fact === 'age' && profile.birthDate) return 'profile';
  if (!profile.assessmentLevel) return null;
  if (QUICK_FACTS.includes(fact)) {
    return profile.assessmentLevel === 'detailed' && (fact === 'gpa' || fact === 'english' || fact === 'exams') ? 'detailed' : 'quick';
  }
  if (fact === 'targetUniversities') return (profile.targetUniversityIds || []).length ? 'auto' : null;
  // Profiles saved before answers were tracked: the old detailed form always asked these two.
  if (!profile.fieldSources && profile.assessmentLevel === 'detailed' && (fact === 'schoolType' || fact === 'targetYear')) return 'detailed';
  // Free-text facts were cleared at the first assessment, so anything there now was typed by the applicant.
  return hasValue(profile, fact) ? 'profile' : null;
}

/** Ranges from the start test: known, but worth an exact number. */
export const isApprox = (fact: ProfileFact, source: FactSource | null | undefined) => source === 'quick' && (fact === 'gpa' || fact === 'english' || fact === 'exams');

export type BlockStatus = 'done' | 'partial' | 'empty' | 'optional';

export interface Completeness {
  percent: number;
  known: ProfileFact[];
  /** Required and important facts nobody has given yet, in reading order */
  missing: ProfileFact[];
  sources: Partial<Record<ProfileFact, FactSource>>;
  blocks: Record<ProfileBlockId, BlockStatus>;
}

export function profileCompleteness(profile: ApplicantProfile, ctx: ProfileContext): Completeness {
  const sources: Partial<Record<ProfileFact, FactSource>> = {};
  for (const block of BLOCK_ORDER) {
    for (const fact of BLOCK_FACTS[block]) {
      const src = factSource(profile, fact, ctx);
      if (src) sources[fact] = src;
    }
  }
  const known = CORE_FACTS.filter((f) => sources[f]);
  const missing = BLOCK_ORDER.flatMap((b) => BLOCK_FACTS[b]).filter((f) => CORE_FACTS.includes(f) && !sources[f]);
  const blocks = {} as Record<ProfileBlockId, BlockStatus>;
  for (const block of BLOCK_ORDER) {
    const counted = BLOCK_FACTS[block].filter((f) => CORE_FACTS.includes(f));
    if (!counted.length) blocks[block] = BLOCK_FACTS[block].some((f) => sources[f]) ? 'done' : 'optional';
    else {
      const have = counted.filter((f) => sources[f]).length;
      blocks[block] = have === counted.length ? 'done' : have ? 'partial' : 'empty';
    }
  }
  return { percent: Math.round((known.length / CORE_FACTS.length) * 100), known, missing, sources, blocks };
}

/** What the detailed test still has to learn: unknown facts and ranges that deserve an exact number. */
export const DETAILED_FACTS: ProfileFact[] = [
  'schoolType',
  'gpa',
  'profileSubjects',
  'english',
  'exams',
  'olympiadLevel',
  'achievements',
  'projects',
  'experience',
  'interests',
  'targetYear',
  'careerGoal',
];

export function detailedGaps(c: Completeness): ProfileFact[] {
  return DETAILED_FACTS.filter((f) => !c.sources[f] || c.sources[f] === 'auto' || isApprox(f, c.sources[f]));
}

// ---------------------------------------------------------------------------
// Portfolio → profile: achievements recorded once count in every analysis.

const LEVEL_RANK: Record<ApplicantProfile['olympiadLevel'], number> = { none: 0, school: 1, city: 2, republican: 3, international: 4 };
const PORTFOLIO_LEVEL_TO_PROFILE: Record<string, ApplicantProfile['olympiadLevel']> = {
  school: 'school',
  city: 'city',
  regional: 'city',
  republican: 'republican',
  international: 'international',
};
/** Portfolio entry types → the activity chips of the profile. */
const TYPE_TO_EXTRA: Partial<Record<string, string>> = {
  olympiad: 'olympiad',
  competition: 'hackathon',
  research: 'research',
  volunteering: 'volunteer',
  project: 'startup',
  internship: 'internship',
  sport: 'sport',
  publication: 'media',
  art: 'media',
};

const unionText = (a: string[], b: string[]) => {
  const seen = new Set(a.map((x) => x.trim().toLowerCase()));
  return [...a, ...b.filter((x) => !seen.has(x.trim().toLowerCase()) && seen.add(x.trim().toLowerCase()))];
};

/** Profile as the analyses should see it: the applicant's answers plus what the portfolio proves. */
export function mergePortfolio(profile: ApplicantProfile, items: PortfolioItem[]): ApplicantProfile {
  const active = items.filter((it) => !it.excluded);
  if (!active.length) return profile;
  let level = profile.olympiadLevel || 'none';
  for (const it of active) {
    if ((it.type === 'olympiad' || it.type === 'competition') && it.level) {
      const mapped = PORTFOLIO_LEVEL_TO_PROFILE[it.level];
      if (mapped && LEVEL_RANK[mapped] > LEVEL_RANK[level]) level = mapped;
    }
  }
  const leaders = active.filter((it) => it.type === 'leadership').map((it) => (it.role ? `${it.role} — ${it.title}` : it.title));
  const extras = active.map((it) => TYPE_TO_EXTRA[it.type]).filter((x): x is string => Boolean(x));
  return {
    ...profile,
    olympiadLevel: level,
    leadershipActivities: unionText(profile.leadershipActivities || [], leaders),
    extracurriculars: Array.from(new Set([...(profile.extracurriculars || []), ...extras])),
  };
}

// ---------------------------------------------------------------------------
// One university against the profile: published requirements met / to improve / unknown, and a rough
// grant range. Everything here is UniRoute's own estimate, never the university's.

export interface Check {
  key: string;
  vars?: Record<string, string | number>;
}

export interface UniversityAnalysis {
  /** Admission chance from the shared model, % */
  admission: number;
  tier: 'Dream' | 'Target' | 'Safety';
  /** Share of checkable requirements already met; null when nothing can be checked yet */
  matchPercent: number | null;
  met: Check[];
  improve: Check[];
  missing: Check[];
  missingDocs: DocumentKind[];
  grant: { available: boolean; range: [number, number] | null; reasonKey: string; reasonVars?: Record<string, string | number> };
}

export interface AnalysisContext {
  sources: Partial<Record<ProfileFact, FactSource>>;
  documents: UploadedDocument[];
  portfolioCount: number;
}

const clampPct = (v: number) => Math.max(1, Math.min(95, Math.round(v)));

export function analyzeUniversity(profile: ApplicantProfile, uni: University, ctx: AnalysisContext): UniversityAnalysis {
  const met: Check[] = [];
  const improve: Check[] = [];
  const missing: Check[] = [];
  const src = ctx.sources;
  const approxMark = (fact: ProfileFact) => (isApprox(fact, src[fact]) ? '≈' : '');
  const other = (name: RegExp) => (profile.otherExams || []).find((e) => name.test(e.name));

  // Grades
  if (!src.gpa) missing.push({ key: 'req.gpa.unknown', vars: { min: uni.minGpa } });
  else {
    const gpa4 = normalizeGpa(profile.gpa, profile.gpaScale);
    const vars = { value: `${approxMark('gpa')}${gpa4.toFixed(2)}`, min: uni.minGpa };
    (gpa4 >= uni.minGpa ? met : improve).push({ key: gpa4 >= uni.minGpa ? 'req.gpa.met' : 'req.gpa.improve', vars });
  }

  // English — local schools and colleges select by their own tests
  const localSchool = uni.region === 'kazakhstan' && (uni.category === 'school' || uni.category === 'college');
  if (!localSchool && uni.minIelts) {
    if (!src.english) missing.push({ key: 'req.ielts.unknown', vars: { min: uni.minIelts } });
    else if (profile.hasIelts && profile.ieltsScore) {
      const vars = { value: `${approxMark('english')}${profile.ieltsScore}`, min: uni.minIelts };
      (profile.ieltsScore >= uni.minIelts ? met : improve).push({ key: profile.ieltsScore >= uni.minIelts ? 'req.ielts.met' : 'req.ielts.improve', vars });
    } else if (other(/toefl/i)) missing.push({ key: 'req.ielts.toefl', vars: { min: uni.minIelts, score: other(/toefl/i)!.score } });
    else improve.push({ key: 'req.ielts.none', vars: { min: uni.minIelts } });
  }

  // SAT where the university uses it
  const policy = uni.admissions?.testPolicy || (uni.minSat ? 'required' : uni.minUnt ? 'unt' : 'optional');
  if (uni.minSat && policy !== 'blind') {
    if (!src.exams) missing.push({ key: 'req.sat.unknown', vars: { min: uni.minSat } });
    else if (profile.hasSat && profile.satScore) {
      const vars = { value: `${approxMark('exams')}${profile.satScore}`, min: uni.minSat };
      (profile.satScore >= uni.minSat ? met : improve).push({ key: profile.satScore >= uni.minSat ? 'req.sat.met' : 'req.sat.improve', vars });
    } else if (other(/\bact\b/i)) missing.push({ key: 'req.sat.act', vars: { min: uni.minSat, score: other(/\bact\b/i)!.score } });
    else if (policy === 'required') improve.push({ key: 'req.sat.none', vars: { min: uni.minSat } });
  }

  // UNT for Kazakhstan grants
  if (uni.minUnt) {
    if (!src.exams) missing.push({ key: 'req.unt.unknown', vars: { min: uni.minUnt } });
    else if (profile.hasUnt && profile.untScore) {
      const vars = { value: `${approxMark('exams')}${profile.untScore}`, min: uni.minUnt };
      (profile.untScore >= uni.minUnt ? met : improve).push({ key: profile.untScore >= uni.minUnt ? 'req.unt.met' : 'req.unt.improve', vars });
    } else improve.push({ key: 'req.unt.none', vars: { min: uni.minUnt } });
  }

  // Programme fit
  if (!src.majors) missing.push({ key: 'req.major.unknown' });
  else if ((uni.supportedMajors || []).some((m) => (profile.targetMajors || []).includes(m))) met.push({ key: 'req.major.met' });
  else improve.push({ key: 'req.major.improve' });

  // Selective universities read achievements closely
  if (parseAcceptanceRate(uni.acceptanceRate) <= 20) {
    const strong = profile.olympiadLevel === 'republican' || profile.olympiadLevel === 'international' || ctx.portfolioCount >= 3;
    (strong ? met : improve).push({ key: strong ? 'req.achievements.met' : 'req.achievements.improve' });
  }

  // Documents the university asks for that are not uploaded yet
  const uploaded = new Set(ctx.documents.map((d) => d.kind));
  const missingDocs = (uni.requiredDocuments || []).filter((k) => !uploaded.has(k as DocumentKind)) as DocumentKind[];
  if ((uni.requiredDocuments || []).length) {
    if (missingDocs.length) missing.push({ key: 'req.docs.missing', vars: { n: missingDocs.length } });
    else met.push({ key: 'req.docs.met' });
  }

  const checked = met.length + improve.length;
  const chance = estimateChance(profile, uni);
  return {
    admission: chance.probability,
    tier: chance.tier,
    matchPercent: checked ? Math.round((met.length / checked) * 100) : null,
    met,
    improve,
    missing,
    missingDocs,
    grant: grantRange(profile, uni, chance.probability, src),
  };
}

/**
 * Rough grant range. Only computed when the grades, English and exams are known; the width shows how
 * precise the inputs are (ranges from the start test → ±10, exact numbers → ±5). The per-type factors are
 * a heuristic: merit and bilateral awards are more selective than admission, need-blind aid follows it.
 */
function grantRange(profile: ApplicantProfile, uni: University, admission: number, src: AnalysisContext['sources']): UniversityAnalysis['grant'] {
  if (!uni.hasFullGrantOrScholarship) return { available: false, range: null, reasonKey: 'grant.reason.none' };
  if (!src.gpa || !src.english || !src.exams) return { available: true, range: null, reasonKey: 'grant.reason.needData' };

  let point: number;
  let reasonKey = `grant.reason.${uni.financialAidType}`;
  let reasonVars: Record<string, string | number> | undefined;
  if (uni.financialAidType === 'state_grant' && uni.minUnt) {
    if (!profile.hasUnt || !profile.untScore) return { available: true, range: null, reasonKey: 'grant.reason.needUnt', reasonVars: { n: uni.minUnt } };
    const gap = profile.untScore - uni.minUnt;
    point = gap >= 20 ? 80 : gap >= 10 ? 65 : gap >= 0 ? 50 : 20;
    reasonKey = gap >= 0 ? 'grant.reason.untAbove' : 'grant.reason.untBelow';
    reasonVars = { score: profile.untScore, n: uni.minUnt };
  } else {
    const factor: Record<string, number> = { need_blind: 1, need_based: 0.75, state_grant: 0.8, bilateral: 0.6, merit: 0.55 };
    point = admission * (factor[uni.financialAidType] ?? 0.6);
  }
  const approx = isApprox('gpa', src.gpa) || isApprox('english', src.english) || isApprox('exams', src.exams);
  const width = approx ? 10 : 5;
  return { available: true, range: [clampPct(point - width), clampPct(point + width)], reasonKey, reasonVars };
}

// ---------------------------------------------------------------------------
// The one next thing to do — the home screen shows exactly this.

export interface NextStep {
  key: string;
  vars?: Record<string, string | number>;
  target: NavTarget;
}

export function nextStep(profile: ApplicantProfile, completeness: Completeness, docsPercent: number | null): NextStep {
  if (!profile.assessmentLevel) return { key: 'next.test', target: { section: 'profile', flow: 'test' } };
  // Profiles from the old one-minute express test hold ranges: the full test makes them exact.
  if (profile.assessmentLevel === 'quick') return { key: 'next.retest', target: { section: 'profile', flow: 'test' } };
  const missing = completeness.missing.filter((f) => f !== 'documents' && f !== 'targetUniversities');
  if (missing.length) return { key: 'next.profile', vars: { n: missing.length }, target: { section: 'profile', flow: 'fill' } };
  if (!(profile.targetUniversityIds || []).length) return { key: 'next.universities', target: { section: 'analysis', sub: 'add' } };
  if (docsPercent !== null && docsPercent < 100) return { key: 'next.documents', vars: { n: docsPercent }, target: { section: 'documents' } };
  return { key: 'next.analysis', target: { section: 'analysis' } };
}
