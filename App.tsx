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

import { useClassManager } from './hooks/useClassManager';
import { IOSheet } from './components/ui/IOSheet';
import { GuideModal } from './features/guide/GuideModal';
import { TabBar, TabType } from './components/navigation/TabBar';

const Dashboard = lazy(() => import('./features/dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
const Editor = lazy(() => import('./features/editor/Editor').then(module => ({ default: module.Editor })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const NotificationsPage = lazy(() => import('./features/dashboard/NotificationsPage').then(module => ({ default: module.NotificationsPage })));
const AuthPage = lazy(() => import('./features/auth/AuthPage').then(module => ({ default: module.AuthPage })));
const Analytics = lazy(() => import('@vercel/analytics/react').then(module => ({ default: module.Analytics })));
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
const getNotificationsRoute = (classId?: string | null) =>
  classId ? `${NOTIFICATIONS_HASH}?class=${encodeURIComponent(classId)}` : NOTIFICATIONS_HASH;

const readNotificationClassId = (): string | null => {
  if (!window.location.hash.startsWith(NOTIFICATIONS_HASH)) return null;
  const query = window.location.hash.split('?')[1] ?? '';
  return new URLSearchParams(query).get('class');
};

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
  const [isEvaluationsOpen, setIsEvaluationsOpen] = useState(false);
  const [isGuideOpen, setGuideOpen] = useState(false);
  const [isSidebarExpanded, setSidebarExpanded] = useState(true);
  const { classes } = useClassManager();
  const { config, updateConfig, isLoading: isConfigLoading } = useConfigManager();
  const { status: authStatus } = useAuth();
  // rappels locaux de fin de séance (vibration + toast), actifs sur toutes les vues
  useSessionAlerts();
  const scrollPositionsRef = useRef<Record<string, number>>({});
  
  const [notificationVersion, setNotificationVersion] = useState(0);
  const notificationFeed = useNotificationFeed(classes, config, config.applicationLocale ?? 'ar', notificationVersion);

  const saveCurrentScroll = useCallback(() => {
    scrollPositionsRef.current[getScrollKey(view, activeClass)] = window.scrollY;
  }, [activeClass, view]);

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    const key = getScrollKey(view, activeClass);
    const top = scrollPositionsRef.current[key] ?? 0;
    const animationFrame = window.requestAnimationFrame(() => window.scrollTo(0, top));
    const settleTimer = window.setTimeout(() => window.scrollTo(0, top), 220);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(settleTimer);
    };
  }, [activeClass, view]);

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
    saveCurrentScroll();
    setView('settings');
    window.history.pushState({ route: 'settings' }, '', SETTINGS_HASH);
  }, [saveCurrentScroll]);

  const handleOpenSchedule = useCallback(() => {
    try { sessionStorage.setItem('config_initial_tab_v1', 'emploi'); } catch { /* navigation conservée */ }
    handleOpenSettings();
  }, [handleOpenSettings]);

  const handleOpenNotifications = useCallback(() => {
    saveCurrentScroll();
    setView('notifications');
    window.history.pushState({ route: 'notifications' }, '', NOTIFICATIONS_HASH);
  }, [saveCurrentScroll]);

  const handleOpenNotificationsForClass = useCallback((classInfo: ClassInfo) => {
    saveCurrentScroll();
    setView('notifications');
    window.history.pushState(
      { route: 'notifications', classId: classInfo.id },
      '',
      getNotificationsRoute(classInfo.id),
    );
  }, [saveCurrentScroll]);

  // « Retour » des Paramètres : revient à la vue d'ORIGINE (éditeur ou tableau
  // de bord) via l'historique, et non systématiquement au tableau de bord.
  // Garde : sur un chargement direct de #/parametres, aucun état poussé par
  // l'app → history.back() sortirait du site ; on retombe alors sur l'accueil.
  const handleBackFromSettings = useCallback(() => {
    if (window.history.state?.route === 'settings' || window.history.state?.route === 'notifications') {
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
      setActiveClass(snapshot.activeClass);
      setView(snapshot.view);
    };
    window.addEventListener('popstate', syncRouteFromLocation);
    window.addEventListener('hashchange', syncRouteFromLocation);
    return () => {
      window.removeEventListener('popstate', syncRouteFromLocation);
      window.removeEventListener('hashchange', syncRouteFromLocation);
    };
  }, [saveCurrentScroll]);

  const renderContent = () => {
    // En attente du chargement (auth ignorée si AUTH_REQUIRED est désactivé).
    if (isConfigLoading || (AUTH_REQUIRED && authStatus === 'loading')) {
      return <AppBootSkeleton />;
    }
    // Page d'authentification (uniquement si l'auth est activée).
    if (AUTH_REQUIRED && authStatus === 'anonymous') {
      return <AuthPage locale={config.applicationLocale ?? 'ar'} onLocaleChange={(locale) => updateConfig({ applicationLocale: locale as AppLocale })} />;
    }
    if (view === 'settings') {
      return <SettingsPage onBack={handleBackFromSettings} />;
    }
    if (view === 'notifications') {
      return (
        <NotificationsPage
          classes={classes}
          config={config}
          feed={notificationFeed}
          initialClassId={readNotificationClassId()}
          onSelectClass={handleSelectClass}
          onOpenSettings={handleOpenSettings}
          onMutate={() => setNotificationVersion(v => v + 1)}
        />
      );
    }
    if (view === 'editor' && activeClass) {
      return <Editor classInfo={activeClass} onOpenSettings={handleOpenSettings} />;
    }
    return (
      <Dashboard
        onSelectClass={handleSelectClass}
        onOpenEvaluations={() => setIsEvaluationsOpen(true)}
        notificationFeed={notificationFeed}
        onOpenNotificationsForClass={handleOpenNotificationsForClass}
        onOpenSchedule={handleOpenSchedule}
      />
    );
  };

  const routeKey = view === 'editor' && activeClass
    ? `editor-${activeClass.id}`
    : view === 'notifications'
      ? `notifications-${readNotificationClassId() ?? 'all'}`
      : view;

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
  const showNavigation = !isAuthView && !isBooting && view !== 'editor';
  const isRtl = (config.applicationLocale ?? 'ar') === 'ar';

  const appSurface = (
    <div className={`app-canvas min-h-screen text-foreground relative overflow-x-clip transition-all ${showNavigation ? (isRtl ? `sm:pr-[76px] ${isSidebarExpanded ? 'lg:pr-[248px]' : 'lg:pr-[76px]'}` : `sm:pl-[76px] ${isSidebarExpanded ? 'lg:pl-[248px]' : 'lg:pl-[76px]'}`) : ''} pb-16 sm:pb-8`}>
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
      <div key={routeKey} className="min-h-screen relative z-10">
        <Suspense fallback={<AppBootSkeleton />}>
          {renderContent()}
        </Suspense>
      </div>
    </div>
  );

  return (
    <>
      <LocaleProvider locale={config.applicationLocale ?? 'ar'}>
        {view === 'editor' ? (
          <Suspense fallback={<AppBootSkeleton />}>
            <MathJaxContext version={3} src={MATHJAX_V4_SRC} config={mathJaxConfig}>
              {appSurface}
            </MathJaxContext>
          </Suspense>
        ) : appSurface}

        {/* Sheet Globale iOS Évaluations */}
        {isEvaluationsOpen && (
          <IOSheet
            isOpen={isEvaluationsOpen}
            onClose={() => setIsEvaluationsOpen(false)}
            title={translateLocaleMessage(config.applicationLocale ?? 'ar', 'dashboard.evaluations')}
            subtitle={translateLocaleMessage(config.applicationLocale ?? 'ar', 'evaluations.selectedClassTracking')}
          >
            <Suspense fallback={<AppBootSkeleton />}>
              <DevoirsView
                classes={classes}
                config={config}
                onConfigChange={updateConfig}
              />
            </Suspense>
          </IOSheet>
        )}

        {isGuideOpen && (
          <Suspense fallback={null}>
            <GuideModal isOpen onClose={() => setGuideOpen(false)} />
          </Suspense>
        )}

        <GlobalTooltip />
        <Toaster
          position={isRtl ? 'bottom-left' : 'bottom-right'}
          closeButton
          expand={false}
          gap={5}
          visibleToasts={3}
          offset={{ bottom: 24, right: 24 }}
          mobileOffset={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)', left: 12, right: 12 }}
          className="print:hidden"
        />
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      </LocaleProvider>
    </>
  );
}

export default App;
