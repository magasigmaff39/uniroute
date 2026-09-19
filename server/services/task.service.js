// User tasks (SAT / IELTS / documents …) with deadlines and on-time tracking.
import crypto from 'node:crypto';
import { getStore, nowIso } from '../db/store.js';
import { notFound } from '../utils/errors.js';
import { UNIVERSITY_BY_ID } from '../../shared/data/universities/index.js';
import { parseRuDeadlineIso } from '../../shared/logic/dates.js';

export const TASK_CATEGORIES = ['sat', 'ielts', 'unt', 'documents', 'essay', 'application', 'olympiad', 'portfolio', 'other'];
export const TASK_STATUSES = ['todo', 'in_progress', 'done'];

/** Derived timeliness so the UI can colour tasks without re-implementing date logic. */
export function timelinessOf(task, today = new Date().toISOString().slice(0, 10)) {
  if (task.status === 'done') {
    if (!task.dueDate) return 'no_deadline';
    return (task.completedAt || '').slice(0, 10) <= task.dueDate ? 'done_on_time' : 'done_late';
  }
  if (!task.dueDate) return 'no_deadline';
  return task.dueDate < today ? 'overdue' : 'upcoming';
}

export function toPublicTask(doc) {
  return {
    id: doc.id,
    userId: doc.userId,
    title: doc.title,
    description: doc.description || undefined,
    category: doc.category,
    status: doc.status,
    dueDate: doc.dueDate || null,
    completedAt: doc.completedAt || null,
    source: doc.source || undefined,
    // Optional links: the university, planner deadline and olympiad a task belongs to.
    universityId: doc.universityId || null,
    deadlineKey: doc.deadlineKey || null,
    olympiadId: doc.olympiadId || null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    timeliness: timelinessOf(doc),
  };
}

export async function listTasks(userId) {
  const store = await getStore();
  const docs = await store.find('tasks', { where: [['userId', '==', userId]] });
  // Deadlines first (soonest on top), then tasks without a date by creation time.
  docs.sort((a, b) => {
    if (a.dueDate && b.dueDate) return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.createdAt < b.createdAt ? -1 : 1;
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.createdAt < b.createdAt ? -1 : 1;
  });
  return docs.map(toPublicTask);
}

const linkId = (v) => (v ? String(v).slice(0, 120) : null);

export async function createTask(userId, { title, description, category, dueDate, status, source, universityId, deadlineKey, olympiadId }) {
  const store = await getStore();
  const id = `task_${crypto.randomUUID()}`;
  const now = nowIso();
  const doc = await store.set('tasks', id, {
    userId,
    title: String(title).slice(0, 200),
    description: description ? String(description).slice(0, 2000) : null,
    category: TASK_CATEGORIES.includes(category) ? category : 'other',
    status: TASK_STATUSES.includes(status) ? status : 'todo',
    dueDate: dueDate || null,
    completedAt: status === 'done' ? now : null,
    source: source || null,
    universityId: linkId(universityId),
    deadlineKey: linkId(deadlineKey),
    olympiadId: linkId(olympiadId),
    createdAt: now,
    updatedAt: now,
  });
  return toPublicTask(doc);
}

export async function updateTask(userId, taskId, patch) {
  const store = await getStore();
  const doc = await store.get('tasks', taskId);
  if (!doc || doc.userId !== userId) throw notFound('Задача не найдена', 'TASK_NOT_FOUND');
  const next = {
    title: patch.title ?? doc.title,
    description: patch.description === undefined ? doc.description : patch.description,
    category: patch.category ?? doc.category,
    status: patch.status ?? doc.status,
    dueDate: patch.dueDate === undefined ? doc.dueDate : patch.dueDate,
    universityId: patch.universityId === undefined ? doc.universityId || null : linkId(patch.universityId),
    deadlineKey: patch.deadlineKey === undefined ? doc.deadlineKey || null : linkId(patch.deadlineKey),
    olympiadId: patch.olympiadId === undefined ? doc.olympiadId || null : linkId(patch.olympiadId),
    updatedAt: nowIso(),
  };
  let completedAt = doc.completedAt || null;
  if (next.status === 'done' && doc.status !== 'done') completedAt = nowIso();
  if (next.status !== 'done') completedAt = null;
  return toPublicTask(await store.update('tasks', taskId, { ...next, completedAt }));
}

export async function deleteTask(userId, taskId) {
  const store = await getStore();
  const doc = await store.get('tasks', taskId);
  if (!doc || doc.userId !== userId) throw notFound('Задача не найдена', 'TASK_NOT_FOUND');
  await store.remove('tasks', taskId);
}

export function computeStats(tasks) {
  const stats = { total: tasks.length, done: 0, doneOnTime: 0, doneLate: 0, overdue: 0, upcoming: 0, noDeadline: 0, byCategory: {} };
  for (const t of tasks) {
    const tl = timelinessOf(t);
    if (t.status === 'done') stats.done++;
    if (tl === 'done_on_time') stats.doneOnTime++;
    else if (tl === 'done_late') stats.doneLate++;
    else if (tl === 'overdue') stats.overdue++;
    else if (tl === 'upcoming') stats.upcoming++;
    else stats.noDeadline++;
    stats.byCategory[t.category] = (stats.byCategory[t.category] || 0) + 1;
  }
  stats.onTimeRate = stats.done ? Math.round((stats.doneOnTime / stats.done) * 100) : null;
  return stats;
}

export async function taskStats(userId) {
  const store = await getStore();
  return computeStats(await store.find('tasks', { where: [['userId', '==', userId]] }));
}

/**
 * Seed a starter plan from the applicant profile: exam prep + documents + deadlines of target universities.
 * Skips titles that already exist so it is safe to call repeatedly.
 */
export async function generateStarterTasks(userId, profile) {
  const existing = new Set((await listTasks(userId)).map((t) => t.title.toLowerCase()));
  const year = Number(profile?.targetYear) || 2027;
  const drafts = [];

  if (!profile?.hasIelts) drafts.push({ title: 'Пройти пробный IELTS и забронировать очную дату', category: 'ielts', dueDate: `${year - 1}-11-15` });
  if (!profile?.hasSat && (profile?.targetRegions || []).some((r) => r !== 'kazakhstan')) {
    drafts.push({ title: 'Зарегистрироваться на Digital SAT (цель 1450+)', category: 'sat', dueDate: `${year - 1}-10-20` });
  }
  if (!profile?.hasUnt && (profile?.targetRegions || []).includes('kazakhstan')) {
    drafts.push({ title: 'Пробное ЕНТ на app.testcenter.kz', category: 'unt', dueDate: `${year}-02-15` });
  }
  drafts.push({ title: 'Запросить транскрипт за 9–11 классы на двух языках', category: 'documents', dueDate: `${year - 1}-11-30` });
  drafts.push({ title: 'Попросить 2 рекомендательных письма у учителей', category: 'documents', dueDate: `${year - 1}-12-10` });
  drafts.push({ title: 'Первый драфт Personal Statement (650 слов)', category: 'essay', dueDate: `${year - 1}-12-20` });
  drafts.push({ title: 'Собрать портфолио: проекты, олимпиады, волонтёрство с подтверждениями', category: 'portfolio', dueDate: `${year - 1}-12-01` });

  for (const id of profile?.targetUniversityIds || []) {
    const u = UNIVERSITY_BY_ID.get(id);
    if (!u) continue;
    // Real due date parsed from the knowledge-base deadline string (no deadline for "rolling")
    drafts.push({ title: `Подать заявку: ${u.shortName} (${u.regularDeadline})`, category: 'application', dueDate: parseRuDeadlineIso(u.regularDeadline), description: u.officialPortalUrl, universityId: u.id, deadlineKey: `${u.id}:app` });
  }

  const created = [];
  for (const d of drafts) {
    if (existing.has(d.title.toLowerCase())) continue;
    created.push(await createTask(userId, { ...d, status: 'todo', source: 'generated' }));
  }
  return created;
}
