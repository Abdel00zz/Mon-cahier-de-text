import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { writeNotificationVibration } from '../utils/notificationDevicePreferences';
import { detectSessionAlerts } from '../utils/sessionAlertEngine';
import { getBundledCalendar, loadHolidayCalendar } from '../utils/calendar';
import { readCachedConfig } from '../utils/configStorage';
import { subscribe } from '../utils/syncBus';
import { captureWorkspaceLease, readWorkspaceScope } from '../utils/accountWorkspace';
import { readClassLessons } from '../utils/notificationSignals';
import { collectSessionDates } from '../utils/printMeta';
import { showLocalNotification } from '../utils/push';
import { translateLocaleMessage } from '../i18n/LocaleProvider';
import type { ClassInfo } from '../types';

const claimsKey = 'session_alert_claims_v2';
const memoryClaims = new Set<string>();
/** Web Locks serialize cooperating tabs; localStorage fallback is best effort on older browsers. */
async function claimAlert(id: string, isCurrent: () => boolean, deliver: () => Promise<boolean>): Promise<boolean> {
  const claim = async () => {
    if (!isCurrent() || memoryClaims.has(id)) return false;
    let entries: Record<string, unknown> = {};
    try {
      const raw = JSON.parse(localStorage.getItem(claimsKey) ?? '{}');
      entries = Object.fromEntries(Object.entries(raw).filter(([, time]) => typeof time === 'number' && Date.now() - time < 48 * 3600_000));
      if (entries[id]) return false;
    } catch { /* In-memory deduplication remains available. */ }
    memoryClaims.add(id);
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
    const timer = window.setInterval(bump, 15_000);
    window.addEventListener('storage', bump);
    document.addEventListener('visibilitychange', bump);
    return () => { unsubscribers.forEach(unsubscribe => unsubscribe()); window.clearInterval(timer); window.removeEventListener('storage', bump); document.removeEventListener('visibilitychange', bump); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const lease = captureWorkspaceLease();
    const fresh = () => !cancelled && lease();
    if (!enabled) { setCurrent({ key: '', classIds: [] }); return; }
    const config = readCachedConfig();
    let classes: ClassInfo[] = [];
    try { const value = JSON.parse(localStorage.getItem('classManager_v1') ?? '[]'); if (Array.isArray(value)) classes = value; } catch { /* No class means no target. */ }
    void (async () => {
      const calendar = await loadHolidayCalendar().catch(() => getBundledCalendar());
      if (!fresh()) return;
      const snapshot = detectSessionAlerts(config, classes, calendar, new Date(), (id, date) => collectSessionDates(readClassLessons(id)).includes(date));
      const classIds = [...new Set(snapshot.current.map(block => block.classId))].sort();
      const key = `${snapshot.today}:${snapshot.current.map(block => `${block.classId}-${block.startMin}-${block.endMin}`).sort().join('|')}`;
      setCurrent(previous => previous.key === key ? previous : { key, classIds });
      const scope = readWorkspaceScope()?.owner ?? 'local';
      for (const event of snapshot.events) {
        await claimAlert(`${scope}:${event.id}`, fresh, async () => {
        // Locks/network may have delayed dispatch: recheck both the time and the date evidence.
        const stillDue = detectSessionAlerts(readCachedConfig(), classes, calendar, new Date(), (id, date) => collectSessionDates(readClassLessons(id)).includes(date)).events.some(candidate => candidate.id === event.id);
        if (!stillDue || !fresh()) return false;
        const latestConfig = readCachedConfig();
        const t = (key: string, values: Record<string, string | number> = {}) => translateLocaleMessage(latestConfig.applicationLocale ?? 'ar', key, values);
        const names = event.classIds.map(id => classes.find(item => item.id === id)?.name ?? '').join(', ');
        const message = event.kind === 'end' ? t('sessionAlert.endSoonBody', { classes: names }) : t('sessionAlert.missingDateMany', { count: event.classIds.length, classes: names });
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
          return showLocalNotification(title, message, event.id, url, undefined, latestConfig.notificationSettings.sessionVibration ?? false, fresh);
        }
        return false;
        });
      }
    })();
    return () => { cancelled = true; };
  }, [tick, enabled]);
  return { current };
}
