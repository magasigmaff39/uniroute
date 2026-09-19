// Central configuration. Values come from `.env` (loaded with Node's built-in process.loadEnvFile)
// with sensible defaults for local development. Nothing secret is hard-coded here — API keys live only
// in `.env` (git-ignored) or in Firebase Secret Manager for the deployed function.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(__dirname, '..');

// Load .env once (silently ignore if absent — e.g. in Cloud Functions where secrets are injected directly)
for (const candidate of ['.env', '.env.local']) {
  try {
    process.loadEnvFile(path.join(ROOT_DIR, candidate));
  } catch {
    /* file missing — fine */
  }
}

const env = process.env;
/** True inside Cloud Functions for Firebase / Cloud Run. */
export const isFirebaseRuntime = Boolean(env.K_SERVICE || env.FUNCTION_TARGET || env.FUNCTIONS_EMULATOR);
const isServerless = isFirebaseRuntime || Boolean(env.VERCEL);
const bool = (v, fallback) => (v === undefined || v === '' ? fallback : ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase()));
const num = (v, fallback) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? fallback : Number(v));
const list = (v, fallback = []) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : fallback);

let firebaseRuntimeConfig = {};
try {
  firebaseRuntimeConfig = env.FIREBASE_CONFIG ? JSON.parse(env.FIREBASE_CONFIG) : {};
} catch {
  firebaseRuntimeConfig = {};
}

const firebaseProjectId = env.FIREBASE_PROJECT_ID || firebaseRuntimeConfig.projectId || env.GCLOUD_PROJECT || env.GOOGLE_CLOUD_PROJECT || '';
const dbDriver = env.DB_DRIVER || (isFirebaseRuntime || env.FIREBASE_SERVICE_ACCOUNT ? 'firestore' : 'sqlite');

export const config = {
  env: env.NODE_ENV || 'development',
  // API_PORT wins over PORT: dev tools often inject PORT for the *frontend* dev server.
  port: num(env.API_PORT ?? env.PORT, 3001),
  host: env.HOST || '127.0.0.1',
  /** Public origin of the frontend (used in emails); Firebase Hosting URL by default in production. */
  publicUrl: env.PUBLIC_URL || (firebaseProjectId ? `https://${firebaseProjectId}.web.app` : 'http://localhost:5173'),
  /** Origins allowed by CORS. Comma-separated in .env. */
  corsOrigins: list(env.CORS_ORIGINS, ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173']),

  /** Persistence: SQLite on a laptop, Cloud Firestore when deployed (or when a service account is configured). */
  db: {
    driver: dbDriver,
    file: env.DB_FILE || (isServerless ? path.join('/tmp', 'admitroute.sqlite') : path.join(ROOT_DIR, 'server', 'data', 'admitroute.sqlite')),
  },
  /** Binary uploads: local disk, Cloud Storage bucket ("gcs") or chunked Firestore blobs ("firestore"). */
  files: {
    driver: env.FILE_STORAGE || (dbDriver === 'firestore' ? 'firestore' : 'local'),
    uploadsDir: env.UPLOADS_DIR || (isServerless ? path.join('/tmp', 'uploads') : path.join(ROOT_DIR, 'server', 'data', 'uploads')),
    maxUploadBytes: num(env.MAX_UPLOAD_MB, 15) * 1024 * 1024,
  },
  firebase: {
    projectId: firebaseProjectId,
    storageBucket: env.FIREBASE_STORAGE_BUCKET || firebaseRuntimeConfig.storageBucket || '',
    /** Inline JSON or a path to a service-account file — only needed to use Firestore from a laptop. */
    serviceAccount: (env.FIREBASE_SERVICE_ACCOUNT || '').trim(),
    /** Google sign-in: ID tokens are verified against this project. */
    googleSignIn: bool(env.GOOGLE_SIGN_IN, Boolean(firebaseProjectId)),
  },

  /** Sessions: opaque bearer tokens; only their SHA-256 hash is stored. */
  sessionTtlDays: num(env.SESSION_TTL_DAYS, 30),

  /** OTP / email. Registration works without a code by default; set OTP_REQUIRED=true to enforce verification. */
  otp: {
    required: bool(env.OTP_REQUIRED, false),
    ttlMinutes: num(env.OTP_TTL_MINUTES, 10),
    devMode: bool(env.OTP_DEV_MODE, env.NODE_ENV !== 'production'),
  },
  smtp: {
    user: (env.GMAIL_USER || env.SMTP_USER || '').trim(),
    pass: (env.GMAIL_APP_PASSWORD || env.SMTP_PASS || '').replace(/\s+/g, ''),
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port: num(env.SMTP_PORT, 587),
    from: env.MAIL_FROM || 'UniRoute',
  },

  /** Gemini (Google AI Studio) — primary model provider. Newer models are tried first, older ones are fallbacks. */
  gemini: {
    apiKey: (env.GEMINI_API_KEY || '').trim(),
    baseUrl: env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    models: {
      smart: list(env.GEMINI_SMART_MODELS, ['gemini-3-flash-preview', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']),
      fast: list(env.GEMINI_FAST_MODELS, ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-3.5-flash']),
      deep: list(env.GEMINI_DEEP_MODELS, ['gemini-3-flash-preview', 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite']),
    },
    timeoutMs: num(env.GEMINI_TIMEOUT_MS, 90_000),
    /** How long a model that answered 429/503 is skipped before being retried (doubles on repeated failures). */
    cooldownMs: num(env.GEMINI_COOLDOWN_MS, 600_000),
    /** Fallback (preview) models get a shorter per-attempt timeout so an overloaded model cannot stall a request. */
    fallbackTimeoutMs: num(env.GEMINI_FALLBACK_TIMEOUT_MS, 30_000),
    /** Streaming: if no text arrives within this window the next model is tried (keeps chat snappy under load). */
    firstTokenTimeoutMs: num(env.GEMINI_FIRST_TOKEN_TIMEOUT_MS, 16_000),
    /** Streaming: after this many ms without a first token, a fast 'lite' model is raced against the primary. */
    hedgeAfterMs: num(env.GEMINI_HEDGE_AFTER_MS, 5_000),
  },

  /** Groq (OpenAI-compatible) — fallback text provider and Whisper transcription. */
  ai: {
    apiKey: (env.GROQ_API_KEY || '').trim(),
    baseUrl: env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    chatModel: env.GROQ_CHAT_MODEL || 'openai/gpt-oss-120b',
    fastModel: env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b',
    researchModel: env.GROQ_RESEARCH_MODEL || 'groq/compound',
    transcribeModel: env.GROQ_TRANSCRIBE_MODEL || 'whisper-large-v3-turbo',
    maxTokens: num(env.GROQ_MAX_TOKENS, 1800),
    timeoutMs: num(env.GROQ_TIMEOUT_MS, 60000),
  },

  /** Fixed-window rate limits per IP (+ user). */
  rateLimit: {
    windowMs: 60_000,
    general: num(env.RATE_LIMIT_GENERAL, 240),
    ai: num(env.RATE_LIMIT_AI, 30),
    auth: num(env.RATE_LIMIT_AUTH, 20),
    upload: num(env.RATE_LIMIT_UPLOAD, 30),
  },

  /** Cache TTLs (ms) for expensive external lookups. */
  cache: {
    newsMs: num(env.CACHE_NEWS_MINUTES, 60) * 60_000,
    socialMs: num(env.CACHE_SOCIAL_HOURS, 12) * 3_600_000,
    translationMs: num(env.CACHE_TRANSLATION_DAYS, 30) * 86_400_000,
  },
};

export const isProduction = config.env === 'production';
