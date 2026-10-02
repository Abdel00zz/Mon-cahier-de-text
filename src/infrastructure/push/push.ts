import { apiFetch } from '../../platform/nativeHttp';
import { Capacitor } from '@capacitor/core';
import { translateLocaleMessage } from '../../i18n/messages';
// Helpers d'abonnement Web Push côté client.

import type { PushNotificationKind } from '../../domain/notifications/notificationTypes';
import type { AppLocale } from '../../types';
import { notificationPresentation } from '../../domain/notifications/notificationPresentation';
import { isSuccessfulTestResponse } from './pushResponse';
import { captureWorkspaceLease, readWorkspaceScope } from '../storage/accountWorkspace';
import { forgetPushCleanup, pendingPushCleanup, rememberPushCleanup } from './pushCleanup';
import { pendingNativePushCleanup } from './nativePushCleanup';

const VAPID_PUBLIC_KEY = import.meta.env?.VITE_VAPID_PUBLIC_KEY as string | undefined;

export const pushSupported = (): boolean =>
    Capacitor.isNativePlatform() || (typeof window !== 'undefined' &&
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window);

/** iOS n'autorise le push que depuis une PWA installée (display-mode standalone). */
export const isStandalone = (): boolean =>
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(display-mode: standalone)').matches ||
        window.matchMedia?.('(display-mode: fullscreen)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true);

/** Inclut iPadOS lorsqu'il se présente comme un Mac avec écran tactile. */
export const isIOSDevice = (): boolean =>
    typeof navigator !== 'undefined' &&
    (/iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export interface PushNotificationState {
    delivery?: 'local' | 'web-push';
    permission: NotificationPermission | 'unsupported';
    /** Abonnement présent dans PushManager sur ce navigateur. */
    subscribed: boolean;
    /** null signifie que le serveur n'a pas pu être interrogé avec certitude. */
    serverRegistered: boolean | null;
    /** Android: local reminders may be active while optional FCM remains unconfigured. */
    remoteAvailable?: boolean;
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
const requestPush = async (body: object): Promise<{ response: Response; payload: Record<string, unknown> | null }> => {
    const owner = readWorkspaceScope()?.owner;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8_000);
    try {
        const response = await apiFetch('/api/notify', {
            method: 'POST', headers: { 'Content-Type': 'application/json', ...(owner ? { 'X-Workspace-Owner': owner } : {}) },
            credentials: 'same-origin', signal: controller.signal, body: JSON.stringify(body),
        });
        const payload = await readJson(response);
        return { response, payload };
    } finally { window.clearTimeout(timer); }
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
 * alors apparaître dans le volet du téléphone tant que la page reste vivante.
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

const subscribeToPush = async (options: { requestPermission?: boolean; isCurrent?: () => boolean } = {}): Promise<PushNotificationState> => {
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
        if (options.isCurrent && !options.isCurrent()) throw new Error('Workspace changed');
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
        if (options.isCurrent && !options.isCurrent()) throw new Error('Workspace changed');
        const { response, payload } = await requestPush({ action: 'subscribe', subscription, device: deviceLabel() });
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
    (await import('./appBadge')).enableInboxBadge();
    if (Capacitor.isNativePlatform()) return (await import('../../platform/nativeNotifications')).nativeNotificationState(true);
    const isCurrent = captureWorkspaceLease();
    const native = await requestNativeNotificationPermission();
    if (native.permission !== 'granted' || !isCurrent()) return native;

    const subscription = await subscribeToPush({ requestPermission: false, isCurrent });
    return {
        permission: subscription.permission,
        subscribed: subscription.subscribed,
        serverRegistered: subscription.serverRegistered,
        reason: subscription.reason,
    };
};

/** Lit l'état réel sans jamais déclencher de demande d'autorisation. */
export const getPushNotificationState = async (): Promise<PushNotificationState> => {
    if (Capacitor.isNativePlatform()) return (await import('../../platform/nativeNotifications')).nativeNotificationState();
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
        const { response, payload } = await requestPush({ action: 'status', endpoint: subscription.endpoint });
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
    if (Capacitor.isNativePlatform()) {
        const [serverUnregistered] = await Promise.all([
            (await import('../../platform/nativePush')).disconnectNativePush(),
            (await import('../../platform/nativeNotifications')).disableNativeReminders(),
        ]);
        return { ok: serverUnregistered, hadSubscription: true, serverUnregistered, localUnsubscribed: true };
    }
    await (await import('./appBadge')).clearInboxBadge();
    if (!pushSupported()) {
        return { ok: true, hadSubscription: false, serverUnregistered: true, localUnsubscribed: true };
    }
    const owner = readWorkspaceScope()?.owner ?? null;
    const isCurrent = captureWorkspaceLease();

    let registration: ServiceWorkerRegistration | null;
    let subscription: PushSubscription | null;
    try {
        registration = await currentServiceWorkerRegistration();
        subscription = registration ? await registration.pushManager.getSubscription() : null;
    } catch {
        return { ok: false, hadSubscription: false, serverUnregistered: false, localUnsubscribed: false };
    }
    const endpoints = new Set(pendingPushCleanup(owner));
    let localUnsubscribed = !subscription;
    if (subscription && registration && isCurrent()) {
        endpoints.add(subscription.endpoint);
        rememberPushCleanup(owner, subscription.endpoint);
        try {
            await subscription.unsubscribe();
            localUnsubscribed = (await registration.pushManager.getSubscription()) === null;
        } catch { localUnsubscribed = false; }
    }

    // Retirer d'abord l'abonnement local coupe immédiatement les rappels sur
    // cet appareil, même si le réseau est lent. Le serveur est ensuite
    // informé avec l'endpoint mémorisé pour éviter toute fuite de livraison.
    const results = await Promise.all([...endpoints].map(async endpoint => {
        if (!isCurrent()) return false;
        try {
            const { response, payload } = await requestPush({ action: 'unsubscribe', endpoint });
            if (!isCurrent() || !response.ok || payload?.ok !== true) return false;
            forgetPushCleanup(owner, endpoint);
            return true;
        } catch { return false; }
    }));
    const serverUnregistered = results.every(Boolean);

    return {
        ok: serverUnregistered && localUnsubscribed,
        hadSubscription: !!subscription,
        serverUnregistered,
        localUnsubscribed,
    };
};

export const hasPendingPushCleanup = (): boolean => {
    const owner = readWorkspaceScope()?.owner ?? null;
    return (Capacitor.isNativePlatform() ? pendingNativePushCleanup(owner) : pendingPushCleanup(owner)).length > 0;
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
    kind: PushNotificationKind = tag.includes('missing') ? 'missing-date' : 'session-reminder',
    vibration = true,
    isCurrent: () => boolean = () => true,
    locale?: AppLocale,
): Promise<boolean> => {
    try {
        if (Capacitor.isNativePlatform()) {
            if (!isCurrent()) return false;
            return (await import('../../platform/nativeNotifications')).showNativeNotification(title, body, tag, url);
        }
        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
        if (!('serviceWorker' in navigator)) return false;
        const registration = await currentServiceWorkerRegistration();
        if (!registration || !isCurrent()) return false;
        const presentation = notificationPresentation({ title, body, tag, url, kind, locale }, vibration);
        await registration.showNotification(presentation.title, presentation.options);
        return true;
    } catch {
        return false;
    }
};

export const sendTestNotification = async (): Promise<PushTestResult> => {
    if (Capacitor.isNativePlatform()) {
        const remote = await (await import('../../platform/nativePush')).testNativePush();
        if (remote) return remote;
        const raw = localStorage.getItem('appConfig_v1');
        const locale: AppLocale = raw ? JSON.parse(raw).applicationLocale ?? 'ar' : 'ar';
        const ok = await (await import('../../platform/nativeNotifications')).showNativeNotification(
            translateLocaleMessage(locale, 'notifications.remindersTitle'),
            translateLocaleMessage(locale, 'notifications.nativeTestBody'), 'native-test', '/#/notifications',
        );
        return { ok, sent: ok ? 1 : 0 };
    }
    const registration = await currentServiceWorkerRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return { ok: false, sent: 0, error: 'Aucun abonnement sur cet appareil.' };
    const { response, payload } = await requestPush({ action: 'test', endpoint: subscription.endpoint });
    const sent = typeof payload?.sent === 'number' ? payload.sent : 0;
    return {
        ok: isSuccessfulTestResponse(response.ok, payload),
        sent,
        error: responseError(payload),
    };
};
