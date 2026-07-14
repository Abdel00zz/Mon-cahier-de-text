import React, { Suspense, lazy, useState, useCallback, useEffect, useRef } from 'react';
import { Toaster } from './components/ui/sonner';
import { GlobalTooltip } from './components/ui/GlobalTooltip';
import { AppBootSkeleton } from './components/ui/PageSkeleton';
import { ClassInfo } from './types';
import { useConfigManager } from './hooks/useConfigManager';
import { useSessionAlerts } from './hooks/useSessionAlerts';
import { useAuth } from './contexts/AuthContext';
import { AUTH_REQUIRED } from './config/features';
import { normalizeOfficialClassName } from './constants';

const Dashboard = lazy(() => import('./features/dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
const Editor = lazy(() => import('./features/editor/Editor').then(module => ({ default: module.Editor })));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const AuthPage = lazy(() => import('./features/auth/AuthPage').then(module => ({ default: module.AuthPage })));
const Analytics = lazy(() => import('@vercel/analytics/react').then(module => ({ default: module.Analytics })));
const MathJaxContext = lazy(() => import('better-react-mathjax').then(module => ({ default: module.MathJaxContext })));

// MathJax 4.1.3 (dernière version) — chargé depuis jsDelivr. L'API de démarrage
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
  const { isLoading: isConfigLoading } = useConfigManager();
  const { status: authStatus } = useAuth();
  // rappels locaux de fin de séance (vibration + toast), actifs sur toutes les vues
  useSessionAlerts();
  const scrollPositionsRef = useRef<Record<string, number>>({});

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

  // « Retour » des Paramètres : revient à la vue d'ORIGINE (éditeur ou tableau
  // de bord) via l'historique — et non systématiquement au tableau de bord.
  // Garde : sur un chargement direct de #/parametres, aucun état poussé par
  // l'app → history.back() sortirait du site ; on retombe alors sur l'accueil.
  const handleBackFromSettings = useCallback(() => {
    if (window.history.state?.route === 'settings') {
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
      return <AuthPage />;
    }
    if (view === 'settings') {
      return <SettingsPage onBack={handleBackFromSettings} />;
    }
    if (view === 'editor' && activeClass) {
      return <Editor classInfo={activeClass} onOpenSettings={handleOpenSettings} />;
    }
    return <Dashboard onSelectClass={handleSelectClass} onOpenSettings={handleOpenSettings} />;
  };

  const routeKey = view === 'editor' && activeClass ? `editor-${activeClass.id}` : view;

    const appSurface = (
      /* overflow-x-clip (et non -hidden) : masque tout débordement horizontal
         sans créer de conteneur de scroll, afin de préserver la barre d’outils sticky. */
      <div className="min-h-screen bg-background text-foreground relative overflow-x-clip">
        <div key={routeKey} className="min-h-screen relative z-10">
          <Suspense fallback={<AppBootSkeleton />}>
            {renderContent()}
          </Suspense>
        </div>
      </div>
    );

    return (
      <>
        {view === 'editor' ? (
          <Suspense fallback={<AppBootSkeleton />}>
            <MathJaxContext version={3} src={MATHJAX_V4_SRC} config={mathJaxConfig}>
              {appSurface}
            </MathJaxContext>
          </Suspense>
        ) : appSurface}
        <GlobalTooltip />
        <Toaster
          position="bottom-right"
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
      </>
    );
}

export default App;
