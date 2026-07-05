import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MathJaxContext } from 'better-react-mathjax';
import { Toaster } from 'sonner';
import { GlobalTooltip } from './components/ui/GlobalTooltip';
import { Dashboard } from './components/Dashboard';
import { Editor } from './components/Editor';
import { SettingsPage } from './components/SettingsPage';
import { AppBootSkeleton } from './components/ui/PageSkeleton';
import { ClassInfo } from './types';
import { useConfigManager } from './hooks/useConfigManager';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { AUTH_REQUIRED } from './config/features';
import { Analytics } from '@vercel/analytics/react';
import { OrientationAlertModal } from './components/modals/OrientationAlertModal';

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
  chtml: {
    // évite les débordements des longues formules sur mobile
    displayOverflow: "linebreak",
  },
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
    return classes.find(classInfo => classInfo.id === classId) ?? null;
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
  const { isLoading: isConfigLoading } = useConfigManager();
  const { status: authStatus } = useAuth();
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
        <div className="min-h-screen" style={{ backgroundColor: 'var(--clr-bg)', color: 'var(--clr-text)' }}>
          <div key={routeKey} className="min-h-screen">
            {renderContent()}
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
          toastOptions={{
            className: 'print:hidden',
            style: { fontFamily: "'Inter', sans-serif", borderRadius: '0.75rem' },
          }}
        />
        <Analytics />
      </MathJaxContext>
    );
}

export default App;
