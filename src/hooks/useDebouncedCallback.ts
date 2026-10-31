import { useEffect, useMemo, useRef } from 'react';
import { debounce } from 'es-toolkit';

/**
 * React hook version of debounce backed by es-toolkit.
 * Ensures the debounced function identity is stable across renders
 * and cancels pending execution on unmount.
 */
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  const debounced = useMemo(
    () => debounce((...args: Parameters<T>) => { cbRef.current(...args); }, delay),
    [delay]
  );

  useEffect(() => () => { debounced.cancel(); }, [debounced]);

  return debounced as unknown as T;
}
