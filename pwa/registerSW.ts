import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';

/**
 * Service worker — mise à jour AUTOMATIQUE et silencieuse (esprit application
 * native) : aucune invite, aucun bouton « Recharger », aucun message de
 * confirmation. Dès qu'une nouvelle version est publiée, le SW l'active
 * (skipWaiting + clientsClaim) et la page se recharge d'elle-même, une seule
 * fois. Les cahiers sont persistés en continu dans le localStorage : le
 * rechargement ne perd jamais de données.
 */
export const initPwa = (): void => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // La page était-elle DÉJÀ contrôlée au chargement ? Si oui, un changement de
    // contrôleur = vraie mise à jour → on recharge. Sinon (toute première visite,
    // premier claim), on ne recharge pas : la page a déjà la dernière version.
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!hadController || reloading) return;
        reloading = true;
        window.location.reload();
    });

    registerSW({
        immediate: true,
        onOfflineReady() {
            toast.success('Le Cahier fonctionne désormais entièrement hors connexion.', {
                id: 'pwa-offline-ready',
                duration: 4_000,
            });
        },
    });
};
