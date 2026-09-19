// "Everything the AI should know about this applicant": account, profile, portfolio, tasks, documents
// (with their AI summaries), recent analyses and what is on screen right now. Rendered as a compact
// Markdown block for prompts, so every AI feature sees the same, complete picture.
import { getStore } from '../db/store.js';
import { listItems, scorePortfolio } from './portfolio.service.js';
import { listTasks, computeStats } from './task.service.js';
import { listDocuments, buildChecklist } from './document.service.js';
import { UNIVERSITY_BY_ID } from '../../shared/data/universities/index.js';
import { PORTFOLIO_ITEM_TYPES, PORTFOLIO_LEVELS, PORTFOLIO_RESULTS, FIELD_RUBRICS, fieldForMajors } from '../../shared/data/portfolioRubrics.js';
import { estimateWithProjections } from '../../shared/logic/chance.js';

const label = (list, id) => list.find((x) => x.id === id)?.label || id || '';

const MAJOR_LABELS = {
  cs_ai: 'Computer Science / AI',
  software_eng: 'Software Engineering',
  data_science: 'Data Science',
  robotics: 'Робототехника',
  business_finance: 'Бизнес и финансы',
  economics: 'Экономика',
  medicine_bio: 'Медицина / биология',
  international_law: 'Международное право',
  media_design: 'Медиа и дизайн',
  engineering: 'Инженерия',
  natural_sciences: 'Естественные науки',
  humanities: 'Гуманитарные науки',
  education: 'Педагогика',
  linguistics: 'Лингвистика',
};
const REGION_LABELS = { kazakhstan: 'Казахстан', europe: 'Европа', asia: 'Азия', usa_canada: 'США / Канада' };
const BUDGET_LABELS = { grant_only: 'только 100% грант', up_to_5k: 'до 5 000 $/год', up_to_15k: 'до 15 000 $/год', above_25k: 'свыше 25 000 $/год' };
const GRADE_LABELS = { grade_9: '9 класс', grade_10: '10 класс', grade_11: '11 класс', college: 'колледж', gap_year: 'gap year' };

export function describeProfile(profile) {
  if (!profile) return 'Профиль абитуриента ещё не заполнен.';
  const p = profile;
  const parts = [
    `Имя: ${p.name || '—'}; ${GRADE_LABELS[p.grade] || p.grade}; возраст ${p.age}; тип школы: ${p.schoolType}.`,
    `GPA ${p.gpa}/${p.gpaScale}; профильные предметы: ${(p.profileSubjects || []).join(', ') || '—'}.`,
    `IELTS: ${p.hasIelts ? p.ieltsScore : 'не сдан'}; SAT: ${p.hasSat ? p.satScore : 'не сдан'}; ЕНТ: ${p.hasUnt ? p.untScore : 'не сдан'}.`,
    `Олимпиады: уровень «${p.olympiadLevel}»${p.olympiadDetails ? ` (${p.olympiadDetails})` : ''}. Лидерство: ${(p.leadershipActivities || []).join('; ') || '—'}. Активности: ${(p.extracurriculars || []).join(', ') || '—'}.`,
    `Цели: направления — ${(p.targetMajors || []).map((m) => MAJOR_LABELS[m] || m).join(', ') || '—'}; регионы — ${(p.targetRegions || []).map((r) => REGION_LABELS[r] || r).join(', ') || '—'}; бюджет — ${BUDGET_LABELS[p.budgetTier] || p.budgetTier}; год поступления ${p.targetYear}; стиль наставника: ${p.advisorTone}.`,
  ];
  if (p.birthDate || p.country || p.city || p.schoolName) {
    parts.push(
      [p.birthDate && `Дата рождения: ${p.birthDate}`, (p.city || p.country) && `живёт: ${[p.city, p.country].filter(Boolean).join(', ')}`, p.schoolName && `школа: ${p.schoolName}`].filter(Boolean).join('; ') + '.',
    );
  }
  if (p.englishLevel) parts.push(`Уровень английского (самооценка): ${p.englishLevel}.`);
  if (p.otherExams?.length) parts.push(`Другие экзамены: ${p.otherExams.map((e) => `${e.name}${e.score ? ` ${e.score}` : ''}`).join(', ')}.`);
  if (p.interests?.length) parts.push(`Интересы: ${p.interests.join(', ')}.`);
  if (p.skills?.length) parts.push(`Навыки: ${p.skills.join(', ')}.`);
  if (p.targetUniversityIds?.length) {
    parts.push(
      `Целевые университеты: ${p.targetUniversityIds
        .map((id) => {
          const plan = p.universityPlans?.[id];
          const extra = [plan?.program, plan?.year].filter(Boolean).join(', ');
          return `${UNIVERSITY_BY_ID.get(id)?.name || id}${extra ? ` (${extra})` : ''}`;
        })
        .join('; ')}.`,
    );
  }
  if (p.careerGoal) parts.push(`Желаемая профессия: ${p.careerGoal}.`);
  if (p.careerPlans) parts.push(`Карьерные планы: ${p.careerPlans}.`);
  if (p.allergies) parts.push(`Аллергии: ${p.allergies}.`);
  if (p.healthNotes) parts.push(`Здоровье: ${p.healthNotes}.`);
  if (p.dietaryNeeds) parts.push(`Питание: ${p.dietaryNeeds}.`);
  if (p.climatePreference && p.climatePreference !== 'any') parts.push(`Климат: предпочитает ${p.climatePreference}.`);
  if (p.cityPreference && p.cityPreference !== 'any') parts.push(`Город: предпочитает ${p.cityPreference}.`);
  if (p.languagesSpoken?.length) parts.push(`Языки: ${p.languagesSpoken.join(', ')}.`);
  if (p.personalNotes) parts.push(`Заметки абитуриента: ${p.personalNotes}`);
  return parts.join('\n');
}

export function describePortfolioItems(items) {
  if (!items.length) return 'Портфолио пока пустое.';
  return items
    .map((it) => {
      const bits = [
        `[${label(PORTFOLIO_ITEM_TYPES, it.type)}] ${it.title}`,
        it.organization && `(${it.organization})`,
        it.level && `уровень: ${label(PORTFOLIO_LEVELS, it.level)}`,
        it.result && it.result !== 'none' && `результат: ${label(PORTFOLIO_RESULTS, it.result)}`,
        it.role && `роль: ${it.role}`,
        (it.startDate || it.endDate) && `${it.startDate || '?'} – ${it.endDate || 'н.в.'}`,
        it.hoursPerWeek && `${it.hoursPerWeek} ч/нед`,
        it.documentId && 'есть подтверждающий документ',
        it.links.length && `ссылки: ${it.links.join(' ')}`,
        it.excluded && 'исключена абитуриентом из итоговой заявки',
      ].filter(Boolean);
      return `- ${bits.join(' · ')}${it.description ? `\n  ${it.description.slice(0, 400)}` : ''}`;
    })
    .join('\n');
}

/**
 * @param {object} opts
 * @param {string|null} opts.userId
 * @param {object|null} opts.profile   profile sent by the frontend (wins over the stored one)
 * @param {object} [opts.uiState]     what the user sees: { step, selectedForCompare, filters, essayDraft, roadmapDone }
 * @param {boolean} [opts.withPortfolioScore]
 */
export async function buildUserContext({ userId, profile, uiState, withPortfolioScore = true }) {
  const ctx = { profile: profile || null, portfolio: [], tasks: [], taskStats: null, documents: [], checklist: [], analyses: [], uiState: uiState || null, portfolioScore: null };
  if (userId) {
    const store = await getStore();
    const [stored, portfolio, tasks, documents, analyses] = await Promise.all([
      profile ? null : store.get('profiles', userId),
      listItems(userId),
      listTasks(userId),
      listDocuments(userId),
      store.find('ai_analyses', { where: [['userId', '==', userId]], orderBy: [['createdAt', 'desc']], limit: 6 }),
    ]);
    if (!ctx.profile && stored?.profile) ctx.profile = stored.profile;
    ctx.portfolio = portfolio;
    ctx.tasks = tasks;
    ctx.taskStats = computeStats(tasks);
    ctx.documents = documents;
    ctx.checklist = await buildChecklist(userId, ctx.profile?.targetRegions || []);
    ctx.analyses = analyses;
    if (withPortfolioScore) ctx.portfolioScore = scorePortfolio(portfolio, ctx.profile, fieldForMajors(ctx.profile?.targetMajors));
  }
  return ctx;
}

/** Markdown block for prompts. `detail` = 'compact' | 'full'. */
export function renderContext(ctx, { detail = 'full', language = 'ru' } = {}) {
  const out = [];
  out.push(`## Профиль абитуриента\n${describeProfile(ctx.profile)}`);

  if (ctx.portfolio?.length || ctx.portfolioScore) {
    out.push(`## Портфолио (${ctx.portfolio.length} записей)\n${describePortfolioItems(detail === 'full' ? ctx.portfolio : ctx.portfolio.slice(0, 8))}`);
    if (ctx.portfolioScore) {
      const s = ctx.portfolioScore;
      out.push(
        `Расчётная оценка портфолио (детерминированная, не завышать): ${s.total}/100 для сферы «${s.fieldTitle}». По критериям: ${s.criteria.map((c) => `${c.title} ${c.score}`).join('; ')}. Слабые зоны: ${s.gaps.join(', ') || 'нет'}.`,
      );
    }
  }

  if (ctx.tasks?.length) {
    const open = ctx.tasks.filter((t) => t.status !== 'done');
    const st = ctx.taskStats;
    out.push(
      `## Задачи (${st.total}: выполнено ${st.done}, в срок ${st.doneOnTime}, просрочено ${st.overdue})\n${(detail === 'full' ? open : open.slice(0, 6))
        .map((t) => `- [${t.category}] ${t.title}${t.dueDate ? ` — до ${t.dueDate}` : ''}${t.timeliness === 'overdue' ? ' (ПРОСРОЧЕНО)' : ''}`)
        .join('\n') || '- открытых задач нет'}`,
    );
  }

  if (ctx.checklist?.length) {
    const uploaded = ctx.checklist.filter((c) => c.uploaded);
    const missing = ctx.checklist.filter((c) => !c.uploaded && c.required);
    out.push(
      `## Документы\nЗагружено: ${uploaded.map((c) => c.title).join(', ') || 'ничего'}. Не хватает обязательных: ${missing.map((c) => c.title).join(', ') || 'всё загружено'}.` +
        (ctx.documents?.some((d) => d.aiSummary)
          ? `\nСодержимое загруженных документов (по данным AI-разбора):\n${ctx.documents
              .filter((d) => d.aiSummary)
              .map((d) => `- ${d.originalName} (${d.kind}): ${d.aiSummary}`)
              .join('\n')}`
          : ''),
    );
  }

  if (ctx.analyses?.length && detail === 'full') {
    const last = ctx.analyses.slice(0, 3).map((a) => {
      const o = a.output || {};
      const head = o.summary || o.verdict || o.overallSummary || '';
      return `- ${a.kind} (${a.createdAt?.slice(0, 10)}): ${String(head).slice(0, 300)}`;
    });
    out.push(`## Предыдущие AI-анализы\n${last.join('\n')}`);
  }

  if (ctx.uiState) {
    const u = ctx.uiState;
    const bits = [];
    if (u.section) {
      const [section, view] = String(u.section).split(':');
      bits.push(`Пользователь сейчас в разделе «${SECTION_NAMES[section] || section}»${view ? ` (${VIEW_NAMES[view] || view})` : ''}`);
    } else if (u.step) bits.push(`Пользователь сейчас на шаге ${u.step} (${STEP_NAMES[u.step] || ''})`);
    if (u.selectedForCompare?.length) bits.push(`В сравнении: ${u.selectedForCompare.map((id) => UNIVERSITY_BY_ID.get(id)?.name || id).join(', ')}`);
    if (u.viewingUniversityId) bits.push(`Открыта карточка: ${UNIVERSITY_BY_ID.get(u.viewingUniversityId)?.name || u.viewingUniversityId}`);
    if (u.roadmapDone) bits.push(`Прогресс маршрута: ${u.roadmapDone}`);
    if (u.essayDraft) bits.push(`Черновик эссе (${u.essayDraft.length} симв.): «${String(u.essayDraft).slice(0, 600)}»`);
    if (u.language) bits.push(`Язык интерфейса: ${u.language}`);
    if (bits.length) out.push(`## Что на экране\n${bits.join('\n')}`);
  }
  return out.join('\n\n');
}

const STEP_NAMES = { 1: 'вход', 2: 'анкета профиля', 3: 'диагностика', 4: 'рекомендации вузов', 5: 'сравнение', 6: 'маршрут', 7: 'первоочередной шаг' };
const SECTION_NAMES = {
  home: 'Главная',
  cabinet: 'Личный кабинет',
  tests: 'Мои тесты',
  results: 'Мои результаты',
  achievements: 'Мои достижения',
  universities: 'Мои университеты',
  profile: 'Мой профиль',
  documents: 'Документы',
  analysis: 'Анализ поступления',
  grants: 'Гранты и финансирование',
  deadlines: 'Дедлайны',
  tasks: 'Задачи',
  olympiads: 'Олимпиады',
  portfolio: 'Портфолио',
};
const VIEW_NAMES = { quick: 'экспресс-тест', detailed: 'подробный тест' };

/** Chance estimates for the applicant's target / compared universities — hard numbers for prompts. */
export function chanceTable(profile, ids = []) {
  return ids
    .map((id) => UNIVERSITY_BY_ID.get(id))
    .filter(Boolean)
    .map((u) => {
      const c = estimateWithProjections(profile, u);
      return { id: u.id, name: u.name, probability: c.probability, tier: c.tier, factors: c.factors.slice(0, 4).map((f) => f.note) };
    });
}

export { FIELD_RUBRICS };
