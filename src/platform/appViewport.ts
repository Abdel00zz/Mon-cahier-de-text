import { clamp } from 'es-toolkit';

const isIOSDevice = (): boolean => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        || navigatorWithStandalone.standalone === true;
};

/**
 * Ajustements de plateforme qui ne peuvent pas être exprimés uniquement en CSS :
 * hauteur réellement visible lorsque le clavier virtuel s'ouvre, plateforme
 * détectée, et état « clavier ouvert » pour les barres et les feuilles modales.
 *
 * L'état d'installation PWA est géré séparément par `pwaInstall.ts`.
 */
export const initAppViewport = (): (() => void) => {
    const root = document.documentElement;
    root.dataset.platform = isIOSDevice() ? 'ios' : /android/i.test(navigator.userAgent) ? 'android' : 'web';

    let viewportFrame: number | null = null;
    let layoutWidth = window.innerWidth;
    let restingHeight = window.innerHeight;
    const editableFocused = () => {
        const active = document.activeElement as HTMLElement | null;
        if (active?.isContentEditable || active?.tagName === 'TEXTAREA') return true;
        return active?.tagName === 'INPUT' && !['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'hidden', 'color', 'date', 'time', 'month', 'week', 'file'].includes((active as HTMLInputElement).type);
    };
    const applyViewport = () => {
        viewportFrame = null;
        const viewport = window.visualViewport;
        const height = Math.round(viewport?.height ?? window.innerHeight);
        const editable = editableFocused();
        // Android adjustResize and Chrome resizes-content shrink the layout as
        // well as the visual viewport. Comparing only those two misses the IME.
        if (layoutWidth !== window.innerWidth) {
            layoutWidth = window.innerWidth;
            restingHeight = window.innerHeight;
        } else if (!editable || window.innerHeight > restingHeight) {
            restingHeight = window.innerHeight;
        }
        const threshold = clamp(restingHeight * 0.22, 100, 160);
        const keyboardOpen = editable && (viewport?.scale ?? 1) === 1
            && Math.max(window.innerHeight - height, restingHeight - height) > threshold;
        const values = { '--app-viewport-height': `${height}px`, '--app-viewport-offset-top': `${Math.round(viewport?.offsetTop ?? 0)}px` };
        Object.entries(values).forEach(([key, value]) => {
            if (root.style.getPropertyValue(key) !== value) root.style.setProperty(key, value);
        });
        const keyboardState = keyboardOpen ? 'open' : 'closed';
        if (root.dataset.keyboard !== keyboardState) root.dataset.keyboard = keyboardState;
    };

    const updateViewport = () => {
        if (viewportFrame === null) viewportFrame = window.requestAnimationFrame(applyViewport);
    };

    applyViewport();
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    window.addEventListener('resize', updateViewport);
    document.addEventListener('focusin', updateViewport);
    document.addEventListener('focusout', updateViewport);

    return () => {
        window.visualViewport?.removeEventListener('resize', updateViewport);
        window.visualViewport?.removeEventListener('scroll', updateViewport);
        window.removeEventListener('orientationchange', updateViewport);
        window.removeEventListener('resize', updateViewport);
        document.removeEventListener('focusin', updateViewport);
        document.removeEventListener('focusout', updateViewport);
        if (viewportFrame !== null) window.cancelAnimationFrame(viewportFrame);
    };
};
