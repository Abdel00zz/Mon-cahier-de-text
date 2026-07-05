import webpush from 'web-push';

/** Helper Web Push partagé entre le cron (notify) et les actions admin. */

export interface PushSubscriptionJSON {
    endpoint: string;
    keys: { p256dh: string; auth: string };
}

export interface PushEntry {
    subs: Array<PushSubscriptionJSON & { device?: string }>;
    lastNotifiedAt?: string;
    lastSeverity?: string;
}

export const configureVapid = (): boolean => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';
    if (!publicKey || !privateKey) return false;
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return true;
};

/**
 * Envoie une notification à tous les appareils d'un enseignant.
 * Purge automatiquement les abonnements morts (404/410).
 */
export const sendToEntry = async (
    entry: PushEntry,
    payload: { title: string; body: string; url: string }
): Promise<{ survivingSubs: PushEntry['subs']; sent: number }> => {
    const survivingSubs: PushEntry['subs'] = [];
    let sent = 0;
    await Promise.all(
        entry.subs.map(async sub => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: sub.keys },
                    JSON.stringify(payload)
                );
                survivingSubs.push(sub);
                sent += 1;
            } catch (error) {
                const statusCode = (error as { statusCode?: number }).statusCode;
                if (statusCode !== 404 && statusCode !== 410) {
                    survivingSubs.push(sub); // erreur transitoire : on conserve l'abonnement
                }
            }
        })
    );
    return { survivingSubs, sent };
};
