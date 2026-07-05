import { ApiRequest, ApiResponse, HttpError, getQueryParam, parseBody, sendError } from './_lib/http';
import { getRedis, KEYS } from './_lib/redis';
import { PushEntry, configureVapid, sendToEntry } from './_lib/webpush';
import {
    ADMIN_COOKIE,
    ADMIN_MAX_AGE,
    clearCookie,
    requireAdmin,
    safeEqualStrings,
    setCookie,
    signSession,
} from './_lib/auth';
import type { ClassInfo, ClassSchedule, TeacherSnapshot } from '../types';

interface AdminBody {
    action?: string;
    code?: string;
    phone?: string;
    blocked?: boolean;
    title?: string;
    message?: string;
}

interface ClassesBlob {
    classes: ClassInfo[];
    schedules: ClassSchedule[];
    classMeta: Record<string, { updatedAt: string }>;
    updatedAt: string;
}

interface StoredUser {
    phone: string;
    nom: string;
    prenom: string;
    createdAt: string;
    lastSyncAt?: string;
    blocked?: boolean;
}

const handleAdminLogin = async (body: AdminBody, res: ApiResponse) => {
    const expected = process.env.ADMIN_SECRET;
    if (!expected || expected.length < 6) {
        throw new HttpError(500, "ADMIN_SECRET non configuré sur le serveur.");
    }
    if (typeof body.code !== 'string' || !safeEqualStrings(body.code, expected)) {
        throw new HttpError(401, "Code d'accès incorrect.");
    }
    const token = await signSession({ role: 'admin' }, ADMIN_MAX_AGE);
    setCookie(res, ADMIN_COOKIE, token, ADMIN_MAX_AGE);
    res.status(200).json({ ok: true });
};

const handleOverview = async (res: ApiResponse) => {
    const redis = getRedis();
    const snapshots = (await redis.hgetall<Record<string, TeacherSnapshot>>(KEYS.adminSnapshots)) ?? {};
    const teachers = Object.values(snapshots).sort((a, b) => {
        const aTime = a.lastSyncAt ?? '';
        const bTime = b.lastSyncAt ?? '';
        return bTime.localeCompare(aTime);
    });
    res.status(200).json({ teachers });
};

const handleTeacherDetail = async (req: ApiRequest, res: ApiResponse) => {
    const phone = getQueryParam(req, 'phone');
    if (!phone) throw new HttpError(400, 'Paramètre phone manquant.');

    const redis = getRedis();
    const pipeline = redis.pipeline();
    pipeline.get(KEYS.user(phone));
    pipeline.get(KEYS.classes(phone));
    pipeline.hget(KEYS.adminSnapshots, phone);
    const [user, classesBlob, snapshot] = (await pipeline.exec()) as [
        StoredUser | null,
        ClassesBlob | null,
        TeacherSnapshot | null,
    ];

    if (!user && !snapshot) throw new HttpError(404, 'Enseignant introuvable.');

    res.status(200).json({
        user: user
            ? { phone: user.phone, nom: user.nom, prenom: user.prenom, createdAt: user.createdAt, lastSyncAt: user.lastSyncAt ?? null }
            : null,
        classes: classesBlob?.classes ?? [],
        schedules: classesBlob?.schedules ?? [],
        classMeta: classesBlob?.classMeta ?? {},
        snapshot: snapshot ?? null,
    });
};

/* ── Actions de gestion (bloquer / supprimer / notifier un enseignant) ────── */

const requirePhone = (body: AdminBody): string => {
    if (typeof body.phone !== 'string' || !body.phone) throw new HttpError(400, 'Téléphone manquant.');
    return body.phone;
};

/** Bloque ou débloque un compte : le login est refusé tant que blocked=true. */
const handleBlockTeacher = async (body: AdminBody, res: ApiResponse) => {
    const phone = requirePhone(body);
    const redis = getRedis();
    const user = await redis.get<StoredUser & { passwordHash?: string }>(KEYS.user(phone));
    if (!user) throw new HttpError(404, 'Enseignant introuvable.');
    const blocked = body.blocked !== false;
    await redis.set(KEYS.user(phone), { ...user, blocked });
    res.status(200).json({ ok: true, blocked });
};

/** Suppression définitive : compte + classes + tous les cahiers + snapshot + push. */
const handleDeleteTeacher = async (body: AdminBody, res: ApiResponse) => {
    const phone = requirePhone(body);
    const redis = getRedis();
    const classesBlob = await redis.get<ClassesBlob>(KEYS.classes(phone));

    const pipeline = redis.pipeline();
    pipeline.del(KEYS.user(phone));
    pipeline.del(KEYS.classes(phone));
    for (const cls of classesBlob?.classes ?? []) {
        pipeline.del(KEYS.lessons(phone, cls.id));
    }
    pipeline.hdel(KEYS.adminSnapshots, phone);
    pipeline.hdel(KEYS.pushSubs, phone);
    await pipeline.exec();
    res.status(200).json({ ok: true, deletedClasses: classesBlob?.classes.length ?? 0 });
};

/** Notification push directe de l'admin vers le téléphone d'un enseignant. */
const handleNotifyTeacher = async (body: AdminBody, res: ApiResponse) => {
    const phone = requirePhone(body);
    const message = typeof body.message === 'string' ? body.message.trim().slice(0, 300) : '';
    if (!message) throw new HttpError(400, 'Message manquant.');
    if (!configureVapid()) throw new HttpError(500, 'Clés VAPID non configurées sur le serveur.');

    const redis = getRedis();
    const entry = await redis.hget<PushEntry>(KEYS.pushSubs, phone);
    if (!entry || entry.subs.length === 0) {
        throw new HttpError(400, "Cet enseignant n'a activé les notifications sur aucun appareil.");
    }
    const { survivingSubs, sent } = await sendToEntry(entry, {
        title: (body.title || 'Message de l’administration').slice(0, 80),
        body: message,
        url: '/',
    });
    await redis.hset(KEYS.pushSubs, { [phone]: { ...entry, subs: survivingSubs } });
    res.status(200).json({ ok: sent > 0, sent });
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
    res.setHeader('Cache-Control', 'no-store');
    try {
        if (req.method === 'POST') {
            const body = parseBody<AdminBody>(req.body);
            if (body.action === 'login') return await handleAdminLogin(body, res);
            if (body.action === 'logout') {
                clearCookie(res, ADMIN_COOKIE);
                return res.status(200).json({ ok: true });
            }
            // actions de gestion : session admin requise
            await requireAdmin(req);
            if (body.action === 'blockTeacher') return await handleBlockTeacher(body, res);
            if (body.action === 'deleteTeacher') return await handleDeleteTeacher(body, res);
            if (body.action === 'notifyTeacher') return await handleNotifyTeacher(body, res);
            throw new HttpError(400, 'Action inconnue.');
        }

        if (req.method === 'GET') {
            await requireAdmin(req);
            const action = getQueryParam(req, 'action');
            if (action === 'overview') return await handleOverview(res);
            if (action === 'teacher') return await handleTeacherDetail(req, res);
            throw new HttpError(400, 'Action inconnue.');
        }

        throw new HttpError(405, 'Méthode non autorisée.');
    } catch (error) {
        sendError(res, error);
    }
}
