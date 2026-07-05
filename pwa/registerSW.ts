import { registerSW } from 'virtual:pwa-register';

// Enregistre le service worker et propose un rechargement quand une nouvelle
// version est disponible (jamais de reload silencieux pendant une saisie).
export const initPwa = (): void => {
    if (typeof window === 'undefined') return;

    const updateSW = registerSW({
        onNeedRefresh() {
            const shouldReload = window.confirm(
                'Une nouvelle version du Cahier de textes est disponible. Recharger maintenant ?'
            );
            if (shouldReload) {
                void updateSW(true);
            }
        },
        onOfflineReady() {
            // L'application est prête à fonctionner hors ligne.
        },
    });
};
