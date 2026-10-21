import { pendingAdminMessages } from '../../src/domain/messages/conversation.js';
import type { AdminMessage } from '../../src/types.js';
import { KEYS, isFirestoreStore, type RedisClient } from './redis.js';
import { HttpError } from './http.js';

const MAX_ADMIN_MESSAGES_PER_TEACHER = 60;
const ADMIN_MESSAGES_DETAIL_LIMIT = MAX_ADMIN_MESSAGES_PER_TEACHER;

const isAdminMessage = (value: unknown): value is AdminMessage => {
    if (!value || typeof value !== 'object') return false;
    const message = value as Partial<AdminMessage>;
    return (
        typeof message.id === 'string' &&
        typeof message.title === 'string' &&
        typeof message.body === 'string' &&
        typeof message.createdAt === 'string' && Number.isFinite(Date.parse(message.createdAt)) &&
        (message.classId === undefined || typeof message.classId === 'string') &&
        (message.requestKind === undefined || message.requestKind === 'help' || message.requestKind === 'custom-content') &&
        (message.sender === undefined || message.sender === 'admin' || message.sender === 'teacher') &&
        (message.replyTo === undefined || typeof message.replyTo === 'string') &&
        (message.answeredAt === undefined || typeof message.answeredAt === 'string') &&
        (message.className === undefined || typeof message.className === 'string') &&
        (message.acknowledgedAt === undefined || typeof message.acknowledgedAt === 'string')
    );
};

/** Frontière Redis : seules les entrées sûres et triées atteignent l'UI. */
export const normalizeAdminMessages = (value: unknown): AdminMessage[] =>
    (Array.isArray(value) ? value : [])
        .filter(isAdminMessage)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const recentAdminMessages = (value: unknown): AdminMessage[] =>
    normalizeAdminMessages(value).slice(0, ADMIN_MESSAGES_DETAIL_LIMIT);

/** Bound storage without silently deleting unanswered requests or unread replies. */
export function appendConversationMessage(messages: AdminMessage[], message: AdminMessage): AdminMessage[] {
    const next = [message, ...messages];
    while (next.length > MAX_ADMIN_MESSAGES_PER_TEACHER) {
        let removable = -1;
        for (let index = next.length - 1; index > 0; index--) {
            const item = next[index];
            if (item.sender === 'teacher' ? item.answeredAt : item.acknowledgedAt) { removable = index; break; }
        }
        if (removable < 0) throw new HttpError(429, 'La conversation est pleine. Traitez les messages en attente avant de réessayer.');
        next.splice(removable, 1);
    }
    return next;
}

/** Read count + order in one Redis operation. HTTP/FCM completion order and
 * clocks on different Vercel instances must not restore an already-read badge. */
export async function readInboxSnapshot(redis: RedisClient, phone: string) {
    const snapshot = isFirestoreStore(redis) ? await redis.atomic(async view => {
        if (!await view.get(KEYS.user(phone))) return null;
        const messages = await view.get(KEYS.adminMessages(phone)) ?? [];
        const previous = Number(await view.get(KEYS.inboxClock(phone)) ?? 0);
        const timestamp = Math.max(Date.now(), previous + 1);
        await view.set(KEYS.inboxClock(phone), timestamp);
        return [messages, timestamp] as [unknown, number];
    }) : await redis.eval<unknown[], [unknown, number] | null>(`
if redis.call('EXISTS', KEYS[3]) == 0 then return nil end
local messages = redis.call('GET', KEYS[1]) or '[]'
local clock = redis.call('TIME')
local previous = tonumber(redis.call('GET', KEYS[2]) or '0')
local timestamp = math.max(tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000), previous + 1)
redis.call('SET', KEYS[2], tostring(timestamp))
return {messages, timestamp}`, [KEYS.adminMessages(phone), KEYS.inboxClock(phone), KEYS.user(phone)], []);
    if (!snapshot) throw new HttpError(404, 'Compte supprimé.');
    const raw = typeof snapshot[0] === 'string' ? JSON.parse(snapshot[0]) : snapshot[0];
    const messages = normalizeAdminMessages(raw);
    return { messages, unreadCount: pendingAdminMessages(messages).length, badgeUpdatedAt: snapshot[1] };
}
