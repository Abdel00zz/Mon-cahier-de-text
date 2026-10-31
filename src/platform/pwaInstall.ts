import { Capacitor } from '@capacitor/core';
import { dequal } from 'dequal';
import { createStore } from 'zustand/vanilla';

export type PwaPlatform = 'ios' | 'android' | 'desktop';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export interface PwaInstallSnapshot {
  readonly isStandalone: boolean;
  readonly platform: PwaPlatform;
  readonly canPromptNative: boolean;
  readonly shouldAskInstall: boolean;
  readonly installing: boolean;
  readonly guideOpen: boolean;
}

const PWA_INSTALLED_STORAGE_KEY = 'cdt_pwa_installed_v1';

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installing = false;
let guideOpen = false;
let manualInstalled = false;
const pwaInstallStore = createStore<{ snapshot: PwaInstallSnapshot | null }>(() => ({ snapshot: null }));

function readStoredInstallFlag(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(PWA_INSTALLED_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function detectPwaPlatform(
  nav: { userAgent?: string; platform?: string; maxTouchPoints?: number } | undefined = typeof navigator !== 'undefined' ? navigator : undefined,
): PwaPlatform {
  if (!nav) return 'desktop';
  const ua = nav.userAgent ?? '';
  if (/iphone|ipad|ipod/i.test(ua) || (nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1)) {
    return 'ios';
  }
  if (/android/i.test(ua)) {
    return 'android';
  }
  return 'desktop';
}

function isStandaloneDisplay(win: Window | undefined, nav: Navigator | undefined, doc: Document | undefined): boolean {
  if (!win) return false;
  const matchStandalone =
    win.matchMedia?.('(display-mode: standalone)')?.matches ||
    win.matchMedia?.('(display-mode: fullscreen)')?.matches ||
    win.matchMedia?.('(display-mode: window-controls-overlay)')?.matches;
  if (matchStandalone) return true;
  if ((nav as unknown as { standalone?: boolean } | undefined)?.standalone === true) return true;
  if (doc?.referrer?.startsWith('android-app://')) return true;
  return false;
}

export function detectStandaloneMode(
  win: Window | undefined = typeof window !== 'undefined' ? window : undefined,
  nav: Navigator | undefined = typeof navigator !== 'undefined' ? navigator : undefined,
  doc: Document | undefined = typeof document !== 'undefined' ? document : undefined,
): boolean {
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    // Ignore when Capacitor bridge is not initialized in unit tests
  }
  return Boolean(win && (manualInstalled || readStoredInstallFlag() || isStandaloneDisplay(win, nav, doc)));
}

function syncRootAttributes(snapshot: PwaInstallSnapshot): void {
  if (typeof document === 'undefined' || !document.documentElement?.dataset) return;
  document.documentElement.dataset.standalone = snapshot.isStandalone ? 'true' : 'false';
  document.documentElement.dataset.pwaPlatform = snapshot.platform;
}

function computeSnapshot(): PwaInstallSnapshot {
  const isStandalone = detectStandaloneMode();
  const platform = detectPwaPlatform();
  const canPromptNative = Boolean(deferredPrompt) && !isStandalone;
  const shouldAskInstall = !isStandalone && typeof window !== 'undefined';
  return {
    isStandalone,
    platform,
    canPromptNative,
    shouldAskInstall,
    installing,
    guideOpen,
  };
}

function emitChange(): void {
  const next = computeSnapshot();
  const cachedSnapshot = pwaInstallStore.getState().snapshot;
  if (cachedSnapshot && dequal(cachedSnapshot, next)) {
    return;
  }
  syncRootAttributes(next);
  pwaInstallStore.setState({ snapshot: next });
}

export function getPwaInstallSnapshot(): PwaInstallSnapshot {
  let cachedSnapshot = pwaInstallStore.getState().snapshot;
  if (!cachedSnapshot) {
    cachedSnapshot = computeSnapshot();
    syncRootAttributes(cachedSnapshot);
    pwaInstallStore.setState({ snapshot: cachedSnapshot });
  }
  return cachedSnapshot;
}

export function subscribePwaInstall(listener: () => void): () => void {
  return pwaInstallStore.subscribe(listener);
}

export function setPwaGuideOpen(open: boolean): void {
  if (guideOpen === open) return;
  guideOpen = open;
  emitChange();
}

export function markPwaInstalled(): void {
  manualInstalled = true;
  deferredPrompt = null;
  installing = false;
  guideOpen = false;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PWA_INSTALLED_STORAGE_KEY, 'true');
    }
  } catch {
    // Ignore storage quota / private mode restrictions
  }
  emitChange();
}

export async function triggerPwaInstall(): Promise<'accepted' | 'dismissed' | 'guide'> {
  if (detectStandaloneMode()) {
    markPwaInstalled();
    return 'accepted';
  }

  if (deferredPrompt) {
    const promptEvent = deferredPrompt;
    installing = true;
    emitChange();
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      deferredPrompt = null;
      installing = false;
      if (choice?.outcome === 'accepted') {
        markPwaInstalled();
        return 'accepted';
      }
      emitChange();
      return 'dismissed';
    } catch {
      deferredPrompt = null;
      installing = false;
      guideOpen = true;
      emitChange();
      return 'guide';
    }
  }

  guideOpen = true;
  emitChange();
  return 'guide';
}

async function registerPwaServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  try {
    if (Capacitor.isNativePlatform()) return null;
  } catch {
    // Web context
  }
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    registration.addEventListener?.('updatefound', () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;
      installingWorker.addEventListener('statechange', () => {
        if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
          installingWorker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    });
    return registration;
  } catch {
    return null;
  }
}

export function initPwaInstall(): () => void {
  if (typeof window === 'undefined') return () => {};

  const initialSnapshot = computeSnapshot();
  syncRootAttributes(initialSnapshot);
  pwaInstallStore.setState({ snapshot: initialSnapshot });

  const onBeforeInstallPrompt = (event: Event) => {
    // Do not call event.preventDefault() so desktop/mobile browsers also display
    // the native "App available" / "Installer" chip in the browser address bar
    // while keeping event.prompt() available for our in-app robot button.
    deferredPrompt = event as BeforeInstallPromptEvent;
    // A fresh browser install prompt after uninstall invalidates the old flag.
    // Check the actual display mode, not our own persisted/DOM snapshot.
    if (!isStandaloneDisplay(window, navigator, document)) {
      manualInstalled = false;
      try { localStorage.removeItem(PWA_INSTALLED_STORAGE_KEY); } catch { /* Storage unavailable. */ }
    }
    emitChange();
  };

  const onAppInstalled = () => {
    markPwaInstalled();
  };

  const onDisplayModeChange = () => {
    if (
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.matchMedia?.('(display-mode: fullscreen)')?.matches
    ) {
      markPwaInstalled();
    } else {
      emitChange();
    }
  };

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onAppInstalled);

  const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
  mediaQuery?.addEventListener?.('change', onDisplayModeChange);

  void registerPwaServiceWorker();

  return () => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.removeEventListener('appinstalled', onAppInstalled);
    mediaQuery?.removeEventListener?.('change', onDisplayModeChange);
  };
}
