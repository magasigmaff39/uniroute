// Admission planner state that belongs to the applicant but not to the profile itself: favourite olympiads,
// deadlines marked as done, the applicant's own dates and the motivation-letter draft. Stored as one JSON
// document per user (like the profile), so it follows the applicant across devices.
import { getStore, nowIso } from '../db/store.js';
import { badRequest } from '../utils/errors.js';
import { OLYMPIAD_BY_ID } from '../../shared/data/olympiads.js';

const MAX_BYTES = 200_000;
const DEADLINE_KINDS = ['application', 'documents', 'scholarship', 'exam', 'olympiad', 'other'];

const str = (v, max) => String(v ?? '').slice(0, max);
const isoDate = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null);

/** Keeps only the known shape so the document cannot grow with arbitrary data. */
function sanitize(input = {}) {
  const favorites = Array.isArray(input.favoriteOlympiadIds) ? [...new Set(input.favoriteOlympiadIds.map((x) => str(x, 80)).filter((id) => OLYMPIAD_BY_ID.has(id)))].slice(0, 100) : [];
  const done = {};
  for (const [k, v] of Object.entries(input.deadlineDone && typeof input.deadlineDone === 'object' ? input.deadlineDone : {}).slice(0, 500)) {
    if (v) done[str(k, 120)] = isoDate(String(v).slice(0, 10)) || nowIso().slice(0, 10);
  }
  const custom = (Array.isArray(input.customDeadlines) ? input.customDeadlines : []).slice(0, 200).flatMap((d) => {
    const date = isoDate(d?.date);
    const title = str(d?.title, 160).trim();
    if (!date || !title) return [];
    return [{ id: str(d.id, 60) || `cd_${Math.random().toString(36).slice(2, 10)}`, title, date, kind: DEADLINE_KINDS.includes(d.kind) ? d.kind : 'other', universityId: d.universityId ? str(d.universityId, 80) : null, note: d.note ? str(d.note, 500) : '' }];
  });
  const essay = input.essay && typeof input.essay === 'object' ? input.essay : null;
  return { favoriteOlympiadIds: favorites, deadlineDone: done, customDeadlines: custom, essay };
}

export async function getPlanner(userId) {
  const store = await getStore();
  const row = await store.get('planners', userId);
  return row ? { planner: row.planner, updatedAt: row.updatedAt } : { planner: null, updatedAt: null };
}

export async function savePlanner(userId, input) {
  const planner = sanitize(input);
  if (JSON.stringify(planner).length > MAX_BYTES) throw badRequest('Данные планировщика слишком большие', 'PLANNER_TOO_LARGE');
  const store = await getStore();
  const row = await store.set('planners', userId, { userId, planner, updatedAt: nowIso() });
  return { planner: row.planner, updatedAt: row.updatedAt };
}
