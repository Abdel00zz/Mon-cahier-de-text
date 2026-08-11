import { useEffect, useState } from 'react';

export type DeviceType = 'phone' | 'tablet' | 'desktop';

interface DeviceInfo {
    type: DeviceType;
    isPortrait: boolean;
    isLandscape: boolean;
    isTouch: boolean;
}

const PHONE_MAX = 767;
const TABLET_MAX = 1023;

/** Détection fine du type d'appareil (phone / tablette / desktop). */
export const useDevice = (): DeviceInfo => {
    const [info, setInfo] = useState<DeviceInfo>(() => readDevice());

    useEffect(() => {
        const queries = [
            window.matchMedia(`(max-width: ${PHONE_MAX}px)`),
            window.matchMedia(`(min-width: ${PHONE_MAX + 1}px) and (max-width: ${TABLET_MAX}px)`),
            window.matchMedia('(orientation: portrait)'),
            window.matchMedia('(pointer: coarse)'),
        ];
        const update = () => setInfo(readDevice());
        queries.forEach(q => q.addEventListener('change', update));
        return () => queries.forEach(q => q.removeEventListener('change', update));
    }, []);

    return info;
};

const readDevice = (): DeviceInfo => {
    if (typeof window === 'undefined') return { type: 'desktop', isPortrait: false, isLandscape: false, isTouch: false };
    const w = window.innerWidth;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const isPortrait = window.matchMedia('(orientation: portrait)').matches;
    let type: DeviceType = 'desktop';
    if (w <= PHONE_MAX) type = 'phone';
    else if (w <= TABLET_MAX && isTouch) type = 'tablet';
    else if (w <= TABLET_MAX) type = 'desktop';
    return { type, isPortrait, isLandscape: !isPortrait, isTouch };
};
