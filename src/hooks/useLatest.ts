import { useRef } from 'react';

/**
 * Conserve une référence toujours à jour d'une valeur sans forcer de re-render.
 * Utile pour les callbacks, écouteurs d'événements et timers.
 */
export function useLatest<T>(value: T): { readonly current: T } {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}
