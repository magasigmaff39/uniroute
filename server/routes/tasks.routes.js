// /api/tasks — personal preparation tasks with deadlines and on-time statistics (auth required).
import { Router } from 'express';
import { asyncHandler } from '../utils/errors.js';
import { requireString, optionalString, requireEnum, optionalDate, requireObject } from '../utils/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { listTasks, createTask, updateTask, deleteTask, taskStats, generateStarterTasks, TASK_CATEGORIES, TASK_STATUSES } from '../services/task.service.js';

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

tasksRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await listTasks(req.user.id);
    res.json({ items, stats: await taskStats(req.user.id) });
  }),
);

tasksRouter.get(
  '/stats',
  asyncHandler(async (req, res) => res.json(await taskStats(req.user.id))),
);

/** Optional links of a task to a university, a planner deadline and an olympiad. */
const linksOf = (b) => ({
  universityId: optionalString(b.universityId, 'universityId', { max: 80 }),
  deadlineKey: optionalString(b.deadlineKey, 'deadlineKey', { max: 120 }),
  olympiadId: optionalString(b.olympiadId, 'olympiadId', { max: 80 }),
});

tasksRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const task = await createTask(req.user.id, {
      title: requireString(b.title, 'title', { max: 200 }),
      description: optionalString(b.description, 'description', { max: 2000 }),
      category: requireEnum(b.category, 'category', TASK_CATEGORIES, 'other'),
      status: requireEnum(b.status, 'status', TASK_STATUSES, 'todo'),
      dueDate: optionalDate(b.dueDate, 'dueDate'),
      source: optionalString(b.source, 'source', { max: 40 }),
      ...linksOf(b),
    });
    res.status(201).json(task);
  }),
);

/** Bulk create (used by "add AI plan to tasks"). Body: { items: [{title, category, dueDate, description}] } */
tasksRouter.post(
  '/bulk',
  asyncHandler(async (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 20) : [];
    const existing = new Set((await listTasks(req.user.id)).map((t) => t.title.toLowerCase()));
    const created = [];
    for (const b of items) {
      const title = requireString(b.title, 'title', { max: 200 });
      if (existing.has(title.toLowerCase())) continue;
      created.push(
        await createTask(req.user.id, {
          title,
          description: optionalString(b.description, 'description', { max: 2000 }),
          category: requireEnum(b.category, 'category', TASK_CATEGORIES, 'other'),
          status: 'todo',
          dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(b.dueDate || '')) ? String(b.dueDate) : /^\d{4}-\d{2}$/.test(String(b.dueDate || '')) ? `${b.dueDate}-28` : null,
          source: optionalString(b.source, 'source', { max: 40 }) || 'ai',
          ...linksOf(b),
        }),
      );
      existing.add(title.toLowerCase());
    }
    res.status(201).json({ created, items: await listTasks(req.user.id), stats: await taskStats(req.user.id) });
  }),
);

tasksRouter.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const profile = requireObject(req.body?.profile, 'profile');
    const created = await generateStarterTasks(req.user.id, profile);
    res.status(201).json({ created, items: await listTasks(req.user.id), stats: await taskStats(req.user.id) });
  }),
);

tasksRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const patch = {};
    if (b.title !== undefined) patch.title = requireString(b.title, 'title', { max: 200 });
    if (b.description !== undefined) patch.description = optionalString(b.description, 'description', { max: 2000 }) ?? null;
    if (b.category !== undefined) patch.category = requireEnum(b.category, 'category', TASK_CATEGORIES);
    if (b.status !== undefined) patch.status = requireEnum(b.status, 'status', TASK_STATUSES);
    if (b.dueDate !== undefined) patch.dueDate = optionalDate(b.dueDate, 'dueDate');
    for (const key of ['universityId', 'deadlineKey', 'olympiadId']) {
      if (b[key] !== undefined) patch[key] = optionalString(b[key], key, { max: 120 }) ?? null;
    }
    res.json(await updateTask(req.user.id, req.params.id, patch));
  }),
);

tasksRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteTask(req.user.id, req.params.id);
    res.json({ success: true });
  }),
);
