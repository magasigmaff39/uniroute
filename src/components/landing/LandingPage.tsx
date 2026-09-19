import React from 'react';
import {
  ArrowRight,
  BarChart3,
  ShieldCheck,
  CalendarClock,
  FileText,
  Compass,
  MessageCircle,
  UserPlus,
  Lock,
  GraduationCap,
  School,
  BookOpen,
  UserCircle2,
  Mail,
  KeyRound,
  Check,
  ClipboardList,
  LayoutDashboard,
  Timer,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext';
import { useRevealObserver, useCountUp } from '../../hooks/useReveal';
import { UNIVERSITY_DATABASE, UNIVERSITY_COUNTS } from '../../data/universities';
import { HeroRadar } from './HeroRadar';
import { UniversityCrest } from '../ui/UniversityCrest';
import { BrandLogo } from '../ui/Brand';

interface LandingPageProps {
  onRegister: () => void;
  onLogin: () => void;
  onStartQuickTest?: () => void;
}

const FEATURES = [
  { icon: BarChart3, key: 'f1' },
  { icon: ShieldCheck, key: 'f2' },
  { icon: CalendarClock, key: 'f3' },
  { icon: FileText, key: 'f4' },
  { icon: Compass, key: 'f5' },
  { icon: MessageCircle, key: 'f6' },
];

const HOW_STEPS = ['1', '2', '3', '4', '5', '6'];

const QUICK_PREVIEW_IDS = ['nu', 'kaist', 'tum'];

const REG_STEPS = [
  { icon: UserCircle2, key: '1' },
  { icon: Mail, key: '2' },
  { icon: KeyRound, key: '3' },
  { icon: Lock, key: '4' },
];

const MARQUEE_IDS = ['nu', 'kaist', 'mit', 'stanford', 'aitu', 'harvard', 'kbtu', 'nus', 'kimep', 'yale', 'sdu', 'hkust', 'princeton', 'snu', 'columbia', 'utokyo', 'caltech', 'tsinghua', 'nyuad', 'duke'];

const Stat: React.FC<{ value: number; suffix?: string; label: string }> = ({ value, suffix = '', label }) => {
  const { ref, value: v } = useCountUp(value);
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className="reveal px-0 lg:px-8 first:lg:pl-0">
      <p className="font-display text-[32px] sm:text-4xl leading-none font-bold tracking-[-0.02em] text-slate-950 dark:text-white tabular-nums">
        {v}
        <span className="text-blue-600 dark:text-blue-400">{suffix}</span>
      </p>
      <p className="text-[13px] sm:text-sm text-slate-500 dark:text-zinc-400 mt-2 leading-snug max-w-[16rem]">{label}</p>
    </div>
  );
};

const SectionIntro: React.FC<{ kicker: string; title: string; subtitle?: string; center?: boolean }> = ({ kicker, title, subtitle, center }) => (
  <div className={`reveal max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
    <p className="ar-kicker mb-2">{kicker}</p>
    <h2 className="text-[28px] sm:text-4xl leading-[1.15] font-bold tracking-[-0.02em] text-slate-950 dark:text-white [text-wrap:balance]">{title}</h2>
    {subtitle && <p className="text-base sm:text-[17px] text-slate-600 dark:text-zinc-400 mt-4 leading-relaxed">{subtitle}</p>}
  </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onRegister, onLogin, onStartQuickTest }) => {
  const { t } = useI18n();
  const root = useRevealObserver<HTMLDivElement>();
  const startTest = onStartQuickTest || onRegister;

  const byId = new Map(UNIVERSITY_DATABASE.map((u) => [u.id, u]));
  const marquee = MARQUEE_IDS.map((id) => byId.get(id)).filter(Boolean) as typeof UNIVERSITY_DATABASE;
  const marqueeItems = marquee.length ? marquee : UNIVERSITY_DATABASE.slice(0, 20);

  return (
    <div ref={root} className="relative">
      {/* ------------------------------------------------------------ HERO */}
      <section id="top" className="relative overflow-hidden">
        <div className="absolute inset-y-0 right-0 w-full lg:w-3/5 ar-dots pointer-events-none" aria-hidden />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 lg:pt-12 pb-16 sm:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            <div className="lg:col-span-6 xl:col-span-6">
              <p className="inline-flex items-center gap-2 h-8 px-3 rounded-full border border-[var(--line)] bg-[var(--surface-raised)] text-[13px] font-medium text-slate-600 dark:text-zinc-300 shadow-xs animate-fadeInUp">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" aria-hidden />
                {t('landing.badge')}
              </p>

              <h1 className="mt-6 text-[36px] leading-[1.1] sm:text-[44px] xl:text-[50px] font-bold tracking-[-0.03em] text-slate-950 dark:text-white animate-fadeInUp-delay-1 [text-wrap:balance]">
                {t('landing.title1')} <span className="text-blue-600 dark:text-blue-400">{t('landing.title2')}</span>
              </h1>

              <p className="mt-5 text-base sm:text-lg leading-relaxed text-slate-600 dark:text-zinc-300 max-w-xl animate-fadeInUp-delay-2">{t('landing.subtitle')}</p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 animate-fadeInUp-delay-3">
                <button type="button" onClick={startTest} className="ar-btn ar-btn-primary ar-btn-lg group">
                  <ClipboardList className="w-[18px] h-[18px]" />
                  {t('landing.cta.quick')}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button type="button" onClick={onLogin} className="ar-btn ar-btn-secondary ar-btn-lg">
                  {t('landing.cta.login')}
                </button>
              </div>

              <ul className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] font-medium text-slate-600 dark:text-zinc-400 animate-fadeInUp-delay-3">
                {[t('landing.hero.free'), t('landing.hero.quick'), t('landing.hero.detailed')].map((text) => (
                  <li key={text} className="inline-flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/12 dark:text-emerald-300 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-6 xl:col-span-6 animate-fadeInUp-delay-2">
              <HeroRadar />
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ UNIVERSITIES STRIP */}
      <section className="border-y border-[var(--line)] bg-[var(--surface-raised)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-6">
          <span className="hidden sm:block shrink-0 text-[13px] font-medium text-slate-500 dark:text-zinc-400">{t('landing.marquee')}</span>
          <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
            <div className="flex w-max gap-2.5 animate-marquee">
              {[...marqueeItems, ...marqueeItems].map((u, i) => (
                <span
                  key={`${u.id}-${i}`}
                  className="inline-flex items-center gap-2 h-9 pl-1 pr-3.5 rounded-full border border-[var(--line)] bg-[var(--surface-subtle)] text-[13px] font-medium text-slate-700 dark:text-zinc-200 whitespace-nowrap"
                >
                  <UniversityCrest uni={u} size={26} rounded="rounded-full" />
                  {u.shortName}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ STATS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 lg:gap-0 lg:divide-x lg:divide-[var(--line)]">
          <Stat value={UNIVERSITY_COUNTS.total} label={t('landing.stat.unis')} />
          <Stat value={4} label={t('landing.stat.regions')} />
          <Stat value={100} suffix="%" label={t('landing.stat.grants')} />
          <Stat value={3} label={t('landing.stat.langs')} />
        </div>
      </section>

      {/* ------------------------------------------------------------ ONE TEST → CABINET */}
      <section id="levels" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 scroll-mt-20">
        <SectionIntro kicker={t('landing.levels.kicker')} title={t('landing.levels.title')} subtitle={t('landing.levels.subtitle')} />

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 lg:gap-5 items-stretch">
          <article className="reveal reveal-d1 ar-card p-6 sm:p-8 border-blue-200 dark:border-blue-500/30 shadow-[0_0_0_4px_rgb(14_100_210_/_0.06)]">
            <div className="flex items-center justify-between gap-3">
              <span className="ar-badge ar-badge-blue">
                <ClipboardList className="w-3.5 h-3.5" /> {t('landing.levels.quick.badge')}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-zinc-400">
                <Timer className="w-3.5 h-3.5" /> {t('landing.levels.quick.time')}
              </span>
            </div>
            <h3 className="text-xl sm:text-[22px] font-semibold text-slate-950 dark:text-white mt-5">{t('landing.levels.quick.title')}</h3>
            <p className="text-sm text-slate-600 dark:text-zinc-400 mt-2 leading-relaxed">{t('landing.levels.quick.text')}</p>

            <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mb-3">{t('landing.levels.quick.preview')}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {QUICK_PREVIEW_IDS.map((id) => byId.get(id))
                  .filter(Boolean)
                  .map((u) => (
                    <span key={u!.id} className="inline-flex items-center gap-2 h-9 pl-1 pr-3 rounded-full border border-[var(--line)] bg-[var(--surface-raised)] text-[13px] font-medium text-slate-800 dark:text-zinc-100">
                      <UniversityCrest uni={u!} size={26} rounded="rounded-full" />
                      {u!.shortName}
                    </span>
                  ))}
              </div>
            </div>

            <ul className="mt-6 space-y-2.5 text-sm text-slate-700 dark:text-zinc-300">
              {['1', '2', '3'].map((k) => (
                <li key={k} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  {t(`landing.levels.quick.p${k}`)}
                </li>
              ))}
            </ul>
            <button type="button" onClick={startTest} className="ar-btn ar-btn-primary mt-7 group">
              {t('landing.cta.quick')} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </article>

          <div className="reveal reveal-d2 hidden lg:flex items-center justify-center" aria-hidden>
            <span className="w-10 h-10 rounded-full border border-[var(--line)] bg-[var(--surface-raised)] text-slate-400 dark:text-zinc-500 flex items-center justify-center shadow-xs">
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>

          <article className="reveal reveal-d3 ar-card p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <span className="ar-badge">
                <LayoutDashboard className="w-3.5 h-3.5" /> {t('landing.levels.detailed.badge')}
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">{t('landing.levels.detailed.time')}</span>
            </div>
            <h3 className="text-xl sm:text-[22px] font-semibold text-slate-950 dark:text-white mt-5">{t('landing.levels.detailed.title')}</h3>
            <p className="text-sm text-slate-600 dark:text-zinc-400 mt-2 leading-relaxed">{t('landing.levels.detailed.text')}</p>

            <div className="mt-6 rounded-xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-zinc-400 mb-3">
                <span>{t('landing.levels.detailed.preview')}</span>
                <span className="font-semibold tabular-nums text-blue-600 dark:text-blue-400">7</span>
              </div>
              {/* The seven steps of the applicant test (a fact, not a score) */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }, (_, i) => (
                  <div key={i} className="h-1.5 rounded-full bg-blue-600 dark:bg-blue-500" />
                ))}
              </div>
            </div>

            <ul className="mt-6 space-y-2.5 text-sm text-slate-700 dark:text-zinc-300">
              {['1', '2', '3', '4'].map((k) => (
                <li key={k} className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  {t(`landing.levels.detailed.p${k}`)}
                </li>
              ))}
            </ul>
            <p className="mt-7 inline-flex items-center gap-2 text-[13px] font-medium text-slate-500 dark:text-zinc-400">
              <Lock className="w-4 h-4" /> {t('landing.levels.detailed.note')}
            </p>
          </article>
        </div>
      </section>

      {/* ------------------------------------------------------------ FEATURES */}
      <section id="features" className="border-t border-[var(--line)] bg-[var(--surface-raised)] scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <SectionIntro kicker={t('landing.capabilities')} title={t('landing.capTitle')} subtitle={t('landing.capSubtitle')} />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10 mt-12 sm:mt-14">
            {FEATURES.map(({ icon: Icon, key }, i) => (
              <article key={key} className={`reveal reveal-d${(i % 3) + 1}`}>
                <span className="ar-icon-tile !w-10 !h-10">
                  <Icon className="w-5 h-5" />
                </span>
                <h3 className="text-base sm:text-[17px] font-semibold text-slate-950 dark:text-white mt-4">{t(`landing.${key}.title`)}</h3>
                <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed mt-2">{t(`landing.${key}.text`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ AUDIENCE */}
      <section className="border-y border-[var(--line)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5">
            <SectionIntro kicker={t('landing.aud.kicker')} title={t('landing.aud.title')} subtitle={t('landing.aud.subtitle')} />
          </div>
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: School, key: '1' },
              { icon: BookOpen, key: '2' },
              { icon: GraduationCap, key: '3' },
            ].map(({ icon: Icon, key }, i) => (
              <div key={key} className={`reveal reveal-d${i + 1} ar-card p-5`}>
                <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <p className="text-[15px] font-semibold text-slate-950 dark:text-white mt-4">{t(`landing.aud.${key}.title`)}</p>
                <p className="text-[13px] text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">{t(`landing.aud.${key}.text`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ HOW IT WORKS */}
      <section id="how" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 scroll-mt-16">
        <SectionIntro kicker={t('landing.how.kicker')} title={t('landing.how.title')} subtitle={t('landing.how.subtitle')} />

        <ol className="relative mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-x-5 gap-y-8">
          <span className="hidden lg:block absolute left-4 right-4 top-4 h-px bg-[var(--line-strong)]" aria-hidden />
          {HOW_STEPS.map((key, i) => (
            <li key={key} className={`reveal reveal-d${i + 1} relative flex lg:block gap-4`}>
              <span className="relative z-10 w-8 h-8 shrink-0 rounded-full bg-blue-600 text-white text-[13px] font-semibold flex items-center justify-center ring-4 ring-[var(--bg)] tabular-nums">{i + 1}</span>
              <div className="lg:mt-5">
                <p className="text-[15px] font-semibold text-slate-950 dark:text-white">{t(`landing.how.${key}.title`)}</p>
                <p className="text-[13px] text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">{t(`landing.how.${key}.text`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------------ REGISTRATION CTA */}
      <section id="register" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24 scroll-mt-20">
        <div className="reveal relative overflow-hidden rounded-3xl bg-blue-950 text-white">
          <svg viewBox="0 0 600 300" className="absolute -right-24 -bottom-16 w-[640px] max-w-none h-auto pointer-events-none opacity-[0.07]" aria-hidden>
            <path d="M0 290 C 160 290, 210 150, 330 140 S 500 90, 590 10" fill="none" stroke="#fff" strokeWidth="56" strokeLinecap="round" />
          </svg>

          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-10 p-7 sm:p-12 lg:p-14 items-center">
            <div className="lg:col-span-6">
              <p className="text-[13px] font-semibold text-blue-200">{t('landing.reg.kicker')}</p>
              <h2 className="mt-2 text-[28px] sm:text-4xl leading-[1.15] font-bold tracking-[-0.02em] [text-wrap:balance]">{t('landing.reg.title')}</h2>
              <p className="mt-4 text-blue-100/80 text-base leading-relaxed max-w-lg">{t('landing.reg.subtitle')}</p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button type="button" onClick={onRegister} className="ar-btn ar-btn-lg bg-[#fff] text-blue-950 hover:bg-blue-50 shadow-sm group">
                  <UserPlus className="w-[18px] h-[18px]" />
                  {t('landing.reg.cta')}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button type="button" onClick={onLogin} className="ar-btn ar-btn-lg border-white/20 text-white hover:bg-white/10">
                  {t('landing.reg.haveAccount')} <span className="text-blue-200">{t('landing.reg.login')}</span>
                </button>
              </div>

              <p className="mt-6 text-[13px] text-blue-100/60 flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" /> {t('landing.locked')}
              </p>
            </div>

            <ol className="lg:col-span-6 space-y-2.5">
              {REG_STEPS.map(({ icon: Icon, key }, i) => (
                <li key={key} className={`reveal reveal-d${i + 1} flex items-center gap-4 rounded-xl bg-white/[0.06] border border-white/10 px-4 py-3.5`}>
                  <span className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <Icon className="w-[18px] h-[18px] text-blue-100" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-white">{t(`landing.reg.${key}.title`)}</span>
                    <span className="block text-[13px] text-blue-100/60 mt-0.5">{t(`landing.reg.${key}.text`)}</span>
                  </span>
                  <span className="text-xs font-semibold text-blue-100/40 tabular-nums">0{i + 1}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ FOOTER */}
      <footer className="border-t border-[var(--line)] bg-[var(--surface-raised)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <div className="space-y-3">
            <BrandLogo tagline={t('header.tagline')} />
            <p className="text-[13px] text-slate-500 dark:text-zinc-400 max-w-xs leading-relaxed">{t('landing.footer.made')}</p>
          </div>

          <nav className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
            <a href="#features" className="text-slate-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-300 transition-colors">{t('landing.nav.features')}</a>
            <a href="#how" className="text-slate-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-300 transition-colors">{t('landing.nav.how')}</a>
            <a href="#register" className="text-slate-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-300 transition-colors">{t('landing.nav.register')}</a>
            <button type="button" onClick={onLogin} className="text-left text-slate-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-300 transition-colors">
              {t('landing.nav.login')}
            </button>
          </nav>

          <div className="md:text-right text-[13px] text-slate-500 dark:text-zinc-400 space-y-1">
            <p>
              © {new Date().getFullYear()} UniRoute · {t('landing.footer.rights')}
            </p>
            <p>Қазақша · English · Русский</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
