import { Capacitor } from '@capacitor/core';
import { translateLocaleMessage } from '../../i18n/messages';
/*
 * Notifications : rappels NATIFS pour l'application Android, rappels LOCAUX
 * pour la page web (service worker, page vivante).
 *
 * Le Web Push a été retiré : plus de clé VAPID, plus d'abonnement navigateur,
 * plus d'appel à \`/api/notify\` depuis ce module. Le fil de messages et le
 * badge de l'application ne dépendent pas de ce fichier.
 */

import type { PushNotificationKind } from '../../domain/notifications/notificationTypes';
import type { AppLocale } from '../../types';
import { notificationPresentation } from '../../domain/notifications/notificationPresentation';
import { readWorkspaceScope } from '../storage/accountWorkspace';
import { clearInboxBadge, enableInboxBadge } from './appBadge';
import { pendingNativePushCleanup } from './nativePushCleanup';

export const NOTIFICATION_STATE_EVENT = 'cdt-notification-state-change';

function emitNotificationStateChange(): void {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        try {
            window.dispatchEvent(new Event(NOTIFICATION_STATE_EVENT));
        } catch {
            // Ignore in synthetic test environments
        }
    }
}

export const pushSupported = (): boolean =>
    Capacitor.isNativePlatform() || (typeof window !== 'undefined' &&
    (window.isSecureContext || window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1') &&
    'Notification' in window &&
    'serviceWorker' in navigator);

/** iOS n'expose les notifications que depuis une page installée sur l'écran d'accueil. */
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
    /** 'local' = rappels natifs Android ; absent = page web (rappels locaux du service worker). */
    delivery?: 'local';
    permission: NotificationPermission | 'unsupported';
    /** Android : inscription FCM enregistrée côté serveur. */
    subscribed: boolean;
    /** null signifie que le serveur n'a pas pu être interrogé avec certitude. */
    serverRegistered: boolean | null;
    /** false = aucune livraison distante possible sur cet appareil (page web). */
    remoteAvailable?: boolean;
    reason?: NotificationActivationReason;
    /** Android : exemption d'optimisation de batterie pour l'arrière-plan */
    batteryOptimizationIgnored?: boolean;
    /** Android : droit de planifier des alarmes exactes */
    canScheduleExactAlarms?: boolean;
}

export type NativeNotificationActivation = PushNotificationState;

type NotificationActivationReason =
    | 'unsupported'
    | 'iosInstallRequired'
    | 'permissionDenied'
    | 'permissionDismissed'
    | 'nativeUnavailable';

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

/** Ne reste pas bloqué sur \`serviceWorker.ready\` lorsqu'aucun SW n'existe (DEV). */
const currentServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
    return (await navigator.serviceWorker.getRegistration()) ?? null;
};

/**
 * Demande l'autorisation système. Indispensable aux rappels locaux : ce sont
 * eux qui affichent la notification dans le volet du téléphone.
 */
const requestNotificationPermission = async (): Promise<PushNotificationState> => {
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
            serverRegistered: null,
            remoteAvailable: false,
            reason: permission === 'granted' ? undefined : permission === 'denied' ? 'permissionDenied' : 'permissionDismissed',
        };
    } catch {
        return { permission: 'unsupported', subscribed: false, serverRegistered: false, reason: 'nativeUnavailable' };
    }
};

/** Autorisation système, puis inscription native si la plateforme le permet. */
export const activateNativeNotifications = async (): Promise<NativeNotificationActivation> => {
    if (Capacitor.isNativePlatform()) {
        enableInboxBadge();
        const state = await (await import('../../platform/nativeNotifications')).nativeNotificationState(true);
        emitNotificationStateChange();
        return state;
    }
    const permissionPromise = requestNotificationPermission();
    enableInboxBadge();
    const state = await permissionPromise;
    emitNotificationStateChange();
    return state;
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
    return { permission, subscribed: false, serverRegistered: null, remoteAvailable: false };
};

export const unsubscribeFromPush = async (): Promise<PushUnsubscribeResult> => {
    if (Capacitor.isNativePlatform()) {
        const [serverUnregistered] = await Promise.all([
            (await import('../../platform/nativePush')).disconnectNativePush(),
            (await import('../../platform/nativeNotifications')).disableNativeReminders(),
        ]);
        emitNotificationStateChange();
        return { ok: serverUnregistered, hadSubscription: true, serverUnregistered, localUnsubscribed: true };
    }
    // Web : plus aucun abonnement distant à retirer, seul le badge reste à nettoyer.
    await clearInboxBadge();
    emitNotificationStateChange();
    return { ok: true, hadSubscription: false, serverUnregistered: true, localUnsubscribed: true };
};

export const hasPendingPushCleanup = (): boolean =>
    Capacitor.isNativePlatform() && pendingNativePushCleanup(readWorkspaceScope()?.owner ?? null).length > 0;

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

/** Test local : notification système sur cet appareil, sans transport serveur. */
export const sendTestNotification = async (): Promise<PushTestResult> => {
    const raw = localStorage.getItem('appConfig_v1');
    const locale: AppLocale = raw ? JSON.parse(raw).applicationLocale ?? 'ar' : 'ar';
    const title = translateLocaleMessage(locale, 'notifications.remindersTitle');
    const body = translateLocaleMessage(locale, 'notifications.nativeTestBody');
    if (Capacitor.isNativePlatform()) {
        const remote = await (await import('../../platform/nativePush')).testNativePush();
        if (remote) return remote;
        const ok = await (await import('../../platform/nativeNotifications')).showNativeNotification(title, body, 'native-test', '/#/');
        return { ok, sent: ok ? 1 : 0 };
    }
    const ok = await showLocalNotification(title, body, 'local-test', '/#/', 'test' as PushNotificationKind, true, () => true, locale);
    return { ok, sent: ok ? 1 : 0 };
};

export const requestIgnoreBatteryOptimization = async (): Promise<void> => {
    if (Capacitor.isNativePlatform()) {
        const { requestBatteryOptimizationExemption } = await import('../../platform/nativeNotifications');
        await requestBatteryOptimizationExemption();
    }
};

export const requestExactAlarmPermission = async (): Promise<void> => {
    if (Capacitor.isNativePlatform()) {
        const { requestExactAlarmAccess } = await import('../../platform/nativeNotifications');
        await requestExactAlarmAccess();
    }
};
