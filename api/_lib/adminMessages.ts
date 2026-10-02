import type { AdminMessage } from '../../src/types.js';
import { KEYS, type RedisClient } from './redis.js';
import { HttpError } from './http.js';

export const MAX_ADMIN_MESSAGES_PER_TEACHER = 60;
const ADMIN_MESSAGES_DETAIL_LIMIT = 20;

const isAdminMessage = (value: unknown): value is AdminMessage => {
    if (!value || typeof value !== 'object') return false;
    const message = value as Partial<AdminMessage>;
    return (
        typeof message.id === 'string' &&
        typeof message.title === 'string' &&
        typeof message.body === 'string' &&
        typeof message.createdAt === 'string' &&
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

/** Read count + order in one Redis operation. HTTP/FCM completion order and
 * clocks on different Vercel instances must not restore an already-read badge. */
export async function readInboxSnapshot(redis: RedisClient, phone: string) {
    const snapshot = await redis.eval<unknown[], [unknown, number] | null>(`
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
    return { messages, unreadCount: messages.filter(message => !message.acknowledgedAt).length, badgeUpdatedAt: snapshot[1] };
}
