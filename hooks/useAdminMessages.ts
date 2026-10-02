import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminMessage } from '../types';
import { captureWorkspaceLease } from '../utils/accountWorkspace';
import { requestSyncJson } from '../utils/syncTransport';
import { startForegroundPolling } from '../utils/mobileScheduling';

interface MessagesResponse {
    messages?: AdminMessage[];
}

const loadPendingMessages = async (owner: string, signal: AbortSignal): Promise<AdminMessage[]> => {
    const data = await requestSyncJson<MessagesResponse>('/api/messages', {
        credentials: 'same-origin', headers: { 'X-Workspace-Owner': owner }, signal,
    }, 15_000);
    return Array.isArray(data.messages) ? data.messages : [];
};

/**
 * Boîte de réception minimale des messages direction : lecture au démarrage,
 * à l'arrivée d'un push et au retour de l'onglet. Au premier plan seulement,
 * une vérification par minute couvre les appareils sans permission Push.
 */
export const useAdminMessages = (enabled: boolean, owner?: string) => {
    const [messages, setMessages] = useState<AdminMessage[]>([]);
    const refreshController = useRef<AbortController | null>(null);

    const refresh = useCallback(async () => {
        if (!enabled || !owner || refreshController.current || document.visibilityState !== 'visible' || !navigator.onLine) return;
        const controller = new AbortController();
        refreshController.current = controller;
        const isCurrent = captureWorkspaceLease();
        try {
            const next = await loadPendingMessages(owner, controller.signal);
            if (isCurrent() && !controller.signal.aborted) setMessages(next);
            return true;
        } finally {
            if (refreshController.current === controller) refreshController.current = null;
        }
    }, [enabled, owner]);

    useEffect(() => {
        setMessages([]);
        if (!enabled || !owner) return;
        const stopPolling = startForegroundPolling(refresh, {
            interval: 60_000, onInactive: () => refreshController.current?.abort(),
        });

        const onServiceWorkerMessage = (event: MessageEvent<unknown>) => {
            const data = event.data as { type?: unknown } | null;
            if (data?.type === 'admin-message') void refresh().catch(() => undefined);
        };
        navigator.serviceWorker?.addEventListener('message', onServiceWorkerMessage);

        return () => {
            navigator.serviceWorker?.removeEventListener('message', onServiceWorkerMessage);
            stopPolling();
            refreshController.current?.abort();
            refreshController.current = null;
        };
    }, [enabled, owner, refresh]);

    const acknowledge = useCallback(async (messageId: string): Promise<void> => {
        const isCurrent = captureWorkspaceLease();
        if (!enabled || !owner) throw new Error('Session indisponible.');
        await requestSyncJson('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Workspace-Owner': owner },
            credentials: 'same-origin',
            body: JSON.stringify({ action: 'acknowledge', messageId }),
        }, 15_000);
        if (isCurrent()) setMessages(current => current.filter(message => message.id !== messageId));
    }, [enabled, owner]);

    return { messages, acknowledge };
};
