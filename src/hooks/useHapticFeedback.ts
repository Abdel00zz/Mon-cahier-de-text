import { Capacitor } from '@capacitor/core';

type HapticsModule = typeof import('@capacitor/haptics');
let cachedHaptics: HapticsModule | null = null;
let hapticsPromise: Promise<HapticsModule> | null = null;

const loadNativeHaptics = (): Promise<HapticsModule> => {
  if (cachedHaptics) return Promise.resolve(cachedHaptics);
  if (!hapticsPromise) {
    hapticsPromise = import('@capacitor/haptics')
      .then((mod) => {
        cachedHaptics = mod;
        return mod;
      })
      .catch((err) => {
        hapticsPromise = null; // Remise à null pour ne pas cacher l'erreur indéfiniment
        throw err;
      });
  }
  return hapticsPromise;
};

if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
  void loadNativeHaptics().catch(() => {});
}

const patterns: Record<string, number | number[]> = {
  light: 8,
  medium: 16,
  heavy: 24,
  soft: 5,
  rigid: 12,
};

const notificationPatterns: Record<string, number[]> = {
  success: [8, 30, 8],
  warning: [12, 40, 12],
  error: [16, 40, 16, 40, 16],
};

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

let lastSelectionTime = 0;
const SELECTION_THROTTLE_MS = 35;

export type HapticImpactStyle = 'light' | 'medium' | 'heavy' | 'soft' | 'rigid';
export type HapticNotificationType = 'success' | 'warning' | 'error';

export interface HapticFeedback {
  impact: (style?: HapticImpactStyle) => void;
  notification: (type: HapticNotificationType) => void;
  selection: () => void;
}

const runNativeOrVibrate = (
  nativeAction: (mod: HapticsModule) => Promise<void>,
  vibrateMs: number | number[]
) => {
  if (prefersReducedMotion()) return;

  if (Capacitor.isNativePlatform()) {
    if (cachedHaptics) {
      void nativeAction(cachedHaptics).catch(() => {});
    } else {
      void loadNativeHaptics()
        .then(nativeAction)
        .catch(() => {});
    }
    return;
  }

  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(vibrateMs);
    } catch {
      // silencieux
    }
  }
};

/**
 * Singleton haptique partagé pour toute l'application.
 * Zéro allocation d'objet ou d'état par composant.
 */
export const hapticFeedback: HapticFeedback = {
  impact(style: HapticImpactStyle = 'light') {
    runNativeOrVibrate(
      ({ Haptics, ImpactStyle }) =>
        Haptics.impact({
          style:
            style === 'heavy'
              ? ImpactStyle.Heavy
              : style === 'medium' || style === 'rigid'
                ? ImpactStyle.Medium
                : ImpactStyle.Light,
        }),
      patterns[style] ?? 8
    );
  },

  notification(type: HapticNotificationType) {
    runNativeOrVibrate(
      ({ Haptics, NotificationType }) =>
        Haptics.notification({
          type:
            type === 'success'
              ? NotificationType.Success
              : type === 'warning'
                ? NotificationType.Warning
                : NotificationType.Error,
        }),
      notificationPatterns[type] ?? [8]
    );
  },

  selection() {
    const now = Date.now();
    if (now - lastSelectionTime < SELECTION_THROTTLE_MS) return;
    lastSelectionTime = now;

    runNativeOrVibrate(
      ({ Haptics }) => Haptics.selectionChanged(),
      10
    );
  },
};

/**
 * Hook retournant l'instance singleton `hapticFeedback`.
 * Stable à 100% sans aucune re-création de fonction.
 */
export const useHapticFeedback = (): HapticFeedback => hapticFeedback;
