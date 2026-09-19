// /api/planner — favourite olympiads, deadline statuses, the applicant's own dates, essay draft (auth required).
import { Router } from 'express';
import { asyncHandler } from '../utils/errors.js';
import { requireObject } from '../utils/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { getPlanner, savePlanner } from '../services/planner.service.js';

export const plannerRouter = Router();
plannerRouter.use(requireAuth);

plannerRouter.get(
  '/',
  asyncHandler(async (req, res) => res.json(await getPlanner(req.user.id))),
);

plannerRouter.put(
  '/',
  asyncHandler(async (req, res) => res.json(await savePlanner(req.user.id, requireObject(req.body?.planner, 'planner')))),
);
