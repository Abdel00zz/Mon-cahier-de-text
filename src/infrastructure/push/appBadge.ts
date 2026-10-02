import { Capacitor } from '@capacitor/core';
import type { AppLocale } from '../../types';
import { applyAppBadge, nextInboxBadge, type InboxBadgeState } from '../../domain/notifications/appBadge';
import { readWorkspaceScope, captureWorkspaceLease } from '../storage/accountWorkspace';

type BadgingNavigator = Navigator & Parameters<typeof applyAppBadge>[0];
let queue = Promise.resolve();
let lastState: InboxBadgeState | null = null;
let generation = 0;
let blockedRevision: string | undefined;
export function enableInboxBadge(): void { blockedRevision = undefined; }

/** Serialize clear/update so a delayed notification cannot restore a signed-out badge. */
export function syncInboxBadge(owner: string, count: number, updatedAt: number, locale: AppLocale): Promise<void> {
  const current = captureWorkspaceLease();
  const expected = generation;
  queue = queue.catch(() => {}).then(async () => {
    if (!current() || expected !== generation || readWorkspaceScope()?.owner !== owner
      || readWorkspaceScope()?.revision === blockedRevision) return;
    const state = nextInboxBadge(lastState, { owner, count, updatedAt });
    if (!state) return;
    lastState = state;
    if (Capacitor.isNativePlatform()) {
      await (await import('../../platform/nativePush')).NativePush.syncUnread({ ...state, locale,
        enabled: localStorage.getItem(`cdt_native_reminders_v1_${owner}`) === 'true' });
    } else {
      if (!current()) return;
      const registration = await navigator.serviceWorker?.getRegistration();
      if (!current()) return;
      if (registration?.active) registration.active.postMessage({ type: 'INBOX_BADGE', ...state });
      else await applyAppBadge(navigator as BadgingNavigator, state.count);
    }
  });
  return queue.catch(() => {});
}

export function clearInboxBadge(): Promise<void> {
  // Invalidate queued updates immediately, before any slow unsubscribe request.
  lastState = null;
  generation++;
  blockedRevision = readWorkspaceScope()?.revision;
  const current = captureWorkspaceLease();
  queue = queue.catch(() => {}).then(async () => {
    if (!current()) return;
    if (Capacitor.isNativePlatform()) await (await import('../../platform/nativePush')).NativePush.clear();
    else {
      await applyAppBadge(navigator as BadgingNavigator, 0);
      const registration = await navigator.serviceWorker?.getRegistration();
      if (current()) registration?.active?.postMessage({ type: 'CLEAR_INBOX_BADGE' });
    }
  });
  return queue.catch(() => {});
}
