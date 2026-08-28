import express from "express";
import path from "path";

import { createServer as createViteServer } from "vite";
import { getBundledCalendar, validateHolidayCalendar } from './utils/calendar';
import {
    getOfficialStudentEventsFile,
    validateOfficialStudentEventsFile
} from './utils/officialStudentEvents';
import { prepareImportedLessons, summarizeImportedLessons } from './utils/importPipeline';
import crypto from 'crypto';

const DEV_PHONE = '0600000000';
const DEV_PASSWORD = '00000000';

interface DevWorkspace {
    classesBlob: Record<string, unknown> | null;
    lessonsByClass: Map<string, unknown>;
}

export function setupMockApi(app: express.Express) {
    const DEV_USER = {
        phone: DEV_PHONE,
        nom: 'Dev',
        prenom: 'Prof',
        hasCompletedWelcome: false,
    };
    let sessionUser: Record<string, unknown> | null = null;
    let classesBlob: Record<string, unknown> | null = null;
    let devCalendar: any = structuredClone(getBundledCalendar());
    let devOfficialEvents: any = structuredClone(getOfficialStudentEventsFile());
    const lessonsByClass = new Map<string, unknown>();
    let devSnapshot: Record<string, unknown> | null = null; // vue admin (poussée au sync)
    let devAdminMessages: Array<{ id: string; title: string; body: string; createdAt: string; acknowledgedAt?: string }> = [];
    let devTeacherBlocked = false;
    const workspacesByPhone = new Map<string, DevWorkspace>();

    const readBody = (req: import('http').IncomingMessage): Promise<string> =>
        new Promise(resolve => {
            let data = '';
            req.on('data', chunk => { data += chunk; });
            req.on('end', () => resolve(data));
        });
    const send = (res: import('http').ServerResponse, status: number, payload: unknown) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(payload));
    };
    const hasSession = (req: import('http').IncomingMessage) =>
        /cdt_dev_session=1/.test(req.headers.cookie ?? '');
    const currentSessionPhone = (): string => {
        const phone = sessionUser?.phone;
        return typeof phone === 'string' && phone ? phone : DEV_PHONE;
    };
    const workspaceForCurrentSession = (): { phone: string; workspace: DevWorkspace } => {
        const phone = currentSessionPhone();
        let workspace = workspacesByPhone.get(phone);
        if (!workspace) {
            workspace = { classesBlob: null, lessonsByClass: new Map<string, unknown>() };
            workspacesByPhone.set(phone, workspace);
        }
        return { phone, workspace };
    };
    // accepte 06000000, 0600000000, +212 6..., etc., tolérant sur la saisie dev
    const phoneMatches = (raw: unknown) => {
        const digits = String(raw ?? '').replace(/\D/g, '');
        return digits === '06000000' || digits === '0600000000' || digits === '2126000000' || digits === '212600000000';
    };


            app.use('/api/auth', async (req, res) => {
                if (req.method === 'GET') {
                    if (hasSession(req) && !devTeacherBlocked) return send(res, 200, { user: sessionUser ?? DEV_USER });
                    if (devTeacherBlocked) return send(res, 401, { error: 'Ce compte est bloqué par la direction.' });
                    return send(res, 401, { error: 'Non connecté.' });
                }
                if (req.method === 'POST') {
                    let body: Record<string, unknown> = {};
                    try { body = JSON.parse(await readBody(req)); } catch { /* corps vide */ }
                    if (body.action === 'login') {
                        if (devTeacherBlocked) return send(res, 401, { error: 'Ce compte est bloqué par la direction.' });
                        if (phoneMatches(body.phone) && body.password === DEV_PASSWORD) {
                            sessionUser = DEV_USER;
                            res.setHeader('Set-Cookie', 'cdt_dev_session=1; Path=/; SameSite=Lax');
                            return send(res, 200, { user: DEV_USER });
                        }
                        return send(res, 401, { error: 'Téléphone ou mot de passe incorrect. (dev : 06000000 / 00000000)' });
                    }
                    if (body.action === 'register') {
                        sessionUser = {
                            phone: String(body.phone ?? DEV_PHONE),
                            nom: String(body.nom ?? 'Dev'),
                            prenom: String(body.prenom ?? 'Prof'),
                            hasCompletedWelcome: false,
                        };
                        res.setHeader('Set-Cookie', 'cdt_dev_session=1; Path=/; SameSite=Lax');
                        return send(res, 200, { user: sessionUser });
                    }
                    if (body.action === 'completeWelcome') {
                        if (!hasSession(req) || devTeacherBlocked) return send(res, 401, { error: devTeacherBlocked ? 'Ce compte est bloqué par la direction.' : 'Non connecté.' });
                        sessionUser = { ...(sessionUser ?? DEV_USER), hasCompletedWelcome: true };
                        return send(res, 200, { user: sessionUser });
                    }
                    if (body.action === 'logout') {
                        sessionUser = null;
                        res.setHeader('Set-Cookie', 'cdt_dev_session=; Path=/; Max-Age=0');
                        return send(res, 200, { ok: true });
                    }
                    return send(res, 400, { error: 'Action inconnue.' });
                }
                send(res, 405, { error: 'Méthode non autorisée.' });
            });

            app.use('/api/sync', async (req, res) => {
                if (!hasSession(req) || devTeacherBlocked) return send(res, 401, { error: devTeacherBlocked ? 'Ce compte est bloqué par la direction.' : 'Non connecté.' });
                const { phone, workspace } = workspaceForCurrentSession();
                if (req.method === 'GET') {
                    const url = new URL(req.url ?? '/', 'http://localhost');
                    const classId = url.searchParams.get('classId');
                    if (classId) {
                        const blob = workspace.lessonsByClass.get(classId);
                        return blob
                            ? send(res, 200, blob)
                            : send(res, 404, { error: 'Aucune donnée cloud pour cette classe.' });
                    }
                    return send(res, 200, workspace.classesBlob ?? {
                        classes: [], schedules: [], timetable: [], settings: {},
                        settingsUpdatedAt: '', classMeta: {}, deletedClasses: {}, updatedAt: '',
                    });
                }
                if (req.method === 'POST') {
                    let body: Record<string, any> = {};
                    try { body = JSON.parse(await readBody(req)); } catch { /* corps vide */ }
                    const now = new Date().toISOString();
                    const existingBlob = workspace.classesBlob;
                    const classMeta: Record<string, { updatedAt: string }> = { ...((existingBlob?.classMeta as any) ?? {}) };
                    const deletedClasses: Record<string, { deletedAt: string }> = {
                        ...((existingBlob?.deletedClasses as Record<string, { deletedAt: string }> | undefined) ?? {}),
                    };
                    for (const id of body.deletedClassIds ?? []) {
                        if (typeof id === 'string' && id) deletedClasses[id] = { deletedAt: now };
                    }
                    if (Array.isArray(body.deletedClasses)) {
                        for (const entry of body.deletedClasses) {
                            if (typeof entry?.id === 'string' && entry.id) {
                                deletedClasses[entry.id] = { deletedAt: typeof entry.deletedAt === 'string' ? entry.deletedAt : now };
                            }
                        }
                    } else if (body.deletedClasses && typeof body.deletedClasses === 'object') {
                        for (const [id, tombstone] of Object.entries(body.deletedClasses)) {
                            if (id) {
                                deletedClasses[id] = {
                                    deletedAt: typeof (tombstone as any)?.deletedAt === 'string' ? (tombstone as any).deletedAt : now,
                                };
                            }
                        }
                    }
                    const deletedIds = new Set(Object.keys(deletedClasses));
                    const requestedClasses = Array.isArray(body.classes) ? body.classes : ((existingBlob?.classes as any[]) ?? []);
                    const existingClasses = (existingBlob?.classes as Array<{ id?: string }> | undefined) ?? [];
                    const adminClassOverrides = { ...((existingBlob?.adminClassOverrides as Record<string, unknown>) ?? {}) };
                    const adminLessonsUpdatedAt = { ...((existingBlob?.adminLessonsUpdatedAt as Record<string, string>) ?? {}) };
                    const classesById = new Map<string, unknown>();
                    for (const classInfo of existingClasses) {
                        if (typeof classInfo?.id === 'string') classesById.set(classInfo.id, classInfo);
                    }
                    for (const classInfo of requestedClasses) {
                        if (typeof classInfo?.id === 'string') classesById.set(classInfo.id, classInfo);
                    }
                    const classes = Array.from(classesById.entries())
                        .filter(([classId]) => !deletedIds.has(classId))
                        .map(([classId, classInfo]) => adminClassOverrides[classId] ?? classInfo);
                    for (const entry of body.lessons ?? []) {
                        if (deletedIds.has(entry.classId)) continue;
                        const entryUpdatedAt = typeof entry.updatedAt === 'string' ? entry.updatedAt : now;
                        const watermark = adminLessonsUpdatedAt[entry.classId];
                        if (watermark && entryUpdatedAt <= watermark) continue;
                        const lessonBlob = {
                            lessonsData: entry.lessonsData,
                            ...(entry.contentDirection === 'rtl' || entry.contentDirection === 'ltr' ? { contentDirection: entry.contentDirection } : {}),
                            updatedAt: entryUpdatedAt,
                        };
                        workspace.lessonsByClass.set(entry.classId, lessonBlob);
                        lessonsByClass.set(entry.classId, lessonBlob);
                        classMeta[entry.classId] = { updatedAt: entryUpdatedAt };
                        delete adminLessonsUpdatedAt[entry.classId];
                    }
                    for (const id of deletedIds) {
                        workspace.lessonsByClass.delete(id);
                        lessonsByClass.delete(id);
                        delete classMeta[id];
                        delete adminClassOverrides[id];
                        delete adminLessonsUpdatedAt[id];
                    }
                    if (body.snapshot && typeof body.snapshot === 'object') {
                        devSnapshot = { ...body.snapshot, phone, lastSyncAt: now };
                    }
                    const nextBlob = {
                        classes,
                        schedules: (body.schedules ?? (existingBlob?.schedules as any) ?? []).filter((entry: any) => !deletedIds.has(entry?.classId)),
                        timetable: (body.timetable ?? (existingBlob?.timetable as any) ?? []).filter((entry: any) => !deletedIds.has(entry?.classId)),
                        settings: body.settings ?? (existingBlob?.settings as any) ?? {},
                        settingsUpdatedAt: body.settings ? (body.settingsUpdatedAt || now) : ((existingBlob?.settingsUpdatedAt as any) ?? ''),
                        classMeta,
                        adminClassOverrides,
                        adminLessonsUpdatedAt,
                        deletedClasses,
                        updatedAt: now,
                    };
                    workspace.classesBlob = nextBlob;
                    // L'administration locale reste une vue de la dernière
                    // synchronisation active, sans compromettre l'isolation
                    // des réponses /api/sync entre comptes de test.
                    classesBlob = nextBlob;
                    return send(res, 200, { ok: true, serverTime: now, classMeta, deletedClasses });
                }
                send(res, 405, { error: 'Méthode non autorisée.' });
            });

            // Interface d'administration (/admin.html), code d'accès dev : 00000000
            app.use('/api/calendar', async (req, res) => {
                if (req.method === 'GET') return send(res, 200, devCalendar);
                send(res, 405, { error: 'Methode non autorisee.' });
            });

            app.use('/api/official-events', async (req, res) => {
                if (req.method === 'GET') return send(res, 200, devOfficialEvents);
                send(res, 405, { error: 'Methode non autorisee.' });
            });

            app.use('/api/messages', async (req, res) => {
                if (!hasSession(req) || devTeacherBlocked) return send(res, 401, { error: devTeacherBlocked ? 'Ce compte est bloqué par la direction.' : 'Non connecté.' });
                if (req.method === 'GET') {
                    return send(res, 200, { messages: devAdminMessages.filter(message => !message.acknowledgedAt) });
                }
                if (req.method === 'POST') {
                    let body: Record<string, unknown> = {};
                    try { body = JSON.parse(await readBody(req)); } catch { /* corps vide */ }
                    if (body.action !== 'acknowledge' || typeof body.messageId !== 'string') {
                        return send(res, 400, { error: 'Action inconnue.' });
                    }
                    const index = devAdminMessages.findIndex(message => message.id === body.messageId);
                    if (index === -1) return send(res, 404, { error: 'Message introuvable.' });
                    devAdminMessages[index] = { ...devAdminMessages[index], acknowledgedAt: new Date().toISOString() };
                    return send(res, 200, { ok: true, message: devAdminMessages[index] });
                }
                send(res, 405, { error: 'Methode non autorisee.' });
            });

            app.use('/api/admin', async (req, res) => {
                const hasAdmin = /cdt_dev_admin=1/.test(req.headers.cookie ?? '');
                if (req.method === 'POST') {
                    let body: Record<string, unknown> = {};
                    try { body = JSON.parse(await readBody(req)); } catch { /* corps vide */ }
                    if (body.action === 'login') {
                        if (body.code === DEV_PASSWORD) {
                            res.setHeader('Set-Cookie', 'cdt_dev_admin=1; Path=/; SameSite=Lax');
                            return send(res, 200, { ok: true });
                        }
                        return send(res, 401, { error: "Code d'accès incorrect. (dev : 00000000)" });
                    }
                    if (body.action === 'logout') {
                        res.setHeader('Set-Cookie', 'cdt_dev_admin=; Path=/; Max-Age=0');
                        return send(res, 200, { ok: true });
                    }
                    if (!hasAdmin) return send(res, 401, { error: 'Session admin requise.' });
                    if (body.action === 'blockTeacher') {
                        devTeacherBlocked = body.blocked !== false;
                        return send(res, 200, { ok: true, blocked: devTeacherBlocked });
                    }
                    if (body.action === 'deleteTeacher') return send(res, 200, { ok: true, deletedClasses: lessonsByClass.size });
                    if (body.action === 'upsertTeacherClass') {
                        const input = body.classInfo as Record<string, unknown> | undefined;
                        const name = typeof input?.name === 'string' ? input.name.trim().slice(0, 120) : '';
                        const subject = typeof input?.subject === 'string' ? input.subject.trim().slice(0, 120) : '';
                        if (!name || !subject) return send(res, 400, { error: 'Nom de classe et matière requis.' });
                        const existingClasses = ((classesBlob?.classes as any[]) ?? []);
                        const requestedId = typeof input?.id === 'string' && input.id ? input.id : undefined;
                        const existing = requestedId ? existingClasses.find(item => item.id === requestedId) : undefined;
                        if (requestedId && !existing) return send(res, 404, { error: 'Classe introuvable.' });
                        const now = new Date().toISOString();
                        const classInfo = {
                            id: requestedId ?? crypto.randomUUID(),
                            name,
                            subject,
                            cycle: ['college', 'lycee', 'prepa'].includes(String(input?.cycle)) ? input?.cycle : (existing?.cycle ?? 'college'),
                            teacherName: `${DEV_USER.prenom} ${DEV_USER.nom}`,
                            createdAt: existing?.createdAt ?? now,
                            color: '',
                        };
                        const classes = existing
                            ? existingClasses.map(item => item.id === classInfo.id ? classInfo : item)
                            : [...existingClasses, classInfo];
                        const classMeta = { ...((classesBlob?.classMeta as Record<string, unknown>) ?? {}), [classInfo.id]: { updatedAt: now } };
                        const adminClassOverrides = { ...((classesBlob?.adminClassOverrides as Record<string, unknown>) ?? {}), [classInfo.id]: classInfo };
                        classesBlob = {
                            ...(classesBlob ?? {}),
                            classes,
                            schedules: (classesBlob?.schedules as any) ?? [],
                            timetable: (classesBlob?.timetable as any) ?? [],
                            settings: (classesBlob?.settings as any) ?? {},
                            classMeta,
                            adminClassOverrides,
                            updatedAt: now,
                        };
                        if (!existing) lessonsByClass.set(classInfo.id, { lessonsData: [], updatedAt: now });
                        if (devSnapshot) {
                            const snapshot = devSnapshot as any;
                            const prior = (snapshot.classes ?? []).find((item: any) => item.id === classInfo.id);
                            const classSnapshot = prior
                                ? { ...prior, name: classInfo.name, subject: classInfo.subject, cycle: classInfo.cycle, updatedAt: now }
                                : { id: classInfo.id, name: classInfo.name, subject: classInfo.subject, cycle: classInfo.cycle, totalItems: 0, plannedCount: 0, completionRate: 0, sessionsCount: 0, lastDate: null, weekdays: [], sessionsPerWeek: 0, updatedAt: now };
                            devSnapshot = { ...snapshot, classes: prior ? snapshot.classes.map((item: any) => item.id === classInfo.id ? classSnapshot : item) : [...(snapshot.classes ?? []), classSnapshot] };
                        }
                        return send(res, 200, { ok: true, classInfo, created: !existing });
                    }
                    if (body.action === 'deleteTeacherClass') {
                        const classId = typeof body.classId === 'string' ? body.classId : '';
                        const existingClasses = ((classesBlob?.classes as any[]) ?? []);
                        if (!classId || !existingClasses.some(item => item.id === classId)) return send(res, 404, { error: 'Classe introuvable.' });
                        const now = new Date().toISOString();
                        const classMeta = { ...((classesBlob?.classMeta as Record<string, unknown>) ?? {}) };
                        delete classMeta[classId];
                        const adminClassOverrides = { ...((classesBlob?.adminClassOverrides as Record<string, unknown>) ?? {}) };
                        delete adminClassOverrides[classId];
                        const deletedClasses = { ...((classesBlob?.deletedClasses as Record<string, unknown>) ?? {}), [classId]: { deletedAt: now } };
                        const settings = { ...((classesBlob?.settings as Record<string, any>) ?? {}) };
                        for (const key of ['assessmentDates', 'assessmentAbsences', 'pedagogicalEvents']) {
                            if (settings[key]) {
                                settings[key] = { ...settings[key] };
                                delete settings[key][classId];
                            }
                        }
                        classesBlob = {
                            ...(classesBlob ?? {}),
                            classes: existingClasses.filter(item => item.id !== classId),
                            schedules: ((classesBlob?.schedules as any[]) ?? []).filter(item => item.classId !== classId),
                            timetable: ((classesBlob?.timetable as any[]) ?? []).filter(item => item.classId !== classId),
                            settings,
                            classMeta,
                            adminClassOverrides,
                            deletedClasses,
                            updatedAt: now,
                        };
                        lessonsByClass.delete(classId);
                        if (devSnapshot) {
                            devSnapshot = { ...(devSnapshot as any), classes: ((devSnapshot as any).classes ?? []).filter((item: any) => item.id !== classId) };
                        }
                        return send(res, 200, { ok: true, classId });
                    }
                    if (body.action === 'importClassLessons') {
                        const classId = typeof body.classId === 'string' ? body.classId : '';
                        const mode = body.importMode === 'append' || body.importMode === 'replace' ? body.importMode : null;
                        const existingClasses = ((classesBlob?.classes as any[]) ?? []);
                        const classInfo = existingClasses.find(item => item.id === classId);
                        if (!classInfo) return send(res, 404, { error: 'Classe introuvable pour cet enseignant.' });
                        if (!mode) return send(res, 400, { error: 'Mode d’import invalide.' });

                        let prepared: ReturnType<typeof prepareImportedLessons>;
                        try {
                            prepared = prepareImportedLessons(body.lessonsPayload);
                        } catch (error) {
                            return send(res, 400, { error: error instanceof Error ? error.message : 'Structure JSON invalide.' });
                        }
                        if (prepared.lessonsData.length === 0) {
                            return send(res, 400, { error: 'Le JSON ne contient aucun bloc de cours exploitable.' });
                        }

                        const prior = lessonsByClass.get(classId) as { lessonsData?: unknown; contentDirection?: 'ltr' | 'rtl'; updatedAt?: string } | undefined;
                        if ((prior?.updatedAt ?? null) !== (body.expectedUpdatedAt ?? null)) {
                            return send(res, 409, { error: 'Ce cahier a changé depuis son ouverture. Rechargez-le avant de confirmer l’import.' });
                        }
                        const currentLessons = Array.isArray(prior?.lessonsData) ? prior.lessonsData : [];
                        const lessonsData = mode === 'append' ? [...currentLessons, ...prepared.lessonsData] : prepared.lessonsData;
                        const contentDirection = mode === 'append' && currentLessons.length > 0
                            ? prior?.contentDirection ?? prepared.direction.direction
                            : prepared.direction.direction;
                        const now = new Date().toISOString();
                        lessonsByClass.set(classId, { lessonsData, contentDirection, updatedAt: now });
                        classesBlob = {
                            ...(classesBlob ?? {}),
                            classMeta: {
                                ...((classesBlob?.classMeta as Record<string, unknown>) ?? {}),
                                [classId]: { updatedAt: now },
                            },
                            adminLessonsUpdatedAt: {
                                ...((classesBlob?.adminLessonsUpdatedAt as Record<string, string>) ?? {}),
                                [classId]: now,
                            },
                            updatedAt: now,
                        };
                        const targetWorkspace = workspacesByPhone.get(String(body.phone ?? DEV_PHONE));
                        if (targetWorkspace) {
                            targetWorkspace.classesBlob = classesBlob;
                            targetWorkspace.lessonsByClass.set(classId, { lessonsData, contentDirection, updatedAt: now });
                        }

                        const stats = summarizeImportedLessons(lessonsData);
                        if (devSnapshot) {
                            const snapshot = devSnapshot as any;
                            const previous = (snapshot.classes ?? []).find((item: any) => item.id === classId);
                            const nextClassSnapshot = {
                                ...(previous ?? {}),
                                id: classInfo.id,
                                name: classInfo.name,
                                subject: classInfo.subject,
                                cycle: classInfo.cycle,
                                totalItems: stats.totalItems,
                                plannedCount: stats.plannedCount,
                                completionRate: stats.completionRate,
                                sessionsCount: stats.sessionsCount,
                                lastDate: stats.lastDate,
                                weekdays: previous?.weekdays ?? [],
                                sessionsPerWeek: previous?.sessionsPerWeek ?? 0,
                                updatedAt: now,
                            };
                            devSnapshot = {
                                ...snapshot,
                                classes: previous
                                    ? snapshot.classes.map((item: any) => item.id === classId ? nextClassSnapshot : item)
                                    : [...(snapshot.classes ?? []), nextClassSnapshot],
                            };
                        }
                        return send(res, 200, {
                            ok: true,
                            classId,
                            mode,
                            importedTopLevel: prepared.report.topLevelCount,
                            importedItems: prepared.report.itemCount,
                            totalTopLevel: lessonsData.length,
                            contentDirection,
                            updatedAt: now,
                        });
                    }
                    if (body.action === 'notifyTeacher') {
                        const content = typeof body.message === 'string' ? body.message.trim().slice(0, 1_200) : '';
                        if (!content) return send(res, 400, { error: 'Message manquant.' });
                        const title = typeof body.title === 'string' && body.title.trim()
                            ? body.title.trim().slice(0, 80)
                            : 'Message de la direction';
                        const message = {
                            id: `admin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
                            title,
                            body: content,
                            createdAt: new Date().toISOString(),
                        };
                        devAdminMessages = [message, ...devAdminMessages].slice(0, 60);
                        return send(res, 200, { ok: true, sent: 0, message });
                    }
                    if (body.action === 'saveCalendar' && body.calendar && typeof body.calendar === 'object') {
                        try {
                            const validated = validateHolidayCalendar(body.calendar);
                            devCalendar = { ...validated, version: validated.version + 1 };
                            return send(res, 200, { ok: true, calendar: devCalendar });
                        } catch (error) {
                            return send(res, 400, { error: error instanceof Error ? error.message : 'Calendrier invalide.' });
                        }
                    }
                    if (body.action === 'saveOfficialEvents') {
                        try {
                            const validated = validateOfficialStudentEventsFile(body.officialEvents);
                            devOfficialEvents = { ...validated, version: validated.version + 1 };
                            return send(res, 200, { ok: true, officialEvents: devOfficialEvents });
                        } catch (error) {
                            return send(res, 400, { error: error instanceof Error ? error.message : 'Bulletin JSON invalide.' });
                        }
                    }
                    if (body.action === 'saveAssessmentDate') {
                        const classId = String(body.classId ?? '');
                        const assessmentId = String(body.assessmentId ?? '');
                        const settings = { ...((classesBlob?.settings as Record<string, any>) ?? {}) };
                        const assessmentDates = { ...(settings.assessmentDates ?? {}) };
                        assessmentDates[classId] = {
                            ...(assessmentDates[classId] ?? {}),
                            [assessmentId]: String(body.date ?? ''),
                        };
                        classesBlob = {
                            ...(classesBlob ?? {}),
                            settings: { ...settings, assessmentDates },
                            settingsUpdatedAt: new Date().toISOString(),
                        };
                        return send(res, 200, { ok: true, assessmentDates });
                    }
                    return send(res, 400, { error: 'Action inconnue.' });
                }
                if (req.method === 'GET') {
                    if (!hasAdmin) return send(res, 401, { error: 'Session admin requise.' });
                    const url = new URL(req.url ?? '/', 'http://localhost');
                    const action = url.searchParams.get('action');
                    if (action === 'overview') {
                        return send(res, 200, {
                            teachers: devSnapshot
                                ? [{
                                    ...devSnapshot,
                                    blocked: devTeacherBlocked,
                                    pendingMessages: devAdminMessages.filter(message => !message.acknowledgedAt).length,
                                    lastMessageAt: devAdminMessages[0]?.createdAt ?? null,
                                }]
                                : [],
                        });
                    }
                    if (action === 'calendar') return send(res, 200, { calendar: devCalendar });
                    if (action === 'officialEvents') return send(res, 200, { officialEvents: devOfficialEvents });
                    if (action === 'messages') return send(res, 200, { adminMessages: devAdminMessages.slice(0, 20) });
                    if (action === 'teacher') {
                        const settings = (classesBlob?.settings as Record<string, any> | undefined) ?? {};
                        return send(res, 200, {
                            user: { ...DEV_USER, createdAt: new Date().toISOString(), lastSyncAt: (devSnapshot as any)?.lastSyncAt ?? null, blocked: devTeacherBlocked },
                            classes: (classesBlob?.classes as any) ?? [],
                            schedules: (classesBlob?.schedules as any) ?? [],
                            classMeta: (classesBlob?.classMeta as any) ?? {},
                            snapshot: devSnapshot,
                            assessmentDates: settings.assessmentDates ?? {},
                            printSettings: {
                                establishmentName: settings.establishmentName ?? '',
                                defaultTeacherName: settings.defaultTeacherName ?? '',
                                academyRegion: settings.academyRegion,
                                educationProvince: settings.educationProvince,
                                schoolYearStart: settings.schoolYearStart,
                                printDescriptionMode: settings.printDescriptionMode,
                                printDescriptionTypes: settings.printDescriptionTypes,
                            },
                            adminMessages: devAdminMessages,
                        });
                    }
                    if (action === 'lessons') {
                        const blob = lessonsByClass.get(url.searchParams.get('classId') ?? '');
                        return blob
                            ? send(res, 200, blob)
                            : send(res, 404, { error: 'Aucun cahier synchronisé pour cette classe.' });
                    }
                    return send(res, 400, { error: 'Action inconnue.' });
                }
                send(res, 405, { error: 'Méthode non autorisée.' });
            });
}



async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  setupMockApi(app);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
