// /api/auth — Google sign-in, registration (optional OTP), login, session, profile persistence.
import { Router } from 'express';
import { asyncHandler } from '../utils/errors.js';
import { requireEmail, requireString, optionalNumber, requireEnum, requireObject } from '../utils/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { requireAuth } from '../middleware/auth.js';
import { config } from '../config.js';
import {
  registerUser,
  loginUser,
  loginWithGoogle,
  destroySession,
  updateUser,
  changePassword,
  markEmailVerified,
  getProfile,
  saveProfile,
  countUsers,
  findUserByEmail,
  deleteAccount,
  GRADES,
  TARGET_TRACKS,
  LANGUAGES,
} from '../services/auth.service.js';
import { issueOtp, verifyOtp } from '../services/otp.service.js';

export const authRouter = Router();

// Recently verified emails (email → expiry) so /register can trust that OTP passed without a second round-trip.
// Kept in memory per instance; with OTP disabled by default this only matters when OTP_REQUIRED=true.
const verifiedEmails = new Map();
const markVerified = (email) => verifiedEmails.set(email, Date.now() + 30 * 60_000);
const consumeVerified = (email) => {
  const exp = verifiedEmails.get(email);
  if (exp && exp > Date.now()) {
    verifiedEmails.delete(email);
    return true;
  }
  return false;
};

const sessionResponse = (res, { user, session, isNew }, status = 200, message = 'Авторизация успешна') =>
  res.status(status).json({ success: true, user, token: session.token, expiresAt: session.expiresAt, isNew: Boolean(isNew), message });

// Public configuration the frontend needs to render the right buttons.
authRouter.get('/config', (_req, res) => {
  res.json({
    googleSignIn: config.firebase.googleSignIn && Boolean(config.firebase.projectId),
    otpRequired: config.otp.required,
    otpDevMode: config.otp.devMode,
    firebaseProjectId: config.firebase.projectId || null,
  });
});

export const sendOtpHandler = asyncHandler(async (req, res) => {
  const email = requireEmail(req.body?.email);
  const name = (req.body?.name || '').toString().slice(0, 80);
  if (await findUserByEmail(email)) {
    return res.status(409).json({ error: 'Аккаунт с таким email уже зарегистрирован — войдите', code: 'EMAIL_TAKEN' });
  }
  res.json(await issueOtp(email, name));
});

export const verifyOtpHandler = asyncHandler(async (req, res) => {
  const email = requireEmail(req.body?.email);
  const result = await verifyOtp(email, req.body?.code);
  markVerified(email);
  await markEmailVerified(email);
  res.json(result);
});

authRouter.post('/send-otp', authLimiter, sendOtpHandler);
authRouter.post('/verify-otp', authLimiter, verifyOtpHandler);

authRouter.post(
  '/google',
  authLimiter,
  asyncHandler(async (req, res) => {
    const idToken = requireString(req.body?.idToken, 'idToken', { min: 20, max: 4096 });
    const preferredLanguage = requireEnum(req.body?.preferredLanguage, 'preferredLanguage', LANGUAGES, 'ru');
    const result = await loginWithGoogle({ idToken, preferredLanguage, userAgent: req.headers['user-agent'] });
    sessionResponse(res, result, result.isNew ? 201 : 200, result.isNew ? 'Аккаунт создан через Google' : 'Вход через Google выполнен');
  }),
);

authRouter.post(
  '/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const email = requireEmail(b.gmail ?? b.email);
    const firstName = requireString(b.firstName, 'firstName', { max: 60 });
    const lastName = (b.lastName ?? '').toString().trim().slice(0, 60);
    const age = optionalNumber(b.age, 'age', { min: 10, max: 60, fallback: 16 });
    const grade = requireEnum(b.grade, 'grade', GRADES, 'grade_10');
    const targetTrack = requireEnum(b.targetTrack, 'targetTrack', TARGET_TRACKS, 'all');
    const preferredLanguage = requireEnum(b.preferredLanguage, 'preferredLanguage', LANGUAGES, 'ru');
    const password = requireString(b.password, 'password', { min: 6, max: 128 });

    const otpPassed = consumeVerified(email);
    if (config.otp.required && !otpPassed) {
      return res.status(400).json({ error: 'Сначала подтвердите email кодом', code: 'OTP_REQUIRED' });
    }
    const result = await registerUser({ firstName, lastName, email, age, grade, targetTrack, password, preferredLanguage, isEmailVerified: otpPassed, userAgent: req.headers['user-agent'] });
    sessionResponse(res, { ...result, isNew: true }, 201, 'Аккаунт создан');
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const email = requireEmail(req.body?.email ?? req.body?.gmail);
    const password = requireString(req.body?.password, 'password', { min: 1, max: 128 });
    sessionResponse(res, await loginUser({ email, password, userAgent: req.headers['user-agent'] }));
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await destroySession(req.sessionToken);
    res.json({ success: true });
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user, profile: await getProfile(req.user.id) });
  }),
);

authRouter.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: await updateUser(req.user.id, req.body || {}) });
  }),
);

authRouter.post(
  '/change-password',
  requireAuth,
  authLimiter,
  asyncHandler(async (req, res) => {
    await changePassword(req.user.id, (req.body?.currentPassword ?? '').toString(), requireString(req.body?.newPassword, 'newPassword', { min: 6, max: 128 }));
    res.json({ success: true, message: 'Пароль изменён. Войдите заново.' });
  }),
);

authRouter.delete(
  '/me',
  requireAuth,
  authLimiter,
  asyncHandler(async (req, res) => {
    await deleteAccount(req.user.id);
    res.json({ success: true });
  }),
);

// Applicant profile (JSON) — synced from the frontend so it survives device changes.
authRouter.get(
  '/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json((await getProfile(req.user.id)) || { profile: null, updatedAt: null });
  }),
);

authRouter.put(
  '/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const profile = requireObject(req.body?.profile, 'profile');
    res.json(await saveProfile(req.user.id, profile));
  }),
);

// Public counter only — never a list of users.
authRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    res.json({ users: await countUsers() });
  }),
);
