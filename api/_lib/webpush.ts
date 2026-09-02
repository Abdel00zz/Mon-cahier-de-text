import { createHash } from 'node:crypto';
import webpush from 'web-push';
import type { PushNotificationPayload } from '../../utils/notificationTypes.js';

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

/** Champ Redis stable pour l'index global endpoint → propriétaire. */
export const pushEndpointField = (endpoint: string): string =>
    createHash('sha256').update(endpoint, 'utf8').digest('hex');

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
    payload: PushNotificationPayload
): Promise<{ survivingSubs: PushEntry['subs']; sent: number }> => {
    const results = await Promise.all(
        entry.subs.map(async sub => {
            try {
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: sub.keys },
                    JSON.stringify(payload),
                    {
                        // Une alerte de retard perd son utilité après un jour;
                        // un test ne doit pas arriver plusieurs heures plus
                        // tard après une réinstallation ou un mode avion.
                        TTL: payload.kind === 'test' ? 3_600 : 86_400,
                        urgency: payload.kind === 'admin' ? 'high' : 'normal',
                    }
                );
                return { sub, keep: true, sent: true };
            } catch (error) {
                const statusCode = (error as { statusCode?: number }).statusCode;
                if (statusCode !== 404 && statusCode !== 410) {
                    // Erreur transitoire : on conserve l'abonnement pour le
                    // prochain passage, mais elle ne compte pas comme livré.
                    return { sub, keep: true, sent: false };
                }
                // 404/410 = abonnement révoqué côté fournisseur : purge.
                return { sub, keep: false, sent: false };
            }
        })
    );
    return {
        // Conserve l'ordre d'inscription, indépendant de l'ordre de résolution
        // des requêtes réseau concurrentes.
        survivingSubs: results.filter(result => result.keep).map(result => result.sub),
        sent: results.filter(result => result.sent).length,
    };
};
