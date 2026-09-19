// Portfolio against the published criteria of a university: what is already covered, what may be missing,
// which entries matter most for the chosen field and what is worth developing. Deterministic, so the UI can
// show it instantly and the AI feedback is grounded in the same facts. It reads published requirements
// only — it never predicts an admission decision.
import { normalizeGpa } from './chance.js';
import { fieldForMajors } from '../data/portfolioRubrics.js';

/** What universities write about beyond grades, detected in their requirement and "what they value" texts. */
export const PORTFOLIO_SIGNALS = [
  { id: 'olympiads', types: ['olympiad'], re: /олимпиад|olympiad/i },
  { id: 'research', types: ['research', 'publication'], re: /исследова|научн|research|лаборатор|публикац|science fair/i },
  { id: 'projects', types: ['project', 'internship', 'research'], re: /проект|project|github|прототип|prototype|стартап|startup|продукт/i },
  { id: 'competitions', types: ['competition', 'olympiad'], re: /конкурс|хакатон|соревнован|competition|hackathon|робототехн|robotics/i },
  { id: 'leadership', types: ['leadership'], re: /лидер|leadership|инициатив|организатор|капитан|основател/i },
  { id: 'community', types: ['volunteering'], re: /волонт|сообществ|community|социальн|volunteer|вклад в/i },
  { id: 'creative', types: ['art', 'publication'], re: /творческ|creative|дизайн|design|искусств|художеств|музык|архитектур/i },
  // Exam certificates (ЕНТ, IELTS…) are test results, not courses.
  { id: 'certificates', types: ['course'], re: /сертификат|certificate|летн\S* школ|summer school|онлайн-курс/i, exclude: /(сертификат|certificate)\S*\s+(ент|ұбт|ielts|toefl|sat|act|nuet|duolingo)/i },
  { id: 'extracurricular', types: ['sport', 'art', 'volunteering', 'leadership', 'other'], re: /внеклассн|внеучебн|extracurricular|спорт|клуб/i },
];
const SIGNAL_BY_ID = Object.fromEntries(PORTFOLIO_SIGNALS.map((s) => [s.id, s]));

/** Portfolio-related documents a university may ask for. */
const PORTFOLIO_DOCS = new Set(['essay', 'recommendation', 'cv', 'portfolio']);

/** Subjects and words that make an entry relevant to a field. */
const FIELD_SUBJECTS = {
  tech: ['informatics', 'math', 'robotics'],
  engineering: ['physics', 'math', 'robotics', 'informatics'],
  science: ['physics', 'chemistry', 'biology', 'astronomy', 'math', 'research'],
  medicine: ['biology', 'chemistry', 'research'],
  business: ['economics', 'entrepreneurship', 'math'],
  law: ['history', 'debate', 'linguistics', 'english'],
  humanities: ['history', 'linguistics', 'english', 'essay', 'debate'],
  creative: ['design', 'essay'],
};
const FIELD_WORDS = {
  tech: /программ|python|java|c\+\+|алгоритм|приложени|сайт|веб|web|app|ai\b|ии\b|машинн|нейросет|данн|data|codeforces|github|кибер|бот/i,
  engineering: /инженер|робот|arduino|схем|механ|электр|3d|cad|конструк|дрон/i,
  science: /физик|хими|биолог|астроном|эксперимент|лаборатор|исследова|научн/i,
  medicine: /медиц|биолог|хими|здоров|клиник|анатом|генет|медсестр|волонт.*больниц/i,
  business: /бизнес|экономик|финанс|стартап|маркетинг|продаж|инвест|предприним/i,
  law: /прав|юрид|дебат|model un|mun|политик|конституц/i,
  humanities: /истор|литератур|язык|лингв|эссе|философ|журнал|перевод/i,
  creative: /дизайн|рисун|живопис|фото|видео|музык|театр|медиа|анимац|figma/i,
};
const TYPE_FIELD_FIT = {
  tech: { project: 1, competition: 0.9, olympiad: 0.9, research: 0.7, internship: 0.8, course: 0.5 },
  engineering: { project: 1, competition: 0.9, olympiad: 0.8, research: 0.8, internship: 0.7, course: 0.4 },
  science: { research: 1, olympiad: 1, publication: 0.8, competition: 0.7, project: 0.6, course: 0.4 },
  medicine: { research: 1, volunteering: 0.8, olympiad: 0.8, internship: 0.7, course: 0.4 },
  business: { project: 0.9, competition: 0.9, internship: 0.9, leadership: 0.8, olympiad: 0.6, course: 0.4 },
  law: { competition: 0.9, leadership: 0.8, publication: 0.8, volunteering: 0.7, olympiad: 0.6, course: 0.4 },
  humanities: { publication: 1, competition: 0.8, olympiad: 0.8, research: 0.8, volunteering: 0.5, course: 0.4 },
  creative: { art: 1, publication: 0.9, project: 0.8, competition: 0.7, course: 0.4 },
};

const HIGH_LEVELS = new Set(['republican', 'international']);
const PRIZE_RESULTS = new Set(['winner', 'gold', 'silver', 'bronze', 'honorable_mention', 'finalist']);

const active = (items) => (items || []).filter((it) => !it.excluded);
const hasProof = (it) => Boolean(it.documentId) || (it.links || []).length > 0;

/** 1–10 significance: the AI verdict when there is one, else the server's estimate, else a quick rule. */
export function itemSignificance(it) {
  if (it.ai && Number.isFinite(it.ai.score)) return it.ai.score;
  if (Number.isFinite(it.preScore)) return it.preScore;
  let s = 4;
  if (HIGH_LEVELS.has(it.level)) s += 3;
  else if (it.level === 'regional') s += 2;
  if (PRIZE_RESULTS.has(it.result)) s += 2;
  if (hasProof(it)) s += 1;
  return Math.max(1, Math.min(10, s));
}

/** Is this entry a strong piece of evidence? School and city results show the direction but count as partial. */
function isStrong(it) {
  if (['olympiad', 'competition', 'sport', 'art'].includes(it.type)) return HIGH_LEVELS.has(it.level) || (it.level === 'regional' && PRIZE_RESULTS.has(it.result));
  return itemSignificance(it) >= 6;
}

/** Signals a university publishes, with the exact texts they come from. */
export function universitySignals(uni) {
  const texts = [...(uni.admissionRequirements || []), ...(uni.admissions?.likes || [])];
  const found = [];
  for (const sig of PORTFOLIO_SIGNALS) {
    const sources = texts.filter((t) => sig.re.test(t) && !sig.exclude?.test(t));
    if (sources.length) found.push({ id: sig.id, sources });
  }
  return found;
}

/**
 * @returns {{ universityId: string, checks: Array, met: number, partial: number, missing: number, unknown: number, coverage: number | null }}
 */
export function matchPortfolio(profile, items, documents, uni) {
  const p = profile || {};
  const pool = active(items);
  const uploaded = new Set((documents || []).map((d) => d.kind));
  const checks = [];

  // Academic thresholds the university publishes.
  const gpa4 = normalizeGpa(Number(p.gpa) || 0, p.gpaScale);
  if (uni.minGpa) {
    checks.push({ id: 'gpa', group: 'academic', min: uni.minGpa, value: gpa4 ? Number(gpa4.toFixed(2)) : null, status: !gpa4 ? 'unknown' : gpa4 >= uni.minGpa ? 'met' : gpa4 >= uni.minGpa - 0.2 ? 'partial' : 'missing', evidence: [] });
  }
  const localSchool = uni.region === 'kazakhstan' && (uni.category === 'school' || uni.category === 'college');
  if (uni.minIelts && !localSchool) {
    const toefl = (p.otherExams || []).find((e) => /toefl/i.test(e.name || ''));
    const score = p.hasIelts ? Number(p.ieltsScore) || 0 : 0;
    checks.push({
      id: 'ielts',
      group: 'academic',
      min: uni.minIelts,
      value: score || (toefl ? `TOEFL ${toefl.score}` : null),
      status: score ? (score >= uni.minIelts ? 'met' : score >= uni.minIelts - 0.5 ? 'partial' : 'missing') : toefl ? 'partial' : 'missing',
      evidence: [],
    });
  }
  const policy = uni.admissions?.testPolicy || (uni.minSat ? 'required' : 'optional');
  if (uni.minSat && policy !== 'blind' && policy !== 'optional') {
    const score = p.hasSat ? Number(p.satScore) || 0 : 0;
    checks.push({ id: 'sat', group: 'academic', min: uni.minSat, value: score || null, status: score ? (score >= uni.minSat ? 'met' : score >= uni.minSat - 60 ? 'partial' : 'missing') : 'missing', evidence: [] });
  }
  if (uni.minUnt) {
    const score = p.hasUnt ? Number(p.untScore) || 0 : 0;
    checks.push({ id: 'unt', group: 'academic', min: uni.minUnt, value: score || null, status: score ? (score >= uni.minUnt ? 'met' : score >= uni.minUnt - 5 ? 'partial' : 'missing') : 'missing', evidence: [] });
  }
  if ((uni.supportedMajors || []).length && (p.targetMajors || []).length) {
    const fits = uni.supportedMajors.some((m) => p.targetMajors.includes(m));
    checks.push({ id: 'major', group: 'academic', status: fits ? 'met' : 'missing', evidence: [] });
  }

  // What the university says it values in the portfolio.
  for (const sig of universitySignals(uni)) {
    const def = SIGNAL_BY_ID[sig.id];
    const matching = pool.filter((it) => def.types.includes(it.type));
    let status = !matching.length ? 'missing' : matching.some(isStrong) ? 'met' : 'partial';
    if (sig.id === 'olympiads' && HIGH_LEVELS.has(p.olympiadLevel)) status = 'met';
    if (sig.id === 'leadership' && status === 'missing' && (p.leadershipActivities || []).length) status = 'partial';
    if (sig.id === 'extracurricular' && status === 'missing' && (p.extracurriculars || []).length) status = 'partial';
    checks.push({
      id: `signal:${sig.id}`,
      group: 'portfolio',
      signal: sig.id,
      status,
      source: sig.sources[0],
      evidence: matching.sort((a, b) => itemSignificance(b) - itemSignificance(a)).slice(0, 3).map((it) => ({ id: it.id, title: it.title })),
    });
  }

  // Portfolio documents the university asks for (essay, recommendations, CV, portfolio file).
  for (const kind of uni.requiredDocuments || []) {
    if (!PORTFOLIO_DOCS.has(kind)) continue;
    checks.push({ id: `doc:${kind}`, group: 'documents', docKind: kind, status: uploaded.has(kind) ? 'met' : 'missing', evidence: [] });
  }
  if (uni.admissions?.interview) checks.push({ id: 'interview', group: 'documents', status: 'unknown', evidence: [] });

  const count = (s) => checks.filter((c) => c.status === s).length;
  const met = count('met');
  const partial = count('partial');
  const missing = count('missing');
  const judged = met + partial + missing;
  return { universityId: uni.id, checks, met, partial, missing, unknown: count('unknown'), coverage: judged ? Math.round(((met + partial * 0.5) / judged) * 100) : null };
}

/**
 * Entries ranked by relevance to the chosen field and to what the selected universities value.
 * @returns {Array<{ id: string, title: string, type: string, score: number, reasons: string[], valuedBy: string[] }>}
 */
export function rankRelevantItems(profile, items, universities = []) {
  const field = fieldForMajors(profile?.targetMajors);
  const subjects = FIELD_SUBJECTS[field] || [];
  const words = FIELD_WORDS[field];
  const typeFit = TYPE_FIELD_FIT[field] || {};
  const signalsByUni = universities.map((u) => ({ id: u.id, signals: universitySignals(u).map((s) => s.id) }));

  return active(items)
    .map((it) => {
      const reasons = [];
      const significance = itemSignificance(it);
      const subjectHit = (it.subjects || []).some((s) => subjects.includes(s));
      const wordHit = words ? words.test(`${it.title} ${it.description || ''} ${it.organization || ''}`) : false;
      let fieldFit = typeFit[it.type] ?? 0.3;
      if (subjectHit || wordHit) fieldFit = Math.min(1, fieldFit + 0.4);
      if (fieldFit >= 0.8) reasons.push('field');
      const valuedBy = signalsByUni.filter((u) => u.signals.some((sid) => SIGNAL_BY_ID[sid].types.includes(it.type))).map((u) => u.id);
      if (valuedBy.length) reasons.push('valued');
      if (HIGH_LEVELS.has(it.level)) reasons.push('high_level');
      if (PRIZE_RESULTS.has(it.result)) reasons.push('result');
      reasons.push(hasProof(it) ? 'proof' : 'no_proof');
      const valuedShare = universities.length ? valuedBy.length / universities.length : 0.5;
      const score = Math.round((significance / 10) * 45 + fieldFit * 35 + valuedShare * 20);
      return { id: it.id, title: it.title, type: it.type, score: Math.max(1, Math.min(100, score)), reasons, valuedBy };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * What to develop across all selected universities: signals they value that the portfolio covers weakly or
 * not at all, plus entries that lack proof or numbers.
 * @returns {Array<{ id: string, kind: 'signal' | 'proof' | 'numbers' | 'academic', status: 'missing' | 'partial', universities: string[], items?: {id: string, title: string}[] }>}
 */
export function developmentAreas(matches, items) {
  const bySignal = new Map();
  for (const m of matches) {
    for (const c of m.checks) {
      if (c.status !== 'missing' && c.status !== 'partial') continue;
      if (c.group === 'documents') continue;
      const key = c.group === 'portfolio' ? c.signal : c.id;
      const cur = bySignal.get(key) || { id: key, kind: c.group === 'portfolio' ? 'signal' : 'academic', status: c.status, universities: [] };
      if (c.status === 'missing') cur.status = 'missing';
      cur.universities.push(m.universityId);
      bySignal.set(key, cur);
    }
  }
  const areas = [...bySignal.values()].sort((a, b) => (a.status === b.status ? b.universities.length - a.universities.length : a.status === 'missing' ? -1 : 1));
  const pool = active(items);
  const noProof = pool.filter((it) => !hasProof(it));
  if (noProof.length) areas.push({ id: 'proof', kind: 'proof', status: 'partial', universities: [], items: noProof.slice(0, 4).map((it) => ({ id: it.id, title: it.title })) });
  const noNumbers = pool.filter((it) => !['olympiad', 'competition'].includes(it.type) && !/\d/.test(it.description || ''));
  if (noNumbers.length) areas.push({ id: 'numbers', kind: 'numbers', status: 'partial', universities: [], items: noNumbers.slice(0, 4).map((it) => ({ id: it.id, title: it.title })) });
  return areas;
}
