import { useState, useEffect } from 'react';

export const useOrientation = () => {
    const [isLandscape, setIsLandscape] = useState(
        typeof window !== 'undefined' ? window.matchMedia('(orientation: landscape)').matches : true
    );

    useEffect(() => {
        const mediaQuery = window.matchMedia('(orientation: landscape)');
        
        const handleChange = (e: MediaQueryListEvent) => {
            setIsLandscape(e.matches);
        };

        // Modern API
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
        } else {
            // Fallback for older browsers
            mediaQuery.addListener(handleChange);
        }

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handleChange);
            } else {
                mediaQuery.removeListener(handleChange);
            }
        };
    }, []);

    return { isLandscape };
};
