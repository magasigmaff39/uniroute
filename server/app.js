// UniRoute AI backend — Express 5 application instance.
// Exported for the standalone server (server/index.js) and for Cloud Functions for Firebase (server/firebase.js).
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { config, isProduction, isFirebaseRuntime, ROOT_DIR } from './config.js';
import { optionalAuth } from './middleware/auth.js';
import { generalLimiter, authLimiter } from './middleware/rateLimit.js';
import { errorMiddleware, notFoundMiddleware } from './utils/errors.js';
import { mailStatus } from './services/mail.service.js';
import { aiStatus } from './services/ai.service.js';
import { validateUniversityDatabase, UNIVERSITY_COUNTS } from '../shared/data/universities/index.js';
import { OLYMPIAD_COUNTS } from '../shared/data/olympiads.js';

import { authRouter, sendOtpHandler, verifyOtpHandler } from './routes/auth.routes.js';
import { universitiesRouter } from './routes/universities.routes.js';
import { aiRouter } from './routes/ai.routes.js';
import { tasksRouter } from './routes/tasks.routes.js';
import { documentsRouter } from './routes/documents.routes.js';
import { portfolioRouter } from './routes/portfolio.routes.js';
import { olympiadsRouter } from './routes/olympiads.routes.js';
import { mailRouter, sendPlanHandler } from './routes/mail.routes.js';
import { newsRouter } from './routes/news.routes.js';
import { plannerRouter } from './routes/planner.routes.js';

validateUniversityDatabase();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

const allowedOrigin = (origin) =>
  !origin ||
  !isProduction ||
  config.corsOrigins.includes(origin) ||
  /^https:\/\/[a-z0-9-]+\.(web\.app|firebaseapp\.com|vercel\.app)$/.test(origin) ||
  (config.publicUrl && origin === config.publicUrl);

app.use(
  cors({
    origin(origin, cb) {
      if (allowedOrigin(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} не разрешён`));
    },
    credentials: false,
    maxAge: 600,
  }),
);

// Security headers for API responses (the static site gets its own set from firebase.json).
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Large JSON bodies only where files travel as base64; everything else stays small.
const uploadBodyLimit = `${Math.ceil((config.files.maxUploadBytes * 1.4) / 1048576) + 1}mb`;
app.use(['/api/documents', '/api/ai/transcribe'], express.json({ limit: uploadBodyLimit }));
app.use(express.json({ limit: '2mb' }));
app.use(optionalAuth);
app.use('/api', generalLimiter);

// Compact request log
app.use((req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    if (req.path.startsWith('/api')) {
      console.log(`${res.statusCode} ${req.method} ${req.originalUrl} ${Date.now() - started}ms${req.user ? ` u:${req.user.id.slice(0, 12)}` : ''}`);
    }
  });
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'UniRoute AI Backend',
    version: '3.0.0',
    time: new Date().toISOString(),
    runtime: isFirebaseRuntime ? 'firebase-functions' : 'node',
    storage: { db: config.db.driver, files: config.files.driver },
    universities: UNIVERSITY_COUNTS,
    olympiads: OLYMPIAD_COUNTS,
    ai: aiStatus(),
    mail: mailStatus(),
    auth: { googleSignIn: config.firebase.googleSignIn && Boolean(config.firebase.projectId), otpRequired: config.otp.required, otpDevMode: config.otp.devMode },
  });
});

app.use('/api/auth', authRouter);
app.use('/api/universities', universitiesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/portfolio', portfolioRouter);
app.use('/api/olympiads', olympiadsRouter);
app.use('/api/mail', mailRouter);
app.use('/api/news', newsRouter);
app.use('/api/planner', plannerRouter);

// Backwards-compatible aliases for the original frontend endpoints.
app.post('/api/send-otp', authLimiter, sendOtpHandler);
app.post('/api/verify-otp', authLimiter, verifyOtpHandler);
app.post('/api/send-plan', authLimiter, sendPlanHandler);

// Standalone production server: serve the built frontend from dist/ (Firebase Hosting does this in the cloud).
if (isProduction && !isFirebaseRuntime && !process.env.VERCEL) {
  const dist = path.join(ROOT_DIR, 'dist');
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use('/api', notFoundMiddleware);
app.use(errorMiddleware);

export default app;
