import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';

/**
 * Enregistre le service worker et propose les mises à jour à la manière de
 * claude.ai : un toast discret, PERSISTANT et non bloquant avec une action
 * « Recharger » — jamais de boîte de dialogue native, jamais de rechargement
 * silencieux pendant une saisie. L'utilisateur décide du moment.
 */
export const initPwa = (): void => {
    if (typeof window === 'undefined') return;

    const updateSW = registerSW({
        onNeedRefresh() {
            toast.info('Une nouvelle version du Cahier est disponible.', {
                id: 'pwa-update', // jamais deux invitations empilées
                duration: Infinity,
                action: {
                    label: 'Recharger',
                    onClick: () => {
                        void updateSW(true);
                    },
                },
            });
        },
        onOfflineReady() {
            toast.success('Le Cahier fonctionne désormais entièrement hors connexion.', {
                id: 'pwa-offline-ready',
                duration: 5_000,
            });
        },
    });
};
