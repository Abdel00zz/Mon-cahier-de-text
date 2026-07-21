import { useSyncExternalStore } from 'react';

const subscribeToQuery = (query: string, callback: () => void) => {
    const mediaQueryList = window.matchMedia(query);
    mediaQueryList.addEventListener('change', callback);
    return () => mediaQueryList.removeEventListener('change', callback);
};

export function useMediaQuery(query: string): boolean {
    return useSyncExternalStore(
        callback => subscribeToQuery(query, callback),
        () => window.matchMedia(query).matches,
        () => false,
    );
}
