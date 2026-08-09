import type { AdminMessage } from '../../types.js';

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
