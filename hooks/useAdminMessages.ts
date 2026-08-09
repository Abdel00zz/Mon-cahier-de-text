import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminMessage } from '../types';

interface MessagesResponse {
    messages?: AdminMessage[];
}

const loadPendingMessages = async (): Promise<AdminMessage[]> => {
    const response = await fetch('/api/messages', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) throw new Error('Chargement des messages de la direction impossible.');
    const data = await response.json() as MessagesResponse;
    return Array.isArray(data.messages) ? data.messages : [];
};

/**
 * Boîte de réception minimale des messages direction : lecture au démarrage,
 * à l'arrivée d'un push et au retour de l'onglet. Aucun polling permanent :
 * un écran enseignant inactif ne génère donc aucune requête supplémentaire.
 */
export const useAdminMessages = (enabled: boolean) => {
    const [messages, setMessages] = useState<AdminMessage[]>([]);
    const refreshInFlightRef = useRef(false);

    const refresh = useCallback(async () => {
        if (!enabled || refreshInFlightRef.current) return;
        refreshInFlightRef.current = true;
        try {
            const next = await loadPendingMessages();
            setMessages(next);
        } finally {
            refreshInFlightRef.current = false;
        }
    }, [enabled]);

    useEffect(() => {
        if (!enabled) {
            setMessages([]);
            return;
        }
        void refresh().catch(() => undefined);

        const onServiceWorkerMessage = (event: MessageEvent<unknown>) => {
            const data = event.data as { type?: unknown } | null;
            if (data?.type === 'admin-message') void refresh().catch(() => undefined);
        };
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') void refresh().catch(() => undefined);
        };
        navigator.serviceWorker?.addEventListener('message', onServiceWorkerMessage);
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            navigator.serviceWorker?.removeEventListener('message', onServiceWorkerMessage);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, [enabled, refresh]);

    const acknowledge = useCallback(async (messageId: string): Promise<void> => {
        const response = await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ action: 'acknowledge', messageId }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(typeof data?.error === 'string' ? data.error : 'Accusé de réception impossible.');
        }
        setMessages(current => current.filter(message => message.id !== messageId));
    }, []);

    return { messages, acknowledge };
};
