import { useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

const nativeHaptics = () => import('@capacitor/haptics');

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
      void nativeHaptics().then(({ Haptics, ImpactStyle }) => Haptics.impact({ style: style === 'heavy' ? ImpactStyle.Heavy : style === 'medium' || style === 'rigid' ? ImpactStyle.Medium : ImpactStyle.Light })).catch(() => {});
      return;
    }
    if (!hasVibrate.current) return;
    try { navigator.vibrate(patterns[style] ?? 8); } catch { /* silencieux */ }
  }, []);

  const notification = useCallback((type: 'success' | 'warning' | 'error') => {
    if (Capacitor.isNativePlatform()) {
      void nativeHaptics().then(({ Haptics, NotificationType }) => Haptics.notification({ type: type === 'success' ? NotificationType.Success : type === 'warning' ? NotificationType.Warning : NotificationType.Error })).catch(() => {});
      return;
    }
    if (!hasVibrate.current) return;
    try { navigator.vibrate(notificationPatterns[type] ?? [8]); } catch { /* silencieux */ }
  }, []);

  const selection = useCallback(() => {
    if (Capacitor.isNativePlatform()) {
      void nativeHaptics().then(({ Haptics }) => Haptics.selectionChanged()).catch(() => {});
      return;
    }
    if (!hasVibrate.current) return;
    try { navigator.vibrate(10); } catch { /* silencieux */ }
  }, []);

  return { impact, notification, selection };
};
