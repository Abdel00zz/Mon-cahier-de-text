import { ApiRequest, ApiResponse, HttpError, getQueryParam, parseBody, sendError } from './_lib/http';
import { getRedis, KEYS } from './_lib/redis';
import { assertBodySize, assertValidClasses, assertValidLessonsPayload, assertValidTimetable } from './_lib/validate';
import { requireUser } from './_lib/auth';
import type { ClassInfo, ClassSchedule, LessonsData, TeacherSnapshot, TimetableEntry } from '../types';

interface ClassesBlob {
    classes: ClassInfo[];
    schedules: ClassSchedule[];
    timetable: TimetableEntry[];
    /** réglages du professeur synchronisés (blob opaque, voir utils/syncSettings) */
    settings?: Record<string, unknown>;
    settingsUpdatedAt?: string;
    classMeta: Record<string, { updatedAt: string }>;
    updatedAt: string;
}

interface LessonsBlob {
    lessonsData: LessonsData;
    updatedAt: string;
}

interface SyncPushBody {
    classes?: ClassInfo[];
    schedules?: ClassSchedule[];
    timetable?: TimetableEntry[];
    settings?: Record<string, unknown>;
    settingsUpdatedAt?: string;
    deletedClassIds?: string[];
    lessons?: { classId: string; lessonsData: LessonsData; updatedAt: string }[];
    snapshot?: TeacherSnapshot;
}

const EMPTY_BLOB: ClassesBlob = { classes: [], schedules: [], timetable: [], settings: {}, settingsUpdatedAt: '', classMeta: {}, updatedAt: '' };

const handlePull = async (req: ApiRequest, res: ApiResponse, phone: string) => {
    const redis = await getRedis();
    const classId = getQueryParam(req, 'classId');

    if (classId) {
        const blob = await redis.get<LessonsBlob>(KEYS.lessons(phone, classId));
        if (!blob) {
            throw new HttpError(404, 'Aucune donnée cloud pour cette classe.');
        }
        return res.status(200).json(blob);
    }

    const blob = (await redis.get<ClassesBlob>(KEYS.classes(phone))) ?? EMPTY_BLOB;
    res.status(200).json(blob);
};

const handlePush = async (req: ApiRequest, res: ApiResponse, phone: string) => {
    assertBodySize(req.body);
    const body = parseBody<SyncPushBody>(req.body);

    const redis = await getRedis();
    const now = new Date().toISOString();
    const existing = (await redis.get<ClassesBlob>(KEYS.classes(phone))) ?? EMPTY_BLOB;
    const classes = assertValidClasses(body.classes);

    const classMeta: Record<string, { updatedAt: string }> = { ...existing.classMeta };
    const validClassIds = new Set(classes.map(c => c.id));
    const timetable = assertValidTimetable(body.timetable, validClassIds);

    const lessons = assertValidLessonsPayload(body.lessons, validClassIds);
    for (const entry of lessons) {
        classMeta[entry.classId] = { updatedAt: entry.updatedAt || now };
    }

    const deletedClassIds = (body.deletedClassIds ?? []).filter(id => typeof id === 'string' && id);
    for (const id of deletedClassIds) {
        delete classMeta[id];
    }
    // purge des métadonnées orphelines (classe absente de la liste poussée)
    for (const id of Object.keys(classMeta)) {
        if (!validClassIds.has(id)) delete classMeta[id];
    }

    const nextBlob: ClassesBlob = {
        classes,
        schedules: Array.isArray(body.schedules) ? body.schedules : existing.schedules,
        timetable: timetable ?? (existing.timetable ?? []),
        settings: body.settings && typeof body.settings === 'object' ? body.settings : (existing.settings ?? {}),
        settingsUpdatedAt: body.settings && typeof body.settings === 'object'
            ? (typeof body.settingsUpdatedAt === 'string' && body.settingsUpdatedAt ? body.settingsUpdatedAt : now)
            : (existing.settingsUpdatedAt ?? ''),
        classMeta,
        updatedAt: now,
    };

    const pipeline = redis.pipeline();
    pipeline.set(KEYS.classes(phone), nextBlob);
    for (const entry of lessons) {
        pipeline.set(KEYS.lessons(phone, entry.classId), {
            lessonsData: entry.lessonsData,
            updatedAt: entry.updatedAt || now,
        } satisfies LessonsBlob);
    }
    for (const id of deletedClassIds) {
        pipeline.del(KEYS.lessons(phone, id));
    }
    if (body.snapshot && typeof body.snapshot === 'object') {
        // le téléphone du snapshot est imposé côté serveur : impossible d'écrire celui d'un autre
        pipeline.hset(KEYS.adminSnapshots, { [phone]: { ...body.snapshot, phone, lastSyncAt: now } });
    }
    await pipeline.exec();

    res.status(200).json({ ok: true, serverTime: now, classMeta });
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
    res.setHeader('Cache-Control', 'no-store');
    try {
        const { phone } = await requireUser(req);
        if (req.method === 'GET') {
            return await handlePull(req, res, phone);
        }
        if (req.method === 'POST') {
            return await handlePush(req, res, phone);
        }
        throw new HttpError(405, 'Méthode non autorisée.');
    } catch (error) {
        sendError(res, error);
    }
}
