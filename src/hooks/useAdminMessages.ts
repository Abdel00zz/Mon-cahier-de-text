import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminMessage, AppLocale, TeacherRequestDraft } from '../types';
import { captureWorkspaceLease } from '../infrastructure/storage/accountWorkspace';
import { requestSyncJson } from '../infrastructure/sync/syncTransport';
import { isForegroundOnline, startForegroundPolling } from '../platform/mobileScheduling';
import { runInboxLongPoll } from '../infrastructure/messages/inboxLongPoll';
import { syncInboxBadge } from '../infrastructure/push/appBadge';
import { Capacitor } from '@capacitor/core';

interface MessagesResponse {
    messages?: AdminMessage[];
    history?: AdminMessage[];
    unreadCount?: number;
    badgeUpdatedAt?: number;
    signature?: string;
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
    const [history, setHistory] = useState<AdminMessage[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    const [loadedOwner, setLoadedOwner] = useState<string>();
    const lastSnapshot = useRef(0);
    const acknowledged = useRef(new Set<string>());
    const applyPage = useCallback((page: MessagesResponse) => {
        if (!Array.isArray(page.messages)) return;
        const time = page.badgeUpdatedAt ?? Date.now();
        if (time < lastSnapshot.current) return;
        lastSnapshot.current = time;
        setMessages(page.messages.filter(message => !acknowledged.current.has(message.id)));
        setHistory((page.history ?? page.messages).map(message => acknowledged.current.has(message.id) ? { ...message, acknowledgedAt: message.acknowledgedAt ?? new Date().toISOString() } : message));
        setLoadedOwner(owner);
        setLoaded(true);
        setFailed(false);
    }, [owner]);
    const refreshController = useRef<AbortController | null>(null);

    const refresh = useCallback(async () => {
        if (!enabled || !owner || refreshController.current || !isForegroundOnline()) return;
        const controller = new AbortController();
        refreshController.current = controller;
        const isCurrent = captureWorkspaceLease();
        try {
            const next = await loadPendingMessages(owner, controller.signal);
            if (isCurrent() && !controller.signal.aborted) {
                applyPage(next);
                void syncInboxBadge(owner, next.unreadCount ?? next.messages!.length, next.badgeUpdatedAt!, locale);
            }
            return true;
        } catch (error) {
            if (isCurrent() && !controller.signal.aborted) setFailed(true);
            throw error;
        } finally {
            if (refreshController.current === controller) refreshController.current = null;
        }
    }, [enabled, owner, locale, applyPage]);

    useEffect(() => {
        setMessages([]);
        setHistory([]);
        setLoaded(false);
        setFailed(false);
        setLoadedOwner(owner);
        lastSnapshot.current = 0;
        acknowledged.current.clear();
        const isCurrent = captureWorkspaceLease();
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

        // Temps réel : le serveur retient la requête et rend la main dès qu'un
        // message arrive ou qu'un accusé est enregistré. Le repli d'une minute
        // ci-dessus reste actif si cette boucle s'arrête.
        let realtimeActive = true;
        const realtimeController = new AbortController();
        const pageVisible = () => typeof document === 'undefined' || document.visibilityState === 'visible';
        void runInboxLongPoll<MessagesResponse>({
            wait: 8_000,
            isActive: () => realtimeActive && isForegroundOnline() && pageVisible(),
            load: ({ wait, since }) => requestSyncJson<MessagesResponse>(
                `/api/messages?wait=${wait}&since=${encodeURIComponent(since)}`,
                { credentials: 'same-origin', headers: { 'X-Workspace-Owner': owner }, signal: realtimeController.signal },
                wait + 12_000),
            onPage: page => {
                if (!Array.isArray(page.messages) || !isCurrent() || !realtimeActive) return;
                applyPage(page);
                void syncInboxBadge(owner, page.unreadCount ?? page.messages.length, page.badgeUpdatedAt ?? Date.now(), locale);
            },
        }).catch(() => {});

        const onNativeMessage = () => { void refresh().catch(() => {}); };
        window.addEventListener('admin-message', onNativeMessage);

        return () => {
            realtimeActive = false;
            realtimeController.abort();
            window.removeEventListener('admin-message', onNativeMessage);
            stopPolling();
            refreshController.current?.abort();
            refreshController.current = null;
            stopConnection();
        };
    }, [enabled, owner, locale, refresh, applyPage]);

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
            if (result.badgeUpdatedAt) lastSnapshot.current = Math.max(lastSnapshot.current, result.badgeUpdatedAt);
            acknowledged.current.add(messageId);
            setHistory(current => current.map(message => message.id === messageId ? { ...message, acknowledgedAt: new Date().toISOString() } : message));
            setMessages(current => current.filter(message => message.id !== messageId));
            if (typeof result.unreadCount === 'number' && typeof result.badgeUpdatedAt === 'number') {
                void syncInboxBadge(owner, result.unreadCount, result.badgeUpdatedAt, locale);
            } else void refresh().catch(() => {}); // Compatible with the previous server during rollout.
        }
    }, [enabled, owner, locale, refresh]);

    const sendRequest = useCallback(async (draft: TeacherRequestDraft, signal?: AbortSignal) => {
        if (!enabled || !owner) throw new Error('Session indisponible.');
        const isCurrent = captureWorkspaceLease();
        const result = await requestSyncJson<{ message: AdminMessage }>('/api/messages', {
            method: 'POST', credentials: 'same-origin', signal,
            headers: { 'Content-Type': 'application/json', 'X-Workspace-Owner': owner },
            body: JSON.stringify({ ...draft, action: 'send' }),
        }, 15_000);
        if (!isCurrent()) throw new Error('Session modifiée.');
        setHistory(current => [result.message, ...current.filter(item => item.id !== result.message.id)]);
        setLoadedOwner(owner);
        void refresh().catch(() => {});
        return result.message;
    }, [enabled, owner, refresh]);

    const recordWhatsAppContact = useCallback(async (requestId: string, classId?: string) => {
        if (!enabled || !owner) return;
        const isCurrent = captureWorkspaceLease();
        // Keep the small authenticated request alive while the browser opens WhatsApp.
        const result = await requestSyncJson<{ message: AdminMessage }>('/api/messages', {
            method: 'POST', credentials: 'same-origin', keepalive: true,
            headers: { 'Content-Type': 'application/json', 'X-Workspace-Owner': owner },
            body: JSON.stringify({ action: 'whatsapp-contact', requestId, classId }),
        }, 15_000);
        if (!isCurrent()) return;
        setHistory(current => [result.message, ...current.filter(item => item.id !== result.message.id)]);
        setLoadedOwner(owner);
    }, [enabled, owner]);

    return { messages: enabled && loadedOwner === owner ? messages : [], history: enabled && loadedOwner === owner ? history : [],
        loaded: loadedOwner === owner && loaded, failed, enabled: enabled && Boolean(owner), owner,
        acknowledge, sendRequest, recordWhatsAppContact, refresh };
};
