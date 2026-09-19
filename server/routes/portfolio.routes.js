// /api/portfolio — applicant achievements + AI evaluation for a field and target universities.
import { Router } from 'express';
import { asyncHandler } from '../utils/errors.js';
import { requireAuth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { listItems, createItem, updateItem, deleteItem, scorePortfolio, tierForScore, scoreItem } from '../services/portfolio.service.js';
import { evaluatePortfolio, portfolioFeedback } from '../services/ai.service.js';
import { getProfile } from '../services/auth.service.js';
import { PORTFOLIO_ITEM_TYPES, PORTFOLIO_LEVELS, PORTFOLIO_RESULTS, PORTFOLIO_CRITERIA, FIELD_LIST, FIELD_RUBRICS, fieldForMajors } from '../../shared/data/portfolioRubrics.js';
import { pickLang } from './universities.routes.js';

export const portfolioRouter = Router();

// Reference data for the UI (public).
portfolioRouter.get('/meta', (_req, res) => {
  res.json({ types: PORTFOLIO_ITEM_TYPES, levels: PORTFOLIO_LEVELS, results: PORTFOLIO_RESULTS, criteria: PORTFOLIO_CRITERIA, fields: FIELD_LIST });
});

portfolioRouter.get('/rubric/:field', (req, res) => {
  const rubric = FIELD_RUBRICS[req.params.field];
  if (!rubric) return res.status(404).json({ error: 'Сфера не найдена', code: 'FIELD_NOT_FOUND' });
  res.json(rubric);
});

portfolioRouter.use(requireAuth);

async function resolveProfile(req) {
  if (req.body?.profile && typeof req.body.profile === 'object') return req.body.profile;
  return (await getProfile(req.user.id))?.profile || null;
}

portfolioRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const items = await listItems(req.user.id);
    const profile = (await getProfile(req.user.id))?.profile || null;
    const field = FIELD_RUBRICS[req.query.field] ? String(req.query.field) : fieldForMajors(profile?.targetMajors);
    const score = scorePortfolio(items, profile, field);
    // preScore: the deterministic 1–10 significance shown until the AI has written its verdict.
    res.json({ items: items.map((it) => ({ ...it, preScore: scoreItem(it).score })), score: { ...score, tier: tierForScore(score.total) } });
  }),
);

portfolioRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    res.status(201).json(await createItem(req.user.id, req.body || {}));
  }),
);

portfolioRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await updateItem(req.user.id, req.params.id, req.body || {}));
  }),
);

portfolioRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await deleteItem(req.user.id, req.params.id);
    res.json({ success: true });
  }),
);

/** Body: { field?, universityIds?, profile?, uiState? } */
portfolioRouter.post(
  '/evaluate',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const result = await evaluatePortfolio({
      userId: req.user.id,
      profile: await resolveProfile(req),
      field: typeof b.field === 'string' ? b.field : undefined,
      universityIds: Array.isArray(b.universityIds) ? b.universityIds.map(String).slice(0, 6) : [],
      language: pickLang(req),
      uiState: b.uiState && typeof b.uiState === 'object' ? b.uiState : undefined,
    });
    res.json(result);
  }),
);

/** Body: { universityIds?, profile?, uiState? } — concrete AI feedback against the published criteria. */
portfolioRouter.post(
  '/feedback',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    res.json(
      await portfolioFeedback({
        userId: req.user.id,
        profile: await resolveProfile(req),
        universityIds: Array.isArray(b.universityIds) ? b.universityIds.map(String).slice(0, 6) : [],
        language: pickLang(req),
        uiState: b.uiState && typeof b.uiState === 'object' ? b.uiState : undefined,
      }),
    );
  }),
);
