import { useEffect, useMemo, useRef } from 'react';
import { debounce } from 'es-toolkit';

export type DebouncedCallback<T extends (...args: any[]) => void> = T & { cancel: () => void };

/**
 * React hook version of debounce backed by es-toolkit.
 * Ensures the debounced function identity is stable across renders,
 * cancels pending execution on unmount, and exposes `cancel` for callers
 * that clear the underlying storage.
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

  useEffect(() => () => { debounced.cancel(); }, [debounced]);

  // es-toolkit expose déjà `cancel` : le type le rend visible aux appelants
  // (notamment pour annuler une sauvegarde différée lors d'un effacement).
  return debounced as unknown as DebouncedCallback<T>;
}
