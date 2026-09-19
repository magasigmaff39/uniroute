// «Дедлайны»: every admission date that matters to the applicant, built from the universities on their list,
// their favourite olympiads and the dates they added themselves. Official dates come straight from the
// knowledge base; recommended ones are computed from them and are labelled as such in the UI.
import type { ApplicantProfile, DeadlineItem, DeadlineKind, DeadlineStatus, PlannerState, TaskCategory, University } from '../types';
import { parseRuDeadlineIso, parseRuDayMonth, daysLeft, nextRegistrationDeadline } from '../../shared/logic/dates.js';
import { OLYMPIAD_BY_ID } from '../../shared/data/olympiads.js';

/** Days before the application a recommended step should be finished. */
const DOCS_LEAD_DAYS = 14;
const EXAM_LEAD_DAYS = 30;

export const URGENT_DAYS = 14;
export const SOON_DAYS = 45;

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** What the knowledge base says besides the date: "(ED)", "(загрузка IELTS/SAT)", "; NAWA Banach — 31 марта". */
function noteOf(text?: string) {
  if (!text) return undefined;
  const rest = text.replace(/^\s*\d{1,2}(?:\s*[–-]\s*\d{1,2})?\s+[а-яё]+\s+\d{4}\s*/i, '').trim();
  const inner = /^\(([^()]*)\)$/.exec(rest);
  return (inner ? inner[1] : rest) || undefined;
}

export function statusOf(date: string | null, done: boolean, today = new Date()): DeadlineStatus {
  if (done) return 'done';
  const left = daysLeft(date, today);
  if (left === null) return 'no_date';
  if (left < 0) return 'passed';
  if (left <= URGENT_DAYS) return 'urgent';
  if (left <= SOON_DAYS) return 'soon';
  return 'upcoming';
}

export const TASK_CATEGORY_FOR_KIND: Record<DeadlineKind, TaskCategory> = {
  application: 'application',
  documents: 'documents',
  scholarship: 'documents',
  exam: 'other',
  olympiad: 'olympiad',
  other: 'other',
};

type Draft = Omit<DeadlineItem, 'daysLeft' | 'status' | 'manualDone'>;

export function buildDeadlines({ profile, universities, planner, today = new Date() }: { profile: ApplicantProfile; universities: University[]; planner: PlannerState; today?: Date }): DeadlineItem[] {
  const drafts: Draft[] = [];
  const push = (d: Draft) => drafts.push(d);

  for (const u of universities) {
    const regular = parseRuDeadlineIso(u.regularDeadline);
    const early = parseRuDeadlineIso(u.earlyDeadline);
    const year = (regular || early || '').slice(0, 4);
    const both = `${u.earlyDeadline || ''} ${u.regularDeadline}`;
    const base = { universityId: u.id, url: u.officialPortalUrl };

    // Application rounds
    if (u.earlyDeadline) push({ ...base, id: `${u.id}:app-early`, kind: 'application', source: 'official', titleKey: 'dl.t.appEarly', note: noteOf(u.earlyDeadline), date: early, taskCategory: 'application' });
    push({ ...base, id: `${u.id}:app`, kind: 'application', source: 'official', titleKey: 'dl.t.app', note: noteOf(u.regularDeadline), date: regular, taskCategory: 'application' });

    // Documents: an explicit "документы до …" in the knowledge base, otherwise two weeks before the application.
    const docsText = /документ\S*\s+до\s+([^;/)]+)/i.exec(both);
    const docsDate = docsText ? parseRuDayMonth(docsText[1], year) : null;
    if (docsDate) push({ ...base, id: `${u.id}:docs`, kind: 'documents', source: 'official', titleKey: 'dl.t.docs', date: docsDate, taskCategory: 'documents' });
    else if (regular) push({ ...base, id: `${u.id}:docs`, kind: 'documents', source: 'recommended', titleKey: 'dl.t.docsPrep', titleVars: { n: DOCS_LEAD_DAYS }, date: addDays(regular, -DOCS_LEAD_DAYS), taskCategory: 'documents' });

    // Scholarship / financial aid: a round marked as a scholarship or grant round, otherwise with the application.
    const aidRe = /стипенд|грант|scholar/i;
    const aidOfficial = u.earlyDeadline && aidRe.test(u.earlyDeadline) && early ? early : aidRe.test(u.regularDeadline) && regular ? regular : null;
    if (aidOfficial) push({ ...base, id: `${u.id}:aid`, kind: 'scholarship', source: 'official', titleKey: 'dl.t.aid', note: u.scholarshipName, date: aidOfficial, taskCategory: 'documents' });
    else if (regular) push({ ...base, id: `${u.id}:aid`, kind: 'scholarship', source: 'recommended', titleKey: 'dl.t.aidWithApp', note: u.scholarshipName, date: regular, taskCategory: 'documents' });

    // Language exam, if the university asks for one (local schools and colleges select by their own tests).
    const localSchool = u.region === 'kazakhstan' && (u.category === 'school' || u.category === 'college');
    const examUploadRe = /ielts|toefl|sat|сертификат/i;
    const examOfficial = u.earlyDeadline && examUploadRe.test(u.earlyDeadline) && early ? early : examUploadRe.test(u.regularDeadline) && regular ? regular : null;
    const examDate = (explicit: string | null) => explicit || (regular ? addDays(regular, -EXAM_LEAD_DAYS) : null);
    if (u.minIelts > 0 && !localSchool) {
      const satisfied = Boolean(profile.hasIelts && profile.ieltsScore && profile.ieltsScore >= u.minIelts);
      push({ ...base, id: `${u.id}:lang`, kind: 'exam', source: examOfficial ? 'official' : 'recommended', titleKey: 'dl.t.lang', titleVars: { min: u.minIelts }, date: examDate(examOfficial), satisfied, taskCategory: 'ielts' });
    }
    const policy = u.admissions?.testPolicy;
    if (u.minSat && policy !== 'blind' && policy !== 'optional') {
      const satisfied = Boolean(profile.hasSat && profile.satScore && profile.satScore >= u.minSat);
      push({ ...base, id: `${u.id}:sat`, kind: 'exam', source: examOfficial ? 'official' : 'recommended', titleKey: 'dl.t.sat', titleVars: { min: u.minSat }, date: examDate(examOfficial), satisfied, taskCategory: 'sat' });
    }
    if (u.minUnt) {
      const satisfied = Boolean(profile.hasUnt && profile.untScore && profile.untScore >= u.minUnt);
      push({ ...base, id: `${u.id}:unt`, kind: 'exam', source: 'recommended', titleKey: 'dl.t.unt', titleVars: { min: u.minUnt }, date: examDate(null), satisfied, taskCategory: 'unt' });
    }

    // Other important dates the university publishes without a fixed day.
    if (u.admissions?.interview) push({ ...base, id: `${u.id}:interview`, kind: 'other', source: 'official', titleKey: 'dl.t.interview', date: null, taskCategory: 'application' });
  }

  // Favourite olympiads: the end of the next registration window (the catalogue gives months, not days).
  for (const id of planner.favoriteOlympiadIds) {
    const o = OLYMPIAD_BY_ID.get(id);
    if (!o) continue;
    push({ id: `olymp:${id}`, kind: 'olympiad', source: 'approximate', titleKey: 'dl.t.olympiad', titleVars: { name: o.shortName }, note: o.timeline.registration, universityId: null, olympiadId: id, date: nextRegistrationDeadline(o.timeline.registration, today), taskCategory: 'olympiad', url: o.officialUrl });
  }

  // The applicant's own dates.
  for (const c of planner.customDeadlines) {
    push({ id: `custom:${c.id}`, kind: c.kind, source: 'custom', title: c.title, note: c.note || undefined, universityId: c.universityId, date: c.date, taskCategory: TASK_CATEGORY_FOR_KIND[c.kind] });
  }

  return drafts.map((d) => {
    const manualDone = Boolean(planner.deadlineDone[d.id]);
    return { ...d, manualDone, daysLeft: daysLeft(d.date, today), status: statusOf(d.date, manualDone || Boolean(d.satisfied), today) };
  });
}

export type DeadlineSort = 'nearest' | 'date' | 'university';

const STATUS_ORDER: Record<DeadlineStatus, number> = { urgent: 0, soon: 0, upcoming: 0, no_date: 1, passed: 2, done: 3 };

/** «Ближайшие»: open dates soonest first, then dates without a day, then passed (latest first), then done. */
export function sortDeadlines(items: DeadlineItem[], sort: DeadlineSort, uniName: (id: string | null) => string = () => ''): DeadlineItem[] {
  const byDate = (a: DeadlineItem, b: DeadlineItem) => (a.date && b.date ? (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) : a.date ? -1 : b.date ? 1 : 0);
  return [...items].sort((a, b) => {
    if (sort === 'date') return byDate(a, b);
    if (sort === 'university') return uniName(a.universityId).localeCompare(uniName(b.universityId)) || byDate(a, b);
    const group = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (group) return group;
    return a.status === 'passed' ? -byDate(a, b) : byDate(a, b);
  });
}
