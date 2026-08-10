const isIOSDevice = (): boolean => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
        || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        || navigatorWithStandalone.standalone === true;
};

/**
 * Ajustements de plateforme qui ne peuvent pas être exprimés uniquement en
 * CSS : iPadOS en mode bureau, hauteur réellement visible avec le clavier et
 * mode d'installation sur l'écran d'accueil.
 */
export const initApplePlatform = (): (() => void) => {
    const root = document.documentElement;
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const appleDevice = isIOSDevice();

    root.dataset.platform = appleDevice ? 'ios' : 'web';

    const updateDisplayMode = () => {
        root.dataset.standalone = String(displayMode.matches || navigatorWithStandalone.standalone === true);
    };

    const updateViewport = () => {
        const viewport = window.visualViewport;
        const height = Math.round(viewport?.height ?? window.innerHeight);
        const keyboardOpen = !!viewport
            && viewport.scale === 1
            && window.innerHeight - viewport.height > 160;
        root.style.setProperty('--app-viewport-height', `${height}px`);
        root.style.setProperty('--app-viewport-offset-top', `${Math.round(viewport?.offsetTop ?? 0)}px`);
        root.dataset.keyboard = keyboardOpen ? 'open' : 'closed';
    };

    updateDisplayMode();
    updateViewport();
    displayMode.addEventListener?.('change', updateDisplayMode);
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    return () => {
        displayMode.removeEventListener?.('change', updateDisplayMode);
        window.visualViewport?.removeEventListener('resize', updateViewport);
        window.visualViewport?.removeEventListener('scroll', updateViewport);
        window.removeEventListener('orientationchange', updateViewport);
    };
};
