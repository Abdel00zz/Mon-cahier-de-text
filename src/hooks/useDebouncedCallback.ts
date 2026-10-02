import { useCallback, useEffect, useRef } from 'react';


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
