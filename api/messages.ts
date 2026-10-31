import { createHash } from 'node:crypto';
import { clamp, delay } from 'es-toolkit';
import { conversationSignature, pendingAdminMessages, pendingTeacherRequests } from '../src/domain/messages/conversation.js';
import { recordWhatsAppContact, sendTeacherRequest } from './_lib/teacherMessages.js';
import { ApiRequest, ApiResponse, HttpError, getQueryParam, parseBody, sendError } from './_lib/http.js';
import { beginAccountWrite } from './_lib/atomicWrite.js';
import { normalizeAdminMessages, readInboxSnapshot } from './_lib/adminMessages.js';
import { requireUser } from './_lib/auth.js';
import { getRedis, isFirestoreStore, KEYS } from './_lib/redis.js';
import type { AdminMessage, TeacherSnapshot } from '../src/types.js';
import { assertWorkspaceOwner } from './_lib/workspaceOwner.js';
import { waitUntil } from '@vercel/functions';
import { sendNativeToOwner } from './_lib/nativePush.js';
import { fcmConfigured } from './_lib/fcm.js';

interface MessageBody {
    action?: string;
    messageId?: unknown;
}

const isMessageId = (value: unknown): value is string =>
    typeof value === 'string' && /^admin-[a-zA-Z0-9-]{8,100}$/.test(value);

const LONG_POLL_LIMIT_MS = 8_000;
const LONG_POLL_INTERVAL_MS = 1_500;
const MAX_SIGNATURE_LENGTH = 200;

const sleep = (ms: number) => delay(ms);

/**
 * Signature stable de la boîte : elle change quand un message arrive ou quand un
 * accusé est enregistré, et ne dépend d'aucune horloge. Le snapshot, lui, avance
 * son horloge à chaque lecture : il ne peut donc pas servir de signal.
 */
const inboxSignature = (messages: AdminMessage[]): string =>
    createHash('sha256').update(conversationSignature(messages)).digest('hex');

/**
 * Attente active : la requête est retenue jusqu'à ce que la signature change,
 * sinon elle répond à l'échéance et le client relance. La sonde est en lecture
 * seule (elle ne touche pas l'horloge de boîte).
 */
const handleList = async (res: ApiResponse, phone: string, wait: number, since: string) => {
    const redis = await getRedis();
    // Firestore bills each read: keep Redis long polling, use foreground refresh + FCM on Firestore.
    const longPolling = !isFirestoreStore(redis);
    if (longPolling && wait > 0 && since) {
        const deadline = Date.now() + wait;
        for (;;) {
            const current = inboxSignature(normalizeAdminMessages(await redis.get<AdminMessage[]>(KEYS.adminMessages(phone))));
            if (current !== since) break;
            const remaining = deadline - Date.now();
            if (remaining <= 0) break;
            await sleep(Math.min(LONG_POLL_INTERVAL_MS, remaining));
        }
    }
    const { messages, unreadCount, badgeUpdatedAt } = await readInboxSnapshot(redis, phone);
    // L'enseignant ne reçoit que les messages qui nécessitent encore son accusé.
    const pending = pendingAdminMessages(messages);
    res.status(200).json({ messages: pending, history: messages, unreadCount, badgeUpdatedAt,
        ...(longPolling ? { signature: inboxSignature(messages) } : {}) });
};

const handleAcknowledge = async (body: MessageBody, res: ApiResponse, phone: string) => {
    if (!isMessageId(body.messageId)) throw new HttpError(400, 'Identifiant de message invalide.');
    const redis = await getRedis();
    // Le message est publié par la direction sur la même clé : un simple
    // read-modify-write écrasait un message arrivé entre la lecture et
    // l'écriture. La révision de compte sérialise les deux écrivains.
    const write = await beginAccountWrite(redis, phone);
    const [rawMessages, storedSnapshot] = await Promise.all([
        redis.get<AdminMessage[]>(KEYS.adminMessages(phone)),
        redis.hget<TeacherSnapshot>(KEYS.adminSnapshots, phone),
    ]);
    const messages = normalizeAdminMessages(rawMessages);
    const index = messages.findIndex(message => message.id === body.messageId && message.sender !== 'teacher');
    if (index === -1) throw new HttpError(404, 'Message introuvable.');

    const message = messages[index];
    if (!message.acknowledgedAt) {
        messages[index] = { ...message, acknowledgedAt: new Date().toISOString() };
        write.set(KEYS.adminMessages(phone), messages);
        if (storedSnapshot) {
            write.hset(KEYS.adminSnapshots, {
                [phone]: {
                    ...storedSnapshot,
                    pendingMessages: pendingAdminMessages(messages).length,
                    pendingRequests: pendingTeacherRequests(messages).length,
                    lastMessageAt: messages[0]?.createdAt ?? null,
                },
            });
        }
        await write.exec();
    }
    const { unreadCount, badgeUpdatedAt } = await readInboxSnapshot(redis, phone);
    // Reading on desktop updates Android devices without delaying the acknowledgement.
    if (fcmConfigured()) waitUntil(sendNativeToOwner(phone, { kind: 'badge-sync', badgeCount: unreadCount, timestamp: badgeUpdatedAt }).catch(() => 0));
    res.status(200).json({ ok: true, message: messages[index], unreadCount, badgeUpdatedAt });
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
    res.setHeader('Cache-Control', 'no-store');
    try {
        const { phone } = await requireUser(req);
        if (req.headers['x-workspace-owner'] !== undefined) assertWorkspaceOwner(req.headers['x-workspace-owner'], phone);
        if (req.method === 'GET') {
            const wait = clamp(Number(getQueryParam(req, 'wait')) || 0, 0, LONG_POLL_LIMIT_MS);
            const since = (getQueryParam(req, 'since') ?? '').slice(0, MAX_SIGNATURE_LENGTH);
            return await handleList(res, phone, wait, since);
        }
        if (req.method === 'POST') {
            const body = parseBody<MessageBody>(req.body);
            if (body.action === 'whatsapp-contact') {
                const message = await recordWhatsAppContact(await getRedis(), phone, body);
                return res.status(200).json({ ok: true, message });
            }
            if (body.action === 'send') {
                const message = await sendTeacherRequest(await getRedis(), phone, body);
                return res.status(200).json({ ok: true, message });
            }
            if (body.action === 'acknowledge') return await handleAcknowledge(body, res, phone);
            throw new HttpError(400, 'Action inconnue.');
        }
        throw new HttpError(405, 'Méthode non autorisée.');
    } catch (error) {
        sendError(res, error);
    }
}
