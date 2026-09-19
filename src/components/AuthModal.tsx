import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Loader2, X, KeyRound, Eye, EyeOff, Check, ArrowRight, ArrowLeft, Mail, ShieldCheck, Landmark, GraduationCap, School, Globe2 } from 'lucide-react';
import { registerUser, loginUser, loginWithGoogle, canUseGoogle, UserAccount } from '../lib/auth';
import { authApi, ApiError, type AuthConfig } from '../lib/api';
import { EducationGrade, TargetTrack } from '../types';
import { useToast } from '../context/ToastContext';
import { useI18n } from '../i18n/I18nContext';
import { BrandLogo, BrandMark } from './ui/Brand';

export type AuthMode = 'register' | 'login';

interface AuthModalProps {
  isOpen: boolean;
  initialMode?: AuthMode;
  onClose: () => void;
  onSuccess: (user: UserAccount, isNew?: boolean) => void;
}

type RegisterSubStep = 'data' | 'otp';

const labelClass = 'ar-label';

/** Inline message under a field; the field itself gets aria-invalid. */
const FieldError: React.FC<{ id: string; text?: string }> = ({ id, text }) =>
  text ? (
    <p id={id} className="ar-field-error animate-fadeIn">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {text}
    </p>
  ) : null;

const GoogleMark = () => (
  <svg viewBox="0 0 48 48" className="w-4 h-4" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.7 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6.1C12.3 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4H24v7.6h12.8c-.3 2.1-1.7 5.3-4.8 7.4l7.4 5.7c4.4-4.1 7.1-10.1 7.1-16.7z" />
    <path fill="#FBBC05" d="M10.4 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2 1.4-4.7 2.4-8.5 2.4-6.3 0-11.7-4.1-13.6-9.9l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

const PasswordInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete: string;
  name?: string;
  showLabel: string;
  hideLabel: string;
  id?: string;
  invalid?: boolean;
  describedBy?: string;
}> = ({ value, onChange, placeholder, autoComplete, name, showLabel, hideLabel, id, invalid, describedBy }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        name={name}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? describedBy : undefined}
        className="ar-input pr-11"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label={show ? hideLabel : showLabel}
        title={show ? hideLabel : showLabel}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, initialMode = 'register', onClose, onSuccess }) => {
  const { notify } = useToast();
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [registerStep, setRegisterStep] = useState<RegisterSubStep>('data');
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState<number>(16);
  const [grade, setGrade] = useState<EducationGrade>('grade_10');
  const [targetTrack, setTargetTrack] = useState<TargetTrack>('all');
  const [gmail, setGmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [devCode, setDevCode] = useState<string | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sync the requested tab every time the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setError(null);
    setFieldErrors({});
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) return;
    authApi
      .config()
      .then(setAuthConfig)
      .catch(() => setAuthConfig({ googleSignIn: canUseGoogle(), otpRequired: false, otpDevMode: true, firebaseProjectId: null }));
  }, [isOpen]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  useEffect(() => {
    if (registerStep === 'otp' && otpInputRefs.current[0]) setTimeout(() => otpInputRefs.current[0]?.focus(), 150);
  }, [registerStep]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const googleAvailable = canUseGoogle() && (authConfig?.googleSignIn ?? true);
  const otpRequired = authConfig?.otpRequired ?? false;

  const describeError = (err: unknown, fallback: string) => {
    if (err instanceof ApiError) return err.code === 'NETWORK' ? t('common.backendOffline') : err.message;
    return err instanceof Error ? err.message : fallback;
  };

  const validateData = () => {
    const next: Record<string, string> = {};
    if (!firstName.trim()) next.firstName = t('auth.err.firstName');
    if (!lastName.trim()) next.lastName = t('auth.err.lastName');
    if (!gmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gmail)) next.gmail = t('auth.err.email');
    if (!password || password.length < 6) next.password = t('auth.err.password');
    if (password !== confirmPassword) next.confirmPassword = t('auth.err.mismatch');
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  };

  const finalizeAccount = async () => {
    const user = await registerUser({ firstName: firstName.trim(), lastName: lastName.trim(), gmail, age, grade, targetTrack, password, preferredLanguage: lang });
    notify(t('auth.toast.created'), 'success');
    onSuccess(user, true);
    onClose();
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateData()) return;
    setLoading(true);
    try {
      if (!otpRequired) {
        await finalizeAccount();
        return;
      }
      const resp = await authApi.sendOtp(gmail.trim(), `${firstName} ${lastName}`.trim());
      setRegisterStep('otp');
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setDevCode(resp.devCode || null);
      notify(t('auth.toast.codeSent'), 'success');
    } catch (err: unknown) {
      setError(describeError(err, t('common.error')));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const char = value.slice(-1);
    if (char && !/^\d$/.test(char)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = char;
    setOtpDigits(newDigits);
    setError(null);
    if (char && index < 5) otpInputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) otpInputRefs.current[index - 1]?.focus();
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (pasted.length > 0) {
      const digits = pasted.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      digits.forEach((d, i) => {
        newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      otpInputRefs.current[Math.min(digits.length, 5)]?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const fullCode = otpDigits.join('');
    if (fullCode.length !== 6) {
      setError(t('auth.err.code6'));
      return;
    }
    setLoading(true);
    try {
      await authApi.verifyOtp(gmail, fullCode);
      await finalizeAccount();
    } catch (err: unknown) {
      setError(describeError(err, t('common.error')));
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginEmail.includes('@') || !loginPassword) {
      setError(t('auth.err.email'));
      return;
    }
    setLoading(true);
    try {
      const user = await loginUser(loginEmail, loginPassword);
      notify(`${t('auth.toast.welcome')}, ${user.firstName}`, 'success');
      onSuccess(user, false);
      onClose();
    } catch (err: unknown) {
      setError(describeError(err, t('common.error')));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const { user, isNew } = await loginWithGoogle(lang);
      notify(isNew ? t('auth.toast.created') : `${t('auth.toast.welcome')}, ${user.firstName}`, 'success');
      onSuccess(user, isNew);
      onClose();
    } catch (err: unknown) {
      setError(describeError(err, t('common.error')));
    } finally {
      setGoogleLoading(false);
    }
  };

  const switchMode = (m: AuthMode) => {
    setMode(m);
    setError(null);
    setFieldErrors({});
  };

  const fullCodeLength = otpDigits.filter((d) => d !== '').length;

  const GoogleButton = (
    <button type="button" onClick={handleGoogle} disabled={googleLoading || loading} aria-busy={googleLoading || undefined} className="ar-btn ar-btn-secondary w-full min-h-11 gap-2.5">
      {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleMark />}
      {googleLoading ? t('auth.checking') : t('auth.google')}
    </button>
  );

  const Divider = (
    <div className="flex items-center gap-3 text-xs font-medium text-slate-400 dark:text-zinc-500">
      <span className="h-px flex-1 bg-[var(--line)]" />
      {t('auth.orEmail')}
      <span className="h-px flex-1 bg-[var(--line)]" />
    </div>
  );

  const primaryBtn = 'ar-btn ar-btn-primary ar-btn-lg w-full group';

  const tracks: { id: TargetTrack; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'university', label: t('auth.track.university'), icon: Landmark },
    { id: 'college', label: t('auth.track.college'), icon: GraduationCap },
    { id: 'school', label: t('auth.track.school'), icon: School },
    { id: 'all', label: t('auth.track.all'), icon: Globe2 },
  ];

  const invalid = (key: string) => (fieldErrors[key] ? { 'aria-invalid': true as const, 'aria-describedby': `auth-err-${key}` } : {});

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/40 backdrop-blur-[2px] animate-fadeIn"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'register' ? t('auth.registration') : t('auth.login')}
    >
      <div className="relative w-full max-w-[920px] max-h-[calc(100dvh-1.5rem)] sm:max-h-[92vh] grid grid-cols-1 md:grid-cols-12 rounded-2xl overflow-hidden bg-[var(--surface-raised)] border border-[var(--line)] shadow-[var(--shadow-overlay)] animate-popIn">
        {/* Brand panel */}
        <aside className="hidden md:flex md:col-span-5 relative flex-col justify-between gap-10 bg-blue-950 text-white p-8 overflow-hidden">
          <svg viewBox="0 0 400 300" className="absolute -right-20 -bottom-10 w-[440px] max-w-none h-auto pointer-events-none opacity-[0.08]" aria-hidden>
            <path d="M0 290 C 110 290, 140 160, 230 150 S 350 100, 400 20" fill="none" stroke="#fff" strokeWidth="44" strokeLinecap="round" />
          </svg>

          <div className="relative flex items-center gap-3">
            <span className="h-11 px-2 rounded-xl bg-[#fff] flex items-center">
              <BrandMark className="h-6" />
            </span>
            <div>
              <p className="font-display text-lg font-bold tracking-[-0.02em] leading-none">UniRoute</p>
              <p className="text-xs text-blue-100/70 mt-1">{t('header.tagline')}</p>
            </div>
          </div>

          <div className="relative space-y-5">
            <h2 className="text-2xl font-bold leading-tight tracking-[-0.02em]">{t('auth.hero.title')}</h2>
            <p className="text-sm text-blue-100/80 leading-relaxed">{t('auth.hero.text')}</p>
            <ul className="space-y-3">
              {[t('auth.hero.b1'), t('auth.hero.b2'), t('auth.hero.b3')].map((b) => (
                <li key={b} className="flex items-start gap-3 text-sm text-blue-50">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-white/12 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3" />
                  </span>
                  {b}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-blue-100/60 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" /> {t('auth.terms')}
          </p>
        </aside>

        {/* Form panel */}
        <div className="md:col-span-7 overflow-y-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[92vh]">
          <div className="px-5 sm:px-8 pt-5 sm:pt-7 pb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="md:hidden mb-4">
                <BrandLogo size="sm" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-950 dark:text-white">{mode === 'register' ? t('auth.registration') : t('auth.welcomeBack')}</h3>
              <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1.5">{mode === 'register' ? t('auth.registerSubtitle') : t('auth.loginSubtitle')}</p>
            </div>
            <button type="button" onClick={onClose} className="ar-btn ar-btn-icon -mr-2 -mt-1 shrink-0" aria-label={t('common.close')}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Segmented switch */}
          <div className="px-5 sm:px-8">
            <div className="grid grid-cols-2 gap-0.5 p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-[var(--line)]" role="tablist">
              {(['register', 'login'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  onClick={() => switchMode(m)}
                  className={`h-9 rounded-lg text-[13px] font-semibold transition-[background-color,color,box-shadow] duration-150 ${
                    mode === m ? 'bg-white text-slate-950 shadow-sm dark:bg-zinc-800 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
                  }`}
                  aria-selected={mode === m}
                >
                  {m === 'register' ? t('auth.register') : t('auth.login')}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 sm:px-8 pb-6 sm:pb-8 pt-5 space-y-5">
            {googleAvailable && registerStep === 'data' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  {GoogleButton}
                  <p className="text-xs text-slate-500 dark:text-zinc-500 leading-relaxed">{t('auth.googleHint')}</p>
                </div>
                {Divider}
              </div>
            )}

            {error && (
              <div className="ar-notice ar-notice-error animate-fadeIn" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'register' && otpRequired && (
              <ol className="grid grid-cols-2 gap-2">
                {[t('auth.step.data'), t('auth.step.code')].map((label, i) => {
                  const active = registerStep === (i === 0 ? 'data' : 'otp');
                  const done = registerStep === 'otp' && i === 0;
                  return (
                    <li
                      key={label}
                      className={`flex items-center gap-2 rounded-lg px-3 h-9 text-[13px] font-medium border ${
                        active || done ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100' : 'border-[var(--line)] text-slate-400 dark:text-zinc-500'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold ${done ? 'bg-blue-600 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-zinc-800'}`}>
                        {done ? <Check className="w-3 h-3" /> : i + 1}
                      </span>
                      {label}
                    </li>
                  );
                })}
              </ol>
            )}

            {mode === 'register' && registerStep === 'data' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4" autoComplete="on" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="auth-first" className={labelClass}>
                      {t('auth.firstName')}
                    </label>
                    <input id="auth-first" type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Алихан" autoComplete="given-name" className="ar-input" {...invalid('firstName')} />
                    <FieldError id="auth-err-firstName" text={fieldErrors.firstName} />
                  </div>
                  <div>
                    <label htmlFor="auth-last" className={labelClass}>
                      {t('auth.lastName')}
                    </label>
                    <input id="auth-last" type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Сериков" autoComplete="family-name" className="ar-input" {...invalid('lastName')} />
                    <FieldError id="auth-err-lastName" text={fieldErrors.lastName} />
                  </div>
                </div>

                {/* Target track selector */}
                <fieldset>
                  <legend className={labelClass}>{t('auth.targetTrack')}</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {tracks.map(({ id, label, icon: Icon }) => (
                      <button key={id} type="button" onClick={() => setTargetTrack(id)} aria-pressed={targetTrack === id} className="ar-chip justify-center min-w-0">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{label}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="auth-age" className={labelClass}>
                      {t('auth.age')}
                    </label>
                    <input id="auth-age" type="number" inputMode="numeric" min={11} max={26} required value={age} onChange={(e) => setAge(parseInt(e.target.value) || 16)} className="ar-input" />
                  </div>
                  <div>
                    <label htmlFor="auth-grade" className={labelClass}>
                      {t('auth.grade')}
                    </label>
                    <select id="auth-grade" value={grade} onChange={(e) => setGrade(e.target.value as EducationGrade)} className="ar-input">
                      <option value="grade_7">{t('auth.grade.7')}</option>
                      <option value="grade_8">{t('auth.grade.8')}</option>
                      <option value="grade_9">{t('auth.grade.9')}</option>
                      <option value="grade_10">{t('auth.grade.10')}</option>
                      <option value="grade_11">{t('auth.grade.11')}</option>
                      <option value="grade_12">{t('auth.grade.12')}</option>
                      <option value="college">{t('auth.grade.college')}</option>
                      <option value="gap_year">{t('auth.grade.gap')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="auth-email" className={labelClass}>
                    {t('auth.email')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input id="auth-email" type="email" required value={gmail} onChange={(e) => setGmail(e.target.value)} placeholder="student@gmail.com" autoComplete="username" name="username" className="ar-input pl-10" {...invalid('gmail')} />
                  </div>
                  <FieldError id="auth-err-gmail" text={fieldErrors.gmail} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="auth-pass" className={labelClass}>
                      {t('auth.password')}
                    </label>
                    <PasswordInput
                      id="auth-pass"
                      value={password}
                      onChange={setPassword}
                      placeholder={t('auth.passwordHint')}
                      autoComplete="new-password"
                      name="new-password"
                      showLabel={t('auth.showPassword')}
                      hideLabel={t('auth.hidePassword')}
                      invalid={Boolean(fieldErrors.password)}
                      describedBy="auth-err-password"
                    />
                    <FieldError id="auth-err-password" text={fieldErrors.password} />
                  </div>
                  <div>
                    <label htmlFor="auth-pass2" className={labelClass}>
                      {t('auth.confirmPassword')}
                    </label>
                    <PasswordInput
                      id="auth-pass2"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      placeholder={t('auth.confirmHint')}
                      autoComplete="new-password"
                      showLabel={t('auth.showPassword')}
                      hideLabel={t('auth.hidePassword')}
                      invalid={Boolean(fieldErrors.confirmPassword)}
                      describedBy="auth-err-confirmPassword"
                    />
                    <FieldError id="auth-err-confirmPassword" text={fieldErrors.confirmPassword} />
                  </div>
                </div>

                <button type="submit" disabled={loading} aria-busy={loading || undefined} className={`${primaryBtn} mt-1`}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> {t('auth.sending')}
                    </>
                  ) : (
                    <>
                      {otpRequired ? t('auth.sendCode').replace(/\s*→\s*$/, '') : t('auth.createAccount').replace(/\s*→\s*$/, '')}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>

                <p className="text-center text-[13px] text-slate-500 dark:text-zinc-400">
                  {t('auth.haveAccount')}{' '}
                  <button type="button" onClick={() => switchMode('login')} className="ar-link">
                    {t('auth.login')}
                  </button>
                </p>
              </form>
            )}

            {mode === 'register' && registerStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <p className="text-sm text-slate-600 dark:text-zinc-300 leading-relaxed">
                  {t('auth.codeSentTo')} <strong className="font-semibold text-slate-950 dark:text-white">{gmail}</strong>. {t('auth.codeAfter')}
                </p>
                {devCode && (
                  <div className="ar-notice border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                    <KeyRound className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      {t('auth.devCode')} <strong className="font-mono text-base tracking-widest">{devCode}</strong>
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-6 gap-2 sm:gap-3">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpInputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      onPaste={handleOtpPaste}
                      autoComplete={index === 0 ? 'one-time-code' : 'off'}
                      aria-label={`${t('auth.step.code')} ${index + 1}`}
                      className={`ar-input !px-0 h-12 sm:h-14 text-center !text-xl font-semibold tabular-nums ${digit ? '!border-blue-500 text-slate-950 dark:text-white' : ''}`}
                    />
                  ))}
                </div>
                <button type="submit" disabled={loading || fullCodeLength !== 6} aria-busy={loading || undefined} className={primaryBtn}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? t('auth.checking') : t('auth.confirmAndStart').replace(/\s*→\s*$/, '')}
                  {!loading && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />}
                </button>
                <div className="flex items-center justify-between gap-3 text-[13px]">
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterStep('data');
                      setError(null);
                    }}
                    className="ar-btn ar-btn-quiet ar-btn-sm -ml-3"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> {t('auth.changeData').replace(/^←\s*/, '')}
                  </button>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || loading}
                    onClick={() => handleRegisterSubmit({ preventDefault: () => undefined } as React.FormEvent)}
                    className="ar-link tabular-nums disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed"
                  >
                    {resendCooldown > 0 ? `${t('auth.resendIn')} ${resendCooldown}с` : t('auth.resend')}
                  </button>
                </div>
              </form>
            )}

            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4" autoComplete="on" noValidate>
                <div>
                  <label htmlFor="auth-login-email" className={labelClass}>
                    {t('auth.email')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input id="auth-login-email" type="email" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="student@gmail.com" autoComplete="username" className="ar-input pl-10" />
                  </div>
                </div>
                <div>
                  <label htmlFor="auth-login-pass" className={labelClass}>
                    {t('auth.password')}
                  </label>
                  <PasswordInput id="auth-login-pass" value={loginPassword} onChange={setLoginPassword} placeholder={t('auth.yourPassword')} autoComplete="current-password" showLabel={t('auth.showPassword')} hideLabel={t('auth.hidePassword')} />
                </div>
                <button type="submit" disabled={loading} aria-busy={loading || undefined} className={`${primaryBtn} mt-1`}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> {t('auth.checking')}
                    </>
                  ) : (
                    <>
                      {t('auth.loginButton').replace(/\s*→\s*$/, '')}
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
                <p className="text-center text-[13px] text-slate-500 dark:text-zinc-400">
                  {t('auth.noAccount')}{' '}
                  <button type="button" onClick={() => switchMode('register')} className="ar-link">
                    {t('auth.register')}
                  </button>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
