import { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';
import { createStore } from 'zustand/vanilla';

export type DeviceType = 'phone' | 'tablet' | 'desktop';

export interface DeviceInfo {
    type: DeviceType;
    isPortrait: boolean;
    isLandscape: boolean;
    isTouch: boolean;
    isPhone: boolean;
    isNative: boolean;
}

const PHONE_MAX = 767;
const TABLET_MAX = 1023;

const isNativeConstant = typeof window !== 'undefined' && (
    Capacitor.isNativePlatform() ||
    (typeof document !== 'undefined' && (document.documentElement.dataset.platform === 'android' || document.documentElement.dataset.platform === 'ios'))
);

const readDevice = (): DeviceInfo => {
    if (typeof window === 'undefined') {
        return { type: 'desktop', isPortrait: false, isLandscape: false, isTouch: false, isPhone: false, isNative: false };
    }
    const isTouch = navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
    // Layout viewport : documentElement.clientWidth ne varie pas lors du pinch-zoom
    const layoutWidth = document.documentElement?.clientWidth || window.innerWidth;
    const screenMin = Math.min(window.screen?.width || layoutWidth, window.screen?.height || layoutWidth);
    const w = isTouch ? Math.min(layoutWidth, screenMin) : layoutWidth;
    const isPortrait = isTouch && window.screen.orientation?.type
        ? window.screen.orientation.type.startsWith('portrait')
        : window.matchMedia('(orientation: portrait)').matches;

    let type: DeviceType = 'desktop';
    if (w <= PHONE_MAX) type = 'phone';
    else if (w <= TABLET_MAX && isTouch) type = 'tablet';
    else if (w <= TABLET_MAX) type = 'desktop';

    return {
        type,
        isPortrait,
        isLandscape: !isPortrait,
        isTouch,
        isPhone: type === 'phone',
        isNative: isNativeConstant,
    };
};

const deviceStore = createStore<DeviceInfo>(() => readDevice());
let subscribers = 0;
let frame: number | null = null;

const updateDevice = () => {
    if (frame !== null) return;
    frame = window.requestAnimationFrame(() => {
        frame = null;
        const next = readDevice();
        const current = deviceStore.getState();
        if (
            current.type !== next.type ||
            current.isPortrait !== next.isPortrait ||
            current.isTouch !== next.isTouch
        ) {
            deviceStore.setState(next);
        }
    });
};

let queries: MediaQueryList[] = [];

const subscribe = (notify: () => void) => {
    const unsub = deviceStore.subscribe(notify);
    subscribers += 1;
    if (subscribers === 1 && typeof window !== 'undefined') {
        queries = [
            window.matchMedia(`(max-width: ${PHONE_MAX}px)`),
            window.matchMedia(`(min-width: ${PHONE_MAX + 1}px) and (max-width: ${TABLET_MAX}px)`),
            window.matchMedia('(orientation: portrait)'),
            window.matchMedia('(pointer: coarse)'),
        ];
        queries.forEach(q => q.addEventListener('change', updateDevice));
        window.addEventListener('resize', updateDevice);
        window.screen.orientation?.addEventListener('change', updateDevice);
        updateDevice();
    }
    return () => {
        unsub();
        subscribers -= 1;
        if (!subscribers && typeof window !== 'undefined') {
            if (frame !== null) {
                window.cancelAnimationFrame(frame);
                frame = null;
            }
            queries.forEach(q => q.removeEventListener('change', updateDevice));
            queries = [];
            window.removeEventListener('resize', updateDevice);
            window.screen.orientation?.removeEventListener('change', updateDevice);
        }
    };
};

const getSnapshot = () => deviceStore.getState();

/** Détection fine et performante de l'appareil avec store partagé au niveau du module. */
export const useDevice = (): DeviceInfo => {
    return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};
