// Accounts & sessions. Passwords are hashed with scrypt (node:crypto); sessions are random 256-bit bearer
// tokens of which only the SHA-256 hash is persisted. Google sign-in verifies a Firebase ID token and
// links (or creates) the account by email.
import crypto from 'node:crypto';
import { getStore, nowIso } from '../db/store.js';
import { config } from '../config.js';
import { badRequest, conflict, unauthorized, HttpError } from '../utils/errors.js';

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
export const GRADES = ['grade_7', 'grade_8', 'grade_9', 'grade_10', 'grade_11', 'grade_12', 'college', 'gap_year'];
export const TARGET_TRACKS = ['university', 'college', 'school', 'all'];
export const LANGUAGES = ['kk', 'en', 'ru'];

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64, SCRYPT_PARAMS).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password, salt, expectedHash) {
  if (!salt || !expectedHash) return false;
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expectedHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

/** Strip secrets; keep the camelCase shape the frontend already uses (`gmail` is a legacy alias). */
export function toPublicUser(doc) {
  if (!doc) return null;
  return {
    id: doc.id,
    firstName: doc.firstName,
    lastName: doc.lastName || '',
    gmail: doc.email,
    email: doc.email,
    age: doc.age,
    grade: doc.grade,
    targetTrack: doc.targetTrack || 'all',
    photoUrl: doc.photoUrl || null,
    providers: doc.providers || ['password'],
    createdAt: doc.createdAt,
    lastLoginAt: doc.lastLoginAt || null,
    isEmailVerified: Boolean(doc.isEmailVerified),
    preferredLanguage: doc.preferredLanguage || 'ru',
  };
}

export async function findUserByEmail(email) {
  const store = await getStore();
  const rows = await store.find('users', { where: [['email', '==', String(email).toLowerCase()]], limit: 1 });
  return rows[0] || null;
}

export async function findUserById(id) {
  const store = await getStore();
  return store.get('users', id);
}

export async function createSession(userId, userAgent) {
  const store = await getStore();
  const token = crypto.randomBytes(32).toString('base64url');
  const created = new Date();
  const expires = new Date(created.getTime() + config.sessionTtlDays * 86_400_000);
  await store.set('sessions', hashToken(token), {
    userId,
    createdAt: created.toISOString(),
    expiresAt: expires.toISOString(),
    userAgent: (userAgent || '').slice(0, 300),
  });
  return { token, expiresAt: expires.toISOString() };
}

/** Returns the user document for a valid session token, or null. */
export async function resolveSession(token) {
  if (!token || typeof token !== 'string' || token.length < 20) return null;
  const store = await getStore();
  const session = await store.get('sessions', hashToken(token));
  if (!session) return null;
  if (session.expiresAt < nowIso()) {
    store.remove('sessions', session.id).catch(() => {});
    return null;
  }
  return store.get('users', session.userId);
}

export async function destroySession(token) {
  if (!token) return;
  const store = await getStore();
  await store.remove('sessions', hashToken(token));
}

export async function destroyAllSessions(userId) {
  const store = await getStore();
  await store.removeWhere('sessions', { where: [['userId', '==', userId]] });
}

function newUserId() {
  return `usr_${crypto.randomUUID()}`;
}

export async function registerUser({ firstName, lastName, email, age, grade, targetTrack, password, isEmailVerified, preferredLanguage, userAgent }) {
  if (!password || password.length < 6) throw badRequest('Пароль должен содержать не менее 6 символов', 'WEAK_PASSWORD');
  if (password.length > 128) throw badRequest('Пароль слишком длинный', 'WEAK_PASSWORD');
  email = String(email).toLowerCase();
  if (await findUserByEmail(email)) throw conflict('Аккаунт с таким email уже зарегистрирован', 'EMAIL_TAKEN');
  if (!GRADES.includes(grade)) grade = 'grade_10';
  if (!TARGET_TRACKS.includes(targetTrack)) targetTrack = 'all';
  if (!LANGUAGES.includes(preferredLanguage)) preferredLanguage = 'ru';

  const store = await getStore();
  const { hash, salt } = hashPassword(password);
  const id = newUserId();
  const created = nowIso();
  const user = await store.set('users', id, {
    email,
    firstName: String(firstName).trim().slice(0, 60),
    lastName: String(lastName || '').trim().slice(0, 60),
    age: Number(age) || 16,
    grade,
    targetTrack,
    passwordHash: hash,
    passwordSalt: salt,
    providers: ['password'],
    isEmailVerified: Boolean(isEmailVerified),
    preferredLanguage,
    createdAt: created,
    lastLoginAt: created,
  });
  const session = await createSession(id, userAgent);
  return { user: toPublicUser(user), session };
}

export async function loginUser({ email, password, userAgent }) {
  const doc = await findUserByEmail(email);
  // Same message for unknown email and wrong password — do not leak which one it was.
  if (!doc || !verifyPassword(password, doc.passwordSalt, doc.passwordHash)) {
    throw unauthorized('Неверный email или пароль', 'INVALID_CREDENTIALS');
  }
  const store = await getStore();
  const updated = await store.update('users', doc.id, { lastLoginAt: nowIso() });
  const session = await createSession(doc.id, userAgent);
  return { user: toPublicUser(updated), session };
}

// ---------------------------------------------------------------------------
// Google sign-in (Firebase Authentication ID token → our own session)
// ---------------------------------------------------------------------------

function splitName(displayName, email) {
  const parts = String(displayName || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: (email || '').split('@')[0] || 'Ученик', lastName: '' };
  return { firstName: parts[0].slice(0, 60), lastName: parts.slice(1).join(' ').slice(0, 60) };
}

export async function loginWithGoogle({ idToken, userAgent, preferredLanguage }) {
  if (!config.firebase.googleSignIn || !config.firebase.projectId) {
    throw new HttpError(503, 'Вход через Google не настроен на сервере', 'GOOGLE_NOT_CONFIGURED');
  }
  if (!idToken || typeof idToken !== 'string' || idToken.length > 4096) throw badRequest('Некорректный токен Google', 'BAD_ID_TOKEN');

  let decoded;
  try {
    const { getAdminAuth } = await import('../db/firebaseAdmin.js');
    const auth = await getAdminAuth();
    decoded = await auth.verifyIdToken(idToken, true);
  } catch (err) {
    throw unauthorized(`Токен Google не прошёл проверку: ${err?.errorInfo?.code || err.message}`, 'GOOGLE_TOKEN_INVALID');
  }
  const email = String(decoded.email || '').toLowerCase();
  if (!email) throw badRequest('Google не передал email — разрешите доступ к адресу почты', 'GOOGLE_NO_EMAIL');
  if (decoded.email_verified === false) throw unauthorized('Email в аккаунте Google не подтверждён', 'GOOGLE_EMAIL_UNVERIFIED');

  const store = await getStore();
  let doc = await findUserByEmail(email);
  let isNew = false;
  const now = nowIso();
  const photoUrl = typeof decoded.picture === 'string' ? decoded.picture.slice(0, 500) : null;

  if (doc) {
    const providers = Array.from(new Set([...(doc.providers || ['password']), 'google']));
    doc = await store.update('users', doc.id, {
      providers,
      googleUid: decoded.uid,
      photoUrl: doc.photoUrl || photoUrl,
      isEmailVerified: true,
      lastLoginAt: now,
    });
  } else {
    isNew = true;
    const { firstName, lastName } = splitName(decoded.name, email);
    doc = await store.set('users', newUserId(), {
      email,
      firstName,
      lastName,
      age: 16,
      grade: 'grade_10',
      passwordHash: null,
      passwordSalt: null,
      providers: ['google'],
      googleUid: decoded.uid,
      photoUrl,
      isEmailVerified: true,
      preferredLanguage: LANGUAGES.includes(preferredLanguage) ? preferredLanguage : 'ru',
      createdAt: now,
      lastLoginAt: now,
    });
  }
  const session = await createSession(doc.id, userAgent);
  return { user: toPublicUser(doc), session, isNew };
}

// ---------------------------------------------------------------------------
// Account maintenance
// ---------------------------------------------------------------------------

export async function updateUser(userId, patch) {
  const store = await getStore();
  const current = await store.get('users', userId);
  if (!current) throw unauthorized();
  const next = {
    firstName: patch.firstName?.trim() ? String(patch.firstName).trim().slice(0, 60) : current.firstName,
    lastName: patch.lastName !== undefined ? String(patch.lastName).trim().slice(0, 60) : current.lastName,
    age: patch.age !== undefined ? Number(patch.age) || current.age : current.age,
    grade: GRADES.includes(patch.grade) ? patch.grade : current.grade,
    targetTrack: TARGET_TRACKS.includes(patch.targetTrack) ? patch.targetTrack : current.targetTrack || 'all',
    preferredLanguage: LANGUAGES.includes(patch.preferredLanguage) ? patch.preferredLanguage : current.preferredLanguage,
  };
  return toPublicUser(await store.update('users', userId, next));
}

export async function changePassword(userId, currentPassword, newPassword) {
  const store = await getStore();
  const doc = await store.get('users', userId);
  if (!doc) throw unauthorized();
  // Google-only accounts may set a first password without knowing a current one.
  if (doc.passwordHash && !verifyPassword(currentPassword, doc.passwordSalt, doc.passwordHash)) {
    throw unauthorized('Текущий пароль неверен', 'INVALID_CREDENTIALS');
  }
  if (!newPassword || newPassword.length < 6) throw badRequest('Новый пароль должен содержать не менее 6 символов', 'WEAK_PASSWORD');
  const { hash, salt } = hashPassword(newPassword);
  await store.update('users', userId, {
    passwordHash: hash,
    passwordSalt: salt,
    providers: Array.from(new Set([...(doc.providers || []), 'password'])),
  });
  await destroyAllSessions(userId); // log out everywhere
}

export async function markEmailVerified(email) {
  const doc = await findUserByEmail(email);
  if (!doc) return;
  const store = await getStore();
  await store.update('users', doc.id, { isEmailVerified: true });
}

export async function deleteAccount(userId) {
  const store = await getStore();
  for (const col of ['tasks', 'documents', 'portfolio_items', 'chat_messages', 'ai_analyses']) {
    await store.removeWhere(col, { where: [['userId', '==', userId]] });
  }
  await store.remove('profiles', userId);
  await store.remove('planners', userId);
  await destroyAllSessions(userId);
  await store.remove('users', userId);
}

// ---------------------------------------------------------------------------
// Profile persistence (JSON blob owned by the frontend ApplicantProfile type)
// ---------------------------------------------------------------------------

export async function getProfile(userId) {
  const store = await getStore();
  const row = await store.get('profiles', userId);
  return row ? { profile: row.profile, updatedAt: row.updatedAt } : null;
}

export async function saveProfile(userId, profile) {
  const json = JSON.stringify(profile);
  if (json.length > 200_000) throw badRequest('Профиль слишком большой', 'PROFILE_TOO_LARGE');
  const store = await getStore();
  const row = await store.set('profiles', userId, { userId, profile: JSON.parse(json), updatedAt: nowIso() });
  return { profile: row.profile, updatedAt: row.updatedAt };
}

export async function countUsers() {
  const store = await getStore();
  return store.count('users');
}
