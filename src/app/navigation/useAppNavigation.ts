import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClassInfo } from '../../types';
import { latestClassOpening } from '../../infrastructure/storage/classOpening';
import { classRoute, DASHBOARD_HASH, DASHBOARD_ROUTE, HELP_HASH, readAppRoute, scrollKey, SETTINGS_HASH } from './appRoutes';

/** Routes, settings overlay history and scroll restoration share one owner. */
export function useAppNavigation(updateClass: (id: string, patch: Partial<ClassInfo>) => boolean,
  markSessionHandled: (id: string | undefined) => void) {
  const [initial] = useState(readAppRoute);
  const [route, setRoute] = useState(initial);
  const [settingsOrigin, setSettingsOrigin] = useState(initial.view === 'settings' ? DASHBOARD_ROUTE : initial);
  const positions = useRef<Record<string, number>>({});
  const backgroundRoute = route.view === 'settings' ? settingsOrigin : route;
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
    setRoute({ view: 'editor', activeClass: openedAt ? { ...classInfo, lastOpenedAt: openedAt } : classInfo });
    window.history.pushState({ route: 'editor', classId: classInfo.id }, '', classRoute(classInfo.id));
  }, [saveScroll, updateClass, markSessionHandled]);

  const handleBackToDashboard = useCallback(() => {
    markSessionHandled(route.activeClass?.id);
    saveScroll();
    resetNavigation();
  }, [route.activeClass, markSessionHandled, saveScroll, resetNavigation]);

  const handleOpenSettings = useCallback(() => {
    if (route.view === 'settings') return;
    saveScroll();
    setSettingsOrigin(route);
    setRoute({ view: 'settings', activeClass: null });
    window.history.pushState({ route: 'settings' }, '', SETTINGS_HASH);
  }, [route, saveScroll]);

  const handleOpenHelp = useCallback(() => {
    if (route.view === 'help') return;
    saveScroll();
    setRoute({ view: 'help', activeClass: null });
    window.history.pushState({ route: 'help' }, '', HELP_HASH);
  }, [route, saveScroll]);

  const handleBackFromSettings = useCallback(() => {
    if (window.history.state?.route === 'settings' && window.history.state?.settingsSubView) window.history.go(-2);
    else if (window.history.state?.route === 'settings') window.history.back();
    else handleBackToDashboard();
  }, [handleBackToDashboard]);

  const handleBackFromHelp = useCallback(() => {
    if (window.history.state?.route === 'help') window.history.back();
    else handleBackToDashboard();
  }, [handleBackToDashboard]);

  useEffect(() => {
    const back = (event: Event) => {
      if (route.view === 'editor') { event.preventDefault(); handleBackToDashboard(); }
      else if (route.view === 'settings') { event.preventDefault(); handleBackFromSettings(); }
      else if (route.view === 'help') { event.preventDefault(); handleBackFromHelp(); }
    };
    window.addEventListener('native-back', back);
    return () => window.removeEventListener('native-back', back);
  }, [route.view, handleBackToDashboard, handleBackFromSettings, handleBackFromHelp]);

  useEffect(() => {
    const restoreRoute = () => {
      saveScroll();
      const next = readAppRoute();
      if (next.view === 'settings' && route.view !== 'settings') setSettingsOrigin(route);
      if (next.view === 'dashboard' && window.location.hash !== DASHBOARD_HASH) {
        window.history.replaceState({ route: 'dashboard' }, '', DASHBOARD_HASH);
      }
      setRoute(next);
    };
    if (initial.view === 'dashboard' && window.location.hash !== DASHBOARD_HASH) {
      window.history.replaceState({ route: 'dashboard' }, '', DASHBOARD_HASH);
    }
    window.addEventListener('popstate', restoreRoute);
    window.addEventListener('hashchange', restoreRoute);
    return () => { window.removeEventListener('popstate', restoreRoute); window.removeEventListener('hashchange', restoreRoute); };
  }, [initial.view, route, saveScroll]);

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
    const remembered = positions.current[scrollKey(backgroundRoute)];
    const restore = () => window.scrollTo(0, remembered ?? 0);
    const frame = window.requestAnimationFrame(restore);
    // A newly opened notebook positions itself at its latest dated content.
    const timer = backgroundRoute.view === 'editor' && remembered === undefined ? undefined : window.setTimeout(restore, 220);
    return () => { window.cancelAnimationFrame(frame); if (timer !== undefined) window.clearTimeout(timer); };
  }, [backgroundRoute]);

  return { ...route, backgroundRoute, initialView: initial.view, resetNavigation,
    handleSelectClass, handleBackToDashboard, handleOpenSettings, handleBackFromSettings, handleOpenHelp, handleBackFromHelp };
}
