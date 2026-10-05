import { useSyncExternalStore } from 'react';

/**
 * Suit une requête média sans état local ni effet : React relit la valeur à chaque changement
 * et la toute première peinture est déjà juste. Côté serveur, la réponse est « faux ».
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    notify => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
      const media = window.matchMedia(query);
      media.addEventListener('change', notify);
      return () => media.removeEventListener('change', notify);
    },
    () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(query).matches),
    () => false,
  );
}
