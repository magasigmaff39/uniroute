// @ts-check
import { Router } from 'express';
import { EDUCATIONAL_NEWS, getRecommendedNews } from '../../shared/data/news/index.js';

export const newsRouter = Router();

// GET /api/news — List educational news with filters
newsRouter.get('/', (req, res) => {
  const { category, track, tag, q, limit } = req.query;
  let list = [...EDUCATIONAL_NEWS];

  if (category && category !== 'all') {
    list = list.filter((n) => n.category === category || n.category === 'all');
  }

  if (track && track !== 'all') {
    list = list.filter((n) => n.targetTrack === track || n.category === track || n.category === 'all');
  }

  if (tag) {
    const tLower = String(tag).toLowerCase();
    list = list.filter((n) => n.tags.some((t) => t.toLowerCase().includes(tLower)));
  }

  if (q) {
    const query = String(q).toLowerCase();
    list = list.filter((n) =>
      [n.title, n.summary, n.content, n.institutionName, ...n.tags].some((field) =>
        String(field).toLowerCase().includes(query),
      ),
    );
  }

  // Sort by date descending
  list.sort((a, b) => b.date.localeCompare(a.date));

  if (limit) {
    list = list.slice(0, Math.max(1, Number(limit)));
  }

  res.json({
    news: list,
    total: list.length,
  });
});

// GET /api/news/recommended — Personalized news recommendations based on profile
newsRouter.get('/recommended', (req, res) => {
  const { track, grade, targetIds, category } = req.query;

  const targetList = targetIds ? String(targetIds).split(',').map((s) => s.trim()).filter(Boolean) : [];

  const recommended = getRecommendedNews({
    category: category ? String(category) : undefined,
    track: track ? String(track) : undefined,
    grade: grade ? String(grade) : undefined,
    targetIds: targetList,
  });

  res.json({
    news: recommended,
    total: recommended.length,
    matchedTrack: track || 'all',
  });
});

// GET /api/news/:id — Retrieve single news item
newsRouter.get('/:id', (req, res) => {
  const item = EDUCATIONAL_NEWS.find((n) => n.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Новость не найдена', code: 'NEWS_NOT_FOUND' });
  }
  res.json({ news: item });
});
