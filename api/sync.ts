import { ApiRequest, ApiResponse, HttpError, getQueryParam, parseBody, sendError } from './_lib/http.js';
import { getRedis, KEYS } from './_lib/redis.js';
import { beginAccountWrite } from './_lib/atomicWrite.js';
import { assertBodySize, assertValidClasses, assertValidLessonsPayload, assertValidSyncSettings, assertValidTeacherSnapshot, assertValidTimetable } from './_lib/validate.js';
import { requireUser } from './_lib/auth.js';
import { assertWorkspaceOwner } from './_lib/workspaceOwner.js';
import type { ClassInfo, ClassSchedule, ContentDirection, LessonsData, TeacherSnapshot, TimetableClockAssignment, TimetableClockPolicy, TimetableEntry } from '../types.js';
import { withCurriculumSettings } from '../utils/classCurriculumSettings.js';
import { DEFAULT_TIMETABLE_CLOCK, resolveTimetableClock } from '../utils/timetable.js';

interface ClassesBlob {
    classes: ClassInfo[];
    schedules: ClassSchedule[];
    timetable: TimetableEntry[];
    /** réglages du professeur synchronisés (blob opaque, voir utils/syncSettings) */
    settings?: Record<string, unknown>;
    settingsUpdatedAt?: string;
    classMeta: Record<string, { updatedAt: string }>;
    /** Les champs imposés par la direction ne peuvent pas être écrasés par un appareil non synchronisé. */
    adminClassOverrides?: Record<string, ClassInfo>;
    adminLessonsUpdatedAt?: Record<string, string>;
    /** Tombstones durables : un client ancien ne peut pas recréer une classe supprimée. */
    deletedClasses?: Record<string, { deletedAt: string }>;
    updatedAt: string;
}

interface LessonsBlob {
    lessonsData: LessonsData;
    contentDirection?: ContentDirection;
    updatedAt: string;
}

interface SyncPushBody {
    classes?: ClassInfo[];
    schedules?: ClassSchedule[];
    timetable?: TimetableEntry[];
    settings?: Record<string, unknown>;
    settingsUpdatedAt?: string;
    deletedClassIds?: string[];
    deletedClasses?: Array<{ id?: unknown; deletedAt?: unknown }> | Record<string, { deletedAt?: unknown }>;
    lessons?: { classId: string; lessonsData: LessonsData; contentDirection?: ContentDirection; updatedAt: string }[];
    snapshot?: TeacherSnapshot;
}

const EMPTY_BLOB: ClassesBlob = { classes: [], schedules: [], timetable: [], settings: {}, settingsUpdatedAt: '', classMeta: {}, deletedClasses: {}, updatedAt: '' };

const isTimestamp = (value: unknown): value is string =>
    typeof value === 'string' && !Number.isNaN(Date.parse(value));

/** Accepte l'ancien tableau d'identifiants et le nouveau format horodaté. */
const readDeletedClasses = (body: SyncPushBody, now: string): Record<string, { deletedAt: string }> => {
    const deleted: Record<string, { deletedAt: string }> = {};
    const add = (id: unknown, deletedAt: unknown) => {
        if (typeof id !== 'string' || !id) return;
        deleted[id] = { deletedAt: isTimestamp(deletedAt) && deletedAt !== new Date(0).toISOString() ? deletedAt : now };
    };

    for (const id of body.deletedClassIds ?? []) add(id, now);
    if (Array.isArray(body.deletedClasses)) {
        for (const entry of body.deletedClasses) add(entry?.id, entry?.deletedAt);
    } else if (body.deletedClasses && typeof body.deletedClasses === 'object') {
        for (const [id, value] of Object.entries(body.deletedClasses)) add(id, value?.deletedAt);
    }
    return deleted;
};

const sanitizeSettings = (settings: Record<string, unknown>, deletedIds: Set<string>): Record<string, unknown> => {
    const cleaned = { ...settings };
    for (const key of ['schedules', 'timetable']) {
        if (Array.isArray(cleaned[key])) {
            cleaned[key] = cleaned[key].filter(entry =>
                !entry || typeof entry !== 'object' || !deletedIds.has((entry as { classId?: unknown }).classId as string)
            );
        }
    }
    for (const key of ['assessmentDates', 'assessmentAbsences', 'pedagogicalEvents', 'manualAssessments', 'removedAssessments', 'assessmentOrder']) {
        if (cleaned[key] && typeof cleaned[key] === 'object' && !Array.isArray(cleaned[key])) {
            const records = { ...(cleaned[key] as Record<string, unknown>) };
            for (const classId of deletedIds) delete records[classId];
            cleaned[key] = records;
        }
    }
    if (Array.isArray(cleaned.dashboardClassOrder)) {
        cleaned.dashboardClassOrder = cleaned.dashboardClassOrder.filter(id => typeof id === 'string' && !deletedIds.has(id));
    }
    return cleaned;
};

const handlePull = async (req: ApiRequest, res: ApiResponse, phone: string) => {
    const redis = await getRedis();
    const classId = getQueryParam(req, 'classId');
    const scope = getQueryParam(req, 'scope');

    if (classId) {
        const blob = await redis.get<LessonsBlob>(KEYS.lessons(phone, classId));
        if (!blob) {
            throw new HttpError(404, 'Aucune donnée cloud pour cette classe.');
        }
        return res.status(200).json(blob);
    }

    const [globalClock, assignment] = await Promise.all([
        redis.get<TimetableClockPolicy>(KEYS.adminTimetableClock),
        redis.get<TimetableClockAssignment>(KEYS.adminTimetableClockForUser(phone)),
    ]);
    const timetableClock = resolveTimetableClock(globalClock ?? DEFAULT_TIMETABLE_CLOCK, assignment);
    if (scope === 'timetableClock') {
        return res.status(200).json({ timetableClock });
    }

    const blob = (await redis.get<ClassesBlob>(KEYS.classes(phone))) ?? EMPTY_BLOB;
    res.status(200).json({ ...blob, timetableClock });
};

const handlePush = async (req: ApiRequest, res: ApiResponse, phone: string) => {
    assertBodySize(req.body);
    const body = parseBody<SyncPushBody>(req.body);

    const redis = await getRedis();
    const pipeline = await beginAccountWrite(redis, phone);
    const now = new Date().toISOString();
    const existing = (await redis.get<ClassesBlob>(KEYS.classes(phone))) ?? EMPTY_BLOB;
    const requestedClasses = assertValidClasses(body.classes);
    const incomingDeletedClasses = readDeletedClasses(body, now);
    const deletedClasses: Record<string, { deletedAt: string }> = {
        ...(existing.deletedClasses ?? {}),
    };
    for (const [id, tombstone] of Object.entries(incomingDeletedClasses)) {
        const known = deletedClasses[id];
        if (!known || tombstone.deletedAt >= known.deletedAt) deletedClasses[id] = tombstone;
    }
    const deletedClassIds = new Set(Object.keys(deletedClasses));
    const requestedById = new Map(requestedClasses.map(classInfo => [classInfo.id, classInfo]));
    const existingById = new Map((existing.classes ?? []).map(classInfo => [classInfo.id, classInfo]));
    const adminClassOverrides = { ...(existing.adminClassOverrides ?? {}) };
    // La liste locale peut être périmée lorsqu'un administrateur vient d'ajouter
    // ou d'éditer une classe. On conserve donc toutes les classes serveur non
    // supprimées, puis l'override administratif garde ses champs prioritaires.
    const classIds = new Set([...existingById.keys(), ...requestedById.keys()]);
    const classes = Array.from(classIds)
        .filter(classId => !deletedClassIds.has(classId))
        .map(classId => {
            const teacherClass = requestedById.get(classId) ?? existingById.get(classId);
            const adminClass = adminClassOverrides[classId];
            // The direction owns class identity, not the teacher's course start or links.
            return adminClass ? withCurriculumSettings(adminClass, teacherClass ?? adminClass) : teacherClass!;
        })
        .filter(Boolean);

    const classMeta: Record<string, { updatedAt: string }> = { ...existing.classMeta };
    const validClassIds = new Set(classes.map(c => c.id));
    const requestedClassIds = new Set(requestedClasses.map(c => c.id));
    const submittedSettings = assertValidSyncSettings(body.settings, requestedClassIds);
    const submittedSettingsAt = isTimestamp(body.settingsUpdatedAt) ? body.settingsUpdatedAt : now;
    const acceptSettings = !!submittedSettings && (!existing.settingsUpdatedAt || submittedSettingsAt >= existing.settingsUpdatedAt);
    const submittedTimetable = assertValidTimetable(body.timetable, requestedClassIds);
    const acceptLegacySchedule = !existing.settingsUpdatedAt && !submittedSettings;
    const timetable = ((acceptSettings || acceptLegacySchedule ? submittedTimetable : undefined) ?? existing.timetable ?? [])
        .filter(entry => !deletedClassIds.has(entry.classId));

    const lessons = assertValidLessonsPayload(body.lessons, requestedClassIds)
        .filter(entry => validClassIds.has(entry.classId));
    // Un appareil resté hors ligne peut pousser une ancienne copie après une
    // importation administrative. Le watermark ne protège que ces imports (une
    // simple édition du nom de classe ne doit pas bloquer un cours légitime).
    const adminLessonsUpdatedAt = { ...(existing.adminLessonsUpdatedAt ?? {}) };
    const acceptedLessons = lessons.filter(entry => {
        const watermark = adminLessonsUpdatedAt[entry.classId];
        return !watermark || entry.updatedAt > watermark;
    });
    for (const entry of acceptedLessons) {
        classMeta[entry.classId] = { updatedAt: entry.updatedAt || now };
        delete adminLessonsUpdatedAt[entry.classId];
    }

    for (const id of deletedClassIds) {
        delete classMeta[id];
        delete adminClassOverrides[id];
        delete adminLessonsUpdatedAt[id];
    }
    // purge des métadonnées orphelines (classe absente de la liste poussée)
    for (const id of Object.keys(classMeta)) {
        if (!validClassIds.has(id)) delete classMeta[id];
    }

    const nextBlob: ClassesBlob = {
        classes,
        schedules: ((acceptSettings || acceptLegacySchedule) && Array.isArray(body.schedules) ? body.schedules : existing.schedules)
            .filter(schedule => !deletedClassIds.has(schedule.classId)),
        timetable,
        settings: sanitizeSettings(
            acceptSettings ? submittedSettings! : (existing.settings ?? {}),
            deletedClassIds
        ),
        settingsUpdatedAt: acceptSettings
            ? submittedSettingsAt
            : (existing.settingsUpdatedAt ?? ''),
        classMeta,
        adminClassOverrides,
        adminLessonsUpdatedAt,
        deletedClasses,
        updatedAt: now,
    };

    pipeline.set(KEYS.classes(phone), nextBlob);
    for (const entry of acceptedLessons) {
        pipeline.set(KEYS.lessons(phone, entry.classId), {
            lessonsData: entry.lessonsData,
            ...(entry.contentDirection ? { contentDirection: entry.contentDirection } : {}),
            updatedAt: entry.updatedAt || now,
        } satisfies LessonsBlob);
    }
    for (const id of deletedClassIds) {
        pipeline.del(KEYS.lessons(phone, id));
    }
    if (body.snapshot && typeof body.snapshot === 'object') {
        // Le snapshot est une projection consultée par le cron : on valide la
        // totalité de sa structure avant de la stocker. Le téléphone et
        // l'horodatage restent imposés par la session serveur.
        const snapshot = assertValidTeacherSnapshot(body.snapshot, phone, {
            syncedAt: now,
            validClassIds: requestedClassIds,
        });
        const storedSnapshot = await redis.hget<TeacherSnapshot>(KEYS.adminSnapshots, phone);
        const previousById = new Map((storedSnapshot?.classes ?? []).map(item => [item.id, item]));
        const incomingById = new Map(snapshot.classes.map(item => [item.id, item]));
        snapshot.classes = classes.flatMap(classInfo => {
            const previous = previousById.get(classInfo.id);
            const entry = adminLessonsUpdatedAt[classInfo.id] && previous
                ? previous : incomingById.get(classInfo.id) ?? previous;
            return entry ? [{ ...entry, name: classInfo.name, subject: classInfo.subject, cycle: classInfo.cycle }] : [];
        });
        pipeline.hset(KEYS.adminSnapshots, { [phone]: snapshot });
    }
    await pipeline.exec();

    res.status(200).json({ ok: true, serverTime: now, classMeta, deletedClasses,
        acceptedClassIds: acceptedLessons.map(entry => entry.classId), settingsAccepted: acceptSettings });
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
    res.setHeader('Cache-Control', 'no-store');
    try {
        const { phone } = await requireUser(req);
        assertWorkspaceOwner(req.headers['x-workspace-owner'], phone);
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
