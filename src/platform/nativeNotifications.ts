import { LocalNotifications } from '@capacitor/local-notifications';
import type { AppConfig, ClassInfo } from '../types';
import { readWorkspaceScope, captureWorkspaceLease } from '../infrastructure/storage/accountWorkspace';
import { buildNativeReminderPlan } from '../domain/notifications/nativeReminderPlan';
import { NativePush, connectNativePush, nativeRemoteState } from './nativePush';

const preferenceKey = () => `cdt_native_reminders_v1_${readWorkspaceScope()?.owner ?? 'local'}`;
const enabled = () => localStorage.getItem(preferenceKey()) === 'true';
const MIN_ID = 1_600_000_000;
let planning = Promise.resolve();
let fingerprint = '';

export const nativeNotificationId = (key: string): number => {
  let hash = 2166136261;
  for (const character of key) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return MIN_ID + (hash >>> 0) % 200_000_000;
};

export async function nativeNotificationState(requestPermission = false) {
  const key = preferenceKey();
  const current = captureWorkspaceLease();
  const permission = await (requestPermission ? LocalNotifications.requestPermissions() : LocalNotifications.checkPermissions());
  const display: NotificationPermission = permission.display === 'granted' ? 'granted' : permission.display === 'denied' ? 'denied' : 'default';
  if (requestPermission && display === 'granted' && current()) localStorage.setItem(key, 'true');
  let remote = { available: false, registered: false as boolean | null };
  if (display === 'granted' && enabled() && current()) {
    try {
      await NativePush.setEnabled({ enabled: true });
      let locale: 'ar' | 'en' | 'fr' = 'ar';
      try { const stored = JSON.parse(localStorage.getItem('appConfig_v1') ?? '{}').applicationLocale; if (stored === 'en' || stored === 'fr') locale = stored; } catch { /* defaults */ }
      remote = requestPermission ? await connectNativePush(locale) : await nativeRemoteState();
    } catch { remote = { available: false, registered: null }; }
  }
  return { permission: display, subscribed: current() && display === 'granted' && enabled(), serverRegistered: remote.registered, remoteAvailable: remote.available, delivery: 'local' as const,
    reason: requestPermission && display !== 'granted' ? display === 'denied' ? 'permissionDenied' as const : 'permissionDismissed' as const : undefined };
}

export function reconcileNativeReminders(config: AppConfig, classes: ClassInfo[], owner?: string): Promise<void> {
  const current = captureWorkspaceLease();
  planning = planning.catch(() => {}).then(async () => {
    if (!current()) return;
    const permission = await LocalNotifications.checkPermissions();
    if (!current()) return;
    const plan = owner && enabled() && config.notificationSettings?.pushEnabled && permission.display === 'granted'
      ? buildNativeReminderPlan(config, classes) : [];
    const signature = JSON.stringify([owner, config.notificationSettings?.sessionVibration, plan]);
    if (signature === fingerprint) return;
    const pending = await LocalNotifications.getPending();
    if (!current()) return;
    const obsolete = pending.notifications.filter(item => item.id >= MIN_ID);
    if (obsolete.length) await LocalNotifications.cancel({ notifications: obsolete });
    if (!current()) return;
    if (plan.length) {
      // Channels belong to the native notification centre: this layer only supplies
      // the plan, never a channel definition.
      const used = new Set<number>();
      await LocalNotifications.schedule({ notifications: plan.map(item => {
        let id = nativeNotificationId(item.key);
        while (used.has(id)) id++;
        used.add(id);
        return { id, title: item.title, body: item.body, channelId: 'cahier-reminders', smallIcon: 'ic_stat_notebook',
          // allowWhileIdle: exact when the teacher granted exact alarms, otherwise
          // setAndAllowWhileIdle, which still pierces Doze (see docs/operations/notifications-natives.md).
          schedule: { at: item.at, allowWhileIdle: true }, autoCancel: true,
          extra: { url: item.url, owner, key: item.key } };
      }) });
    }
    fingerprint = signature;
  });
  return planning;
}

export async function disableNativeReminders(): Promise<void> {
  const current = captureWorkspaceLease();
  localStorage.removeItem(preferenceKey());
  // Serialize with an in-flight schedule so disabling cannot leave late alarms behind.
  planning = planning.catch(() => {}).then(async () => {
    if (!current()) return;
    const pending = await LocalNotifications.getPending();
    if (!current()) return;
    await LocalNotifications.cancel({ notifications: pending.notifications.filter(item => item.id >= MIN_ID) });
    const delivered = await LocalNotifications.getDeliveredNotifications();
    if (!current()) return;
    await LocalNotifications.removeDeliveredNotifications({ notifications: delivered.notifications.filter(item => item.id >= MIN_ID) });
    fingerprint = '';
  });
  return planning;
}

export async function showNativeNotification(title: string, body: string, key: string, url: string): Promise<boolean> {
  const current = captureWorkspaceLease();
  const owner = readWorkspaceScope()?.owner;
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted' || !enabled() || !current() || !owner) return false;
  if (!current() || !enabled()) return false;
  await LocalNotifications.schedule({ notifications: [{ id: nativeNotificationId(key), title, body,
    channelId: 'cahier-reminders', smallIcon: 'ic_stat_notebook', autoCancel: true,
    extra: { url, owner } }] });
  return current();
}
