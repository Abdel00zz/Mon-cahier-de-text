import { createHash } from 'node:crypto';
import { pendingAdminMessages, pendingTeacherRequests } from '../../src/domain/messages/conversation.js';
import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { HttpError, getQueryParam } from '../_lib/http.js';
import { normalizeAdminMessages } from '../_lib/adminMessages.js';
import { getRedis, KEYS } from '../_lib/redis.js';
import { enforceAdminLoginLimit } from '../_lib/adminLoginLimit.js';
import { readAdminAudit } from '../_lib/adminAudit.js';
import { ADMIN_COOKIE, ADMIN_MAX_AGE, safeEqualStrings, setCookie, signSession } from '../_lib/auth.js';
import type { AdminMessage, TeacherSnapshot } from '../../src/types.js';
import type { AdminBody, ClassesBlob, StoredUser } from './shared.js';

/** Connexion, vue d'ensemble et journal de la console. */

export const handleAdminLogin = async (body: AdminBody, req: ApiRequest, res: ApiResponse) => {
    const expected = process.env.ADMIN_SECRET;
    if (!expected || expected.length < 6) {
        throw new HttpError(500, "ADMIN_SECRET non configuré sur le serveur.");
    }
    await enforceAdminLoginLimit(await getRedis(), req, res);
    if (typeof body.code !== 'string' || body.code.length > 1024 || !safeEqualStrings(body.code, expected)) {
        throw new HttpError(401, "Code d'accès incorrect.");
    }
    const token = await signSession({ role: 'admin' }, ADMIN_MAX_AGE);
    setCookie(res, ADMIN_COOKIE, token, ADMIN_MAX_AGE);
    res.status(200).json({ ok: true });
};

/** Empreinte du contenu renvoyé : le tableau de bord ne retélécharge ni ne redessine ce qui n'a pas changé. */
const overviewEtag = (teachers: unknown): string =>
    createHash('sha1').update(JSON.stringify(teachers)).digest('base64url').slice(0, 22);

const isDenormalizedSnapshot = (snapshot: TeacherSnapshot): boolean =>
    snapshot.contactPhone !== undefined
    && typeof snapshot.blocked === 'boolean'
    && typeof snapshot.pendingMessages === 'number'
    && typeof snapshot.pendingRequests === 'number'
    && (typeof snapshot.lastMessageAt === 'string' || snapshot.lastMessageAt === null)
    && snapshot.establishmentName !== undefined;

export const handleOverview = async (req: ApiRequest, res: ApiResponse) => {
    const redis = await getRedis();
    const since = getQueryParam(req, 'since');
    const snapshots = (await redis.hgetall<Record<string, TeacherSnapshot>>(KEYS.adminSnapshots)) ?? {};
    const entries = Object.entries(snapshots);
    if (entries.length === 0) {
        const etag = overviewEtag([]);
        return res.status(200).json(since === etag ? { unchanged: true, etag } : { teachers: [], etag });
    }

    const pipeline = redis.pipeline();
    const legacySlots = new Map<number, { userSlot: number; messagesSlot: number; schoolSlot?: number }>();
    let recordCount = 0;
    // Les nouveaux snapshots portent déjà contactPhone, email, blocked, compteurs de boîte et établissement :
    // 0 lecture supplémentaire par enseignant. Seuls les snapshots historiques passent par le pipeline groupé.
    entries.forEach(([phone, snapshot], index) => {
        if (isDenormalizedSnapshot(snapshot)) return;
        const userSlot = recordCount++;
        const messagesSlot = recordCount++;
        pipeline.get(KEYS.user(phone));
        pipeline.get(KEYS.adminMessages(phone));
        const schoolSlot = snapshot.establishmentName === undefined ? recordCount++ : undefined;
        if (schoolSlot !== undefined) pipeline.get(KEYS.classes(phone));
        legacySlots.set(index, { userSlot, messagesSlot, schoolSlot });
    });
    const records = recordCount > 0
        ? await pipeline.exec() as Array<StoredUser | AdminMessage[] | ClassesBlob | null>
        : [];
    const teachers = entries.flatMap(([, snapshot], index) => {
        const slots = legacySlots.get(index);
        if (!slots) {
            return [{
                ...snapshot,
                establishmentName: typeof snapshot.establishmentName === 'string' ? snapshot.establishmentName.trim().slice(0, 200) : '',
                contactPhone: snapshot.contactPhone!,
                email: snapshot.email,
                blocked: snapshot.blocked === true,
                pendingMessages: snapshot.pendingMessages ?? 0,
                pendingRequests: snapshot.pendingRequests ?? 0,
                lastMessageAt: snapshot.lastMessageAt ?? null,
            }];
        }
        const user = records[slots.userSlot] as StoredUser | null;
        if (!user) return [];
        const messages = normalizeAdminMessages(records[slots.messagesSlot]);
        const school = slots.schoolSlot === undefined ? snapshot.establishmentName
            : (records[slots.schoolSlot] as ClassesBlob | null)?.settings?.establishmentName;
        return [{
            ...snapshot,
            establishmentName: typeof school === 'string' ? school.trim().slice(0, 200) : '',
            contactPhone: user.phone,
            email: user.email,
            blocked: user?.blocked === true,
            pendingMessages: pendingAdminMessages(messages).length,
            pendingRequests: pendingTeacherRequests(messages).length,
            lastMessageAt: messages[0]?.createdAt ?? null,
        }];
    }).sort((a, b) => {
        const aTime = a.lastSyncAt ?? '';
        const bTime = b.lastSyncAt ?? '';
        return bTime.localeCompare(aTime);
    });
    const etag = overviewEtag(teachers);
    // Même contenu que celui déjà affiché : quelques octets au lieu de la liste entière.
    res.status(200).json(since === etag ? { unchanged: true, etag } : { teachers, etag });
};

/** Journal des écritures de la console (lecture seule). */
export const handleAudit = async (res: ApiResponse) => {
    res.status(200).json({ entries: await readAdminAudit(await getRedis(), 100) });
};
