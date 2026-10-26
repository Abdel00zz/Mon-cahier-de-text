import { useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

type HapticsModule = typeof import('@capacitor/haptics');
let cachedHaptics: HapticsModule | null = null;
let hapticsPromise: Promise<HapticsModule> | null = null;

const loadNativeHaptics = (): Promise<HapticsModule> => {
  if (cachedHaptics) return Promise.resolve(cachedHaptics);
  if (!hapticsPromise) {
    hapticsPromise = import('@capacitor/haptics').then((mod) => {
      cachedHaptics = mod;
      return mod;
    });
  }
  return hapticsPromise;
};

if (Capacitor.isNativePlatform()) {
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

export const useHapticFeedback = () => {
  const hasVibrate = useRef(typeof navigator !== 'undefined' && 'vibrate' in navigator);

  const impact = useCallback((style: 'light' | 'medium' | 'heavy' | 'soft' | 'rigid' = 'light') => {
    if (Capacitor.isNativePlatform()) {
      const trigger = ({ Haptics, ImpactStyle }: HapticsModule) =>
        Haptics.impact({ style: style === 'heavy' ? ImpactStyle.Heavy : style === 'medium' || style === 'rigid' ? ImpactStyle.Medium : ImpactStyle.Light });
      if (cachedHaptics) {
        void trigger(cachedHaptics).catch(() => {});
      } else {
        void loadNativeHaptics().then(trigger).catch(() => {});
      }
      return;
    }
    if (!hasVibrate.current) return;
    try { navigator.vibrate(patterns[style] ?? 8); } catch { /* silencieux */ }
  }, []);

  const notification = useCallback((type: 'success' | 'warning' | 'error') => {
    if (Capacitor.isNativePlatform()) {
      const trigger = ({ Haptics, NotificationType }: HapticsModule) =>
        Haptics.notification({ type: type === 'success' ? NotificationType.Success : type === 'warning' ? NotificationType.Warning : NotificationType.Error });
      if (cachedHaptics) {
        void trigger(cachedHaptics).catch(() => {});
      } else {
        void loadNativeHaptics().then(trigger).catch(() => {});
      }
      return;
    }
    if (!hasVibrate.current) return;
    try { navigator.vibrate(notificationPatterns[type] ?? [8]); } catch { /* silencieux */ }
  }, []);

  const selection = useCallback(() => {
    if (Capacitor.isNativePlatform()) {
      const trigger = ({ Haptics }: HapticsModule) => Haptics.selectionChanged();
      if (cachedHaptics) {
        void trigger(cachedHaptics).catch(() => {});
      } else {
        void loadNativeHaptics().then(trigger).catch(() => {});
      }
      return;
    }
    if (!hasVibrate.current) return;
    try { navigator.vibrate(10); } catch { /* silencieux */ }
  }, []);

  return { impact, notification, selection };
};
