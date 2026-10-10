import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { writeNotificationVibration } from '../infrastructure/push/notificationDevicePreferences';
import { detectSessionAlerts } from '../domain/notifications/sessionAlertEngine';
import { getBundledCalendar, loadHolidayCalendar } from '../domain/calendar/calendar';
import { readCachedConfig } from '../infrastructure/storage/configStorage';
import { subscribe } from '../infrastructure/sync/syncBus';
import { captureWorkspaceLease, readWorkspaceScope } from '../infrastructure/storage/accountWorkspace';
import { readClassLessons } from '../infrastructure/notifications/notificationSignals';
import { collectSessionDates } from '../infrastructure/printing/printMeta';
import { showLocalNotification } from '../infrastructure/push/push';
import { translateLocaleMessage } from '../i18n/messages';
import type { ClassInfo } from '../types';
import { scheduleClassLabel } from '../domain/classes/classAbbreviation';
import { classIdentityFor } from '../domain/classes/classIdentity';
import { conciseNotificationText } from '../domain/notifications/notificationPresentation';

const claimsKey = 'session_alert_claims_v2';
const memoryClaims = new Map<string, number>();
const claimLifetime = 48 * 3600_000;
/** Web Locks serialize cooperating tabs; localStorage fallback is best effort on older browsers. */
async function claimAlert(id: string, isCurrent: () => boolean, deliver: () => Promise<boolean>): Promise<boolean> {
  const claim = async () => {
    const now = Date.now();
    for (const [key, timestamp] of memoryClaims) if (now - timestamp >= claimLifetime) memoryClaims.delete(key);
    if (!isCurrent() || memoryClaims.has(id)) return false;
    let entries: Record<string, unknown> = {};
    try {
      const raw = JSON.parse(localStorage.getItem(claimsKey) ?? '{}');
      entries = Object.fromEntries(Object.entries(raw).filter(([, time]) => typeof time === 'number' && time <= now && now - time < claimLifetime).slice(-256));
      if (entries[id]) return false;
    } catch { /* In-memory deduplication remains available. */ }
    if (memoryClaims.size >= 256) memoryClaims.delete(memoryClaims.keys().next().value!);
    memoryClaims.set(id, now);
    try {
      if (!isCurrent() || !await deliver()) {
        memoryClaims.delete(id);
        return false;
      }
      entries[id] = Date.now();
      try { localStorage.setItem(claimsKey, JSON.stringify(entries)); } catch { /* Session memory remains. */ }
    } catch {
      memoryClaims.delete(id);
      return false;
    }
    return true;
  };
  return navigator.locks ? navigator.locks.request(claimsKey, claim) : claim();
}
export function useSessionAlerts(enabled = true) {
  const [tick, setTick] = useState(0);
  const [current, setCurrent] = useState<{ key: string; classIds: string[] }>({ key: '', classIds: [] });
  useEffect(() => {
    let lastVibration: boolean | undefined;
    const syncVibration = () => {
      const value = readCachedConfig().notificationSettings?.sessionVibration === true;
      if (value !== lastVibration) {
        lastVibration = value;
        void writeNotificationVibration(value);
      }
    };
    syncVibration();
    const removeConfig = subscribe('config-changed', syncVibration);
    const removePull = subscribe('pull-applied', syncVibration);
    window.addEventListener('storage', syncVibration);
    return () => { removeConfig(); removePull(); window.removeEventListener('storage', syncVibration); };
  }, []);
  useEffect(() => {
    const bump = () => setTick(value => value + 1);
    const unsubscribers = (['dirty', 'pull-applied', 'config-changed', 'classes-changed'] as const).map(event => subscribe(event, bump));
    window.addEventListener('storage', bump);
    document.addEventListener('visibilitychange', bump);
    window.addEventListener('pageshow', bump);
    return () => { unsubscribers.forEach(unsubscribe => unsubscribe()); window.removeEventListener('storage', bump); document.removeEventListener('visibilitychange', bump); window.removeEventListener('pageshow', bump); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    const lease = captureWorkspaceLease();
    const fresh = () => !cancelled && lease();
    if (!enabled) { setCurrent({ key: '', classIds: [] }); return; }
    if (Capacitor.isNativePlatform() && (document.visibilityState !== 'visible' || document.documentElement.dataset.nativeActive === 'false')) return;
    const config = readCachedConfig();
    let classes: ClassInfo[] = [];
    try { const value = JSON.parse(localStorage.getItem('classManager_v1') ?? '[]'); if (Array.isArray(value)) classes = value; } catch { /* No class means no target. */ }
    // The timetable is local data: display the current class immediately even
    // when the calendar endpoint is unreachable or the session is offline.
    const initial = detectSessionAlerts(config, classes, getBundledCalendar(), new Date(), () => false);
    const initialClassIds = [...new Set(initial.current.map(block => block.classId))].sort();
    const initialKey = `${initial.today}:${initial.current.map(block => `${block.classId}-${block.startMin}-${block.endMin}`).sort().join('|')}`;
    setCurrent(previous => previous.key === initialKey ? previous : { key: initialKey, classIds: initialClassIds });
    void (async () => {
      const calendar = await loadHolidayCalendar().catch(() => getBundledCalendar());
      if (!fresh()) return;
      const snapshot = detectSessionAlerts(config, classes, calendar, new Date(), (id, date) => collectSessionDates(readClassLessons(id)).includes(date));
      // Wake only at the next session boundary/reminder or local midnight.
      timer = window.setTimeout(() => setTick(value => value + 1), snapshot.nextCheckDelay);
      const classIds = [...new Set(snapshot.current.map(block => block.classId))].sort();
      const key = `${snapshot.today}:${snapshot.current.map(block => `${block.classId}-${block.startMin}-${block.endMin}`).sort().join('|')}`;
      setCurrent(previous => previous.key === key ? previous : { key, classIds });
      const scope = readWorkspaceScope()?.owner ?? 'local';
      for (const event of snapshot.events) {
        await claimAlert(`${scope}:${event.id}`, fresh, async () => {
        // Locks/network may have delayed dispatch: recheck both the time and the date evidence.
        const stillDue = detectSessionAlerts(readCachedConfig(), classes, calendar, new Date(), (id, date) => collectSessionDates(readClassLessons(id)).includes(date)).events.find(candidate => candidate.id === event.id);
        if (!stillDue || !fresh()) return false;
        const latestConfig = readCachedConfig();
        const t = (key: string, values: Record<string, string | number> = {}) => translateLocaleMessage(latestConfig.applicationLocale ?? 'ar', key, values);
        const locale = latestConfig.applicationLocale ?? 'ar';
        const names = event.classIds.slice(0, 2).map(id => {
          const name = classes.find(item => item.id === id)?.name ?? t('sessionAlert.classFallback');
          return conciseNotificationText(scheduleClassLabel(classIdentityFor(name, locale), locale, true), 38);
        }).join(locale === 'ar' ? '، ' : ', ') + (event.classIds.length > 2 ? ` (+${event.classIds.length - 2})` : '');
        const message = event.kind === 'end'
          ? t('sessionAlert.endSoonBody', { classes: names, minutes: stillDue.remainingMinutes ?? 1 })
          : event.classIds.length === 1 ? t('sessionAlert.missingDateOne', { className: names })
          : t('sessionAlert.missingDateMany', { count: event.classIds.length, classes: names });
        const title = t(event.kind === 'end' ? 'sessionAlert.endSoonTitle' : 'sessionAlert.missingDateTitle');
        const url = event.classIds.length === 1 ? `/#/classe/${encodeURIComponent(event.classIds[0])}` : '/#/notifications';
        if (document.visibilityState === 'visible') {
          toast(title, {
            id: event.id, description: message, duration: 10000,
            action: {
              label: latestConfig.applicationLocale === 'fr' ? 'Ouvrir' : latestConfig.applicationLocale === 'en' ? 'Open' : 'فتح',
              onClick: () => { if (lease()) window.location.hash = url.slice(1); },
            },
          });
          if (latestConfig.notificationSettings?.sessionVibration) { try { navigator.vibrate?.(event.kind === 'end' ? [160, 80, 160] : [240, 100, 240]); } catch { /* Unsupported device. */ } }
          return true;
        } else if (latestConfig.notificationSettings?.pushEnabled) {
          return showLocalNotification(title, message, event.id, url, event.kind === 'end' ? 'session-reminder' : 'missing-date', latestConfig.notificationSettings.sessionVibration ?? false, fresh, locale);
        }
        return false;
        });
      }
    })();
    return () => { cancelled = true; if (timer !== undefined) window.clearTimeout(timer); };
  }, [tick, enabled]);
  return { current };
}
