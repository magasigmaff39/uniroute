import React, { useEffect, useState } from 'react';
import {
  LogOut,
  Moon,
  Sun,
  ArrowRight,
  Newspaper,
  LayoutGrid,
  Route,
  UserPlus,
  House,
  Settings,
  GraduationCap,
  UserRound,
  FolderOpen,
  ChartLine,
  HandCoins,
  CalendarClock,
  ListChecks,
  Trophy,
  Briefcase,
  PenLine,
  Menu,
  type LucideIcon,
} from 'lucide-react';
import { UserAccount } from '../lib/auth';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n/I18nContext';
import type { SidebarState } from '../hooks/useSidebar';
import type { AppSection, NavTarget } from '../types';
import { Sidebar, SidebarItem, SidebarSection, MenuToggle } from './Sidebar';
import { BrandLogo } from './ui/Brand';

interface HeaderProps {
  currentUser: UserAccount | null;
  sidebar: SidebarState;
  onOpenAuth: (mode?: 'register' | 'login') => void;
  onLogout: () => void;
  onReset: () => void;
  onOpenNewsModal?: () => void;
  /** Signed-in cabinet: the active section and how to switch it */
  section?: AppSection;
  onNavigate?: (target: NavTarget) => void;
  /** Small progress hints next to menu items */
  badges?: { profile: number; urgentDeadlines?: number; openTasks?: number };
  /** Opens the motivation letter builder over the current page */
  onOpenEssay?: () => void;
  /** Until the applicant test is done the menu starts with «Пройти тест» */
  testPassed?: boolean;
}

const SIDEBAR_ID = 'app-sidebar';

/** The cabinet menu, one line per section; the portfolio sits right under the profile it belongs to. */
const NAV_ITEMS: { id: AppSection; icon: LucideIcon }[] = [
  { id: 'home', icon: House },
  { id: 'profile', icon: UserRound },
  { id: 'portfolio', icon: Briefcase },
  { id: 'universities', icon: GraduationCap },
  { id: 'analysis', icon: ChartLine },
  { id: 'grants', icon: HandCoins },
  { id: 'documents', icon: FolderOpen },
  { id: 'news', icon: Newspaper },
];

/** Preparation tools: dates, the checklist and competitions (the letter builder opens over the page). */
const PREP_ITEMS: { id: AppSection; icon: LucideIcon }[] = [
  { id: 'deadlines', icon: CalendarClock },
  { id: 'tasks', icon: ListChecks },
  { id: 'olympiads', icon: Trophy },
];

/** Phone tab bar: the four places people return to most, plus the full menu. */
const TAB_ITEMS: { id: AppSection; icon: LucideIcon }[] = [
  { id: 'home', icon: House },
  { id: 'universities', icon: GraduationCap },
  { id: 'deadlines', icon: CalendarClock },
  { id: 'tasks', icon: ListChecks },
];

/** KK → EN → RU switcher. Declared outside Header so React does not remount it on every render. */
const LanguageSwitcher: React.FC = () => {
  const { t, lang, setLang, languages } = useI18n();
  return (
    <div className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-zinc-800/80 p-0.5" role="group" aria-label={t('header.language')}>
      {languages.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLang(l.code)}
          title={l.native}
          aria-pressed={lang === l.code}
          className={`h-7 min-w-9 px-2 rounded-md text-xs font-semibold transition-colors ${
            lang === l.code ? 'bg-white text-slate-900 shadow-xs dark:bg-zinc-700 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
};

const Logo: React.FC<{ onClick: () => void; tagline?: string }> = ({ onClick, tagline }) => (
  <button type="button" className="flex items-center select-none rounded-lg min-w-0 py-1" onClick={onClick} aria-label="UniRoute">
    <BrandLogo tagline={tagline} />
  </button>
);

const ThemeButton: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();
  const label = theme === 'dark' ? t('header.theme.light') : t('header.theme.dark');
  return (
    <button type="button" onClick={toggleTheme} className="ar-btn ar-btn-icon" title={label} aria-label={label}>
      {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
    </button>
  );
};

const Avatar: React.FC<{ user: UserAccount; size?: 'sm' | 'md' }> = ({ user, size = 'sm' }) => {
  const dim = size === 'md' ? 'w-9 h-9 text-sm' : 'w-8 h-8 text-[13px]';
  return user.photoUrl ? (
    <img src={user.photoUrl} alt="" referrerPolicy="no-referrer" className={`${dim} shrink-0 rounded-full object-cover`} />
  ) : (
    <span className={`${dim} shrink-0 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold`}>{(user.firstName || '?').slice(0, 1).toUpperCase()}</span>
  );
};

/** Title-page header: brand, anchor links on wide screens (a drawer on phones) and the two entry points. */
const GuestHeader: React.FC<Pick<HeaderProps, 'onOpenAuth' | 'onReset' | 'onOpenNewsModal' | 'sidebar'>> = ({ onOpenAuth, onReset, onOpenNewsModal, sidebar }) => {
  const { t } = useI18n();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const nav = [
    { href: '#features', icon: LayoutGrid, label: t('landing.nav.features') },
    { href: '#how', icon: Route, label: t('landing.nav.how') },
    { href: '#register', icon: UserPlus, label: t('landing.nav.register') },
  ];

  // Anchors only exist on the landing page; from the test go back to it first.
  const goToAnchor = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    sidebar.dismiss();
    const id = href.slice(1);
    const scroll = () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (document.getElementById(id)) window.setTimeout(scroll, 0);
    else {
      onReset();
      window.setTimeout(scroll, 60);
    }
  };

  const run = (fn: () => void) => () => {
    sidebar.dismiss();
    fn();
  };

  const link = 'h-9 px-3 inline-flex items-center rounded-lg text-sm font-medium text-slate-600 hover:text-slate-950 hover:bg-slate-100 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-800/70 transition-colors';

  return (
    <>
      <header
        className={`sticky top-0 z-40 transition-[background-color,border-color] duration-200 border-b ${
          scrolled ? 'border-[var(--line)] bg-white/85 dark:bg-[#0a1019]/85 backdrop-blur-md' : 'border-transparent bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            <div className="flex items-center gap-1 min-w-0">
              <MenuToggle open={sidebar.open} onClick={sidebar.toggle} controls={SIDEBAR_ID} label={sidebar.open ? t('nav.close') : t('nav.open')} className="lg:hidden -ml-2" />
              <Logo onClick={onReset} />
            </div>

            <nav className="hidden lg:flex items-center gap-1" aria-label={t('nav.sections')}>
              {nav.slice(0, 2).map((n) => (
                <a key={n.href} href={n.href} onClick={(e) => goToAnchor(e, n.href)} className={link}>
                  {n.label}
                </a>
              ))}
              {onOpenNewsModal && (
                <button type="button" onClick={onOpenNewsModal} className={link}>
                  {t('header.news')}
                </button>
              )}
            </nav>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="hidden md:block">
                <LanguageSwitcher />
              </div>
              <ThemeButton />
              <button type="button" onClick={() => onOpenAuth('login')} className="ar-btn ar-btn-quiet hidden sm:inline-flex !text-slate-700 dark:!text-zinc-200">
                {t('landing.nav.login')}
              </button>
              <button type="button" onClick={() => onOpenAuth('register')} className="ar-btn ar-btn-primary !px-4">
                {t('landing.nav.start')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <Sidebar
        id={SIDEBAR_ID}
        open={sidebar.open}
        docked={false}
        onClose={sidebar.dismiss}
        label={t('nav.menu')}
        closeLabel={t('nav.close')}
        brand={<Logo onClick={run(onReset)} />}
        footer={
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">{t('header.language')}</span>
              <LanguageSwitcher />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={run(() => onOpenAuth('login'))} className="ar-btn ar-btn-secondary">
                {t('landing.nav.login')}
              </button>
              <button type="button" onClick={run(() => onOpenAuth('register'))} className="ar-btn ar-btn-primary">
                {t('landing.nav.start')}
              </button>
            </div>
          </div>
        }
      >
        <SidebarSection title={t('nav.sections')}>
          {nav.map((n) => (
            <SidebarItem key={n.href} icon={n.icon} label={n.label} href={n.href} onClick={(e) => goToAnchor(e, n.href)} />
          ))}
          {onOpenNewsModal && <SidebarItem icon={Newspaper} label={t('header.news')} onClick={run(onOpenNewsModal)} />}
        </SidebarSection>
      </Sidebar>
    </>
  );
};

/** Bottom navigation on phones and tablets; the last tab opens the full menu. */
const TabBar: React.FC<{ section?: AppSection; onNavigate?: (target: NavTarget) => void; onMenu: () => void; menuOpen: boolean; urgent?: number }> = ({ section, onNavigate, onMenu, menuOpen, urgent }) => {
  const { t } = useI18n();
  const tab = 'relative w-full flex flex-col items-center justify-center gap-1 h-16 text-[11px] font-medium transition-colors';
  const tone = (on: boolean) => (on ? 'text-blue-600 dark:text-blue-300' : 'text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white');
  return (
    <nav aria-label={t('nav.menu')} className="ar-tabbar lg:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-white/92 dark:bg-[#0e1522]/92 backdrop-blur-md">
      <ul className="flex items-stretch max-w-lg mx-auto px-1">
        {TAB_ITEMS.map(({ id, icon: Icon }) => {
          const active = section === id;
          return (
            <li key={id} className="flex-1 min-w-0">
              <button type="button" onClick={() => onNavigate?.({ section: id })} aria-current={active ? 'page' : undefined} className={`${tab} ${tone(active)}`}>
                {active && <span aria-hidden className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-blue-600 dark:bg-blue-400" />}
                <span className="relative">
                  <Icon className="w-[22px] h-[22px]" />
                  {id === 'deadlines' && urgent ? (
                    <span className="absolute -top-1 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-semibold leading-4 text-center tabular-nums">{urgent}</span>
                  ) : null}
                </span>
                <span className="max-w-full truncate px-1">{t(id === 'universities' ? 'nav.tab.universities' : `nav.section.${id}`)}</span>
              </button>
            </li>
          );
        })}
        <li className="flex-1 min-w-0">
          <button type="button" onClick={onMenu} aria-expanded={menuOpen} aria-controls={SIDEBAR_ID} className={`${tab} ${tone(menuOpen)}`}>
            <Menu className="w-[22px] h-[22px]" />
            <span className="max-w-full truncate px-1">{t('nav.menu')}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export const Header: React.FC<HeaderProps> = (props) => {
  const { currentUser, sidebar, onLogout, section, onNavigate, badges, onOpenEssay, testPassed = true } = props;
  const { t } = useI18n();

  if (!currentUser) return <GuestHeader {...props} />;

  // In the overlay drawer every choice also closes it; a docked panel stays open.
  const run = (fn: () => void) => () => {
    sidebar.dismiss();
    fn();
  };
  const go = (id: AppSection) => run(() => onNavigate?.({ section: id }));

  const count = (text: string) => <span className="text-xs font-medium tabular-nums text-slate-400 dark:text-zinc-500">{text}</span>;
  const alert = (n: number) => (
    <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[11px] font-semibold tabular-nums flex items-center justify-center" title={t('nav.urgentDeadlines', { n })}>
      {n}
    </span>
  );
  const trailing = (id: AppSection) => {
    if (!badges) return undefined;
    if (id === 'profile') return count(`${badges.profile}%`);
    if (id === 'deadlines' && badges.urgentDeadlines) return alert(badges.urgentDeadlines);
    if (id === 'tasks' && badges.openTasks) return count(String(badges.openTasks));
    return undefined;
  };

  const testCta = testPassed ? undefined : (
    <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 dark:border-blue-500/20 dark:bg-blue-500/10">
      <p className="text-[13px] font-semibold text-slate-900 dark:text-white">{t('nav.test')}</p>
      <p className="text-xs text-slate-600 dark:text-zinc-400 mt-0.5 leading-snug">{t('landing.hero.quick')}</p>
      <button type="button" onClick={run(() => onNavigate?.({ section: 'profile', flow: 'test' }))} className="ar-btn ar-btn-primary ar-btn-sm w-full mt-3">
        {t('landing.nav.start')} <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-40 h-16 border-b border-[var(--line)] bg-white/85 dark:bg-[#0e1522]/85 backdrop-blur-md">
        <div className="flex items-center justify-between h-16 gap-3 px-3 sm:px-5">
          <div className="flex items-center gap-1.5 min-w-0">
            <MenuToggle open={sidebar.open} docked={sidebar.docked} onClick={sidebar.toggle} controls={SIDEBAR_ID} label={sidebar.open ? t('nav.close') : t('nav.open')} className="hidden lg:inline-flex" />
            <Logo onClick={() => onNavigate?.({ section: 'home' })} />
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeButton />
            <button
              type="button"
              onClick={() => onNavigate?.({ section: 'profile' })}
              className="flex items-center gap-2 p-1 sm:pr-3 rounded-full border border-transparent hover:border-[var(--line)] hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors"
              title={t('nav.section.profile')}
              aria-label={t('nav.section.profile')}
            >
              <Avatar user={currentUser} />
              <span className="hidden sm:block text-sm font-medium text-slate-800 dark:text-zinc-100 max-w-[140px] truncate">{currentUser.firstName}</span>
            </button>
          </div>
        </div>
      </header>

      <Sidebar
        id={SIDEBAR_ID}
        open={sidebar.open}
        docked={sidebar.docked}
        onClose={sidebar.dismiss}
        label={t('nav.menu')}
        closeLabel={t('nav.close')}
        brand={<Logo onClick={go('home')} />}
        lead={testCta}
        footer={
          <div className="flex items-center gap-2 min-w-0">
            <button type="button" onClick={go('profile')} className="flex items-center gap-2.5 flex-1 min-w-0 text-left rounded-lg p-1.5 -m-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800/70 transition-colors">
              <Avatar user={currentUser} size="md" />
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-semibold text-slate-900 dark:text-white truncate">{`${currentUser.firstName} ${currentUser.lastName || ''}`.trim()}</span>
                <span className="block text-xs text-slate-500 dark:text-zinc-400 truncate">{currentUser.gmail}</span>
              </span>
            </button>
            <button type="button" onClick={run(onLogout)} title={t('header.logout')} aria-label={t('header.logout')} className="ar-btn ar-btn-icon hover:!text-rose-600 hover:!bg-rose-50 dark:hover:!text-rose-300 dark:hover:!bg-rose-500/10">
              <LogOut className="w-[18px] h-[18px]" />
            </button>
          </div>
        }
      >
        <SidebarSection title={t('nav.menu')}>
          {NAV_ITEMS.map(({ id, icon }) => (
            <SidebarItem key={id} icon={icon} label={t(`nav.section.${id}`)} active={section === id} trailing={trailing(id)} onClick={go(id)} />
          ))}
        </SidebarSection>
        <SidebarSection title={t('nav.prep')}>
          {PREP_ITEMS.map(({ id, icon }) => (
            <SidebarItem key={id} icon={icon} label={t(`nav.section.${id}`)} active={section === id} trailing={trailing(id)} onClick={go(id)} />
          ))}
          {onOpenEssay && <SidebarItem icon={PenLine} label={t('nav.essay')} onClick={run(onOpenEssay)} />}
        </SidebarSection>
        <SidebarSection>
          <SidebarItem icon={Settings} label={t('nav.section.settings')} active={section === 'settings'} onClick={go('settings')} />
        </SidebarSection>
      </Sidebar>

      <TabBar section={section} onNavigate={onNavigate} onMenu={sidebar.toggle} menuOpen={sidebar.open && !sidebar.docked} urgent={badges?.urgentDeadlines} />
    </>
  );
};
