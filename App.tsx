import React, { Suspense, lazy, useState, useCallback, useEffect, useRef } from 'react';
import { MathJaxContext } from 'better-react-mathjax';
import { Toaster } from './components/ui/sonner';
import { GlobalTooltip } from './components/ui/GlobalTooltip';
import { AppBootSkeleton } from './components/ui/PageSkeleton';
import { ClassInfo } from './types';
import { useConfigManager } from './hooks/useConfigManager';
import { useSessionAlerts } from './hooks/useSessionAlerts';
import { useAuth } from './contexts/AuthContext';
import { AUTH_REQUIRED } from './config/features';
import { Analytics } from '@vercel/analytics/react';
import { OrientationAlertModal } from './components/modals/OrientationAlertModal';
import { normalizeOfficialClassName } from './constants';
// No imports for deleted sessionAssistant

const Dashboard = lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const Editor = lazy(() => import('./components/Editor').then(module => ({ default: module.Editor })));
const SettingsPage = lazy(() => import('./components/SettingsPage').then(module => ({ default: module.SettingsPage })));
const AuthPage = lazy(() => import('./components/auth/AuthPage').then(module => ({ default: module.AuthPage })));

const mathJaxConfig = {
  loader: { load: ["input/tex", "output/chtml"] },
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
  // NB : pas d'option `chtml.displayOverflow` — elle n'existe qu'en MathJax 4,
  // or better-react-mathjax charge MathJax 3.2.2 (elle lèverait « Invalid
  // option "displayOverflow" » et casserait le typeset). Le débordement des
  // longues formules sur mobile est géré en CSS (conteneurs overflow-x:auto).
};

type View = 'dashboard' | 'editor' | 'settings';

interface RouteSnapshot {
  view: View;
  activeClass: ClassInfo | null;
}

const DASHBOARD_HASH = '#/';
const SETTINGS_HASH = '#/parametres';

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
  const { config, isLoading: isConfigLoading } = useConfigManager();
  const { status: authStatus } = useAuth();
  // rappels locaux de fin de séance (vibration + toast), actifs sur toutes les vues
  useSessionAlerts();
  const [showOrientationModal, setShowOrientationModal] = useState(false);
  const orientationTimerRef = useRef<number | null>(null);
  const scrollPositionsRef = useRef<Record<string, number>>({});
  
  // Helper to know if we should show the orientation alert (mobile + portrait)
  const isMobilePortrait = useCallback(() => {
    const isCoarsePointer = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const uaMobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
    const isMobile = isCoarsePointer || uaMobile;
    const isPortrait = window.matchMedia && window.matchMedia('(orientation: portrait)').matches;
    return isMobile && isPortrait;
  }, []);

  const clearOrientationTimer = useCallback(() => {
    if (orientationTimerRef.current !== null) {
      clearTimeout(orientationTimerRef.current);
      orientationTimerRef.current = null;
    }
  }, []);

  const scheduleOrientationModal = useCallback(() => {
    // le portrait est désormais pleinement utilisable : suggestion UNE fois par session
    try {
      if (sessionStorage.getItem('orientationHintShown_v1')) return;
    } catch { /* stockage indisponible */ }
    if (orientationTimerRef.current !== null) return;
    orientationTimerRef.current = window.setTimeout(() => {
      setShowOrientationModal(true);
      orientationTimerRef.current = null;
    }, 3000);
  }, []);

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
    let animationFrame = window.requestAnimationFrame(() => window.scrollTo(0, top));
    const settleTimer = window.setTimeout(() => window.scrollTo(0, top), 220);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(settleTimer);
    };
  }, [activeClass, view]);

  useEffect(() => {
    if (view !== 'editor') {
      clearOrientationTimer();
      setShowOrientationModal(false);
      return;
    }

    const computeAndSet = () => {
      if (isMobilePortrait()) {
        scheduleOrientationModal();
      } else {
        clearOrientationTimer();
        setShowOrientationModal(false);
      }
    };

    computeAndSet();
    const handler = () => computeAndSet();
    window.addEventListener('resize', handler);
    window.addEventListener('orientationchange', handler as any);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('orientationchange', handler as any);
      clearOrientationTimer();
    };
  }, [view, clearOrientationTimer, isMobilePortrait, scheduleOrientationModal]);

  const handleSelectClass = useCallback((classInfo: ClassInfo) => {
    saveCurrentScroll();
    setActiveClass(classInfo);
    setView('editor');
    window.history.pushState({ route: 'editor', classId: classInfo.id }, '', getClassRoute(classInfo.id));
  }, [saveCurrentScroll]);

  // Session assistant suggestion auto-focus has been cleaned up and removed

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

  const handleCloseOrientationModal = () => {
    setShowOrientationModal(false);
    clearOrientationTimer();
    // ne plus harceler l'utilisateur : mémorisé pour la session
    try {
      sessionStorage.setItem('orientationHintShown_v1', '1');
    } catch { /* stockage indisponible */ }
  };

  const renderContent = () => {
    // En attente du chargement (auth ignorée si AUTH_REQUIRED est désactivé).
    if (isConfigLoading || (AUTH_REQUIRED && authStatus === 'loading')) {
      return <AppBootSkeleton />;
    }
    // Page d'authentification (uniquement si l'auth est activée).
    if (AUTH_REQUIRED && authStatus === 'anonymous') {
      return <AuthPage />;
    }
    if (view === 'settings') {
      return <SettingsPage onBack={handleBackToDashboard} />;
    }
    if (view === 'editor' && activeClass) {
      return <Editor classInfo={activeClass} onBack={handleBackToDashboard} />;
    }
    return <Dashboard onSelectClass={handleSelectClass} onOpenSettings={handleOpenSettings} />;
  };

  const routeKey = view === 'editor' && activeClass ? `editor-${activeClass.id}` : view;

    return (
      <MathJaxContext config={mathJaxConfig}>
        <div className="min-h-screen bg-background text-foreground">
          <div key={routeKey} className="min-h-screen">
            <Suspense fallback={<AppBootSkeleton />}>
              {renderContent()}
            </Suspense>
          </div>

          {view === 'editor' && (
            <OrientationAlertModal isOpen={showOrientationModal} onClose={handleCloseOrientationModal} />
          )}
        </div>
        <GlobalTooltip />
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          // règles d'empilement : 3 toasts visibles max (les suivants en file) ;
          // sur mobile, décalés au-dessus du FAB « + » (56 px + safe-area) pour
          // ne jamais le recouvrir
          visibleToasts={3}
          mobileOffset={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 88px)' }}
          className="print:hidden"
        />
        <Analytics />
      </MathJaxContext>
    );
}

export default App;
