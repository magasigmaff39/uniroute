import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FileText } from 'lucide-react';
import { Header } from './components/Header';
import { AdmissionTest } from './components/test/AdmissionTest';
import { LandingPage } from './components/landing/LandingPage';
import { Step3Diagnostic } from './components/Step3Diagnostic';
import { Step4Recommendations } from './components/Step4Recommendations';
import { Step5Comparison } from './components/Step5Comparison';
import { Step6Roadmap } from './components/Step6Roadmap';
import { Step7NextAction } from './components/Step7NextAction';
import { EssayArchitectModal } from './components/EssayArchitectModal';
import { DeadlineCalendarModal } from './components/DeadlineCalendarModal';
import { AuthModal, type AuthMode } from './components/AuthModal';
import { EmailDeliveryModal } from './components/EmailDeliveryModal';
import { AIAssistantWidget } from './components/AIAssistantWidget';
import { DocumentsModal } from './components/DocumentsModal';
import { PortfolioModal } from './components/PortfolioModal';
import { OlympiadsModal } from './components/OlympiadsModal';
import { NewsModal } from './components/NewsModal';
import { HomeSection } from './components/cabinet/HomeSection';
import { GrantsSection } from './components/cabinet/GrantsSection';
import { AnalysisSection, type AnalysisTab } from './components/cabinet/AnalysisSection';
import { SettingsSection } from './components/cabinet/SettingsSection';
import { SectionHeader } from './components/cabinet/ui';
import { BrandLogo } from './components/ui/Brand';
import { ProfileSection } from './components/profile/ProfileSection';
import { ProfileWizard } from './components/profile/ProfileWizard';
import { UniversitiesSection, type UniTab } from './components/universities/UniversitiesSection';
import { AddUniversityDialog } from './components/universities/AddUniversityDialog';
import { DeadlinesSection } from './components/planner/DeadlinesSection';
import { TasksSection } from './components/planner/TasksSection';
import { PortfolioSection, type PortfolioTab } from './components/portfolio/PortfolioSection';
import { getActiveUser, logoutUser, refreshSession, finishGoogleRedirect, UserAccount } from './lib/auth';
import { authApi, documentsApi, portfolioApi, setUiState } from './lib/api';
import { useI18n } from './i18n/I18nContext';
import { useToast } from './context/ToastContext';
import { useSidebar } from './hooks/useSidebar';
import { usePlanner } from './hooks/usePlanner';
import { useTasks } from './hooks/useTasks';
import { buildDeadlines } from './utils/deadlines';

import type {
  ApplicantProfile,
  AppSection,
  FactSource,
  NavTarget,
  PortfolioItem,
  PortfolioItemInput,
  ProfileBlockId,
  ProfileFact,
  RoadmapStep,
  University,
  UploadedDocument,
} from './types';
import { PRESET_PERSONAS } from './data/presets';
import { UNIVERSITY_BY_ID } from './data/universities';
import { runDiagnostic, matchUniversities, generateRoadmap, getNextAction } from './utils/engine';
import { mergePortfolio, nextStep, profileCompleteness, withAnswers } from './utils/profileInsights';

const DEFAULT_PROFILE: ApplicantProfile = PRESET_PERSONAS[0].profile;

/** Sections that work before the applicant test; every other one leads to the test. */
const OPEN_WITHOUT_TEST: AppSection[] = ['home', 'news', 'settings'];
const needsTest = (target: NavTarget) => !OPEN_WITHOUT_TEST.includes(target.section) && !(target.section === 'profile' && target.flow === 'test');

/** Roadmap check marks the applicant set by hand ("stepId/subtaskId" → done), kept in the browser across reloads. */
const ROADMAP_PROGRESS_KEY = 'admitroute_roadmap_progress';
type RoadmapProgress = Record<string, boolean>;
function readRoadmapProgress(): RoadmapProgress {
  try {
    const parsed = JSON.parse(localStorage.getItem(ROADMAP_PROGRESS_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as RoadmapProgress) : {};
  } catch {
    return {};
  }
}
function saveRoadmapProgress(stepId: string, subtaskId: string, done: boolean) {
  try {
    const progress = readRoadmapProgress();
    progress[`${stepId}/${subtaskId}`] = done;
    localStorage.setItem(ROADMAP_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* storage unavailable (private mode): the marks simply stay for this visit */
  }
}
function applyRoadmapProgress(steps: RoadmapStep[]): RoadmapStep[] {
  const progress = readRoadmapProgress();
  return steps.map((step) => ({
    ...step,
    subtasks: step.subtasks.map((sub) => {
      const saved = progress[`${step.id}/${sub.id}`];
      return typeof saved === 'boolean' ? { ...sub, isCompleted: saved } : sub;
    }),
  }));
}

type DocsProgress = { required: number; uploadedRequired: number; percent: number };

/** What the registration form really asked: a password sign-up gives all four, Google only the name. */
function accountFactsOf(user: UserAccount | null): ProfileFact[] {
  if (!user) return [];
  const googleOnly = (user.providers || []).length > 0 && !(user.providers || []).includes('password');
  return googleOnly ? ['name'] : ['name', 'age', 'grade', 'targetTrack'];
}

/**
 * Registration data fills the profile only where the applicant has not changed it — what they told the
 * profile later wins over what the account form remembers.
 */
function withAccount(profile: ApplicantProfile, user: UserAccount): ApplicantProfile {
  const own = profile.fieldSources || {};
  const facts = accountFactsOf(user);
  const next = { ...profile };
  if (!own.name) {
    next.firstName = user.firstName;
    next.lastName = user.lastName;
    next.name = `${user.firstName} ${user.lastName}`.trim();
  }
  if (facts.includes('age') && !own.age && !profile.birthDate) next.age = user.age;
  if (facts.includes('grade') && !own.grade) next.grade = user.grade;
  if (facts.includes('targetTrack') && !own.targetTrack) next.targetTrack = user.targetTrack || profile.targetTrack || 'university';
  return next;
}

export function App() {
  const { t, lang } = useI18n();
  const { notify } = useToast();
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => getActiveUser());
  // Signed-in cabinet docks the navigation panel on desktop; the title page only gets the drawer.
  const sidebar = useSidebar(Boolean(currentUser));
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<AuthMode>('register');
  const openAuth = (mode: AuthMode = 'register') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };
  const [isEmailModalOpen, setIsEmailModalOpen] = useState<boolean>(false);
  const [isOlympiadsModalOpen, setIsOlympiadsModalOpen] = useState<boolean>(false);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState<boolean>(false);
  const [isEssayModalOpen, setIsEssayModalOpen] = useState<boolean>(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState<boolean>(false);
  const [isPortfolioModalOpen, setIsPortfolioModalOpen] = useState<boolean>(false);
  const [isAddUniOpen, setIsAddUniOpen] = useState<boolean>(false);
  const [portfolioDraft, setPortfolioDraft] = useState<Partial<PortfolioItemInput> | null>(null);

  const [profile, setProfile] = useState<ApplicantProfile>(() => {
    try {
      const saved = localStorage.getItem('admitroute_profile');
      const parsed = saved ? JSON.parse(saved) : {};
      const base = { ...DEFAULT_PROFILE, ...parsed, extracurriculars: parsed.extracurriculars || DEFAULT_PROFILE.extracurriculars, targetUniversityIds: parsed.targetUniversityIds || DEFAULT_PROFILE.targetUniversityIds };
      const user = getActiveUser();
      return user ? withAccount(base, user) : base;
    } catch {
      return DEFAULT_PROFILE;
    }
  });

  // Navigation. Every session (including the first one after registration) starts on «Главная».
  const [section, setSection] = useState<AppSection>('home');
  const [flow, setFlow] = useState<NavTarget['flow'] | null>(null);
  const [focusBlock, setFocusBlock] = useState<ProfileBlockId | undefined>(undefined);
  const [uniTab, setUniTab] = useState<UniTab>('list');
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>('universities');
  const [portfolioTab, setPortfolioTab] = useState<PortfolioTab | undefined>(undefined);
  // Bumped on every navigation so the opened screen starts fresh (its own tabs, scroll, test state).
  const [navKey, setNavKey] = useState(0);

  const [guestTakingTest, setGuestTakingTest] = useState<boolean>(false);

  // The rest of what the applicant told the system lives on the server: portfolio entries and documents.
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [docsProgress, setDocsProgress] = useState<DocsProgress | null>(null);

  // One selection: the universities the applicant picked are «Мой список» and the comparison at the same time,
  // so adding or removing a university anywhere updates the comparison immediately.
  const selectedForCompare = useMemo(() => profile.targetUniversityIds || [], [profile.targetUniversityIds]);

  // Planner (favourite olympiads, deadline statuses, own dates, essay draft) and the preparation tasks.
  const planner = usePlanner(currentUser?.id);
  const tasksStore = useTasks(currentUser?.id);

  // Validate the cached session against the backend once (or finish a redirect-based Google sign-in),
  // and pull the server-side profile if newer.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let user: UserAccount | null = null;
      try {
        user = await finishGoogleRedirect(lang);
        if (user && !cancelled) notify(`${t('auth.toast.welcome')}, ${user.firstName}`, 'success');
      } catch {
        user = null;
      }
      if (!user) user = await refreshSession();
      if (cancelled) return;
      setCurrentUser(user);
      if (user) {
        try {
          const remote = await authApi.getProfile();
          if (!cancelled && remote.profile) {
            const localUpdated = Number(localStorage.getItem('admitroute_profile_updated') || 0);
            if (!localUpdated || Date.parse(remote.updatedAt || '') > localUpdated) {
              setProfile((prev) => ({ ...prev, ...remote.profile }));
            }
          }
        } catch {
          /* backend offline — keep local */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist locally always; sync to the server (debounced) when logged in.
  const syncTimer = useRef<number | null>(null);
  useEffect(() => {
    try {
      localStorage.setItem('admitroute_profile', JSON.stringify(profile));
      localStorage.setItem('admitroute_profile_updated', String(Date.now()));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
    if (!currentUser) return;
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(() => {
      authApi.saveProfile(profile).catch(() => undefined);
    }, 1200);
    return () => {
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
    };
  }, [profile, currentUser]);

  // Portfolio and documents: loaded once per session and kept current by the pages that change them.
  const regionsKey = profile.targetRegions.join(',');
  const userId = currentUser?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    portfolioApi
      .list()
      .then((res) => !cancelled && setPortfolioItems(res.items))
      .catch(() => undefined);
    documentsApi
      .list()
      .then((res) => !cancelled && setDocuments(res.items))
      .catch(() => undefined);
    documentsApi
      .checklist(regionsKey ? regionsKey.split(',') : [])
      .then((res) => !cancelled && setDocsProgress(res.progress))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId, regionsKey]);

  /** Every change of the profile goes through here: records the source and confirms it was saved. */
  const saveProfile = (patch: Partial<ApplicantProfile>, source: FactSource = 'profile', quiet = false) => {
    if (!Object.keys(patch).length) return;
    setProfile((prev) => withAnswers(prev, patch, source));
    if (!quiet) notify(t('pf.saved'), 'success');
  };

  // Every analysis sees the whole picture: the profile plus what the portfolio proves.
  const accountFacts = useMemo(() => accountFactsOf(currentUser), [currentUser]);
  const profileCtx = useMemo(() => ({ accountFacts, portfolio: portfolioItems, documents }), [accountFacts, portfolioItems, documents]);
  const effectiveProfile = useMemo(() => mergePortfolio(profile, portfolioItems), [profile, portfolioItems]);
  const diagnostic = useMemo(() => runDiagnostic(effectiveProfile), [effectiveProfile]);
  const matchedUniversities = useMemo(() => matchUniversities(effectiveProfile), [effectiveProfile]);
  const activePortfolioCount = portfolioItems.filter((it) => !it.excluded).length;
  const completeness = useMemo(() => profileCompleteness(profile, profileCtx), [profile, profileCtx]);
  const next = nextStep(profile, completeness, docsProgress?.percent ?? null);
  const myUniversities = useMemo(
    () => (profile.targetUniversityIds || []).map((id) => UNIVERSITY_BY_ID.get(id)).filter((u): u is University => Boolean(u)),
    [profile.targetUniversityIds],
  );
  const grantUniversities = myUniversities.length ? myUniversities : matchedUniversities.slice(0, 6);
  // Every tracked date (home page widget) and the menu hints: deadlines within two weeks and tasks still open.
  const deadlineItems = useMemo(
    () => (currentUser ? buildDeadlines({ profile: effectiveProfile, universities: myUniversities, planner: planner.planner }) : []),
    [currentUser, effectiveProfile, myUniversities, planner.planner],
  );
  const urgentDeadlines = deadlineItems.filter((d) => d.status === 'urgent').length;
  const openTasks = tasksStore.tasks.filter((x) => x.status !== 'done').length;

  const [roadmap, setRoadmap] = useState<RoadmapStep[]>(() => applyRoadmapProgress(generateRoadmap(profile, matchedUniversities)));
  useEffect(() => {
    setRoadmap((prevRoadmap) => {
      const freshSteps = applyRoadmapProgress(generateRoadmap(effectiveProfile, matchedUniversities));
      return freshSteps.map((fresh) => {
        const matchingPrev = prevRoadmap.find((p) => p.id === fresh.id);
        if (!matchingPrev) return fresh;
        return {
          ...fresh,
          subtasks: fresh.subtasks.map((fst) => {
            const prevSub = matchingPrev.subtasks.find((pst) => pst.id === fst.id);
            return prevSub ? { ...fst, isCompleted: prevSub.isCompleted } : fst;
          }),
        };
      });
    });
  }, [effectiveProfile, matchedUniversities]);

  useEffect(() => {
    const total = roadmap.reduce((n, s) => n + s.subtasks.length, 0);
    const done = roadmap.reduce((n, s) => n + s.subtasks.filter((x) => x.isCompleted).length, 0);
    setUiState({ section: flow ? `${section}:${flow}` : section, selectedForCompare, roadmapDone: total ? `${done}/${total}` : undefined, language: lang });
  }, [section, flow, selectedForCompare, roadmap, lang]);

  const nextAction = useMemo(() => getNextAction(roadmap), [roadmap]);
  const activeRoadmapStep = useMemo(() => roadmap.find((s) => s.id === nextAction.stepId) || roadmap[0], [roadmap, nextAction]);

  const testPassed = Boolean(profile.assessmentLevel);
  const navigate = (requested: NavTarget) => {
    // Until the applicant test is done there is nothing to compute from: every section except the home page,
    // the news and the settings leads to the test.
    let target = requested;
    if (!testPassed && needsTest(requested)) {
      if (requested.section !== 'profile' || requested.flow) notify(t('test.required'), 'info');
      target = { section: 'profile', flow: 'test' };
    }
    setSection(target.section);
    setFlow(target.section === 'profile' ? target.flow ?? null : null);
    setFocusBlock(target.block);
    if (target.section === 'universities') setUniTab((target.sub as UniTab) || 'list');
    if (target.section === 'analysis') {
      setAnalysisTab(target.sub === 'readiness' || target.sub === 'plan' || target.sub === 'next' ? target.sub : 'universities');
      if (target.sub === 'add') setIsAddUniOpen(true);
    }
    if (target.section === 'portfolio') setPortfolioTab(target.sub === 'entries' || target.sub === 'compare' || target.sub === 'feedback' ? target.sub : undefined);
    setNavKey((k) => k + 1);
    if (!target.block) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAuthSuccess = async (user: UserAccount, isNew?: boolean) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    void isNew;
    // Prefer the profile stored on the server for this account (multi-device); otherwise keep local edits.
    let remoteProfile: Partial<ApplicantProfile> | null = null;
    try {
      remoteProfile = (await authApi.getProfile()).profile;
    } catch {
      /* ignore */
    }
    const merged = withAccount({ ...profile, ...(remoteProfile || {}) }, user);
    setProfile(merged);
    setGuestTakingTest(false);
    // After registration or sign-in everything starts on the home page (it offers the test when needed).
    setSection('home');
    setFlow(null);
    setNavKey((k) => k + 1);
    window.scrollTo({ top: 0 });
  };

  const handleLogout = () => {
    logoutUser();
    setCurrentUser(null);
    setPortfolioItems([]);
    setDocuments([]);
    setDocsProgress(null);
    setGuestTakingTest(false);
    setSection('home');
    setFlow(null);
    window.scrollTo({ top: 0 });
  };

  // Starting over erases the answers (not the portfolio or documents), so it asks first.
  const handleReset = () => {
    if (!window.confirm(t('reset.confirm'))) return;
    setProfile(currentUser ? withAccount({ ...DEFAULT_PROFILE }, currentUser) : DEFAULT_PROFILE);
    setSection('profile');
    setFlow('test');
    setNavKey((k) => k + 1);
  };

  // The motivation letter builds on the profile and the university list, so it also waits for the test.
  const openEssay = () => (testPassed ? setIsEssayModalOpen(true) : navigate({ section: 'profile', flow: 'test' }));

  // The applicant's own university list — the same list everywhere (profile, universities, analysis, grants).
  const addUniversity = (id: string, plan: { program?: string; year?: string }) => {
    setProfile((prev) => {
      const ids = Array.from(new Set([...(prev.targetUniversityIds || []), id]));
      return withAnswers(prev, { targetUniversityIds: ids, universityPlans: { ...(prev.universityPlans || {}), [id]: plan } }, 'profile');
    });
    notify(t('uni.added', { name: UNIVERSITY_BY_ID.get(id)?.shortName || id }), 'success');
  };
  const removeUniversity = (id: string) => {
    setProfile((prev) => {
      const plans = { ...(prev.universityPlans || {}) };
      delete plans[id];
      return withAnswers(prev, { targetUniversityIds: (prev.targetUniversityIds || []).filter((x) => x !== id), universityPlans: plans }, 'profile');
    });
    notify(t('uni.removed', { name: UNIVERSITY_BY_ID.get(id)?.shortName || id }), 'info');
  };
  const toggleMyList = (id: string) => ((profile.targetUniversityIds || []).includes(id) ? removeUniversity(id) : addUniversity(id, { year: profile.targetYear }));

  const handleToggleSubtask = (stepId: string, subtaskId: string) => {
    const current = roadmap.find((step) => step.id === stepId)?.subtasks.find((task) => task.id === subtaskId);
    if (!current) return;
    const done = !current.isCompleted;
    saveRoadmapProgress(stepId, subtaskId, done);
    setRoadmap((prev) =>
      prev.map((step) =>
        step.id !== stepId ? step : { ...step, subtasks: step.subtasks.map((task) => (task.id !== subtaskId ? task : { ...task, isCompleted: done })) },
      ),
    );
  };

  const handleExportRoadmap = () => {
    let content = `ПЕРСОНАЛЬНЫЙ МАРШРУТ ПОСТУПЛЕНИЯ В УНИВЕРСИТЕТ\r\n`;
    content += `Платформа: UniRoute\r\n`;
    content += `Кандидат: ${profile.name || 'Абитуриент'} (${profile.grade}, ${profile.schoolType.toUpperCase()})\r\n`;
    content += `GPA: ${profile.gpa} | Язык: IELTS ${profile.ieltsScore || '—'} | SAT: ${profile.satScore || '—'} | ЕНТ: ${profile.untScore || '—'}\r\n`;
    content += `Финансирование: ${profile.budgetTier === 'grant_only' ? 'Только 100% грант' : profile.budgetTier}\r\n`;
    content += `Дата формирования: ${new Date().toLocaleDateString('ru-RU')}\r\n\r\n`;
    content += `========================================================\r\n\r\n`;
    roadmap.forEach((step, idx) => {
      content += `ЭТАП ${idx + 1}: ${step.title.toUpperCase()}\r\n`;
      content += `Срок: ${step.targetDate} [Категория: ${step.category}]\r\n`;
      content += `Описание: ${step.description}\r\n`;
      content += `Рекомендация: ${step.guidanceTip}\r\n`;
      content += `Контрольные действия:\r\n`;
      step.subtasks.forEach((st) => {
        content += `  [${st.isCompleted ? 'X' : ' '}] ${st.title}\r\n`;
      });
      content += `\r\n--------------------------------------------------------\r\n\r\n`;
    });
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `uniroute_plan_${profile.name || 'applicant'}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Title page / guest flow: the visitor may take the same applicant test before registering.
  if (!currentUser) {
    const guestHeader = (onReset: () => void) => (
      <Header currentUser={null} sidebar={sidebar} onOpenAuth={openAuth} onLogout={handleLogout} onReset={onReset} onOpenNewsModal={() => setIsNewsModalOpen(true)} />
    );
    const leaveTest = () => {
      setGuestTakingTest(false);
      window.scrollTo({ top: 0 });
    };
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-sans overflow-x-clip transition-colors duration-300">
        {guestTakingTest ? (
          <>
            {guestHeader(leaveTest)}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
              <AdmissionTest
                currentUser={null}
                profile={profile}
                completeness={completeness}
                diagnostic={diagnostic}
                portfolio={[]}
                onComplete={setProfile}
                onPortfolioChange={() => undefined}
                onExit={leaveTest}
                onHome={leaveTest}
                onRegister={() => openAuth('register')}
              />
            </main>
          </>
        ) : (
          <>
            {guestHeader(() => window.scrollTo({ top: 0, behavior: 'smooth' }))}
            <main className="flex-1">
              <LandingPage
                onStartQuickTest={() => {
                  setGuestTakingTest(true);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onRegister={() => openAuth('register')}
                onLogin={() => openAuth('login')}
              />
            </main>
          </>
        )}
        <AuthModal isOpen={isAuthModalOpen} initialMode={authMode} onClose={() => setIsAuthModalOpen(false)} onSuccess={handleAuthSuccess} />
        <NewsModal isOpen={isNewsModalOpen} onClose={() => setIsNewsModalOpen(false)} profile={profile} />
      </div>
    );
  }

  const admissionTest = (initialPhase: 'test' | 'result') => (
    <AdmissionTest
      currentUser={currentUser}
      profile={profile}
      completeness={completeness}
      diagnostic={diagnostic}
      portfolio={portfolioItems}
      initialPhase={initialPhase}
      onComplete={setProfile}
      onPortfolioChange={setPortfolioItems}
      onExit={() => navigate({ section: 'home' })}
      onHome={() => navigate({ section: 'home' })}
      onNavigate={navigate}
    />
  );

  const renderSection = () => {
    // Safety net for states reached without navigate() (e.g. a reset): no test — the test.
    if (!testPassed && needsTest({ section, flow: flow ?? undefined })) return admissionTest('test');
    switch (section) {
      case 'home':
        return (
          <HomeSection
            user={currentUser}
            profile={effectiveProfile}
            completeness={completeness}
            diagnostic={diagnostic}
            next={next}
            grants={{ withGrant: grantUniversities.filter((u) => u.hasFullGrantOrScholarship).length, total: grantUniversities.length }}
            universities={myUniversities}
            deadlines={deadlineItems}
            tasks={tasksStore.tasks}
            portfolioCount={activePortfolioCount}
            essay={planner.planner.essay}
            favoriteOlympiads={planner.planner.favoriteOlympiadIds.length}
            onNavigate={navigate}
            onOpenEssay={openEssay}
          />
        );

      case 'news':
        return (
          <div className="space-y-6">
            <SectionHeader kicker={t('nav.section.news')} title={t('news.title')} subtitle={t('news.subtitle')} />
            <NewsModal variant="page" isOpen onClose={() => navigate({ section: 'home' })} profile={profile} />
          </div>
        );

      case 'profile':
        if (flow === 'test' || flow === 'result') return admissionTest(flow);
        if (flow === 'fill') {
          return (
            <ProfileWizard
              mode="fill"
              profile={profile}
              completeness={completeness}
              portfolio={portfolioItems}
              onSave={(patch) => saveProfile(patch)}
              onPortfolioChange={setPortfolioItems}
              onFinish={() => navigate({ section: 'profile' })}
              onExit={() => navigate({ section: 'profile' })}
            />
          );
        }
        return (
          <ProfileSection
            user={currentUser}
            profile={profile}
            effectiveProfile={effectiveProfile}
            completeness={completeness}
            portfolio={portfolioItems}
            documents={documents}
            docsProgress={docsProgress}
            focusBlock={focusBlock}
            onSave={(patch) => saveProfile(patch)}
            onPortfolioChange={setPortfolioItems}
            onNavigate={navigate}
            onAddUniversity={() => setIsAddUniOpen(true)}
            onRemoveUniversity={removeUniversity}
            onOpenPortfolioAI={() => setIsPortfolioModalOpen(true)}
            onOpenOlympiads={() => setIsOlympiadsModalOpen(true)}
          />
        );

      case 'universities':
        return (
          <UniversitiesSection
            profile={profile}
            myUniversities={myUniversities}
            tab={uniTab}
            onTabChange={setUniTab}
            onAdd={() => setIsAddUniOpen(true)}
            onRemove={removeUniversity}
            onNavigate={navigate}
            pick={
              <Step4Recommendations
                universities={matchedUniversities}
                profile={effectiveProfile}
                selectedForCompare={selectedForCompare}
                onToggleCompare={toggleMyList}
                onNext={() => setUniTab('compare')}
                onBack={() => setUniTab('list')}
              />
            }
            compare={
              <Step5Comparison
                allUniversities={matchedUniversities}
                selectedIds={selectedForCompare}
                onToggleUni={removeUniversity}
                onAddUniversity={() => setIsAddUniOpen(true)}
                onPick={() => setUniTab('pick')}
                onNext={() => navigate({ section: 'analysis' })}
                onBack={() => setUniTab('pick')}
                profile={effectiveProfile}
                isAuthenticated
              />
            }
          />
        );

      case 'analysis':
        return (
          <AnalysisSection
            profile={profile}
            effectiveProfile={effectiveProfile}
            completeness={completeness}
            portfolioCount={activePortfolioCount}
            documents={documents}
            docs={docsProgress}
            universities={myUniversities}
            tab={analysisTab}
            onTabChange={setAnalysisTab}
            onNavigate={navigate}
            onAddUniversity={() => setIsAddUniOpen(true)}
            onRemoveUniversity={removeUniversity}
            onCompare={() => navigate({ section: 'universities', sub: 'compare' })}
            onOpenTasks={() => navigate({ section: 'tasks' })}
            onOpenDeadlines={() => navigate({ section: 'deadlines' })}
            readiness={<Step3Diagnostic embedded profile={effectiveProfile} diagnostic={diagnostic} onNext={() => setAnalysisTab('plan')} onBack={() => setAnalysisTab('universities')} />}
            plan={
              <Step6Roadmap
                embedded
                roadmap={roadmap}
                profile={effectiveProfile}
                onToggleSubtask={handleToggleSubtask}
                onNext={() => setAnalysisTab('next')}
                onBack={() => setAnalysisTab('universities')}
                onExportRoadmap={handleExportRoadmap}
                onOpenEmailModal={() => setIsEmailModalOpen(true)}
              />
            }
            nextAction={
              <Step7NextAction
                embedded
                currentStepData={nextAction}
                activeRoadmapStep={activeRoadmapStep}
                onToggleSubtask={handleToggleSubtask}
                onBack={() => setAnalysisTab('plan')}
                onRestart={() => navigate({ section: 'home' })}
                onOpenEssayModal={openEssay}
                onOpenCalendarModal={() => navigate({ section: 'deadlines' })}
                onOpenEmailModal={() => setIsEmailModalOpen(true)}
              />
            }
          />
        );

      case 'deadlines':
        return (
          <DeadlinesSection
            profile={effectiveProfile}
            universities={myUniversities}
            planner={planner}
            tasks={tasksStore}
            onNavigate={navigate}
            onAddUniversity={() => setIsAddUniOpen(true)}
            onOpenCalendar={() => setIsCalendarModalOpen(true)}
          />
        );

      case 'tasks':
        return (
          <TasksSection
            profile={effectiveProfile}
            universities={myUniversities}
            planner={planner}
            tasks={tasksStore}
            onNavigate={navigate}
            onOpenEssay={openEssay}
          />
        );

      case 'olympiads':
        return (
          <div className="space-y-6">
            <SectionHeader kicker={t('nav.section.olympiads')} title={t('olympiads.page.title')} subtitle={t('olympiads.page.subtitle')} />
            <OlympiadsModal
              variant="page"
              isOpen
              onClose={() => navigate({ section: 'home' })}
              isAuthenticated
              onOpenAuth={() => openAuth('login')}
              profile={effectiveProfile}
              favoriteIds={planner.planner.favoriteOlympiadIds}
              onToggleFavorite={planner.toggleFavorite}
              tasks={tasksStore.tasks}
              onCreateTask={tasksStore.create}
              onOpenTasks={() => navigate({ section: 'tasks' })}
              onOpenDeadlines={() => navigate({ section: 'deadlines' })}
              onAddToPortfolio={(draft) => {
                setPortfolioDraft(draft);
                navigate({ section: 'portfolio', sub: 'entries' });
              }}
            />
          </div>
        );

      case 'portfolio':
        return (
          <PortfolioSection
            profile={profile}
            effectiveProfile={effectiveProfile}
            universities={myUniversities}
            items={portfolioItems}
            documents={documents}
            tasks={tasksStore}
            initialTab={portfolioTab}
            onAddItem={setPortfolioDraft}
            onNavigate={navigate}
            onAddUniversity={() => setIsAddUniOpen(true)}
            entries={
              <PortfolioModal
                variant="page"
                isOpen
                onClose={() => navigate({ section: 'home' })}
                isAuthenticated
                onOpenAuth={() => openAuth('login')}
                profile={profile}
                selectedForCompare={selectedForCompare}
                draft={isPortfolioModalOpen ? null : portfolioDraft}
                onDraftConsumed={() => setPortfolioDraft(null)}
                onItemsChange={setPortfolioItems}
              />
            }
          />
        );

      case 'grants':
        return (
          <GrantsSection
            profile={effectiveProfile}
            completeness={completeness}
            documents={documents}
            portfolioCount={activePortfolioCount}
            universities={grantUniversities}
            ownList={myUniversities.length > 0}
            onNavigate={navigate}
            onAddUniversity={() => setIsAddUniOpen(true)}
          />
        );

      case 'documents':
        return (
          <div className="space-y-6">
            <SectionHeader
              kicker={t('nav.section.documents')}
              title={t('documents.title')}
              subtitle={t('documents.subtitle')}
              aside={
                <button type="button" onClick={openEssay} className="ar-btn ar-btn-ghost text-xs">
                  <FileText className="w-3.5 h-3.5" /> {t('header.essay')}
                </button>
              }
            />
            <DocumentsModal
              variant="page"
              isOpen
              onClose={() => navigate({ section: 'home' })}
              isAuthenticated
              onOpenAuth={() => openAuth('login')}
              profile={profile}
              onProgressChange={setDocsProgress}
              onFilesChange={setDocuments}
            />
          </div>
        );

      case 'settings':
        return (
          <SettingsSection
            user={currentUser}
            profile={profile}
            onSave={(patch) => saveProfile(patch)}
            onRetakeTest={() => navigate({ section: 'profile', flow: 'test' })}
            onReset={handleReset}
            onLogout={handleLogout}
          />
        );
    }
  };

  return (
    <div className="ar-has-tabbar min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-col font-sans overflow-x-clip transition-colors duration-300">
      <Header
        currentUser={currentUser}
        sidebar={sidebar}
        onOpenAuth={openAuth}
        onLogout={handleLogout}
        onReset={handleReset}
        onOpenNewsModal={() => setIsNewsModalOpen(true)}
        section={section}
        onNavigate={navigate}
        badges={{ profile: completeness.percent, urgentDeadlines, openTasks }}
        testPassed={testPassed}
        onOpenEssay={openEssay}
      />

      <div className="ar-shell flex-1 flex flex-col min-w-0" data-sidebar={sidebar.docked && sidebar.open ? 'docked' : undefined}>
        <main key={navKey} className="ar-page flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {renderSection()}
        </main>

        <footer className="border-t border-[var(--line)] py-6 mt-10 text-xs text-slate-500 dark:text-zinc-400">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <BrandLogo size="sm" tagline={t('header.tagline')} />
            <p className="text-center sm:text-right">
              © {new Date().getFullYear()} UniRoute · {currentUser.gmail}
            </p>
          </div>
        </footer>
      </div>

      <AddUniversityDialog open={isAddUniOpen} onClose={() => setIsAddUniOpen(false)} existingIds={profile.targetUniversityIds || []} defaultYear={profile.targetYear} onAdd={addUniversity} />

      <EssayArchitectModal
        isOpen={isEssayModalOpen}
        onClose={() => setIsEssayModalOpen(false)}
        profile={profile}
        universities={myUniversities}
        portfolio={portfolioItems}
        initialDraft={planner.planner.essay}
        onSaveDraft={planner.saveEssay}
      />

      <DeadlineCalendarModal isOpen={isCalendarModalOpen} onClose={() => setIsCalendarModalOpen(false)} />

      <AuthModal isOpen={isAuthModalOpen} initialMode={authMode} onClose={() => setIsAuthModalOpen(false)} onSuccess={handleAuthSuccess} />

      <EmailDeliveryModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        userEmail={currentUser.gmail || ''}
        studentName={profile.name || `${currentUser.firstName} ${currentUser.lastName}`}
        readinessScore={diagnostic.readiness.overall}
        roadmap={roadmap}
        matchedUnis={matchedUniversities}
      />

      <NewsModal isOpen={isNewsModalOpen} onClose={() => setIsNewsModalOpen(false)} profile={profile} />

      {/* Portfolio AI evaluation (entries themselves are edited inside «Мой профиль») */}
      <PortfolioModal
        isOpen={isPortfolioModalOpen}
        onClose={() => setIsPortfolioModalOpen(false)}
        isAuthenticated
        onOpenAuth={() => openAuth('login')}
        profile={profile}
        selectedForCompare={selectedForCompare}
        draft={isPortfolioModalOpen ? portfolioDraft : null}
        onDraftConsumed={() => setPortfolioDraft(null)}
        onItemsChange={setPortfolioItems}
      />

      {/* Olympiad catalogue: «add to portfolio» opens the portfolio with the form prefilled */}
      <OlympiadsModal
        isOpen={isOlympiadsModalOpen}
        onClose={() => setIsOlympiadsModalOpen(false)}
        isAuthenticated
        onOpenAuth={() => openAuth('login')}
        profile={profile}
        favoriteIds={planner.planner.favoriteOlympiadIds}
        onToggleFavorite={planner.toggleFavorite}
        tasks={tasksStore.tasks}
        onCreateTask={tasksStore.create}
        onOpenTasks={() => {
          setIsOlympiadsModalOpen(false);
          navigate({ section: 'tasks' });
        }}
        onOpenDeadlines={() => {
          setIsOlympiadsModalOpen(false);
          navigate({ section: 'deadlines' });
        }}
        onAddToPortfolio={(draft) => {
          setPortfolioDraft(draft);
          setIsOlympiadsModalOpen(false);
          setIsPortfolioModalOpen(true);
        }}
      />

      <AIAssistantWidget profile={profile} isAuthenticated />
    </div>
  );
}

export default App;
