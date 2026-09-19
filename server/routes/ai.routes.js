// /api/ai — chat (streamed and plain), deep applicant analysis, university comparison, essay review,
// translation, voice transcription, feedback on answers.
import { Router } from 'express';
import { asyncHandler, badRequest } from '../utils/errors.js';
import { requireString, requireObject } from '../utils/validate.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { analyzeApplicant, compareUniversities, reviewEssay, translateTexts, aiStatus, quickVerdict, explainUniversityDifferences, essayFeedback, ESSAY_STAGES, essayStageTexts } from '../services/ai.service.js';
import { chat, chatStream, loadHistory, clearHistory, saveFeedback } from '../services/chat.service.js';
import { clearMemory, getMemory } from '../services/memory.service.js';
import { transcribeAudio } from '../services/groq.client.js';
import { pickLang } from './universities.routes.js';

export const aiRouter = Router();

const uiStateOf = (body) => (body?.uiState && typeof body.uiState === 'object' ? body.uiState : undefined);
const profileOf = (body) => (body?.profile && typeof body.profile === 'object' ? body.profile : null);

aiRouter.get('/status', (_req, res) => res.json(aiStatus()));

aiRouter.get(
  '/history',
  asyncHandler(async (req, res) => {
    const [messages, memory] = await Promise.all([loadHistory({ userId: req.user?.id, guestId: req.guestId, limit: 40 }), getMemory({ userId: req.user?.id, guestId: req.guestId })]);
    res.json({ messages, memory: { facts: memory.facts.map((f) => f.text), summary: memory.summary } });
  }),
);

aiRouter.delete(
  '/history',
  asyncHandler(async (req, res) => {
    await clearHistory({ userId: req.user?.id, guestId: req.guestId });
    if (req.query.memory === 'true') await clearMemory({ userId: req.user?.id, guestId: req.guestId });
    res.json({ success: true });
  }),
);

const chatParams = (req) => ({
  userId: req.user?.id,
  guestId: req.guestId,
  message: requireString(req.body?.message, 'message', { max: 8000 }),
  profile: profileOf(req.body),
  uiState: uiStateOf(req.body),
  language: pickLang(req),
  includeNews: req.body?.includeNews !== false,
});

aiRouter.post(
  '/chat',
  aiLimiter,
  asyncHandler(async (req, res) => {
    res.json(await chat(chatParams(req)));
  }),
);

/** Server-Sent Events: status → token* → (revision) → sources → done → suggestions. */
aiRouter.post(
  '/chat/stream',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const params = chatParams(req);
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    const send = (event) => {
      if (res.writableEnded) return;
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      res.flush?.();
    };
    const controller = new AbortController();
    req.on('close', () => controller.abort());
    const heartbeat = setInterval(() => !res.writableEnded && res.write(': ping\n\n'), 15_000);
    try {
      for await (const ev of chatStream({ ...params, signal: controller.signal })) send(ev);
    } catch (err) {
      send({ type: 'error', message: err?.message || 'AI error', code: err?.code || 'AI_ERROR' });
    } finally {
      clearInterval(heartbeat);
      if (!res.writableEnded) res.end();
    }
  }),
);

/** Body: { messageId?, rating: 'up'|'down', comment?, question?, answer? } */
aiRouter.post(
  '/feedback',
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    if (!['up', 'down'].includes(b.rating)) throw badRequest('rating должен быть up или down', 'VALIDATION');
    const id = await saveFeedback({ userId: req.user?.id, guestId: req.guestId, messageId: b.messageId, rating: b.rating, comment: b.comment, question: b.question, answer: b.answer });
    res.status(201).json({ success: true, id });
  }),
);

/** Body: { profile, language? } — preliminary verdict for the 7-question express test. */
aiRouter.post(
  '/quick-verdict',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const profile = requireObject(req.body?.profile, 'profile');
    res.json(await quickVerdict({ userId: req.user?.id, profile, language: pickLang(req) }));
  }),
);

aiRouter.post(
  '/analyze',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const profile = requireObject(req.body?.profile, 'profile');
    const freeText = (req.body?.freeText || '').toString().slice(0, 6000);
    const limit = Math.min(10, Math.max(3, Number(req.body?.limit) || 6));
    res.json(await analyzeApplicant({ userId: req.user?.id, profile, freeText, language: pickLang(req), limit, uiState: uiStateOf(req.body) }));
  }),
);

/** Body: { universityIds: string[], profile?, uiState? } */
aiRouter.post(
  '/compare',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const ids = Array.isArray(req.body?.universityIds) ? req.body.universityIds.map(String).slice(0, 6) : [];
    if (ids.length < 2) throw badRequest('Для сравнения нужно минимум два университета', 'VALIDATION');
    res.json(await compareUniversities({ userId: req.user?.id, profile: profileOf(req.body), universityIds: ids, language: pickLang(req), uiState: uiStateOf(req.body) }));
  }),
);

/** Body: { universityIds: string[], profile?, uiState? } — differences explained by facts, without a ranking. */
aiRouter.post(
  '/compare-insights',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const ids = Array.isArray(req.body?.universityIds) ? [...new Set(req.body.universityIds.map(String))].slice(0, 6) : [];
    if (ids.length < 2) throw badRequest('Для сравнения нужно минимум два университета', 'VALIDATION');
    res.json(await explainUniversityDifferences({ userId: req.user?.id, profile: profileOf(req.body), universityIds: ids, language: pickLang(req), uiState: uiStateOf(req.body) }));
  }),
);

/** Body: { stage: hook|projects|university|future|all, sections, universityId?, profile? } — feedback on the applicant's own text. */
aiRouter.post(
  '/essay-feedback',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const stage = ESSAY_STAGES.includes(req.body?.stage) ? req.body.stage : null;
    if (!stage) throw badRequest('Неизвестный этап письма', 'VALIDATION');
    const sections = requireObject(req.body?.sections, 'sections');
    const universityId = typeof req.body?.universityId === 'string' ? req.body.universityId : undefined;
    if (essayStageTexts(stage, sections).join(' ').length < 40) throw badRequest('Сначала напишите хотя бы пару предложений на этом этапе', 'ESSAY_TOO_SHORT');
    if (JSON.stringify(sections).length > 40_000) throw badRequest('Текст слишком длинный', 'VALIDATION');
    res.json(await essayFeedback({ userId: req.user?.id, stage, sections, universityId, profile: profileOf(req.body), language: pickLang(req), uiState: uiStateOf(req.body) }));
  }),
);

aiRouter.post(
  '/essay-review',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const essay = requireString(req.body?.essay, 'essay', { min: 80, max: 14000 });
    res.json(await reviewEssay({ userId: req.user?.id, essay, universityId: req.body?.universityId, profile: profileOf(req.body), language: pickLang(req), uiState: uiStateOf(req.body) }));
  }),
);

aiRouter.post(
  '/translate',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const texts = Array.isArray(req.body?.texts) ? req.body.texts.map((t) => String(t ?? '').slice(0, 4000)).slice(0, 150) : null;
    if (!texts) throw badRequest('Ожидается массив texts', 'VALIDATION');
    const target = pickLang({ query: { lang: req.body?.targetLang } });
    res.json({ targetLang: target, items: await translateTexts(texts, target) });
  }),
);

/** Body: { audio: { mimeType, dataBase64, fileName? } } */
aiRouter.post(
  '/transcribe',
  aiLimiter,
  asyncHandler(async (req, res) => {
    const a = req.body?.audio;
    if (!a || typeof a.dataBase64 !== 'string') throw badRequest('Аудио не получено', 'NO_FILE');
    const buffer = Buffer.from(a.dataBase64.replace(/^data:[^;]+;base64,/, ''), 'base64');
    if (!buffer.length || buffer.length > 20 * 1024 * 1024) throw badRequest('Аудиофайл пустой или больше 20 МБ', 'FILE_TOO_LARGE');
    const lang = pickLang(req);
    const text = await transcribeAudio(buffer, a.fileName || 'audio.webm', a.mimeType || 'audio/webm', lang === 'kk' ? 'kk' : lang);
    res.json({ text });
  }),
);
