import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminMessage, AppLocale } from '../types';
import { captureWorkspaceLease } from '../infrastructure/storage/accountWorkspace';
import { requestSyncJson } from '../infrastructure/sync/syncTransport';
import { isForegroundOnline, startForegroundPolling } from '../platform/mobileScheduling';
import { syncInboxBadge } from '../infrastructure/push/appBadge';
import { Capacitor } from '@capacitor/core';

interface MessagesResponse {
    messages?: AdminMessage[];
    unreadCount?: number;
    badgeUpdatedAt?: number;
}

const loadPendingMessages = async (owner: string, signal: AbortSignal): Promise<MessagesResponse> => {
    const requestedAt = Date.now();
    const data = await requestSyncJson<MessagesResponse>('/api/messages', {
        credentials: 'same-origin', headers: { 'X-Workspace-Owner': owner }, signal,
    }, 15_000);
    if (!Array.isArray(data.messages)) throw new TypeError('Invalid inbox response');
    return { ...data, badgeUpdatedAt: data.badgeUpdatedAt ?? requestedAt };
};

/**
 * Boîte de réception minimale des messages direction : lecture au démarrage,
 * à l'arrivée d'un push et au retour de l'onglet. Au premier plan seulement,
 * une vérification par minute couvre les appareils sans permission Push.
 */
export const useAdminMessages = (enabled: boolean, owner?: string, locale: AppLocale = 'ar') => {
    const [messages, setMessages] = useState<AdminMessage[]>([]);
    const refreshController = useRef<AbortController | null>(null);

    const refresh = useCallback(async () => {
        if (!enabled || !owner || refreshController.current || !isForegroundOnline()) return;
        const controller = new AbortController();
        refreshController.current = controller;
        const isCurrent = captureWorkspaceLease();
        try {
            const next = await loadPendingMessages(owner, controller.signal);
            if (isCurrent() && !controller.signal.aborted) {
                setMessages(next.messages!);
                void syncInboxBadge(owner, next.unreadCount ?? next.messages!.length, next.badgeUpdatedAt!, locale);
            }
            return true;
        } finally {
            if (refreshController.current === controller) refreshController.current = null;
        }
    }, [enabled, owner, locale]);

    useEffect(() => {
        setMessages([]);
        if (!enabled || !owner) return;
        let stopConnection = () => {};
        if (Capacitor.isNativePlatform()) {
            const connect = () => {
                if (!isForegroundOnline()) return;
                void import('../platform/nativePush').then(module => {
                    if (isForegroundOnline()) return module.connectNativePush(locale);
                }).catch(() => {});
            };
            connect();
            window.addEventListener('native-resume', connect);
            window.addEventListener('online', connect);
            // Unregister below with the inbox listeners; no background timer is added.
            const stop = () => { window.removeEventListener('native-resume', connect); window.removeEventListener('online', connect); };
            stopConnection = stop;
        }
        const stopPolling = startForegroundPolling(refresh, {
            interval: 60_000, onInactive: () => refreshController.current?.abort(),
        });

        const onServiceWorkerMessage = (event: MessageEvent<unknown>) => {
            const data = event.data as { type?: unknown } | null;
            if (data?.type === 'admin-message') void refresh().catch(() => undefined);
        };
        navigator.serviceWorker?.addEventListener('message', onServiceWorkerMessage);
        const onNativeMessage = () => { void refresh().catch(() => {}); };
        window.addEventListener('admin-message', onNativeMessage);

        return () => {
            navigator.serviceWorker?.removeEventListener('message', onServiceWorkerMessage);
            window.removeEventListener('admin-message', onNativeMessage);
            stopPolling();
            refreshController.current?.abort();
            refreshController.current = null;
            stopConnection();
        };
    }, [enabled, owner, locale, refresh]);

    const acknowledge = useCallback(async (messageId: string): Promise<void> => {
        const isCurrent = captureWorkspaceLease();
        if (!enabled || !owner) throw new Error('Session indisponible.');
        refreshController.current?.abort();
        const result = await requestSyncJson<MessagesResponse>('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Workspace-Owner': owner },
            credentials: 'same-origin',
            body: JSON.stringify({ action: 'acknowledge', messageId }),
        }, 15_000);
        if (isCurrent()) {
            setMessages(current => current.filter(message => message.id !== messageId));
            if (typeof result.unreadCount === 'number' && typeof result.badgeUpdatedAt === 'number') {
                void syncInboxBadge(owner, result.unreadCount, result.badgeUpdatedAt, locale);
            } else void refresh().catch(() => {}); // Compatible with the previous server during rollout.
        }
    }, [enabled, owner, locale, refresh]);

    return { messages, acknowledge };
};
