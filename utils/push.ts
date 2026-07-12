// Helpers d'abonnement Web Push côté client.

import type { PushNotificationKind } from './notificationTypes';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export const pushSupported = (): boolean =>
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

/** iOS n'autorise le push que depuis une PWA installée (display-mode standalone). */
export const isStandalone = (): boolean =>
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true);

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const output = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i += 1) output[i] = rawData.charCodeAt(i);
    return output;
};

const deviceLabel = (): string => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'Android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
    if (/windows/i.test(ua)) return 'Windows';
    if (/mac/i.test(ua)) return 'Mac';
    return 'Appareil';
};

export const subscribeToPush = async (): Promise<{ ok: boolean; reason?: string }> => {
    if (!pushSupported()) return { ok: false, reason: 'non-supporté' };
    if (!VAPID_PUBLIC_KEY) return { ok: false, reason: 'clé VAPID manquante' };

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return { ok: false, reason: 'permission refusée' };

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const subscription =
        existing ??
        (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        }));

    const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'subscribe', subscription, device: deviceLabel() }),
    });
    return response.ok ? { ok: true } : { ok: false, reason: 'enregistrement serveur échoué' };
};

export const unsubscribeFromPush = async (): Promise<void> => {
    if (!pushSupported()) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'unsubscribe', endpoint: subscription.endpoint }),
    }).catch(() => undefined);
    await subscription.unsubscribe().catch(() => undefined);
};

/**
 * Notification système LOCALE (sans serveur) via le service worker : visible
 * dans le volet de notifications du téléphone, même app en arrière-plan ou
 * écran verrouillé — tant que la page vit (rappels de fin de séance).
 * Silencieuse si la permission n'a pas été accordée : les couches vibration
 * et toast restent le signal de base.
 */
export const showLocalNotification = async (
    title: string,
    body: string,
    tag: string,
    url = '/',
    kind: PushNotificationKind = tag.includes('missing') ? 'missing-date' : 'session-reminder'
): Promise<boolean> => {
    try {
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
        if (!('serviceWorker' in navigator)) return false;
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
            body,
            tag, // remplace une notification du même créneau au lieu d'empiler
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            data: { url, kind, timestamp: Date.now() },
        });
        return true;
    } catch {
        return false;
    }
};

export const sendTestNotification = async (): Promise<boolean> => {
    const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ action: 'test' }),
    });
    return response.ok;
};
