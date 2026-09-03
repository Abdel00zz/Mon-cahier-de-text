import React, { Suspense, lazy, useState, useCallback, useEffect, useRef } from 'react';
import { Toaster } from './components/ui/sonner';
import { GlobalTooltip } from './components/ui/GlobalTooltip';
import { AppBootSkeleton } from './components/ui/PageSkeleton';
import { AppLocale, ClassInfo } from './types';
import { useConfigManager } from './hooks/useConfigManager';
import { useSessionAlerts } from './hooks/useSessionAlerts';
import { useAuth } from './contexts/AuthContext';
import { AUTH_REQUIRED } from './config/features';
import { normalizeOfficialClassName } from './constants';
import { LocaleProvider, translateLocaleMessage } from '@/i18n/LocaleProvider';
import { useNotificationFeed } from './hooks/useNotificationFeed';
import { useAdminMessages } from './hooks/useAdminMessages';
import { MATHJAX_V4_SRC, mathJaxConfig } from './config/mathJax';

import { useClassManager } from './hooks/useClassManager';
import { useTheme } from './hooks/useTheme';
import { TabBar, TabType } from './components/navigation/TabBar';
import { Modal } from './components/ui/modal';
import { preloadSettingsPage } from './utils/performance';

const Dashboard = lazy(() => import('./features/dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
const Editor = lazy(() => import('./features/editor/Editor').then(module => ({ default: module.Editor })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const NotificationsPage = lazy(() => import('./features/dashboard/NotificationsPage').then(module => ({ default: module.NotificationsPage })));
const AuthPage = lazy(() => import('./features/auth/AuthPage').then(module => ({ default: module.AuthPage })));
const GuideModal = lazy(() => import('./features/guide/GuideModal').then(module => ({ default: module.GuideModal })));
const AdminMessageModal = lazy(() => import('./features/messages/AdminMessageModal').then(module => ({ default: module.AdminMessageModal })));
const MathJaxContext = lazy(() => import('better-react-mathjax').then(module => ({ default: module.MathJaxContext })));
const DevoirsView = lazy(() => import('./features/evaluations/DevoirsView').then(module => ({ default: module.DevoirsView })));

type View = 'dashboard' | 'editor' | 'settings' | 'notifications';

interface RouteSnapshot {
  view: View;
  activeClass: ClassInfo | null;
}

const DASHBOARD_HASH = '#/';
const SETTINGS_HASH = '#/parametres';
const NOTIFICATIONS_HASH = '#/notifications';

const getClassRoute = (classId: string) => `#/classe/${encodeURIComponent(classId)}`;
const readStoredClass = (classId: string): ClassInfo | null => {
  try {
    const classes = JSON.parse(localStorage.getItem('classManager_v1') || '[]') as ClassInfo[];
    const classInfo = classes.find(item => item.id === classId) ?? null;
    if (!classInfo) return null;
    const normalizedName = normalizeOfficialClassName(classInfo.name);
    return normalizedName === classInfo.name ? classInfo : { ...classInfo, name: normalizedName };
  } catch {
    return null;
  }
};

const readRouteSnapshot = (): RouteSnapshot => {
  if (window.location.hash === SETTINGS_HASH) return { view: 'settings', activeClass: null };
  if (window.location.hash.startsWith(NOTIFICATIONS_HASH)) return { view: 'notifications', activeClass: null };
  const match = window.location.hash.match(/^#\/classe\/([^/]+)$/);
  if (!match) return { view: 'dashboard', activeClass: null };

  const classInfo = readStoredClass(decodeURIComponent(match[1]));
  return classInfo
    ? { view: 'editor', activeClass: classInfo }
    : { view: 'dashboard', activeClass: null };
};

const getScrollKey = (view: View, activeClass: ClassInfo | null) =>
  view === 'editor' && activeClass ? `editor:${activeClass.id}` : 'dashboard';

const App: React.FC = () => {
  const initialRouteRef = useRef<RouteSnapshot | null>(null);
  if (initialRouteRef.current === null) {
    initialRouteRef.current = readRouteSnapshot();
  }

  const [view, setView] = useState<View>(initialRouteRef.current.view);
  const [activeClass, setActiveClass] = useState<ClassInfo | null>(initialRouteRef.current.activeClass);
  const [settingsOrigin, setSettingsOrigin] = useState<RouteSnapshot>(() =>
    initialRouteRef.current?.view === 'settings'
      ? { view: 'dashboard', activeClass: null }
      : initialRouteRef.current ?? { view: 'dashboard', activeClass: null }
  );
  const [notificationsOrigin, setNotificationsOrigin] = useState<RouteSnapshot>(() =>
    initialRouteRef.current?.view === 'notifications'
      ? { view: 'dashboard', activeClass: null }
      : initialRouteRef.current ?? { view: 'dashboard', activeClass: null }
  );
  const [isEvaluationsOpen, setIsEvaluationsOpen] = useState(false);
  const [isGuideOpen, setGuideOpen] = useState(false);
  const [isSidebarExpanded, setSidebarExpanded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('cdt_sidebar_expanded_v1');
      if (stored !== null) return stored === 'true';
    } catch {}
    return false; // Réduite par défaut sur PC
  });
  const [isOnboardingVisible, setOnboardingVisible] = useState(false);
  // Le moteur MathJax est une dépendance réelle du rendu des cahiers. L'état
  // évite de révéler une formule brute avant que ses notations soient prêtes.
  const [mathJaxState, setMathJaxState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const { classes, addClass } = useClassManager();
  const { config, updateConfig, isLoading: isConfigLoading } = useConfigManager();
  useTheme(
    config.theme,
    config.contentFontLatin,
    config.contentFontArabic,
    (newTheme) => updateConfig({ theme: newTheme }),
    config.themeCustomization
  );
  const { status: authStatus, user: authUser } = useAuth();
  const { messages: adminMessages, acknowledge: acknowledgeAdminMessage } = useAdminMessages(authStatus === 'authenticated');
  const previousAuthStatusRef = useRef(authStatus);
  // rappels locaux de fin de séance (vibration + toast), actifs sur toutes les vues
  useSessionAlerts();
  const scrollPositionsRef = useRef<Record<string, number>>({});
  
  const notificationFeed = useNotificationFeed(classes, config, config.applicationLocale ?? 'ar');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const requestIdle = (window as any).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 1200));
    const cancelIdle = (window as any).cancelIdleCallback || clearTimeout;
    const idleHandle = requestIdle(() => {
      preloadSettingsPage();
    });
    return () => cancelIdle(idleHandle);
  }, []);

  // Une authentification déclenchée depuis une ancienne vue (par exemple les
  // paramètres après une déconnexion) doit reprendre à l'accueil. Cela permet
  // au premier compte connecté d'atteindre immédiatement son onboarding, sans
  // réafficher la navigation ou les données de l'utilisateur précédent.
  useEffect(() => {
    const wasAnonymous = previousAuthStatusRef.current === 'anonymous';
    previousAuthStatusRef.current = authStatus;
    if (!wasAnonymous || authStatus !== 'authenticated') return;

    setIsEvaluationsOpen(false);
    setOnboardingVisible(false);
    setActiveClass(null);
    setSettingsOrigin({ view: 'dashboard', activeClass: null });
    setNotificationsOrigin({ view: 'dashboard', activeClass: null });
    setView('dashboard');
    window.history.replaceState({ route: 'dashboard' }, '', DASHBOARD_HASH);
  }, [authStatus]);

  const saveCurrentScroll = useCallback(() => {
    const visibleRoute = view === 'settings'
      ? (settingsOrigin.view === 'notifications' ? notificationsOrigin : settingsOrigin)
      : view === 'notifications'
        ? notificationsOrigin
        : { view, activeClass };
    scrollPositionsRef.current[getScrollKey(visibleRoute.view, visibleRoute.activeClass)] = window.scrollY;
  }, [activeClass, notificationsOrigin, settingsOrigin, view]);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const visibleRoute = view === 'settings'
      ? (settingsOrigin.view === 'notifications' ? notificationsOrigin : settingsOrigin)
      : view === 'notifications'
        ? notificationsOrigin
        : { view, activeClass };
    const key = getScrollKey(visibleRoute.view, visibleRoute.activeClass);
    const top = scrollPositionsRef.current[key] ?? 0;
    const animationFrame = window.requestAnimationFrame(() => window.scrollTo(0, top));
    const settleTimer = window.setTimeout(() => window.scrollTo(0, top), 220);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(settleTimer);
    };
  }, [activeClass, notificationsOrigin, settingsOrigin, view]);

  const handleSelectClass = useCallback((classInfo: ClassInfo) => {
    saveCurrentScroll();
    setActiveClass(classInfo);
    setView('editor');
    window.history.pushState({ route: 'editor', classId: classInfo.id }, '', getClassRoute(classInfo.id));
  }, [saveCurrentScroll]);

  const handleBackToDashboard = useCallback(() => {
    saveCurrentScroll();
    setActiveClass(null);
    setView('dashboard');
    window.history.replaceState({ route: 'dashboard' }, '', DASHBOARD_HASH);
  }, [saveCurrentScroll]);

  const handleOpenSettings = useCallback(() => {
    if (view === 'settings') return;
    saveCurrentScroll();
    setSettingsOrigin({ view, activeClass });
    setView('settings');
    window.history.pushState({ route: 'settings' }, '', SETTINGS_HASH);
  }, [activeClass, saveCurrentScroll, view]);

  const handleOpenSchedule = useCallback(() => {
    try { sessionStorage.setItem('config_initial_tab_v1', 'emploi'); } catch { /* navigation conservée */ }
    handleOpenSettings();
  }, [handleOpenSettings]);

  const handleOpenNotifications = useCallback(() => {
    if (view === 'notifications') return;
    saveCurrentScroll();
    const origin = view === 'settings'
      ? (settingsOrigin.view === 'notifications' ? notificationsOrigin : settingsOrigin)
      : { view, activeClass };
    setNotificationsOrigin(
      origin.view === 'settings' || origin.view === 'notifications'
        ? { view: 'dashboard', activeClass: null }
        : origin,
    );
    setView('notifications');
    window.history.pushState({ route: 'notifications' }, '', NOTIFICATIONS_HASH);
  }, [activeClass, notificationsOrigin, saveCurrentScroll, settingsOrigin, view]);

  const handleBackFromNotifications = useCallback(() => {
    if (window.history.state?.route === 'notifications') {
      window.history.back();
    } else {
      // Chargement direct de #/notifications : aucun écran précédent fiable.
      setActiveClass(null);
      setView('dashboard');
      window.history.replaceState({ route: 'dashboard' }, '', DASHBOARD_HASH);
    }
  }, []);

  // « Retour » des Paramètres : revient à la vue d'ORIGINE (éditeur ou tableau
  // de bord) via l'historique, et non systématiquement au tableau de bord.
  // Garde : sur un chargement direct de #/parametres, aucun état poussé par
  // l'app → history.back() sortirait du site ; on retombe alors sur l'accueil.
  const handleBackFromSettings = useCallback(() => {
    if (window.history.state?.route === 'settings' && window.history.state?.settingsSubView) {
      window.history.go(-2); // sous-rubrique mobile + sheet Paramètres
    } else if (window.history.state?.route === 'settings' || window.history.state?.route === 'notifications') {
      window.history.back(); // popstate → syncRouteFromLocation restaure la vue précédente
    } else {
      handleBackToDashboard();
    }
  }, [handleBackToDashboard]);

  // Handle browser back / forward buttons
  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState({ route: 'dashboard' }, '', DASHBOARD_HASH);
    }

    const syncRouteFromLocation = () => {
      saveCurrentScroll();
      const snapshot = readRouteSnapshot();
      if (snapshot.view === 'settings' && view !== 'settings') {
        setSettingsOrigin({ view, activeClass });
      }
      if (snapshot.view === 'notifications' && view !== 'notifications') {
        const origin = view === 'settings'
          ? (settingsOrigin.view === 'notifications' ? notificationsOrigin : settingsOrigin)
          : { view, activeClass };
        setNotificationsOrigin(
          origin.view === 'settings' || origin.view === 'notifications'
            ? { view: 'dashboard', activeClass: null }
            : origin,
        );
      }
      setActiveClass(snapshot.activeClass);
      setView(snapshot.view);
    };
    window.addEventListener('popstate', syncRouteFromLocation);
    window.addEventListener('hashchange', syncRouteFromLocation);
    return () => {
      window.removeEventListener('popstate', syncRouteFromLocation);
      window.removeEventListener('hashchange', syncRouteFromLocation);
    };
  }, [activeClass, notificationsOrigin, saveCurrentScroll, settingsOrigin, view]);

  const requestedBackgroundRoute = view === 'settings'
    ? (settingsOrigin.view === 'notifications' ? notificationsOrigin : settingsOrigin)
    : view === 'notifications'
      ? notificationsOrigin
      : { view, activeClass };
  const backgroundRoute = requestedBackgroundRoute.view === 'settings' || requestedBackgroundRoute.view === 'notifications'
    ? { view: 'dashboard' as const, activeClass: null }
    : requestedBackgroundRoute;
  const backgroundView = backgroundRoute.view;
  const backgroundClass = backgroundRoute.activeClass;

  const renderContent = () => {
    // En attente du chargement (auth ignorée si AUTH_REQUIRED est désactivé).
    if (isConfigLoading || (AUTH_REQUIRED && authStatus === 'loading')) {
      return <AppBootSkeleton />;
    }
    // Page d'authentification (uniquement si l'auth est activée).
    if (AUTH_REQUIRED && authStatus === 'anonymous') {
      return <AuthPage locale={config.applicationLocale ?? 'ar'} onLocaleChange={(locale) => updateConfig({ applicationLocale: locale as AppLocale })} />;
    }
    if (backgroundView === 'editor' && backgroundClass) {
      return <Editor classInfo={backgroundClass} onOpenSettings={handleOpenSettings} />;
    }
    return (
      <Dashboard
        onSelectClass={handleSelectClass}
        notificationFeed={notificationFeed}
        accountTeacherName={`${authUser?.prenom ?? ''} ${authUser?.nom ?? ''}`.trim()}
        onOpenSchedule={handleOpenSchedule}
        onOnboardingVisibilityChange={setOnboardingVisible}
      />
    );
  };

  const routeKey = backgroundView === 'editor' && backgroundClass
    ? `editor-${backgroundClass.id}`
    : backgroundView;

  const activeTab: TabType = isEvaluationsOpen
    ? 'evaluations'
    : view === 'settings'
    ? 'settings'
    : view === 'notifications'
    ? 'notifications'
    : 'dashboard';

  const handleTabChange = useCallback((tab: TabType) => {
    if (tab === 'evaluations') {
      setIsEvaluationsOpen(true);
    } else if (tab === 'dashboard') {
      setIsEvaluationsOpen(false);
      if (view !== 'dashboard') {
        handleBackToDashboard();
      }
    } else if (tab === 'notifications') {
      setIsEvaluationsOpen(false);
      handleOpenNotifications();
    } else if (tab === 'settings') {
      setIsEvaluationsOpen(false);
      handleOpenSettings();
    } else if (tab === 'help') {
      setGuideOpen(true);
    }
  }, [view, handleBackToDashboard, handleOpenNotifications, handleOpenSettings]);

  const isAuthView = AUTH_REQUIRED && authStatus === 'anonymous';
  const isBooting = isConfigLoading || (AUTH_REQUIRED && authStatus === 'loading');
  const isLatexBooting = !isBooting && !isAuthView && mathJaxState === 'loading';

  // L'accueil masque la navigation dès le premier rendu puis pendant tout le
  // parcours déclaré par Dashboard. Une classe créée en cours d'onboarding ne
  // peut donc plus faire réapparaître le sidebar prématurément.
  const shouldBootOnboarding =
    backgroundView === 'dashboard' &&
    !config.hasCompletedWelcome &&
    authUser?.hasCompletedWelcome !== true;
  const isCurrentlyOnboarding = isOnboardingVisible || shouldBootOnboarding;

  const showNavigation = !isAuthView && !isBooting && backgroundView !== 'editor' && !isCurrentlyOnboarding;
  const isRtl = (config.applicationLocale ?? 'ar') === 'ar';

  const appSurface = (
    <div className="relative min-h-screen overflow-x-clip text-foreground">
      {showNavigation && (
        <TabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          notificationsCount={notificationFeed.attentionCount}
          isExpanded={isSidebarExpanded}
          onToggleExpanded={() => setSidebarExpanded(expanded => {
            const next = !expanded;
            try {
              localStorage.setItem('cdt_sidebar_expanded_v1', String(next));
            } catch {}
            return next;
          })}
          isRtl={isRtl}
          teacherName={config.defaultTeacherName || (authUser ? `${authUser.prenom || ''} ${authUser.nom || ''}`.trim() : '')}
        />
      )}
      <div
        data-settings-sheet-open={view === 'settings' || view === 'notifications' ? 'true' : 'false'}
        className={`app-settings-parent relative min-h-screen overflow-x-clip transition-all ${showNavigation ? 'pb-[calc(5.75rem+env(safe-area-inset-bottom,0px))] sm:pb-10' : ''} ${showNavigation ? (isRtl ? (isSidebarExpanded ? 'sm:pr-[252px]' : 'sm:pr-[84px]') : (isSidebarExpanded ? 'sm:pl-[252px]' : 'sm:pl-[84px]')) : ''}`}
      >
        <div key={routeKey} className="relative z-10 min-h-screen">
          <Suspense fallback={<AppBootSkeleton />}>
            {renderContent()}
          </Suspense>
        </div>
        {/* L'onboarding ne compose aucune formule : il reste utilisable
            pendant le chargement du moteur destiné aux cahiers. */}
        {isLatexBooting && !isCurrentlyOnboarding && <AppBootSkeleton stage="latex" overlay />}
      </div>
      {view === 'notifications' && !isAuthView && !isBooting && (
        <Suspense fallback={null}>
          <NotificationsPage
            classes={classes}
            config={config}
            feed={notificationFeed}
            onSelectClass={handleSelectClass}
            onOpenSettings={handleOpenSettings}
            onBack={handleBackFromNotifications}
          />
        </Suspense>
      )}
      {view === 'settings' && !isAuthView && !isBooting && (
        <Suspense fallback={null}>
          <SettingsPage
            onBack={handleBackFromSettings}
            onOpenGuide={() => setGuideOpen(true)}
            config={config}
            onConfigChange={updateConfig}
            classes={classes}
            addClass={addClass}
          />
        </Suspense>
      )}
    </div>
  );

  return (
    <>
      <LocaleProvider locale={config.applicationLocale ?? 'ar'}>
        {/*
          Les aperçus de séance du tableau de bord affichent eux aussi des
          titres saisis en LaTeX. Le contexte doit donc couvrir toute
          l'application, et pas uniquement la vue de l'éditeur.
        */}
        <Suspense fallback={<AppBootSkeleton />}>
          <MathJaxContext
            version={3}
            src={MATHJAX_V4_SRC}
            config={mathJaxConfig}
            onLoad={() => setMathJaxState('ready')}
            // Une coupure réseau ne doit jamais bloquer l'accès aux cahiers :
            // MathText laisse alors la syntaxe source visible et utilisable.
            onError={() => setMathJaxState('unavailable')}
          >
            {appSurface}
          </MathJaxContext>
        </Suspense>

        {/* Évaluations globales — socle commun Modal */}
        <Modal
          isOpen={isEvaluationsOpen}
          onClose={() => setIsEvaluationsOpen(false)}
          maxWidth="4xl"
          title={translateLocaleMessage(config.applicationLocale ?? 'ar', 'dashboard.evaluations')}
          bodyClassName="px-4 py-4 sm:px-6 sm:py-5"
        >
          <Suspense fallback={<AppBootSkeleton />}>
            <DevoirsView
              classes={classes}
              config={config}
              onConfigChange={updateConfig}
            />
          </Suspense>
        </Modal>

        <Suspense fallback={null}>
          <GuideModal isOpen={isGuideOpen} onClose={() => setGuideOpen(false)} />
        </Suspense>

        {adminMessages[0] && (
          <Suspense fallback={null}>
            <AdminMessageModal
              message={adminMessages[0]}
              onAcknowledge={acknowledgeAdminMessage}
            />
          </Suspense>
        )}

        <GlobalTooltip />
        <Toaster
          position={isRtl ? 'bottom-left' : 'bottom-right'}
          closeButton={false}
          expand={false}
          gap={4}
          visibleToasts={2}
          offset={{ bottom: 20, right: 20 }}
          mobileOffset={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)', left: 16, right: 16 }}
          className="print:hidden"
        />
      </LocaleProvider>
    </>
  );
}

export default App;
