// Account session on the client. The backend is the single source of truth; the active user is cached in
// localStorage only so the UI can render immediately after a reload.
import { authApi, getToken, setToken, type UserAccount, type AuthResponse } from './api';
import { googleIdToken, consumeRedirect, firebaseSignOut, isFirebaseConfigured } from './firebase';
import type { AppLanguage, EducationGrade, TargetTrack } from '../types';

export type { UserAccount };

const ACTIVE_USER_KEY = 'admitroute_active_user';

function cacheUser(user: UserAccount | null) {
  try {
    if (user) localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(ACTIVE_USER_KEY);
  } catch {
    /* ignore */
  }
}

function acceptSession(res: AuthResponse): UserAccount {
  setToken(res.token);
  cacheUser(res.user);
  return res.user;
}

export function getActiveUser(): UserAccount | null {
  if (!getToken()) return null;
  try {
    const saved = localStorage.getItem(ACTIVE_USER_KEY);
    return saved ? (JSON.parse(saved) as UserAccount) : null;
  } catch {
    return null;
  }
}

export async function registerUser(data: {
  firstName: string;
  lastName: string;
  gmail: string;
  age: number;
  grade: EducationGrade;
  targetTrack?: TargetTrack;
  password: string;
  preferredLanguage?: AppLanguage;
}): Promise<UserAccount> {
  const res = await authApi.register({
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    email: data.gmail.trim().toLowerCase(),
    age: data.age,
    grade: data.grade,
    targetTrack: data.targetTrack,
    password: data.password,
    preferredLanguage: data.preferredLanguage,
  });
  return acceptSession(res);
}

export async function loginUser(gmail: string, password: string): Promise<UserAccount> {
  return acceptSession(await authApi.login(gmail.trim().toLowerCase(), password));
}

export const canUseGoogle = () => isFirebaseConfigured();

/** One click: Google account chooser → backend session. Returns the user and whether the account is new. */
export async function loginWithGoogle(preferredLanguage?: AppLanguage): Promise<{ user: UserAccount; isNew: boolean }> {
  const idToken = await googleIdToken();
  const res = await authApi.google(idToken, preferredLanguage);
  return { user: acceptSession(res), isNew: Boolean(res.isNew) };
}

/** Completes a redirect-based Google sign-in (popup blocked) if one is pending. */
export async function finishGoogleRedirect(preferredLanguage?: AppLanguage): Promise<UserAccount | null> {
  const idToken = await consumeRedirect();
  if (!idToken) return null;
  const res = await authApi.google(idToken, preferredLanguage);
  return acceptSession(res);
}

/** Re-validate the cached session against the server (call once on startup). */
export async function refreshSession(): Promise<UserAccount | null> {
  if (!getToken()) return null;
  try {
    const { user } = await authApi.me();
    cacheUser(user);
    return user;
  } catch (err: any) {
    if (err?.status === 401) {
      setToken(null);
      cacheUser(null);
      return null;
    }
    return getActiveUser(); // backend offline — keep cached user for the UI shell
  }
}

export function logoutUser(): void {
  authApi.logout().catch(() => undefined);
  firebaseSignOut().catch(() => undefined);
  setToken(null);
  cacheUser(null);
}
