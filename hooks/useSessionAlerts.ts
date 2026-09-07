import { useEffect, useRef, useState } from 'react';
import { detectSessionAlerts, type SessionAlert } from '../utils/sessionAlertEngine';
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
async function claimAlert(id: string, isCurrent: () => boolean): Promise<boolean> {
  const claim = () => {
    if (!isCurrent() || memoryClaims.has(id)) return false;
    try {
      const raw = JSON.parse(localStorage.getItem(claimsKey) ?? '{}');
      const entries = Object.fromEntries(Object.entries(raw).filter(([, time]) => typeof time === 'number' && Date.now() - time < 48 * 3600_000));
      if (entries[id]) { memoryClaims.add(id); return false; }
      entries[id] = Date.now();
      localStorage.setItem(claimsKey, JSON.stringify(entries));
    } catch { /* In-memory deduplication remains available without storage. */ }
    memoryClaims.add(id);
    return true;
  };
  return navigator.locks ? navigator.locks.request(claimsKey, claim) : claim();
}
export function useSessionAlerts(enabled = true) {
  const [tick, setTick] = useState(0);
  const [alert, setAlert] = useState<(SessionAlert & { message: string }) | null>(null);
  const [current, setCurrent] = useState<{ key: string; classIds: string[] }>({ key: '', classIds: [] });
  const clearTimer = useRef<number | undefined>(undefined);
  useEffect(() => {
    const bump = () => setTick(value => value + 1);
    const unsubscribers = (['dirty', 'pull-applied', 'config-changed', 'classes-changed'] as const).map(event => subscribe(event, bump));
    const timer = window.setInterval(bump, 15_000);
    window.addEventListener('storage', bump);
    document.addEventListener('visibilitychange', bump);
    return () => { unsubscribers.forEach(unsubscribe => unsubscribe()); window.clearInterval(timer); window.clearTimeout(clearTimer.current); window.removeEventListener('storage', bump); document.removeEventListener('visibilitychange', bump); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const lease = captureWorkspaceLease();
    const fresh = () => !cancelled && lease();
    if (!enabled) { setAlert(null); setCurrent({ key: '', classIds: [] }); return; }
    const config = readCachedConfig();
    if (!config.notificationSettings?.enabled) setAlert(null);
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
        if (!await claimAlert(`${scope}:${event.id}`, fresh) || !fresh()) continue;
        // Locks/network may have delayed dispatch: recheck both the time and the date evidence.
        const stillDue = detectSessionAlerts(readCachedConfig(), classes, calendar, new Date(), (id, date) => collectSessionDates(readClassLessons(id)).includes(date)).events.some(candidate => candidate.id === event.id);
        if (!stillDue) continue;
        const t = (key: string, values: Record<string, string | number> = {}) => translateLocaleMessage(config.applicationLocale ?? 'ar', key, values);
        const names = event.classIds.map(id => classes.find(item => item.id === id)?.name ?? '').join(', ');
        const message = event.kind === 'end' ? t('sessionAlert.endSoonBody', { classes: names }) : t('sessionAlert.missingDateMany', { count: event.classIds.length, classes: names });
        window.clearTimeout(clearTimer.current);
        setAlert({ ...event, message });
        clearTimer.current = window.setTimeout(() => setAlert(null), 3000);
        if (document.visibilityState === 'visible') {
          if (config.notificationSettings?.sessionVibration) { try { navigator.vibrate?.(event.kind === 'end' ? [160, 80, 160] : [240, 100, 240]); } catch { /* Unsupported device. */ } }
        } else if (config.notificationSettings?.pushEnabled) {
          const url = event.classIds.length === 1 ? `/#/classe/${encodeURIComponent(event.classIds[0])}` : '/#/notifications';
          void showLocalNotification(t(event.kind === 'end' ? 'sessionAlert.endSoonTitle' : 'sessionAlert.missingDateTitle'), message, event.id, url, undefined, config.notificationSettings.sessionVibration ?? false, fresh);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [tick, enabled]);
  return { alert, current };
}
