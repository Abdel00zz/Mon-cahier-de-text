import { useCallback, useRef } from 'react';

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
    if (!hasVibrate.current) return;
    try { navigator.vibrate(patterns[style] ?? 8); } catch { /* silencieux */ }
  }, []);

  const notification = useCallback((type: 'success' | 'warning' | 'error') => {
    if (!hasVibrate.current) return;
    try { navigator.vibrate(notificationPatterns[type] ?? [8]); } catch { /* silencieux */ }
  }, []);

  return { impact, notification };
};
