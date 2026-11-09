import { useEffect, useMemo, useRef } from 'react';
import { debounce } from 'es-toolkit';

export type DebouncedCallback<T extends (...args: any[]) => void> = T & {
  cancel: () => void;
  flush: () => void;
};

/**
 * React hook version of debounce backed by es-toolkit.
 * Ensures the debounced function identity is stable across renders,
 * flushes pending execution on unmount so no writes are lost, and exposes
 * `cancel` and `flush` for callers.
 */
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): DebouncedCallback<T> {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  const debounced = useMemo(
    () => debounce((...args: Parameters<T>) => { cbRef.current(...args); }, delay),
    [delay]
  );

  useEffect(() => () => {
    debounced.flush();
  }, [debounced]);

  return debounced as unknown as DebouncedCallback<T>;
}
