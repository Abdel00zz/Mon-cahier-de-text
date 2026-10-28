import { Capacitor } from '@capacitor/core';
import {
  NOTIFICATION_STATE_EVENT,
  activateNativeNotifications,
  getPushNotificationState,
  isIOSDevice,
  isStandalone,
  pushSupported,
} from '@/infrastructure/push/push';
import { subscribePwaInstall } from './pwaInstall';

export interface NotificationActivationSnapshot {
  readonly supported: boolean;
  readonly checking: boolean;
  readonly activating: boolean;
  readonly permission: NotificationPermission | 'unsupported';
  readonly delivery?: 'local';
  readonly subscribed: boolean;
}

let checking = false;
let activating = false;
let initialized = false;
const listeners = new Set<() => void>();
let cachedSnapshot: NotificationActivationSnapshot | null = null;

function isSupportedOnCurrentDevice(): boolean {
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    // Web / Node test fallback
  }
  if (!pushSupported()) return false;
  if (isIOSDevice() && !isStandalone()) return false;
  return true;
}

function computeInitialSnapshot(): NotificationActivationSnapshot {
  const supported = isSupportedOnCurrentDevice();
  const isNative = (() => {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  })();
  const webPermission: NotificationPermission | 'unsupported' =
    supported && typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';

  return {
    supported,
    checking: isNative && supported,
    activating,
    permission: isNative ? 'default' : webPermission,
    delivery: isNative ? 'local' : undefined,
    subscribed: !isNative && webPermission === 'granted',
  };
}

function updateSnapshot(patch: Partial<NotificationActivationSnapshot>): void {
  const base = cachedSnapshot ?? computeInitialSnapshot();
  const next: NotificationActivationSnapshot = {
    supported: patch.supported ?? base.supported,
    checking: patch.checking ?? base.checking,
    activating: patch.activating ?? base.activating,
    permission: patch.permission ?? base.permission,
    delivery: patch.delivery !== undefined ? patch.delivery : base.delivery,
    subscribed: patch.subscribed ?? base.subscribed,
  };
  if (
    cachedSnapshot &&
    cachedSnapshot.supported === next.supported &&
    cachedSnapshot.checking === next.checking &&
    cachedSnapshot.activating === next.activating &&
    cachedSnapshot.permission === next.permission &&
    cachedSnapshot.delivery === next.delivery &&
    cachedSnapshot.subscribed === next.subscribed
  ) {
    return;
  }
  cachedSnapshot = next;
  for (const listener of listeners) {
    listener();
  }
}

export async function refreshNotificationActivationState(): Promise<NotificationActivationSnapshot> {
  const supported = isSupportedOnCurrentDevice();
  if (!supported) {
    updateSnapshot({
      supported: false,
      checking: false,
      permission: 'unsupported',
      subscribed: false,
    });
    return cachedSnapshot!;
  }

  try {
    const state = await getPushNotificationState();
    const effectiveSupported = state.permission !== 'unsupported' && state.reason !== 'iosInstallRequired';
    const isActive =
      state.permission === 'granted' &&
      (state.delivery === 'local' ? state.subscribed : state.remoteAvailable === false);
    updateSnapshot({
      supported: effectiveSupported,
      checking: false,
      permission: state.permission,
      delivery: state.delivery,
      subscribed: isActive,
    });
  } catch {
    updateSnapshot({ checking: false });
  }
  return cachedSnapshot ?? computeInitialSnapshot();
}

function ensureListenersAttached(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  const onRefresh = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    void refreshNotificationActivationState();
  };

  window.addEventListener(NOTIFICATION_STATE_EVENT, onRefresh);
  window.addEventListener('focus', onRefresh);
  window.addEventListener('native-resume', onRefresh);
  window.addEventListener('online', onRefresh);
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onRefresh);
  }
  subscribePwaInstall(() => {
    void refreshNotificationActivationState();
  });

  if (!checking) {
    checking = true;
    void refreshNotificationActivationState().finally(() => {
      checking = false;
    });
  }
}

export function getNotificationActivationSnapshot(): NotificationActivationSnapshot {
  if (!cachedSnapshot) {
    cachedSnapshot = computeInitialSnapshot();
  }
  return cachedSnapshot;
}

export function subscribeNotificationActivation(listener: () => void): () => void {
  ensureListenersAttached();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function openCompanionNotificationSettings(onOpenAppSettings?: () => void): Promise<void> {
  const isNative = (() => {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  })();

  if (isNative && cachedSnapshot?.permission === 'denied') {
    try {
      const { openNativeNotificationSettings } = await import('./nativeRuntime');
      await openNativeNotificationSettings();
      return;
    } catch {
      // Fallback to in-app notification settings page
    }
  }
  onOpenAppSettings?.();
}

export async function triggerCompanionNotificationActivation(options: {
  onEnableConfig?: () => void;
  onOpenSettings?: () => void;
}): Promise<'activated' | 'settings' | 'dismissed'> {
  if (activating) return 'dismissed';

  const current = getNotificationActivationSnapshot();
  if (current.permission === 'denied') {
    await openCompanionNotificationSettings(options.onOpenSettings);
    return 'settings';
  }

  updateSnapshot({ activating: true });
  try {
    const result = await activateNativeNotifications();
    const isActive =
      result.permission === 'granted' &&
      (result.delivery === 'local' ? result.subscribed : result.remoteAvailable === false);

    updateSnapshot({
      activating: false,
      checking: false,
      supported: result.permission !== 'unsupported' && result.reason !== 'iosInstallRequired',
      permission: result.permission,
      delivery: result.delivery,
      subscribed: isActive,
    });

    if (isActive || result.permission === 'granted') {
      options.onEnableConfig?.();
      return 'activated';
    }

    if (result.permission === 'denied' || result.reason === 'permissionDenied') {
      await openCompanionNotificationSettings(options.onOpenSettings);
      return 'settings';
    }

    return 'dismissed';
  } catch {
    updateSnapshot({ activating: false });
    options.onOpenSettings?.();
    return 'settings';
  }
}
