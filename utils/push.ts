// Helpers d'abonnement Web Push côté client.

import type { PushNotificationKind } from './notificationTypes';
import { isSuccessfulTestResponse } from './pushResponse';

const VAPID_PUBLIC_KEY = import.meta.env?.VITE_VAPID_PUBLIC_KEY as string | undefined;

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

/** Inclut iPadOS lorsqu'il se présente comme un Mac avec écran tactile. */
export const isIOSDevice = (): boolean =>
    typeof navigator !== 'undefined' &&
    (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export interface PushNotificationState {
    permission: NotificationPermission | 'unsupported';
    /** Abonnement présent dans PushManager sur ce navigateur. */
    subscribed: boolean;
    /** null signifie que le serveur n'a pas pu être interrogé avec certitude. */
    serverRegistered: boolean | null;
    reason?: NotificationActivationReason;
}

export type NativeNotificationActivation = PushNotificationState;

type NotificationActivationReason =
    | 'unsupported'
    | 'iosInstallRequired'
    | 'permissionDenied'
    | 'permissionDismissed'
    | 'nativeUnavailable'
    | 'vapidMissing'
    | 'serverRegistrationFailed'
    | 'serverStatusUnavailable';

export interface PushUnsubscribeResult {
    ok: boolean;
    hadSubscription: boolean;
    serverUnregistered: boolean;
    localUnsubscribed: boolean;
}

export interface PushTestResult {
    ok: boolean;
    sent: number;
    error?: string;
}

const readJson = async (response: Response): Promise<Record<string, unknown> | null> => {
    const payload: unknown = await response.json().catch(() => null);
    return payload && typeof payload === 'object' ? payload as Record<string, unknown> : null;
};

const responseError = (payload: Record<string, unknown> | null): string | undefined =>
    typeof payload?.error === 'string' ? payload.error : undefined;

/** Les appels Push ne doivent jamais immobiliser l'écran de réglages ou la
 * déconnexion lorsque le fournisseur réseau ne répond plus. */
const requestSignal = (): AbortSignal | undefined => {
    try {
        return typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
            ? AbortSignal.timeout(8_000)
            : undefined;
    } catch {
        return undefined;
    }
};

const registrationFlag = (payload: Record<string, unknown> | null): boolean | null => {
    if (typeof payload?.registered === 'boolean') return payload.registered;
    if (typeof payload?.endpointOwnedByCurrentUser === 'boolean') return payload.endpointOwnedByCurrentUser;
    // Compatibilité avec la première version de l'action status.
    if (typeof payload?.subscribed === 'boolean') return payload.subscribed;
    return null;
};

/** Ne reste pas bloqué sur `serviceWorker.ready` lorsqu'aucun SW n'existe (DEV). */
const currentServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
    return (await navigator.serviceWorker.getRegistration()) ?? null;
};

/**
 * Déclenche uniquement la demande NATIVE du navigateur. Cette étape reste
 * utile même sans clé VAPID : les rappels locaux du service worker peuvent
 * alors apparaître sur l'écran verrouillé et dans le volet du téléphone.
 */
const requestNativeNotificationPermission = async (): Promise<NativeNotificationActivation> => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
        return { permission: 'unsupported', subscribed: false, serverRegistered: false, reason: 'unsupported' };
    }
    if (isIOSDevice() && !isStandalone()) {
        return { permission: Notification.permission, subscribed: false, serverRegistered: false, reason: 'iosInstallRequired' };
    }
    try {
        const permission = Notification.permission === 'default'
            ? await Notification.requestPermission()
            : Notification.permission;
        return {
            permission,
            subscribed: false,
            serverRegistered: false,
            reason: permission === 'granted' ? undefined : permission === 'denied' ? 'permissionDenied' : 'permissionDismissed',
        };
    } catch {
        return { permission: 'unsupported', subscribed: false, serverRegistered: false, reason: 'nativeUnavailable' };
    }
};

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
    if (isIOSDevice()) return 'iOS';
    if (/windows/i.test(ua)) return 'Windows';
    if (/mac/i.test(ua)) return 'Mac';
    return 'Appareil';
};

const subscribeToPush = async (options: { requestPermission?: boolean } = {}): Promise<PushNotificationState> => {
    if (!pushSupported()) {
        return { permission: 'unsupported', subscribed: false, serverRegistered: false, reason: 'unsupported' };
    }
    if (!VAPID_PUBLIC_KEY) {
        return { permission: Notification.permission, subscribed: false, serverRegistered: false, reason: 'vapidMissing' };
    }

    const permission = Notification.permission === 'default' && options.requestPermission !== false
        ? await Notification.requestPermission()
        : Notification.permission;
    if (permission !== 'granted') {
        return {
            permission,
            subscribed: false,
            serverRegistered: false,
            reason: permission === 'denied' ? 'permissionDenied' : 'permissionDismissed',
        };
    }

    let subscription: PushSubscription;
    try {
        const registration = await currentServiceWorkerRegistration();
        if (!registration) {
            return { permission, subscribed: false, serverRegistered: false, reason: 'nativeUnavailable' };
        }
        const existing = await registration.pushManager.getSubscription();
        subscription = existing ?? await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
    } catch {
        return { permission, subscribed: false, serverRegistered: false, reason: 'nativeUnavailable' };
    }

    try {
        const response = await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            signal: requestSignal(),
            body: JSON.stringify({ action: 'subscribe', subscription, device: deviceLabel() }),
        });
        const payload = await readJson(response);
        const registered = registrationFlag(payload);
        const serverRegistered = response.ok && payload?.ok === true && registered !== false;
        return {
            permission,
            subscribed: true,
            serverRegistered,
            reason: serverRegistered ? undefined : 'serverRegistrationFailed',
        };
    } catch {
        return { permission, subscribed: true, serverRegistered: false, reason: 'serverRegistrationFailed' };
    }
};

/** Autorisation système puis abonnement serveur si celui-ci est configuré. */
export const activateNativeNotifications = async (): Promise<NativeNotificationActivation> => {
    const native = await requestNativeNotificationPermission();
    if (native.permission !== 'granted') return native;

    const subscription = await subscribeToPush({ requestPermission: false });
    return {
        permission: subscription.permission,
        subscribed: subscription.subscribed,
        serverRegistered: subscription.serverRegistered,
        reason: subscription.reason,
    };
};

/** Lit l'état réel sans jamais déclencher de demande d'autorisation. */
export const getPushNotificationState = async (): Promise<PushNotificationState> => {
    if (!pushSupported()) {
        return { permission: 'unsupported', subscribed: false, serverRegistered: false, reason: 'unsupported' };
    }

    const permission = Notification.permission;
    if (isIOSDevice() && !isStandalone()) {
        return { permission, subscribed: false, serverRegistered: false, reason: 'iosInstallRequired' };
    }

    let subscription: PushSubscription | null;
    try {
        const registration = await currentServiceWorkerRegistration();
        // Situation normale en développement ou avant l'installation du SW.
        if (!registration) return { permission, subscribed: false, serverRegistered: false };
        subscription = await registration.pushManager.getSubscription();
    } catch {
        return { permission, subscribed: false, serverRegistered: null, reason: 'nativeUnavailable' };
    }

    if (!subscription) return { permission, subscribed: false, serverRegistered: false };

    try {
        const response = await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            signal: requestSignal(),
            body: JSON.stringify({ action: 'status', endpoint: subscription.endpoint }),
        });
        const payload = await readJson(response);
        const serverRegistered = response.ok && payload?.ok === true ? registrationFlag(payload) : null;
        return {
            permission,
            subscribed: true,
            serverRegistered,
            reason: serverRegistered === null ? 'serverStatusUnavailable' : undefined,
        };
    } catch {
        return { permission, subscribed: true, serverRegistered: null, reason: 'serverStatusUnavailable' };
    }
};

export const unsubscribeFromPush = async (): Promise<PushUnsubscribeResult> => {
    if (!pushSupported()) {
        return { ok: true, hadSubscription: false, serverUnregistered: true, localUnsubscribed: true };
    }

    let registration: ServiceWorkerRegistration | null;
    let subscription: PushSubscription | null;
    try {
        registration = await currentServiceWorkerRegistration();
        subscription = registration ? await registration.pushManager.getSubscription() : null;
    } catch {
        return { ok: false, hadSubscription: false, serverUnregistered: false, localUnsubscribed: false };
    }
    if (!registration || !subscription) {
        return { ok: true, hadSubscription: false, serverUnregistered: true, localUnsubscribed: true };
    }

    let localUnsubscribed = false;
    try {
        await subscription.unsubscribe();
        localUnsubscribed = (await registration.pushManager.getSubscription()) === null;
    } catch {
        localUnsubscribed = false;
    }

    // Retirer d'abord l'abonnement local coupe immédiatement les rappels sur
    // cet appareil, même si le réseau est lent. Le serveur est ensuite
    // informé avec l'endpoint mémorisé pour éviter toute fuite de livraison.
    let serverUnregistered = false;
    try {
        const response = await fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            signal: requestSignal(),
            body: JSON.stringify({ action: 'unsubscribe', endpoint: subscription.endpoint }),
        });
        const payload = await readJson(response);
        serverUnregistered = response.ok && payload?.ok === true;
    } catch {
        serverUnregistered = false;
    }

    return {
        ok: serverUnregistered && localUnsubscribed,
        hadSubscription: true,
        serverUnregistered,
        localUnsubscribed,
    };
};

/**
 * Notification système LOCALE (sans serveur) via le service worker : visible
 * dans le volet de notifications du téléphone, même app en arrière-plan ou
 * écran verrouillé, tant que la page vit (rappels de fin de séance).
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
        const registration = await currentServiceWorkerRegistration();
        if (!registration) return false;
        const options = {
            body,
            tag, // remplace une notification du même créneau au lieu d'empiler
            icon: '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            vibrate: kind === 'missing-date' ? [280, 120, 280] : [180, 90, 180],
            data: { url, kind, timestamp: Date.now() },
        } as NotificationOptions & { vibrate: number[] };
        await registration.showNotification(title, options);
        return true;
    } catch {
        return false;
    }
};

export const sendTestNotification = async (): Promise<PushTestResult> => {
    const response = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        signal: requestSignal(),
        body: JSON.stringify({ action: 'test' }),
    });
    const payload = await readJson(response);
    const sent = typeof payload?.sent === 'number' ? payload.sent : 0;
    return {
        ok: isSuccessfulTestResponse(response.ok, payload),
        sent,
        error: responseError(payload),
    };
};
