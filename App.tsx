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

import { useClassManager } from './hooks/useClassManager';
import { useTheme } from './hooks/useTheme';
import { TabBar, TabType } from './components/navigation/TabBar';
import { Modal } from './components/ui/modal';

const Dashboard = lazy(() => import('./features/dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
const Editor = lazy(() => import('./features/editor/Editor').then(module => ({ default: module.Editor })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const NotificationsPage = lazy(() => import('./features/dashboard/NotificationsPage').then(module => ({ default: module.NotificationsPage })));
const AuthPage = lazy(() => import('./features/auth/AuthPage').then(module => ({ default: module.AuthPage })));
const GuideModal = lazy(() => import('./features/guide/GuideModal').then(module => ({ default: module.GuideModal })));
const AdminMessageModal = lazy(() => import('./features/messages/AdminMessageModal').then(module => ({ default: module.AdminMessageModal })));
const MathJaxContext = lazy(() => import('better-react-mathjax').then(module => ({ default: module.MathJaxContext })));
const DevoirsView = lazy(() => import('./features/evaluations/DevoirsView').then(module => ({ default: module.DevoirsView })));

// MathJax 4.1.3 (dernière version), chargé depuis jsDelivr. L'API de démarrage
// de la v4 reste compatible avec `version={3}` de better-react-mathjax (config
// `window.MathJax`, `startup.promise`, `typesetPromise`). Le composant combiné
// `tex-mml-chtml` inclut déjà entrée TeX/MathML + sortie CHTML (pas de `loader`).
const MATHJAX_V4_SRC = 'https://cdn.jsdelivr.net/npm/mathjax@4.1.3/tex-mml-chtml.js';

const mathJaxConfig = {
  tex: {
    inlineMath: [["$", "$"], ["\\(", "\\)"]],
    displayMath: [["$$", "$$"], ["\\[", "\\]"]],
    // Macros de confort pour la saisie rapide des enseignants :
    // $\R$ ≡ $\mathbb{R}$, $\abs{x}$ ≡ $\left|x\right|$, etc. (voir README).
    macros: {
      R: "\\mathbb{R}",
      N: "\\mathbb{N}",
      Z: "\\mathbb{Z}",
      Q: "\\mathbb{Q}",
      C: "\\mathbb{C}",
      abs: ["\\left|#1\\right|", 1],
      norme: ["\\left\\lVert #1\\right\\rVert", 1],
      vect: ["\\overrightarrow{#1}", 1],
      e: "\\mathrm{e}",
      dif: "\\mathrm{d}",
    },
  },
  // NB : pas d'option `chtml.displayOverflow`, bien que MathJax 4 (chargé
  // ci-dessus) la supporte, le débordement des longues formules sur mobile
  // est géré en CSS (conteneurs overflow-x:auto) ; l'activer changerait la
  // mise en page existante des formules hors-gabarit.
};

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
  const [isEvaluationsOpen, setIsEvaluationsOpen] = useState(false);
  const [isGuideOpen, setGuideOpen] = useState(false);
  const [isSidebarExpanded, setSidebarExpanded] = useState(true);
  const [isOnboardingVisible, setOnboardingVisible] = useState(false);
  const { classes } = useClassManager();
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
    setView('dashboard');
    window.history.replaceState({ route: 'dashboard' }, '', DASHBOARD_HASH);
  }, [authStatus]);

  const saveCurrentScroll = useCallback(() => {
    const visibleRoute = view === 'settings' ? settingsOrigin : { view, activeClass };
    scrollPositionsRef.current[getScrollKey(visibleRoute.view, visibleRoute.activeClass)] = window.scrollY;
  }, [activeClass, settingsOrigin, view]);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const visibleRoute = view === 'settings' ? settingsOrigin : { view, activeClass };
    const key = getScrollKey(visibleRoute.view, visibleRoute.activeClass);
    const top = scrollPositionsRef.current[key] ?? 0;
    const animationFrame = window.requestAnimationFrame(() => window.scrollTo(0, top));
    const settleTimer = window.setTimeout(() => window.scrollTo(0, top), 220);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(settleTimer);
    };
  }, [activeClass, settingsOrigin, view]);

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
    saveCurrentScroll();
    setView('notifications');
    window.history.pushState({ route: 'notifications' }, '', NOTIFICATIONS_HASH);
  }, [saveCurrentScroll]);

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
      setActiveClass(snapshot.activeClass);
      setView(snapshot.view);
    };
    window.addEventListener('popstate', syncRouteFromLocation);
    window.addEventListener('hashchange', syncRouteFromLocation);
    return () => {
      window.removeEventListener('popstate', syncRouteFromLocation);
      window.removeEventListener('hashchange', syncRouteFromLocation);
    };
  }, [activeClass, saveCurrentScroll, view]);

  const backgroundRoute = view === 'settings' ? settingsOrigin : { view, activeClass };
  const backgroundView = backgroundRoute.view === 'settings' ? 'dashboard' : backgroundRoute.view;
  const backgroundClass = backgroundRoute.view === 'settings' ? null : backgroundRoute.activeClass;

  const renderContent = () => {
    // En attente du chargement (auth ignorée si AUTH_REQUIRED est désactivé).
    if (isConfigLoading || (AUTH_REQUIRED && authStatus === 'loading')) {
      return <AppBootSkeleton />;
    }
    // Page d'authentification (uniquement si l'auth est activée).
    if (AUTH_REQUIRED && authStatus === 'anonymous') {
      return <AuthPage locale={config.applicationLocale ?? 'ar'} onLocaleChange={(locale) => updateConfig({ applicationLocale: locale as AppLocale })} />;
    }
    if (backgroundView === 'notifications') {
      return (
        <NotificationsPage
          classes={classes}
          config={config}
          feed={notificationFeed}
          onSelectClass={handleSelectClass}
          onOpenSettings={handleOpenSettings}
        />
      );
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
          onToggleExpanded={() => setSidebarExpanded(expanded => !expanded)}
          isRtl={isRtl}
        />
      )}
      <div
        data-settings-sheet-open={view === 'settings' ? 'true' : 'false'}
        className={`app-settings-parent relative min-h-screen overflow-x-clip transition-all ${showNavigation ? 'pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] sm:pb-8' : ''} ${showNavigation ? `${isRtl ? `sm:pr-[76px] ${isSidebarExpanded ? 'lg:pr-[248px]' : 'lg:pr-[76px]'}` : `sm:pl-[76px] ${isSidebarExpanded ? 'lg:pl-[248px]' : 'lg:pl-[76px]'}`}` : ''}`}
      >
        <div key={routeKey} className="relative z-10 min-h-screen">
          <Suspense fallback={<AppBootSkeleton />}>
            {renderContent()}
          </Suspense>
        </div>
      </div>
      {view === 'settings' && !isAuthView && !isBooting && (
        <Suspense fallback={null}>
          <SettingsPage onBack={handleBackFromSettings} />
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
          <MathJaxContext version={3} src={MATHJAX_V4_SRC} config={mathJaxConfig}>
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
