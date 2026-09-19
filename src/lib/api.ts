// Typed HTTP client for the UniRoute backend. The browser never talks to AI providers directly and
// never holds API keys: everything goes through /api. Errors surface as ApiError so the UI can show an
// honest message instead of inventing data.
import type {
  ApplicantProfile,
  AppLanguage,
  ChanceEstimate,
  ChatMessage,
  ComparisonInsights,
  EssayDraft,
  EssayFeedback,
  EssayStage,
  PlannerState,
  PortfolioFeedback,
  DocumentChecklistItem,
  DocumentKind,
  EducationalNewsItem,
  TargetTrack,
  FitTier,
  Olympiad,
  OlympiadAdvice,
  PortfolioEvaluation,
  PortfolioFieldId,
  PortfolioItem,
  PortfolioItemInput,
  PortfolioScore,
  RoadmapStep,
  TaskCategory,
  TaskStatus,
  UiState,
  University,
  UniversityComparison,
  UploadedDocument,
  UserTask,
} from '../types';

const RAW_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.trim() || '';
export const API_BASE = RAW_BASE ? RAW_BASE.replace(/\/$/, '') + (RAW_BASE.endsWith('/api') ? '' : '/api') : '/api';

const TOKEN_KEY = 'admitroute_token';
const GUEST_KEY = 'admitroute_guest_id';
const LANG_KEY = 'admitroute_lang';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const isNetworkError = (err: unknown) => err instanceof ApiError && err.code === 'NETWORK';

// ---------------------------------------------------------------------------
// Token / guest / language helpers (localStorage, guarded)
// ---------------------------------------------------------------------------

const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

export const getToken = () => storage.get(TOKEN_KEY);
export const setToken = (token: string | null) => (token ? storage.set(TOKEN_KEY, token) : storage.remove(TOKEN_KEY));

export function getGuestId(): string {
  let id = storage.get(GUEST_KEY);
  if (!id) {
    id = 'guest_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    storage.set(GUEST_KEY, id);
  }
  return id;
}

export const getStoredLanguage = (): AppLanguage | null => {
  const l = storage.get(LANG_KEY);
  return l === 'kk' || l === 'en' || l === 'ru' ? l : null;
};
export const setStoredLanguage = (lang: AppLanguage) => storage.set(LANG_KEY, lang);

/** Session-scoped UI state (current step, compared universities…) shared with every AI request. */
let currentUiState: UiState = {};
export const setUiState = (patch: UiState) => {
  currentUiState = { ...currentUiState, ...patch };
};
export const getUiState = (): UiState => ({ ...currentUiState, language: getStoredLanguage() || 'ru' });

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'x-guest-id': getGuestId(),
    'x-app-language': getStoredLanguage() || 'ru',
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120_000);
  opts.signal?.addEventListener('abort', () => controller.abort());

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { method: opts.method || 'GET', headers, body, signal: controller.signal });
  } catch (err) {
    clearTimeout(timer);
    if (import.meta.env.DEV) console.warn('[api] backend unreachable — start it with "npm run dev" (client + server)');
    throw new ApiError(0, 'Сервер временно недоступен — попробуйте ещё раз через минуту.', 'NETWORK', err);
  }
  clearTimeout(timer);

  const text = await res.text();
  const isHtml = /^\s*</.test(text);
  let data: any = null;
  if (text && !isHtml) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    if (res.status === 401 && token && path !== '/auth/login') setToken(null);
    const msg = isHtml ? 'API недоступен по этому адресу' : data?.error || `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, isHtml ? 'NETWORK' : data?.code || 'HTTP_ERROR', data?.details);
  }
  if (isHtml) throw new ApiError(502, 'Некорректный ответ сервера', 'NETWORK');
  return data as T;
}

/** Read a file as base64 (without the data: prefix) for JSON uploads. */
export function fileToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^;]*;base64,/, ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export interface HealthInfo {
  status: string;
  version: string;
  runtime: string;
  storage: { db: string; files: string };
  ai: { primary: 'gemini' | 'groq' | 'none'; gemini: { configured: boolean }; groq: { configured: boolean } };
  mail: { configured: boolean; verified?: boolean };
  auth: { googleSignIn: boolean; otpRequired: boolean; otpDevMode: boolean };
}

export async function pingBackend(): Promise<{ ok: boolean; ai?: boolean; mail?: boolean; health?: HealthInfo }> {
  try {
    const h = await request<HealthInfo>('/health', { timeoutMs: 8000 });
    return { ok: h.status === 'ok', ai: h.ai?.primary !== 'none', mail: h.mail?.configured, health: h };
  } catch {
    return { ok: false, ai: false, mail: false };
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface UserAccount {
  id: string;
  firstName: string;
  lastName: string;
  gmail: string;
  email?: string;
  age: number;
  grade: ApplicantProfile['grade'];
  targetTrack?: TargetTrack;
  photoUrl?: string | null;
  providers?: ('password' | 'google')[];
  createdAt: string;
  isEmailVerified?: boolean;
  preferredLanguage?: AppLanguage;
}

export interface AuthResponse {
  success: boolean;
  user: UserAccount;
  token: string;
  expiresAt: string;
  isNew?: boolean;
  message?: string;
}

export interface AuthConfig {
  googleSignIn: boolean;
  otpRequired: boolean;
  otpDevMode: boolean;
  firebaseProjectId: string | null;
}

export const authApi = {
  config: () => request<AuthConfig>('/auth/config', { timeoutMs: 8000 }),
  sendOtp: (email: string, name?: string) =>
    request<{ success: boolean; delivered: boolean; devCode?: string; message: string; ttlMinutes: number }>('/auth/send-otp', { method: 'POST', body: { email, name } }),
  verifyOtp: (email: string, code: string) => request<{ success: boolean; verified: boolean }>('/auth/verify-otp', { method: 'POST', body: { email, code } }),
  google: (idToken: string, preferredLanguage?: AppLanguage) => request<AuthResponse>('/auth/google', { method: 'POST', body: { idToken, preferredLanguage } }),
  register: (payload: { firstName: string; lastName: string; email: string; age: number; grade: string; targetTrack?: TargetTrack; password: string; preferredLanguage?: AppLanguage }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: payload }),
  login: (email: string, password: string) => request<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: UserAccount; profile: { profile: ApplicantProfile; updatedAt: string } | null }>('/auth/me'),
  updateMe: (patch: Partial<Pick<UserAccount, 'firstName' | 'lastName' | 'age' | 'grade' | 'targetTrack' | 'preferredLanguage'>>) =>
    request<{ user: UserAccount }>('/auth/me', { method: 'PATCH', body: patch }),
  deleteAccount: () => request<{ success: boolean }>('/auth/me', { method: 'DELETE' }),
  getProfile: () => request<{ profile: ApplicantProfile | null; updatedAt: string | null }>('/auth/profile'),
  saveProfile: (profile: ApplicantProfile) => request<{ profile: ApplicantProfile; updatedAt: string }>('/auth/profile', { method: 'PUT', body: { profile } }),
};

export const newsApi = {
  list: (params?: { category?: string; track?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.category && params.category !== 'all') q.set('category', params.category);
    if (params?.track && params.track !== 'all') q.set('track', params.track);
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return request<{ news: EducationalNewsItem[]; total: number }>(`/news${qs ? `?${qs}` : ''}`);
  },
  recommended: (params?: { track?: string; grade?: string; targetIds?: string[] }) => {
    const q = new URLSearchParams();
    if (params?.track) q.set('track', params.track);
    if (params?.grade) q.set('grade', params.grade);
    if (params?.targetIds?.length) q.set('targetIds', params.targetIds.join(','));
    const qs = q.toString();
    return request<{ news: EducationalNewsItem[]; total: number; matchedTrack: string }>(`/news/recommended${qs ? `?${qs}` : ''}`);
  },
};

// ---------------------------------------------------------------------------
// Universities
// ---------------------------------------------------------------------------

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  description?: string;
}

export interface NewsAnalysis {
  universityId: string;
  headlines: NewsItem[];
  summary: string;
  implications?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  sources?: string[];
  model: string;
  cached?: boolean;
}

export interface SocialPlatformSignal {
  platform: 'instagram' | 'tiktok' | 'youtube';
  url: string;
  available: boolean;
  title?: string;
  description?: string;
  followers?: number | null;
  subscribers?: number | null;
  posts?: number | null;
  recentVideos?: { title: string; published: string; link: string; views: number }[];
  reason?: string;
}

export interface SocialAnalysis {
  universityId: string;
  signals: { platforms: SocialPlatformSignal[]; note?: string };
  summary?: string;
  verdict?: string;
  model?: string;
  presence?: { instagram?: string; tiktok?: string; youtube?: string };
  whatTheyHighlight?: string[];
  tone?: string;
  forInternationalStudents?: string;
  redFlags?: string[];
}

export const universitiesApi = {
  news: (id: string, lang: AppLanguage) => request<NewsAnalysis>(`/universities/${id}/news?lang=${lang}`),
  newsAnalysis: (id: string, lang: AppLanguage) => request<NewsAnalysis>(`/universities/${id}/news/analysis?lang=${lang}`),
  socialSignals: (id: string) => request<{ universityId: string; platforms: SocialPlatformSignal[]; note?: string }>(`/universities/${id}/social/signals`),
  socialAnalysis: (id: string, lang: AppLanguage) => request<SocialAnalysis>(`/universities/${id}/social/analysis?lang=${lang}`),
  chance: (id: string, profile: ApplicantProfile) => request<ChanceEstimate>(`/universities/${id}/chance`, { method: 'POST', body: { profile } }),
};

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

export interface RankedUniversity {
  id: string;
  name: string;
  fitScore: number;
  chance: number;
  tier: 'Dream' | 'Target' | 'Safety';
  reasons: string[];
  risks: string[];
  healthAndLifestyle?: string;
  estimate?: ChanceEstimate;
  links?: University['links'];
}

export interface ApplicantAnalysis {
  summary: string;
  ranked: RankedUniversity[];
  redFlags: string[];
  nextSteps: { title: string; deadline: string; category: TaskCategory }[];
  testStrategy: string;
  model: string;
}

/** Express verdict after the 7-question test: a short AI paragraph plus the system's three picks. */
export interface QuickVerdict {
  verdict: string;
  focus: string[];
  confidence: 'low' | 'medium';
  picks: { id: string; name: string; shortName: string; probability: number; tier: FitTier; reasons: string[] }[];
  model: string;
}

export interface EssayReview {
  score: number | null;
  verdict?: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  redFlags?: string[];
  missedStories?: string[];
  rewriteOpening?: string;
  model: string;
}

export interface ChatReply {
  reply: string;
  model: string;
  provider?: string;
  sources: { id: string; name: string; url: string }[];
}

export const aiApi = {
  status: () => request<{ primary: string; gemini: { configured: boolean; tiers: Record<string, string> }; groq: { configured: boolean } }>('/ai/status'),
  history: () => request<{ messages: ChatMessage[] }>('/ai/history'),
  clearHistory: () => request<{ success: boolean }>('/ai/history', { method: 'DELETE' }),
  chat: (message: string, profile: ApplicantProfile | null, language: AppLanguage) =>
    request<ChatReply>('/ai/chat', { method: 'POST', body: { message, profile, language, uiState: getUiState() }, timeoutMs: 150_000 }),
  analyze: (profile: ApplicantProfile, freeText: string, language: AppLanguage, limit = 6) =>
    request<ApplicantAnalysis>('/ai/analyze', { method: 'POST', body: { profile, freeText, language, limit, uiState: getUiState() }, timeoutMs: 180_000 }),
  compare: (universityIds: string[], profile: ApplicantProfile | null, language: AppLanguage) =>
    request<UniversityComparison>('/ai/compare', { method: 'POST', body: { universityIds, profile, language, uiState: getUiState() }, timeoutMs: 180_000 }),
  /** Differences between universities explained by facts and the profile — deliberately without a ranking. */
  compareInsights: (universityIds: string[], profile: ApplicantProfile | null, language: AppLanguage) =>
    request<ComparisonInsights>('/ai/compare-insights', { method: 'POST', body: { universityIds, profile, language, uiState: getUiState() }, timeoutMs: 150_000 }),
  essayFeedback: (stage: EssayStage | 'all', sections: EssayDraft, universityId: string | undefined, profile: ApplicantProfile | null, language: AppLanguage) =>
    request<EssayFeedback>('/ai/essay-feedback', { method: 'POST', body: { stage, sections, universityId, profile, language, uiState: { ...getUiState(), essayDraft: undefined } }, timeoutMs: 120_000 }),
  essayReview: (essay: string, universityId: string | undefined, language: AppLanguage, profile?: ApplicantProfile | null) =>
    request<EssayReview>('/ai/essay-review', { method: 'POST', body: { essay, universityId, language, profile, uiState: { ...getUiState(), essayDraft: undefined } }, timeoutMs: 150_000 }),
  quickVerdict: (profile: ApplicantProfile, language: AppLanguage) =>
    request<QuickVerdict>('/ai/quick-verdict', { method: 'POST', body: { profile, language, uiState: getUiState() }, timeoutMs: 45_000 }),
  translate: (texts: string[], targetLang: AppLanguage) => request<{ items: string[] }>('/ai/translate', { method: 'POST', body: { texts, targetLang }, timeoutMs: 90_000 }),
  transcribe: async (blob: Blob, language: AppLanguage) =>
    request<{ text: string }>(`/ai/transcribe?lang=${language}`, { method: 'POST', body: { audio: { mimeType: blob.type || 'audio/webm', fileName: 'voice.webm', dataBase64: await fileToBase64(blob) } } }),
};

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export interface TaskStats {
  total: number;
  done: number;
  doneOnTime: number;
  doneLate: number;
  overdue: number;
  upcoming: number;
  noDeadline: number;
  onTimeRate: number | null;
  byCategory: Record<string, number>;
}

/** Optional links of a task to a university, a planner deadline and an olympiad. */
export type TaskLinks = { universityId?: string | null; deadlineKey?: string | null; olympiadId?: string | null };
export type NewTask = { title: string; description?: string; category: TaskCategory; dueDate: string | null; status?: TaskStatus; source?: string } & TaskLinks;

export const tasksApi = {
  list: () => request<{ items: UserTask[]; stats: TaskStats }>('/tasks'),
  create: (task: NewTask) => request<UserTask>('/tasks', { method: 'POST', body: task }),
  bulkCreate: (items: ({ title: string; description?: string; category: TaskCategory; dueDate?: string | null; source?: string } & TaskLinks)[]) =>
    request<{ created: UserTask[]; items: UserTask[]; stats: TaskStats }>('/tasks/bulk', { method: 'POST', body: { items } }),
  update: (id: string, patch: Partial<{ title: string; description: string | null; category: TaskCategory; status: TaskStatus; dueDate: string | null } & TaskLinks>) =>
    request<UserTask>(`/tasks/${id}`, { method: 'PATCH', body: patch }),
  remove: (id: string) => request<{ success: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
  generate: (profile: ApplicantProfile) => request<{ created: UserTask[]; items: UserTask[]; stats: TaskStats }>('/tasks/generate', { method: 'POST', body: { profile } }),
};

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export const documentsApi = {
  checklist: (regions: string[]) =>
    request<{ items: DocumentChecklistItem[]; progress: { required: number; uploadedRequired: number; uploadedTotal: number; percent: number }; maxUploadMb: number }>(
      `/documents/checklist?regions=${regions.join(',')}`,
    ),
  list: () => request<{ items: UploadedDocument[] }>('/documents'),
  upload: async (file: File, kind: DocumentKind, note?: string) =>
    request<UploadedDocument>('/documents', {
      method: 'POST',
      body: { kind, note, file: { fileName: file.name, mimeType: file.type || 'application/octet-stream', dataBase64: await fileToBase64(file) } },
      timeoutMs: 180_000,
    }),
  remove: (id: string) => request<{ success: boolean }>(`/documents/${id}`, { method: 'DELETE' }),
  /** Downloads through fetch so the session token stays in the Authorization header (never in a URL). */
  download: async (doc: UploadedDocument) => {
    const token = getToken();
    const res = await fetch(`${API_BASE}${doc.downloadUrl.replace(/^\/api/, '')}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new ApiError(res.status, 'Не удалось скачать файл', 'DOWNLOAD_FAILED');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.originalName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
};

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export interface PortfolioMeta {
  types: { id: string; label: string; hint: string }[];
  levels: { id: string; label: string; weight: number }[];
  results: { id: string; label: string; weight: number }[];
  criteria: { id: string; title: string; description: string; weight: number }[];
  fields: { id: PortfolioFieldId; title: string }[];
}

export const portfolioApi = {
  meta: () => request<PortfolioMeta>('/portfolio/meta'),
  list: (field?: PortfolioFieldId) => request<{ items: PortfolioItem[]; score: PortfolioScore }>(`/portfolio${field ? `?field=${field}` : ''}`),
  create: (item: PortfolioItemInput) => request<PortfolioItem>('/portfolio', { method: 'POST', body: item }),
  update: (id: string, patch: Partial<PortfolioItemInput> & { excluded?: boolean }) => request<PortfolioItem>(`/portfolio/${id}`, { method: 'PATCH', body: patch }),
  remove: (id: string) => request<{ success: boolean }>(`/portfolio/${id}`, { method: 'DELETE' }),
  evaluate: (payload: { field?: PortfolioFieldId; universityIds?: string[]; profile?: ApplicantProfile | null; language: AppLanguage }) =>
    request<PortfolioEvaluation>('/portfolio/evaluate', { method: 'POST', body: { ...payload, uiState: getUiState() }, timeoutMs: 180_000 }),
  /** Concrete feedback against the published criteria of the selected universities. */
  feedback: (payload: { universityIds: string[]; profile?: ApplicantProfile | null; language: AppLanguage }) =>
    request<PortfolioFeedback>('/portfolio/feedback', { method: 'POST', body: { ...payload, uiState: getUiState() }, timeoutMs: 150_000 }),
};

// ---------------------------------------------------------------------------
// Planner (favourite olympiads, deadline statuses, own dates, essay draft)
// ---------------------------------------------------------------------------

export const plannerApi = {
  get: () => request<{ planner: PlannerState | null; updatedAt: string | null }>('/planner'),
  save: (planner: PlannerState) => request<{ planner: PlannerState; updatedAt: string }>('/planner', { method: 'PUT', body: { planner } }),
};

// ---------------------------------------------------------------------------
// Olympiads
// ---------------------------------------------------------------------------

export const olympiadsApi = {
  list: (params: Record<string, string | number | boolean | undefined> = {}) => {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '' && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return request<{ total: number; items: Olympiad[]; subjects: { id: string; label: string }[]; categories: Record<string, string> }>(`/olympiads${qs ? `?${qs}` : ''}`);
  },
  recommend: (profile: ApplicantProfile | null, limit = 12) =>
    request<{ items: Olympiad[]; calendar: { month: string; items: { id: string; shortName: string; phase: 'registration' | 'active'; url: string }[] }[] }>('/olympiads/recommend', {
      method: 'POST',
      body: { profile, limit },
    }),
  advice: (profile: ApplicantProfile | null, language: AppLanguage, limit = 8) =>
    request<OlympiadAdvice>('/olympiads/advice', { method: 'POST', body: { profile, language, limit, uiState: getUiState() }, timeoutMs: 150_000 }),
};

// ---------------------------------------------------------------------------
// Mail
// ---------------------------------------------------------------------------

export const mailApi = {
  sendPlan: (payload: { toEmail: string; studentName: string; readinessScore: number; roadmap: RoadmapStep[]; matchedUnis: University[] }) =>
    request<{ success: boolean; delivered: boolean; messageId?: string; recipient: string; service?: string }>('/mail/send-plan', { method: 'POST', body: payload }),
  status: () => request<{ configured: boolean; verified: boolean }>('/mail/status'),
};

// ---------------------------------------------------------------------------
// Streaming chat (Server-Sent Events over fetch)
// ---------------------------------------------------------------------------

export type ChatStreamEvent =
  | { type: 'status'; text: 'context' | 'thinking' | 'verifying' | 'fallback'; intents?: string[]; unsupported?: string[] }
  | { type: 'token'; text: string }
  | { type: 'revision'; text: string; unsupported?: string[] }
  | { type: 'sources'; items: { id: string; name: string; url: string }[] }
  | { type: 'done'; model: string; provider?: string; sources: { id: string; name: string; url: string }[]; messageId?: string | null; intents?: string[] }
  | { type: 'suggestions'; items: string[] }
  | { type: 'error'; message: string; code?: string };

/**
 * Streams an assistant answer. Resolves when the stream closes; `onEvent` receives every event in order.
 * Falls back to the plain endpoint when the browser cannot read the stream.
 */
export async function chatStream(
  message: string,
  profile: ApplicantProfile | null,
  language: AppLanguage,
  onEvent: (ev: ChatStreamEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'text/event-stream', 'x-guest-id': getGuestId(), 'x-app-language': language };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/ai/chat/stream`, { method: 'POST', headers, body: JSON.stringify({ message, profile, language, uiState: getUiState() }), signal });
  } catch (err) {
    if ((err as any)?.name === 'AbortError') return;
    throw new ApiError(0, 'Сервер временно недоступен — попробуйте ещё раз через минуту.', 'NETWORK', err);
  }
  if (!res.ok || !res.body || !(res.headers.get('content-type') || '').includes('text/event-stream')) {
    // Older backend or proxy without streaming: use the plain endpoint.
    if (res.status === 401 && token) setToken(null);
    if (!res.ok && res.status !== 404) {
      const data = await res.json().catch(() => null);
      throw new ApiError(res.status, data?.error || `HTTP ${res.status}`, data?.code || 'HTTP_ERROR');
    }
    const plain = await aiApi.chat(message, profile, language);
    onEvent({ type: 'token', text: plain.reply });
    onEvent({ type: 'done', model: plain.model, provider: plain.provider, sources: plain.sources });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data:')) continue;
        try {
          onEvent(JSON.parse(line.slice(5)) as ChatStreamEvent);
        } catch {
          /* ignore malformed line */
        }
      }
    }
  }
}

export const feedbackApi = {
  send: (payload: { messageId?: string | null; rating: 'up' | 'down'; comment?: string; question?: string; answer?: string }) =>
    request<{ success: boolean; id: string }>('/ai/feedback', { method: 'POST', body: payload }),
};
