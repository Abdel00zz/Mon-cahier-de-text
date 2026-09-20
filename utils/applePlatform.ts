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

    let viewportFrame: number | null = null;
    const applyViewport = () => {
        viewportFrame = null;
        const viewport = window.visualViewport;
        const height = Math.round(viewport?.height ?? window.innerHeight);
        const keyboardOpen = !!viewport
            && viewport.scale === 1
            && window.innerHeight - viewport.height > 160;
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

    updateDisplayMode();
    applyViewport();
    displayMode.addEventListener?.('change', updateDisplayMode);
    window.visualViewport?.addEventListener('resize', updateViewport);
    window.visualViewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('orientationchange', updateViewport);
    window.addEventListener('resize', updateViewport);

    return () => {
        displayMode.removeEventListener?.('change', updateDisplayMode);
        window.visualViewport?.removeEventListener('resize', updateViewport);
        window.visualViewport?.removeEventListener('scroll', updateViewport);
        window.removeEventListener('orientationchange', updateViewport);
        window.removeEventListener('resize', updateViewport);
        if (viewportFrame !== null) window.cancelAnimationFrame(viewportFrame);
    };
};
