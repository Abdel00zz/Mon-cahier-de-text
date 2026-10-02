import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';
import { translateLocaleMessage } from '@/i18n/messages';
import { startSafePwaAction } from './safeUpdate';

/**
 * Langue enregistrée par l'enseignant, lue hors React : l'enregistrement du
 * service worker a lieu avant le premier rendu. Par défaut l'arabe, comme
 * `App` (`config.applicationLocale ?? 'ar'`).
 */
const readRegisteredLocale = (): 'fr' | 'en' | 'ar' => {
    try {
        const raw = localStorage.getItem('appConfig_v1');
        const value = raw ? (JSON.parse(raw) as { applicationLocale?: unknown }).applicationLocale : null;
        return value === 'fr' || value === 'en' ? value : 'ar';
    } catch {
        return 'ar';
    }
};

/**
 * Service worker, mise à jour AUTOMATIQUE et silencieuse (esprit application
 * native). L'activation puis le rechargement attendent la fin des formulaires,
 * des modales et des sauvegardes locales, y compris dans les autres onglets.
 */
export const initPwa = (): void => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    // En développement, vite-plugin-pwa injecte son worker dédié. Il rend le
    // manifeste installable sans mettre en cache les modules source de Vite.
    if (import.meta.env.DEV) return;

    // La page était-elle DÉJÀ contrôlée au chargement ? Si oui, un changement de
    // contrôleur = vraie mise à jour → on recharge. Sinon (toute première visite,
    // premier claim), on ne recharge pas : la page a déjà la dernière version.
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    let cancelActivation: (() => void) | undefined;
    let cancelReload: (() => void) | undefined;
    const requestReload = () => {
        if (!hadController || reloading) return;
        cancelReload?.();
        cancelReload = startSafePwaAction(() => { reloading = true; window.location.reload(); });
    };
    navigator.serviceWorker.addEventListener('controllerchange', requestReload);

    const updateServiceWorker = registerSW({
        immediate: true,
        onNeedRefresh() {
            cancelActivation?.();
            cancelActivation = startSafePwaAction(() => { void updateServiceWorker(false); });
        },
        onNeedReload: requestReload,
        onOfflineReady() {
            toast.success(translateLocaleMessage(readRegisteredLocale(), 'pwa.offlineReady'), {
                id: 'pwa-offline-ready',
                duration: 4_000,
            });
        },
    });
};
