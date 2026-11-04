import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClassInfo } from '../../types';
import { latestClassOpening } from '../../infrastructure/storage/classOpening';
import { classRoute, DASHBOARD_HASH, DASHBOARD_ROUTE, HELP_HASH, readAppRoute, scrollKey, SETTINGS_HASH } from './appRoutes';

const isOverlayView = (view: string) => view === 'settings' || view === 'help';

/** Routes, settings/help overlay history and scroll restoration share one owner. */
export function useAppNavigation(updateClass: (id: string, patch: Partial<ClassInfo>) => boolean,
  markSessionHandled: (id: string | undefined) => void, enabled = true) {
  const [initial] = useState(readAppRoute);
  const [route, setRoute] = useState(initial);
  const [settingsOrigin, setSettingsOrigin] = useState(() => isOverlayView(initial.view) ? DASHBOARD_ROUTE : initial);
  const positions = useRef<Record<string, number>>({});
  const backgroundRoute = isOverlayView(route.view) ? settingsOrigin : route;
  const saveScroll = useCallback(() => { positions.current[scrollKey(backgroundRoute)] = window.scrollY; }, [backgroundRoute]);

  const resetNavigation = useCallback(() => {
    setSettingsOrigin(DASHBOARD_ROUTE);
    setRoute(DASHBOARD_ROUTE);
    window.history.replaceState({ route: 'dashboard' }, '', DASHBOARD_HASH);
  }, []);

  const handleSelectClass = useCallback((classInfo: ClassInfo) => {
    saveScroll();
    delete positions.current[scrollKey({ view: 'editor', activeClass: classInfo })];
    const openedAt = latestClassOpening(classInfo.lastOpenedAt, new Date().toISOString());
    if (openedAt && openedAt !== classInfo.lastOpenedAt) updateClass(classInfo.id, { lastOpenedAt: openedAt });
    markSessionHandled(classInfo.id);
    const nextRoute = { view: 'editor' as const, activeClass: openedAt ? { ...classInfo, lastOpenedAt: openedAt } : classInfo };
    setSettingsOrigin(nextRoute);
    setRoute(nextRoute);
    window.history.pushState({ route: 'editor', classId: classInfo.id }, '', classRoute(classInfo.id));
  }, [saveScroll, updateClass, markSessionHandled]);

  const handleBackToDashboard = useCallback(() => {
    markSessionHandled(backgroundRoute.activeClass?.id ?? route.activeClass?.id);
    saveScroll();
    resetNavigation();
  }, [backgroundRoute.activeClass?.id, route.activeClass?.id, markSessionHandled, saveScroll, resetNavigation]);

  const handleOpenSettings = useCallback(() => {
    if (route.view === 'settings') return;
    saveScroll();
    if (!isOverlayView(route.view)) setSettingsOrigin(route);
    setRoute({ view: 'settings', activeClass: null });
    window.history.pushState({ route: 'settings' }, '', SETTINGS_HASH);
  }, [route, saveScroll]);

  const handleOpenHelp = useCallback(() => {
    if (route.view === 'help') return;
    saveScroll();
    if (!isOverlayView(route.view)) setSettingsOrigin(route);
    setRoute({ view: 'help', activeClass: null });
    window.history.pushState({ route: 'help' }, '', HELP_HASH);
  }, [route, saveScroll]);

  const handleBackFromSettings = useCallback(() => {
    if (window.history.state?.route === 'settings' && window.history.state?.settingsSubView) window.history.go(-2);
    else if (window.history.state?.route === 'settings') window.history.back();
    else if (settingsOrigin.view === 'editor' && settingsOrigin.activeClass) {
      setRoute(settingsOrigin);
      window.history.replaceState({ route: 'editor', classId: settingsOrigin.activeClass.id }, '', classRoute(settingsOrigin.activeClass.id));
    } else handleBackToDashboard();
  }, [handleBackToDashboard, settingsOrigin]);

  const handleBackFromHelp = useCallback(() => {
    if (window.history.state?.route === 'help') window.history.back();
    else if (settingsOrigin.view === 'editor' && settingsOrigin.activeClass) {
      setRoute(settingsOrigin);
      window.history.replaceState({ route: 'editor', classId: settingsOrigin.activeClass.id }, '', classRoute(settingsOrigin.activeClass.id));
    } else handleBackToDashboard();
  }, [handleBackToDashboard, settingsOrigin]);

  useEffect(() => {
    if (!enabled) return;
    const back = (event: Event) => {
      if (route.view === 'editor') { event.preventDefault(); handleBackToDashboard(); }
      else if (route.view === 'settings') { event.preventDefault(); handleBackFromSettings(); }
      else if (route.view === 'help') { event.preventDefault(); handleBackFromHelp(); }
    };
    window.addEventListener('native-back', back);
    return () => window.removeEventListener('native-back', back);
  }, [enabled, route.view, handleBackToDashboard, handleBackFromSettings, handleBackFromHelp]);

  /*
   * Une entrée initiale inconnue (ancien lien, hash d’aide ou de notification)
   * est ramenée à l’accueil UNE SEULE FOIS, quand la navigation devient active.
   * Cette normalisation vivait dans l’écouteur d’historique et se rejouait donc
   * à chaque changement de route : elle écrasait aussitôt les liens profonds
   * `#/classe/…` et `#/parametres` que l’application venait de pousser.
   */
  useEffect(() => {
    // Auth owns its hashes until the workspace is available. In particular, do
    // not replace #register/#start during session loading.
    if (!enabled || initial.view !== 'dashboard') return;
    if (window.location.hash !== DASHBOARD_HASH) {
      window.history.replaceState({ route: 'dashboard' }, '', DASHBOARD_HASH);
    }
  }, [enabled, initial.view]);

  useEffect(() => {
    if (!enabled) return;
    const restoreRoute = () => {
      saveScroll();
      const next = readAppRoute();
      if (isOverlayView(next.view) && !isOverlayView(route.view)) setSettingsOrigin(route);
      else if (!isOverlayView(next.view)) setSettingsOrigin(next);
      if (next.view === 'dashboard' && window.location.hash !== DASHBOARD_HASH) {
        window.history.replaceState({ route: 'dashboard' }, '', DASHBOARD_HASH);
      }
      setRoute(next);
    };
    window.addEventListener('popstate', restoreRoute);
    window.addEventListener('hashchange', restoreRoute);
    return () => { window.removeEventListener('popstate', restoreRoute); window.removeEventListener('hashchange', restoreRoute); };
  }, [enabled, route, saveScroll]);

  useEffect(() => {
    if (!enabled) return;
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    const remembered = positions.current[scrollKey(backgroundRoute)];
    const restore = () => window.scrollTo(0, remembered ?? 0);
    const frame = window.requestAnimationFrame(restore);
    // A newly opened notebook positions itself at its latest dated content.
    const timer = backgroundRoute.view === 'editor' && remembered === undefined ? undefined : window.setTimeout(restore, 220);
    return () => { window.cancelAnimationFrame(frame); if (timer !== undefined) window.clearTimeout(timer); };
  }, [enabled, backgroundRoute]);

  return { ...route, backgroundRoute, initialView: initial.view, resetNavigation,
    handleSelectClass, handleBackToDashboard, handleOpenSettings, handleBackFromSettings, handleOpenHelp, handleBackFromHelp };
}
