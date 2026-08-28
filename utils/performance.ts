/**
 * Performance utilities for optimization
 */

import { useCallback, useEffect, useRef } from 'react';

/**
 * Memoize function for performance optimization
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * React hook version of debounce that returns a stable debounced callback.
 * Ensures the debounced function identity is stable across renders
 * and clears the pending timeout on unmount to avoid leaks.
 */
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const cbRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // keep latest callback
  cbRef.current = callback;

  const debounced = useCallback((...args: Parameters<T>) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      cbRef.current(...args);
    }, delay);
  }, [delay]) as unknown as T;

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return debounced;
}

let settingsPreloadPromise: Promise<unknown> | null = null;

/**
 * Préchargement de la page de paramètres pour éliminer la latence au clic.
 */
export const preloadSettingsPage = () => {
  if (!settingsPreloadPromise && typeof window !== 'undefined') {
    settingsPreloadPromise = Promise.all([
      import('@/features/settings/SettingsPage'),
      import('@/features/settings/components/AppearanceTab'),
    ]);
  }
  return settingsPreloadPromise;
};
