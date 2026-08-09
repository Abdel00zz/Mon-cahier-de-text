import { ApiRequest, ApiResponse, HttpError, getQueryParam, parseBody, sendError } from './_lib/http.js';
import { randomUUID } from 'node:crypto';
import { MAX_ADMIN_MESSAGES_PER_TEACHER, normalizeAdminMessages, recentAdminMessages } from './_lib/adminMessages.js';
import { getRedis, KEYS } from './_lib/redis.js';
import { PushEntry, configureVapid, sendToEntry } from './_lib/webpush.js';
import {
    ADMIN_COOKIE,
    ADMIN_MAX_AGE,
    clearCookie,
    requireAdmin,
    safeEqualStrings,
    setCookie,
    signSession,
} from './_lib/auth.js';
import type { AdminMessage, AppConfig, ClassInfo, ClassSchedule, ClassSnapshot, Cycle, TimetableEntry, TeacherSnapshot } from '../types.js';
import { getBundledCalendar, type HolidayCalendar } from '../utils/calendar.js';
import {
    getOfficialStudentEventsFile,
    validateOfficialStudentEventsFile,
    type OfficialStudentEventsFile,
} from '../utils/officialStudentEvents.js';

interface AdminBody {
    action?: string;
    code?: string;
    phone?: string;
    blocked?: boolean;
    title?: string;
    message?: string;
    calendar?: HolidayCalendar;
    officialEvents?: OfficialStudentEventsFile;
    classId?: string;
    assessmentId?: string;
    date?: string;
    classInfo?: Partial<ClassInfo>;
}

interface ClassesBlob {
    classes: ClassInfo[];
    schedules: ClassSchedule[];
    timetable?: TimetableEntry[];
    classMeta: Record<string, { updatedAt: string }>;
    /** Champs de classe imposés par la direction, conservés face à un appareil périmé. */
    adminClassOverrides?: Record<string, ClassInfo>;
    /** Suppressions durables, appliquées au prochain pull de l'enseignant. */
    deletedClasses?: Record<string, { deletedAt: string }>;
    updatedAt: string;
    settings?: Partial<AppConfig>;
    settingsUpdatedAt?: string;
}

interface StoredUser {
    phone: string;
    nom: string;
    prenom: string;
    createdAt: string;
    lastSyncAt?: string;
    blocked?: boolean;
}

const VALID_CYCLES = new Set<Cycle>(['college', 'lycee', 'prepa']);

const requiredText = (value: unknown, label: string, maxLength = 120): string => {
    if (typeof value !== 'string') throw new HttpError(400, `${label} manquant.`);
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > maxLength) throw new HttpError(400, `${label} invalide.`);
    return trimmed;
};

const cleanClassSettings = (settings: Partial<AppConfig> | undefined, classId: string): Partial<AppConfig> => {
    const next = { ...(settings ?? {}) };
    next.schedules = next.schedules?.filter(entry => entry.classId !== classId);
    next.timetable = next.timetable?.filter(entry => entry.classId !== classId);
    for (const key of ['assessmentDates', 'assessmentAbsences', 'pedagogicalEvents'] as const) {
        if (!next[key]) continue;
        const records = { ...next[key] };
        delete records[classId];
        next[key] = records as never;
    }
    return next;
};

const updateSnapshotClass = (
    snapshot: TeacherSnapshot | null,
    classInfo: ClassInfo,
    now: string,
): TeacherSnapshot | null => {
    if (!snapshot) return null;
    const existing = snapshot.classes.find(item => item.id === classInfo.id);
    const nextClass: ClassSnapshot = existing
        ? { ...existing, name: classInfo.name, subject: classInfo.subject, cycle: classInfo.cycle, updatedAt: now }
        : {
            id: classInfo.id,
            name: classInfo.name,
            subject: classInfo.subject,
            cycle: classInfo.cycle,
            totalItems: 0,
            plannedCount: 0,
            completionRate: 0,
            sessionsCount: 0,
            lastDate: null,
            weekdays: [],
            sessionsPerWeek: 0,
            updatedAt: now,
        };
    return {
        ...snapshot,
        classes: existing
            ? snapshot.classes.map(item => item.id === classInfo.id ? nextClass : item)
            : [...snapshot.classes, nextClass],
    };
};

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
    const redis = await getRedis();
    const snapshots = (await redis.hgetall<Record<string, TeacherSnapshot>>(KEYS.adminSnapshots)) ?? {};
    const teachers = Object.values(snapshots).sort((a, b) => {
        const aTime = a.lastSyncAt ?? '';
        const bTime = b.lastSyncAt ?? '';
        return bTime.localeCompare(aTime);
    });
    res.status(200).json({ teachers });
};

const validISO = (value: unknown): value is string =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

const validateCalendar = (value: unknown): HolidayCalendar => {
    if (!value || typeof value !== 'object') throw new HttpError(400, 'Calendrier invalide.');
    const calendar = value as HolidayCalendar;
    if (!calendar.anneeScolaire || !validISO(calendar.anneeScolaire.debut) || !validISO(calendar.anneeScolaire.fin)) {
        throw new HttpError(400, 'Année scolaire invalide.');
    }
    if (!Array.isArray(calendar.joursFeries) || calendar.joursFeries.some(item => !validISO(item.date) || !item.nom)) {
        throw new HttpError(400, 'Liste des jours fériés invalide.');
    }
    if (!Array.isArray(calendar.vacances) || calendar.vacances.some(item => !validISO(item.debut) || !validISO(item.fin) || item.fin < item.debut || !item.nom)) {
        throw new HttpError(400, 'Liste des vacances invalide.');
    }
    return {
        ...calendar,
        version: Math.max(1, Number(calendar.version) || 1),
        pays: calendar.pays || 'MA',
        fuseau: calendar.fuseau || 'Africa/Casablanca',
        joursFeries: [...calendar.joursFeries].sort((a, b) => a.date.localeCompare(b.date)),
        vacances: [...calendar.vacances].sort((a, b) => a.debut.localeCompare(b.debut)),
    };
};

const handleGetCalendar = async (res: ApiResponse) => {
    const redis = await getRedis();
    const calendar = (await redis.get<HolidayCalendar>(KEYS.adminCalendar)) ?? getBundledCalendar();
    res.status(200).json({ calendar });
};

const handleSaveCalendar = async (body: AdminBody, res: ApiResponse) => {
    const calendar = validateCalendar(body.calendar);
    const redis = await getRedis();
    const saved = { ...calendar, version: calendar.version + 1 };
    await redis.set(KEYS.adminCalendar, saved);
    res.status(200).json({ ok: true, calendar: saved });
};

const handleGetOfficialEvents = async (res: ApiResponse) => {
    const redis = await getRedis();
    const officialEvents = (await redis.get<OfficialStudentEventsFile>(KEYS.adminOfficialEvents))
        ?? getOfficialStudentEventsFile();
    res.status(200).json({ officialEvents });
};

const handleSaveOfficialEvents = async (body: AdminBody, res: ApiResponse) => {
    let validated: OfficialStudentEventsFile;
    try {
        validated = validateOfficialStudentEventsFile(body.officialEvents);
    } catch (error) {
        throw new HttpError(400, error instanceof Error ? error.message : 'Bulletin officiel JSON invalide.');
    }
    const redis = await getRedis();
    const saved = { ...validated, version: validated.version + 1 };
    await redis.set(KEYS.adminOfficialEvents, saved);
    res.status(200).json({ ok: true, officialEvents: saved });
};

const handleTeacherDetail = async (req: ApiRequest, res: ApiResponse) => {
    const phone = getQueryParam(req, 'phone');
    if (!phone) throw new HttpError(400, 'Paramètre phone manquant.');

    const redis = await getRedis();
    const pipeline = redis.pipeline();
    pipeline.get(KEYS.user(phone));
    pipeline.get(KEYS.classes(phone));
    pipeline.hget(KEYS.adminSnapshots, phone);
    pipeline.get(KEYS.adminMessages(phone));
    const [user, classesBlob, snapshot, messages] = (await pipeline.exec()) as [
        StoredUser | null,
        ClassesBlob | null,
        TeacherSnapshot | null,
        AdminMessage[] | null,
    ];

    if (!user && !snapshot) throw new HttpError(404, 'Enseignant introuvable.');

    res.status(200).json({
        user: user
            ? {
                phone: user.phone,
                nom: user.nom,
                prenom: user.prenom,
                createdAt: user.createdAt,
                lastSyncAt: user.lastSyncAt ?? null,
                blocked: user.blocked === true,
            }
            : null,
        classes: classesBlob?.classes ?? [],
        schedules: classesBlob?.schedules ?? [],
        classMeta: classesBlob?.classMeta ?? {},
        snapshot: snapshot ?? null,
        assessmentDates: classesBlob?.settings?.assessmentDates ?? {},
        adminMessages: recentAdminMessages(messages),
    });
};

/** Rafraîchissement léger des accusés, sans recharger classes ni cahiers. */
const handleTeacherMessages = async (req: ApiRequest, res: ApiResponse) => {
    const phone = getQueryParam(req, 'phone');
    if (!phone) throw new HttpError(400, 'Paramètre phone manquant.');
    const redis = await getRedis();
    const pipeline = redis.pipeline();
    pipeline.get(KEYS.user(phone));
    pipeline.get(KEYS.adminMessages(phone));
    const [user, messages] = (await pipeline.exec()) as [StoredUser | null, AdminMessage[] | null];
    if (!user) throw new HttpError(404, 'Enseignant introuvable.');
    res.status(200).json({ adminMessages: recentAdminMessages(messages) });
};

const handleSaveAssessmentDate = async (body: AdminBody, res: ApiResponse) => {
    const phone = requirePhone(body);
    if (!body.classId || !body.assessmentId) throw new HttpError(400, 'Classe et devoir requis.');
    if (body.date && !validISO(body.date)) throw new HttpError(400, 'Date de devoir invalide.');
    const redis = await getRedis();
    const blob = await redis.get<ClassesBlob>(KEYS.classes(phone));
    if (!blob) throw new HttpError(404, 'Données de l\'enseignant introuvables.');
    const assessmentDates = { ...(blob.settings?.assessmentDates ?? {}) };
    const forClass = { ...(assessmentDates[body.classId] ?? {}) };
    if (body.date) forClass[body.assessmentId] = body.date;
    else delete forClass[body.assessmentId];
    assessmentDates[body.classId] = forClass;
    const now = new Date().toISOString();
    await redis.set(KEYS.classes(phone), {
        ...blob,
        settings: { ...(blob.settings ?? {}), assessmentDates },
        settingsUpdatedAt: now,
        updatedAt: now,
    });
    res.status(200).json({ ok: true, assessmentDates });
};

/** Création ou édition d'une classe affectée à l'enseignant sélectionné. */
const handleUpsertTeacherClass = async (body: AdminBody, res: ApiResponse) => {
    const phone = requirePhone(body);
    const input = body.classInfo;
    if (!input || typeof input !== 'object') throw new HttpError(400, 'Informations de classe manquantes.');

    const redis = await getRedis();
    const pipeline = redis.pipeline();
    pipeline.get(KEYS.user(phone));
    pipeline.get(KEYS.classes(phone));
    pipeline.hget(KEYS.adminSnapshots, phone);
    const [user, storedBlob, storedSnapshot] = (await pipeline.exec()) as [
        StoredUser | null,
        ClassesBlob | null,
        TeacherSnapshot | null,
    ];
    if (!user) throw new HttpError(404, 'Enseignant introuvable.');

    const existingClasses = storedBlob?.classes ?? [];
    const requestedId = typeof input.id === 'string' && input.id.trim() ? input.id.trim() : undefined;
    const existing = requestedId ? existingClasses.find(item => item.id === requestedId) : undefined;
    if (requestedId && !existing) throw new HttpError(404, 'Classe introuvable.');

    const now = new Date().toISOString();
    const classInfo: ClassInfo = {
        id: requestedId ?? randomUUID(),
        name: requiredText(input.name, 'Nom de classe'),
        subject: requiredText(input.subject, 'Matière'),
        cycle: VALID_CYCLES.has(input.cycle as Cycle) ? input.cycle as Cycle : (existing?.cycle ?? 'college'),
        teacherName: `${user.prenom} ${user.nom}`.trim(),
        createdAt: existing?.createdAt ?? now,
        color: '',
    };
    const classes = existing
        ? existingClasses.map(item => item.id === classInfo.id ? classInfo : item)
        : [...existingClasses, classInfo];
    const adminClassOverrides = { ...(storedBlob?.adminClassOverrides ?? {}), [classInfo.id]: classInfo };
    const classMeta = { ...(storedBlob?.classMeta ?? {}), [classInfo.id]: { updatedAt: now } };
    const deletedClasses = { ...(storedBlob?.deletedClasses ?? {}) };
    delete deletedClasses[classInfo.id];

    const write = redis.pipeline();
    write.set(KEYS.classes(phone), {
        classes,
        schedules: storedBlob?.schedules ?? [],
        timetable: storedBlob?.timetable ?? [],
        settings: storedBlob?.settings ?? {},
        settingsUpdatedAt: storedBlob?.settingsUpdatedAt ?? '',
        classMeta,
        adminClassOverrides,
        deletedClasses,
        updatedAt: now,
    } satisfies ClassesBlob);
    if (!existing) {
        write.set(KEYS.lessons(phone, classInfo.id), { lessonsData: [], updatedAt: now });
    }
    const nextSnapshot = updateSnapshotClass(storedSnapshot, classInfo, now);
    if (nextSnapshot) write.hset(KEYS.adminSnapshots, { [phone]: nextSnapshot });
    await write.exec();

    res.status(200).json({ ok: true, classInfo, created: !existing });
};

/** Suppression d'une classe depuis la direction, avec tombstone pour les appareils hors ligne. */
const handleDeleteTeacherClass = async (body: AdminBody, res: ApiResponse) => {
    const phone = requirePhone(body);
    const classId = requiredText(body.classId, 'Classe');
    const redis = await getRedis();
    const pipeline = redis.pipeline();
    pipeline.get(KEYS.user(phone));
    pipeline.get(KEYS.classes(phone));
    pipeline.hget(KEYS.adminSnapshots, phone);
    const [user, storedBlob, storedSnapshot] = (await pipeline.exec()) as [
        StoredUser | null,
        ClassesBlob | null,
        TeacherSnapshot | null,
    ];
    if (!user) throw new HttpError(404, 'Enseignant introuvable.');
    if (!storedBlob?.classes.some(item => item.id === classId)) throw new HttpError(404, 'Classe introuvable.');

    const now = new Date().toISOString();
    const classes = storedBlob.classes.filter(item => item.id !== classId);
    const classMeta = { ...(storedBlob.classMeta ?? {}) };
    delete classMeta[classId];
    const adminClassOverrides = { ...(storedBlob.adminClassOverrides ?? {}) };
    delete adminClassOverrides[classId];
    const deletedClasses = { ...(storedBlob.deletedClasses ?? {}), [classId]: { deletedAt: now } };
    const nextSnapshot = storedSnapshot
        ? { ...storedSnapshot, classes: storedSnapshot.classes.filter(item => item.id !== classId) }
        : null;

    const write = redis.pipeline();
    write.set(KEYS.classes(phone), {
        ...storedBlob,
        classes,
        schedules: (storedBlob.schedules ?? []).filter(entry => entry.classId !== classId),
        timetable: (storedBlob.timetable ?? []).filter(entry => entry.classId !== classId),
        settings: cleanClassSettings(storedBlob.settings, classId),
        settingsUpdatedAt: now,
        classMeta,
        adminClassOverrides,
        deletedClasses,
        updatedAt: now,
    } satisfies ClassesBlob);
    write.del(KEYS.lessons(phone, classId));
    if (nextSnapshot) write.hset(KEYS.adminSnapshots, { [phone]: nextSnapshot });
    await write.exec();

    res.status(200).json({ ok: true, classId });
};

/**
 * Cahier complet d'une classe (lecture seule) : permet à l'admin d'inspecter
 * les chapitres, la dernière séance saisie et son contenu exact.
 */
const handleClassLessons = async (req: ApiRequest, res: ApiResponse) => {
    const phone = getQueryParam(req, 'phone');
    const classId = getQueryParam(req, 'classId');
    if (!phone || !classId) throw new HttpError(400, 'Paramètres phone et classId requis.');
    const redis = await getRedis();
    const blob = await redis.get<{ lessonsData: unknown; updatedAt: string }>(KEYS.lessons(phone, classId));
    if (!blob) throw new HttpError(404, 'Aucun cahier synchronisé pour cette classe.');
    res.status(200).json(blob);
};

/* ── Actions de gestion (bloquer / supprimer / notifier un enseignant) ────── */

const requirePhone = (body: AdminBody): string => {
    if (typeof body.phone !== 'string' || !body.phone) throw new HttpError(400, 'Téléphone manquant.');
    return body.phone;
};

/** Bloque ou débloque un compte : le login est refusé tant que blocked=true. */
const handleBlockTeacher = async (body: AdminBody, res: ApiResponse) => {
    const phone = requirePhone(body);
    const redis = await getRedis();
    const user = await redis.get<StoredUser & { passwordHash?: string }>(KEYS.user(phone));
    if (!user) throw new HttpError(404, 'Enseignant introuvable.');
    const blocked = body.blocked !== false;
    await redis.set(KEYS.user(phone), { ...user, blocked });
    res.status(200).json({ ok: true, blocked });
};

/** Suppression définitive : compte + classes + tous les cahiers + snapshot + push. */
const handleDeleteTeacher = async (body: AdminBody, res: ApiResponse) => {
    const phone = requirePhone(body);
    const redis = await getRedis();
    const classesBlob = await redis.get<ClassesBlob>(KEYS.classes(phone));

    const pipeline = redis.pipeline();
    pipeline.del(KEYS.user(phone));
    pipeline.del(KEYS.classes(phone));
    for (const cls of classesBlob?.classes ?? []) {
        pipeline.del(KEYS.lessons(phone, cls.id));
    }
    pipeline.hdel(KEYS.adminSnapshots, phone);
    pipeline.hdel(KEYS.pushSubs, phone);
    pipeline.del(KEYS.adminMessages(phone));
    await pipeline.exec();
    res.status(200).json({ ok: true, deletedClasses: classesBlob?.classes.length ?? 0 });
};

/** Notification push directe de l'admin vers le téléphone d'un enseignant. */
const handleNotifyTeacher = async (body: AdminBody, res: ApiResponse) => {
    const phone = requirePhone(body);
    const content = typeof body.message === 'string' ? body.message.trim().slice(0, 1_200) : '';
    if (!content) throw new HttpError(400, 'Message manquant.');
    const title = typeof body.title === 'string' && body.title.trim()
        ? body.title.trim().slice(0, 80)
        : 'Message de la direction';

    const redis = await getRedis();
    const [user, storedMessages, entry] = await Promise.all([
        redis.get<StoredUser>(KEYS.user(phone)),
        redis.get<AdminMessage[]>(KEYS.adminMessages(phone)),
        redis.hget<PushEntry>(KEYS.pushSubs, phone),
    ]);
    if (!user) throw new HttpError(404, 'Enseignant introuvable.');

    const message: AdminMessage = {
        id: `admin-${randomUUID()}`,
        title,
        body: content,
        createdAt: new Date().toISOString(),
    };
    const messages = [message, ...normalizeAdminMessages(storedMessages)]
        .slice(0, MAX_ADMIN_MESSAGES_PER_TEACHER);
    await redis.set(KEYS.adminMessages(phone), messages);

    // Le message reste disponible dans l'application même sans abonnement push.
    if (!entry || entry.subs.length === 0 || !configureVapid()) {
        return res.status(200).json({ ok: true, sent: 0, message });
    }

    const { survivingSubs, sent } = await sendToEntry(entry, {
        title: 'Direction administrative',
        body: title,
        url: '/',
        kind: 'admin',
        tag: `cdt-admin-${message.id}`,
        timestamp: Date.now(),
        messageId: message.id,
    });
    await redis.hset(KEYS.pushSubs, { [phone]: { ...entry, subs: survivingSubs } });
    res.status(200).json({ ok: true, sent, message });
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
            if (body.action === 'saveCalendar') return await handleSaveCalendar(body, res);
            if (body.action === 'saveOfficialEvents') return await handleSaveOfficialEvents(body, res);
            if (body.action === 'saveAssessmentDate') return await handleSaveAssessmentDate(body, res);
            if (body.action === 'upsertTeacherClass') return await handleUpsertTeacherClass(body, res);
            if (body.action === 'deleteTeacherClass') return await handleDeleteTeacherClass(body, res);
            throw new HttpError(400, 'Action inconnue.');
        }

        if (req.method === 'GET') {
            await requireAdmin(req);
            const action = getQueryParam(req, 'action');
            if (action === 'overview') return await handleOverview(res);
            if (action === 'teacher') return await handleTeacherDetail(req, res);
            if (action === 'messages') return await handleTeacherMessages(req, res);
            if (action === 'calendar') return await handleGetCalendar(res);
            if (action === 'officialEvents') return await handleGetOfficialEvents(res);
            if (action === 'lessons') return await handleClassLessons(req, res);
            throw new HttpError(400, 'Action inconnue.');
        }

        throw new HttpError(405, 'Méthode non autorisée.');
    } catch (error) {
        sendError(res, error);
    }
}
