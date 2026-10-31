import type { AdminMessage } from '../types';
import { TeacherMessagingContext } from '../contexts/TeacherMessagingContext';
import { hasCompletedOnboarding } from '../domain/auth/onboardingCompletion';
import React, { Suspense, lazy, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Toaster } from '../components/ui/sonner';
import { GlobalTooltip } from '../components/ui/GlobalTooltip';
import { AppBootSkeleton, PageTransitionLoader } from '../components/ui/PageSkeleton';
import { SyncStrip } from '../components/ui/SyncStrip';
import { AppLocale } from '../types';
import { useConfigManager } from '../hooks/useConfigManager';
import { useSessionAlerts } from '../hooks/useSessionAlerts';
import { useBootstrapProgress } from '../hooks/useBootstrapProgress';
import { useSyncProgress } from '../hooks/useSyncProgress';
import { shouldShowBootScreen } from '../domain/sync/bootScreen';
import { startIdlePrefetch } from './prefetch';
import { useNativeReminders } from '../hooks/useNativeReminders';
import { accountOwner } from '../domain/auth/accountIdentity';
import { useAuth } from '../contexts/AuthContext';
import { useSync } from '../contexts/SyncContext';
import { AUTH_REQUIRED } from '../config/features';
import { LocaleProvider } from '@/i18n/LocaleProvider';
import { useAdminMessages } from '../hooks/useAdminMessages';

import { useClassManager } from '../hooks/useClassManager';
import { useTheme } from '../hooks/useTheme';
import { useDevice } from '../hooks/useDevice';
import { TabBar, TabType } from '../components/navigation/TabBar';
import { DeferredMount } from '../components/ui/DeferredMount';
import { markCurrentSessionHandled, sessionClaimedByClass } from '../infrastructure/notifications/currentSessionNavigation';
import { teachesSeveralSubjects } from '../domain/classes/subjectScope';
import { teacherDisplayName } from '../domain/classes/teacherIdentity';
import { SubjectScopeProvider } from '../contexts/SubjectScopeContext';
import { useAppNavigation } from './navigation/useAppNavigation';
import { useCommandPaletteStore } from '../stores/useCommandPaletteStore';
import { computeDynamicCanvasStyle } from '../features/dashboard/dashboardCanvas';

const Dashboard = lazy(() => import('../features/dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
const Editor = lazy(() => import('../features/editor/Editor').then(module => ({ default: module.Editor })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const GuidePage = lazy(() => import('../features/guide/GuidePage').then(module => ({ default: module.GuidePage })));
const AuthPage = lazy(() => import('../features/auth/AuthPage').then(module => ({ default: module.AuthPage })));
const CommandPalette = lazy(() => import('../components/ui/CommandPalette').then(module => ({ default: module.CommandPalette })));
const TeacherConversation = lazy(() => import('../features/messages/TeacherConversation').then(module => ({ default: module.TeacherConversation })));
const AdminMessageModal = lazy(() => import('../features/messages/AdminMessageModal').then(module => ({ default: module.AdminMessageModal })));

const App: React.FC = () => {
  const { isPhone } = useDevice();
  const [, setClassActivitiesOpen] = useState(false);
  const [assistantSettingsSection, setAssistantSettingsSection] = useState<'emploi' | 'notifications' | undefined>();
  const { isOpen: isCommandPaletteOpen, close: closeCommandPalette, toggle: toggleCommandPalette } = useCommandPaletteStore();
  const [isSidebarExpanded, setSidebarExpanded] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('cdt_sidebar_expanded_v1');
      if (stored !== null) return stored === 'true';
    } catch {}
    return true; // Développée par défaut sur PC
  });
  const [isOnboardingVisible, setOnboardingVisible] = useState(false);

  // Écouteur global de la palette de commandes (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCommandPalette]);

  const { classes, addClass, updateClass } = useClassManager();
  const { config, updateConfig, isLoading: isConfigLoading } = useConfigManager();
  useTheme(config.theme, config.appTextSize);
  const { status: authStatus, user: authUser, sessionNotice } = useAuth();
  const authOwner = authUser ? accountOwner(authUser) : undefined;
  useNativeReminders(config, classes, authOwner);
  const messaging = useAdminMessages(authStatus === 'authenticated', authOwner, config.applicationLocale ?? 'ar');
  const { messages: adminMessages, acknowledge: acknowledgeAdminMessage } = messaging;
  const [replySelection, setReplySelection] = useState<{ owner?: string; message: AdminMessage } | null>(null);
  const replyMessage = replySelection?.owner === authOwner ? replySelection?.message : undefined;
  useEffect(() => setReplySelection(null), [authOwner]);
  const previousAuthStatusRef = useRef(authStatus);
  // Un moteur unique pilote les rappels système et l'état visuel des cartes.
  const { current: currentSession } = useSessionAlerts(!AUTH_REQUIRED || authStatus === 'authenticated' || (authStatus === 'offline' && !!authUser));
  /*
   * Réclamation de la séance courante : elle n'est consommée que par le cahier
   * de la séance ELLE-MÊME (`markSessionHandledFor`).
   */
  const sessionClaimRef = useRef<{ scope: string; key: string; classIds: string[] }>({ scope: 'local', key: '', classIds: [] });
  useEffect(() => {
    sessionClaimRef.current = { scope: authOwner ?? 'local', key: currentSession.key, classIds: currentSession.classIds };
  }, [authOwner, currentSession.classIds, currentSession.key]);
  /** Marque la séance traitée seulement si la classe ouverte est celle de la séance. */
  const markSessionHandledFor = useCallback((classId: string | undefined) => {
    const session = sessionClaimRef.current;
    if (!sessionClaimedByClass(classId, session)) return;
    markCurrentSessionHandled(session.scope, session.key);
  }, []);
  const { view, activeClass, backgroundRoute, initialView, handleSelectClass, handleBackToDashboard,
    handleOpenSettings, handleBackFromSettings, handleOpenHelp, handleBackFromHelp, resetNavigation } = useAppNavigation(updateClass, markSessionHandledFor);
  useEffect(() => {
    setAssistantSettingsSection(undefined);
  }, [authOwner]);
  useEffect(() => {
    if (view !== 'settings') setAssistantSettingsSection(undefined);
  }, [view]);
  const handleOpenSchedule = useCallback(() => {
    setAssistantSettingsSection('emploi');
    handleOpenSettings();
  }, [handleOpenSettings]);
  const handleOpenNotifications = useCallback(() => {
    setAssistantSettingsSection('notifications');
    handleOpenSettings();
  }, [handleOpenSettings]);
  /*
   * Un cahier ouvert vaut pour la séance entière, QUELLE QUE SOIT la voie :
   * clic sur la carte, lien profond d'une notification ou rechargement direct
   * sur `#/classe/…`.
   */
  useEffect(() => {
    if (view !== 'editor') return;
    markSessionHandledFor(activeClass?.id);
  }, [activeClass, markSessionHandledFor, view]);
  /*
   * Une seule matière ne se distingue de rien : ses libellés et badges sont
   * masqués dans toute l'application (emploi du temps, liste, évaluations,
   * devoirs, filtre du tableau de bord). La décision est prise ici, une fois,
   * dans le même périmètre (les classes de cet enseignant) que le filtre du
   * tableau de bord, puis lue partout via `useShowsSubjectLabels`.
   */
  const teacherName = useMemo(
    () => teacherDisplayName(config.defaultTeacherName, authUser),
    [config.defaultTeacherName, authUser],
  );
  const showsSubjectLabels = useMemo(
    () => teachesSeveralSubjects(classes, teacherName),
    [classes, teacherName],
  );
  const bootProgress = useBootstrapProgress();
  const syncProgress = useSyncProgress();
  /** Envoi immédiat des réglages en attente, déclenché en quittant les Réglages. */
  const { flushPush } = useSync();
  /*
   * L'écran d'attente suit le VRAI chargement (voir domain/sync/bootScreen) :
   * configuration locale, session, puis premier rapatriement cloud —  celui qui
   * applique l'emploi du temps puis les classes. Il ne couvrait auparavant que
   * la vérification de session, donc la progression réelle s'affichait toujours
   * à zéro et l'écran disparaissait avant que l'espace n'arrive. Aucun blocage :
   * hors ligne ou en échec, le signal retombe et l'application reprend la main.
   */
  const isBooting = shouldShowBootScreen({
    configLoading: isConfigLoading,
    authLoading: AUTH_REQUIRED && authStatus === 'loading',
    authenticated: !AUTH_REQUIRED || authStatus === 'authenticated',
    firstLoadRunning: syncProgress.state === 'pulling',
    firstLoadComplete: bootProgress.complete,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || authStatus !== 'authenticated') return;
    // Tous les écrans sont préparés pendant l'inactivité : la navigation ne doit
    // plus afficher d'écran de chargement (voir app/prefetch).
    return startIdlePrefetch({ initialView });
  }, [authStatus, initialView]);

  // Une authentification déclenchée depuis une ancienne vue (par exemple les
  // paramètres après une déconnexion) doit reprendre à l'accueil. Cela permet
  // au premier compte connecté d'atteindre immédiatement son onboarding, sans
  // réafficher la navigation ou les données de l'utilisateur précédent.
  useEffect(() => {
    const wasAnonymous = previousAuthStatusRef.current === 'anonymous';
    previousAuthStatusRef.current = authStatus;
    if (!wasAnonymous || authStatus !== 'authenticated') return;

    setClassActivitiesOpen(false);
    setOnboardingVisible(false);
    resetNavigation();
  }, [authStatus, resetNavigation]);

  /*
   * Quitter les Réglages envoie tout de suite les réglages modifiés : l'emploi
   * du temps part sans attendre le debounce, donc la direction et les autres
   * appareils le voient immédiatement. L'effet couvre TOUTES les sorties
   * (bouton retour, barre d'onglets, lien direct, retour natif).
   */
  const wasInSettingsRef = useRef(false);
  useEffect(() => {
    if (view === 'settings') { wasInSettingsRef.current = true; return; }
    if (!wasInSettingsRef.current) return;
    wasInSettingsRef.current = false;
    flushPush();
  }, [flushPush, view]);

  /*
   * Quitter un cahier de textes pousse immédiatement les modifications en
   * attente vers le cloud sans attendre le délai de debounce.
   */
  const wasInEditorRef = useRef(false);
  useEffect(() => {
    if (view === 'editor') { wasInEditorRef.current = true; return; }
    if (!wasInEditorRef.current) return;
    wasInEditorRef.current = false;
    flushPush();
  }, [flushPush, view]);

  const backgroundView = backgroundRoute.view;
  const backgroundClass = backgroundRoute.activeClass;

  const renderContent = () => {
    // Écran d'attente : configuration, session, ou premier chargement cloud.
    if (isBooting) {
      return <AppBootSkeleton progress={bootProgress} />;
    }
    // Page d'authentification (uniquement si l'auth est activée).
    if (AUTH_REQUIRED && authStatus === 'anonymous') {
      return <AuthPage locale={config.applicationLocale ?? 'ar'} onLocaleChange={(locale) => updateConfig({ applicationLocale: locale as AppLocale })} notice={sessionNotice} />;
    }
    if (view === 'settings') {
      return (
        <SettingsPage
          asPage
          initialSection={assistantSettingsSection}
          onBack={handleBackFromSettings}
          onOpenGuide={handleOpenHelp}
          config={config}
          onConfigChange={updateConfig}
          classes={classes}
          addClass={addClass}
        />
      );
    }
    if (view === 'help') {
      return (
        <GuidePage
          onBack={handleBackFromHelp}
          onClose={handleBackFromHelp}
        />
      );
    }
    if (backgroundView === 'editor' && backgroundClass) {
      // Le Web propose un retour visible ; Android utilise son bouton système.
      return <Editor classInfo={backgroundClass} onOpenSettings={handleOpenSettings} onBack={handleBackToDashboard} />;
    }
    return (
      <Dashboard
        onOpenSchedule={handleOpenSchedule}
        onOpenNotifications={handleOpenNotifications}
        onSelectClass={handleSelectClass}
        onEvaluationVisibilityChange={setClassActivitiesOpen}
        activeSessionClassIds={currentSession.classIds}
          accountTeacherName={teacherName}
        onOnboardingVisibilityChange={setOnboardingVisible}
      />
    );
  };

  const routeKey = view === 'editor' && activeClass
    ? `editor-${activeClass.id}`
    : view;
  const routeFallback = <PageTransitionLoader />;

  const activeTab: TabType = view === 'settings' ? 'settings' : view === 'help' ? 'help' : 'dashboard';

  const handleTabChange = useCallback((tab: TabType) => {
    if (tab === 'dashboard') {
      if (view !== 'dashboard') {
        handleBackToDashboard();
      }

    } else if (tab === 'settings') {
      handleOpenSettings();
    } else if (tab === 'help') {
      handleOpenHelp();
    }
  }, [view, handleBackToDashboard, handleOpenSettings, handleOpenHelp]);

  const isAuthView = AUTH_REQUIRED && authStatus === 'anonymous';

  // Une classe ajoutée pendant la préparation ne termine pas le parcours.
  const shouldBootOnboarding =
    view === 'dashboard' &&
    !hasCompletedOnboarding(config, authUser);
  const isCurrentlyOnboarding =
    isOnboardingVisible || shouldBootOnboarding;

  const showNavigation = !isAuthView && !isBooting && view !== 'editor' && !isCurrentlyOnboarding;
  const isRtl = (config.applicationLocale ?? 'ar') === 'ar';

  const dynamicCanvasStyle = useMemo(() => {
    return computeDynamicCanvasStyle(classes, currentSession.classIds);
  }, [classes, currentSession.classIds]);

  const mandatoryAdminMessage = adminMessages.find(message => !message.replyTo || view !== 'dashboard');

  const appSurface = (
    <div
      className="workspace-shell relative min-h-dvh overflow-x-clip text-foreground bg-background"
      data-phone-navigation={isPhone ? 'true' : 'false'}
      style={view === 'dashboard' ? dynamicCanvasStyle : undefined}
      /* Un seul canvas couvre le contenu, la navigation et les gouttières. */
      data-dashboard-surface={view === 'dashboard' && !isAuthView && !isBooting ? 'true' : undefined}
    >
      {showNavigation && (
        <TabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          isExpanded={isSidebarExpanded}
          onToggleExpanded={() => setSidebarExpanded(expanded => {
            const next = !expanded;
            try {
              localStorage.setItem('cdt_sidebar_expanded_v1', String(next));
            } catch {}
            return next;
          })}
          teacherName={teacherName}
        />
      )}
      <div
        data-settings-sheet-open="false"
        data-workspace-navigation={showNavigation ? 'true' : 'false'}
        data-sidebar-expanded={isSidebarExpanded ? 'true' : 'false'}
        dir={isRtl ? 'rtl' : 'ltr'}
        className="app-settings-parent relative min-h-dvh overflow-x-clip"
      >
        <div key={routeKey} className="relative z-10 min-h-dvh">
          <Suspense fallback={routeFallback}>
            {renderContent()}
          </Suspense>
        </div>
        {/* L'onboarding ne compose aucune formule : il reste utilisable
            pendant le chargement du moteur destiné aux cahiers. */}
      </div>
    </div>
  );

  return (
    <>
      <TeacherMessagingContext.Provider value={{ ...messaging, teacherName, classes }}>
      <LocaleProvider locale={config.applicationLocale ?? 'ar'}>
        <SubjectScopeProvider showsSubjectLabels={showsSubjectLabels}>
        {/* Liseré de synchronisation : discret, sans écran bloquant. */}
        <SyncStrip />
        <Suspense fallback={<AppBootSkeleton />}>
          {appSurface}
        </Suspense>



        <DeferredMount active={isCommandPaletteOpen}>
          <Suspense fallback={null}>
            <CommandPalette
              isOpen={isCommandPaletteOpen}
              onClose={closeCommandPalette}
              classes={classes}
              onSelectClass={(classInfo) => {
                handleSelectClass(classInfo);
                closeCommandPalette();
              }}
              onOpenSettings={() => {
                handleOpenSettings();
                closeCommandPalette();
              }}
              onOpenGuide={() => {
                handleOpenHelp();
                closeCommandPalette();
              }}
              isDarkMode={config.theme === 'dark'}
              onToggleDarkMode={() => {
                const nextTheme = config.theme === 'dark' ? 'light' : 'dark';
                updateConfig({ theme: nextTheme });
              }}
            />
          </Suspense>
        </DeferredMount>

        {mandatoryAdminMessage && (
          <Suspense fallback={null}>
            <AdminMessageModal
              message={mandatoryAdminMessage}
              onAcknowledge={acknowledgeAdminMessage}
              onReply={() => setReplySelection({ owner: authOwner, message: mandatoryAdminMessage })}
            />
          </Suspense>
        )}

        {replyMessage && <Suspense fallback={null}>
          <TeacherConversation key={`${authOwner}:${replyMessage.id}`} open onClose={() => setReplySelection(null)}
            locale={config.applicationLocale ?? 'ar'} initialReplyTo={replyMessage.id}
            target={replyMessage.classId ? { id: replyMessage.classId, name: replyMessage.className ?? '' } : undefined} />
        </Suspense>}
        <GlobalTooltip />
        <Toaster
          position={isRtl ? 'bottom-left' : 'bottom-right'}
          dir={isRtl ? 'rtl' : 'ltr'}
          closeButton={false}
          expand={false}
          gap={6}
          visibleToasts={3}
          duration={3000}
          offset={24}
          mobileOffset={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)', left: 16, right: 16 }}
          className="print:hidden"
        />
        </SubjectScopeProvider>
      </LocaleProvider>
      </TeacherMessagingContext.Provider>
    </>
  );
}

export default App;
