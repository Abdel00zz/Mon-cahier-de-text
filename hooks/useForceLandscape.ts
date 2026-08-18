import { useEffect } from 'react';
import { logger } from '../utils/logger';

let fullscreenRequestedByEditor = false;

type LockableScreenOrientation = ScreenOrientation & {
    lock?: (orientation: 'landscape') => Promise<void>;
};

const getLockableOrientation = (): LockableScreenOrientation | null => {
    if (typeof window === 'undefined' || typeof screen === 'undefined') return null;
    const orientation = screen.orientation as LockableScreenOrientation;
    return typeof orientation?.lock === 'function' ? orientation : null;
};

/**
 * Demande le paysage au moment d'un geste utilisateur. Certains navigateurs
 * n'autorisent le verrouillage qu'en plein écran ; ce repli est limité aux
 * appareils tactiles pour ne jamais modifier l'expérience bureau.
 */
export const requestEditorLandscape = async (): Promise<boolean> => {
    const orientation = getLockableOrientation();
    if (!orientation) return false;

    try {
        await orientation.lock('landscape');
        return true;
    } catch {
        const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
        const root = document.documentElement;
        if (!isTouchDevice || document.fullscreenElement || typeof root.requestFullscreen !== 'function') {
            return false;
        }

        try {
            await root.requestFullscreen({ navigationUI: 'hide' });
            fullscreenRequestedByEditor = true;
            await orientation.lock('landscape');
            return true;
        } catch (error) {
            logger.warn('Unable to lock the editor in landscape orientation:', error);
            return false;
        }
    }
};

const releaseEditorLandscape = () => {
    const orientation = getLockableOrientation();
    if (orientation) {
        try {
            orientation.unlock();
        } catch (error) {
            logger.warn('Unable to unlock screen orientation:', error);
        }
    }

    if (fullscreenRequestedByEditor && document.fullscreenElement && typeof document.exitFullscreen === 'function') {
        void document.exitFullscreen().catch(error => logger.warn('Unable to exit editor fullscreen mode:', error));
    }
    fullscreenRequestedByEditor = false;
};

export const useForceLandscape = () => {
    useEffect(() => {
        void requestEditorLandscape();
        return releaseEditorLandscape;
    }, []);
};
