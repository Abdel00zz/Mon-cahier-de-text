import { useCallback, useSyncExternalStore } from 'react';

/**
 * Suit une requête média sans état local ni effet : React relit la valeur à chaque changement
 * et la toute première peinture est déjà juste. Côté serveur, la réponse est « faux ».
 *
 * Utilise un `subscribe` mémorisé par `useCallback` pour éviter de se réabonner inutilement
 * à chaque cycle de rendu.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((notify: () => void) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
    const media = window.matchMedia(query);
    media.addEventListener('change', notify);
    return () => media.removeEventListener('change', notify);
  }, [query]);

  return useSyncExternalStore(
    subscribe,
    () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches),
    () => false,
  );
}
