import { useState, useEffect } from 'react';

/**
 * Orientation réelle de l'appareil. `screen.orientation` reste stable quand le
 * clavier virtuel redimensionne le viewport, contrairement à la media query
 * `(orientation: landscape)` — qui faisait basculer l'interface en paysage dès
 * l'ouverture du clavier sur téléphone.
 */
const readLandscape = (): boolean => {
    if (typeof window === 'undefined') return true;
    const type = window.screen.orientation?.type;
    if (type) return type.startsWith('landscape');
    return window.matchMedia('(orientation: landscape)').matches;
};

export const useOrientation = () => {
    const [isLandscape, setIsLandscape] = useState(readLandscape);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(orientation: landscape)');
        
        const screenOrientation = window.screen.orientation;
        const handleChange = () => setIsLandscape(readLandscape());

        // `screen.orientation` d'abord (insensible au clavier virtuel), puis la
        // media query en repli pour les navigateurs qui ne l'exposent pas.
        screenOrientation?.addEventListener?.('change', handleChange);
        mediaQuery.addEventListener?.('change', handleChange);

        return () => {
            screenOrientation?.removeEventListener?.('change', handleChange);
            mediaQuery.removeEventListener?.('change', handleChange);
        };
    }, []);

    return { isLandscape };
};
