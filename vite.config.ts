import path from 'path';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa';
import { BUNDLE_OPTIMIZATION } from './config/optimization';
import { getBundledCalendar, type HolidayCalendar } from './utils/calendar';
import {
    getOfficialStudentEventsFile,
    validateOfficialStudentEventsFile,
    type OfficialStudentEventsFile,
} from './utils/officialStudentEvents';

/*
 * MOCK D'API POUR LE DÉVELOPPEMENT LOCAL (jamais inclus au build : apply 'serve').
 * La version déployée utilise les fonctions Vercel (/api/auth, /api/sync + Redis) ;
 * en local, ce plugin les simule pour travailler EXACTEMENT comme en production :
 *   • connexion : téléphone 06000000 · mot de passe 00000000 ;
 *   • synchro : état en mémoire (réinitialisé au redémarrage du serveur dev).
 */
const DEV_PHONE = '0600000000';
const DEV_PASSWORD = '00000000';

const devApiMockPlugin = (): Plugin => {
    const DEV_USER = {
        phone: DEV_PHONE,
        nom: 'Dev',
        prenom: 'Prof',
        cycles: ['college', 'lycee'],
        subjects: ['Mathématiques'],
    };
    let sessionUser: Record<string, unknown> | null = null;
    let classesBlob: Record<string, unknown> | null = null;
    let devCalendar: HolidayCalendar = structuredClone(getBundledCalendar());
    let devOfficialEvents: OfficialStudentEventsFile = structuredClone(getOfficialStudentEventsFile());
    const lessonsByClass = new Map<string, unknown>();
    let devSnapshot: Record<string, unknown> | null = null; // vue admin (poussée au sync)
    let devAdminMessages: Array<{ id: string; title: string; body: string; createdAt: string; acknowledgedAt?: string }> = [];
    let devTeacherBlocked = false;

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
    // accepte 06000000, 0600000000, +212 6..., etc., tolérant sur la saisie dev
    const phoneMatches = (raw: unknown) => {
        const digits = String(raw ?? '').replace(/\D/g, '');
        return digits === '06000000' || digits === '0600000000' || digits === '2126000000' || digits === '212600000000';
    };

    return {
        name: 'dev-api-mock',
        apply: 'serve',
        configureServer(server) {
            server.middlewares.use('/api/auth', async (req, res) => {
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
                            cycles: Array.isArray(body.cycles) ? body.cycles : [],
                            subjects: Array.isArray(body.subjects) ? body.subjects : [],
                        };
                        res.setHeader('Set-Cookie', 'cdt_dev_session=1; Path=/; SameSite=Lax');
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

            server.middlewares.use('/api/sync', async (req, res) => {
                if (!hasSession(req) || devTeacherBlocked) return send(res, 401, { error: devTeacherBlocked ? 'Ce compte est bloqué par la direction.' : 'Non connecté.' });
                if (req.method === 'GET') {
                    const url = new URL(req.url ?? '/', 'http://localhost');
                    const classId = url.searchParams.get('classId');
                    if (classId) {
                        const blob = lessonsByClass.get(classId);
                        return blob
                            ? send(res, 200, blob)
                            : send(res, 404, { error: 'Aucune donnée cloud pour cette classe.' });
                    }
                    return send(res, 200, classesBlob ?? {
                        classes: [], schedules: [], timetable: [], settings: {},
                        settingsUpdatedAt: '', classMeta: {}, deletedClasses: {}, updatedAt: '',
                    });
                }
                if (req.method === 'POST') {
                    let body: Record<string, any> = {};
                    try { body = JSON.parse(await readBody(req)); } catch { /* corps vide */ }
                    const now = new Date().toISOString();
                    const classMeta: Record<string, { updatedAt: string }> = { ...((classesBlob?.classMeta as any) ?? {}) };
                    const deletedClasses: Record<string, { deletedAt: string }> = {
                        ...((classesBlob?.deletedClasses as Record<string, { deletedAt: string }> | undefined) ?? {}),
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
                    const requestedClasses = Array.isArray(body.classes) ? body.classes : ((classesBlob?.classes as any[]) ?? []);
                    const existingClasses = (classesBlob?.classes as Array<{ id?: string }> | undefined) ?? [];
                    const adminClassOverrides = { ...((classesBlob?.adminClassOverrides as Record<string, unknown>) ?? {}) };
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
                        lessonsByClass.set(entry.classId, { lessonsData: entry.lessonsData, updatedAt: entry.updatedAt || now });
                        classMeta[entry.classId] = { updatedAt: entry.updatedAt || now };
                    }
                    for (const id of deletedIds) {
                        lessonsByClass.delete(id);
                        delete classMeta[id];
                        delete adminClassOverrides[id];
                    }
                    if (body.snapshot && typeof body.snapshot === 'object') {
                        devSnapshot = { ...body.snapshot, phone: DEV_PHONE, lastSyncAt: now };
                    }
                    classesBlob = {
                        classes,
                        schedules: (body.schedules ?? (classesBlob?.schedules as any) ?? []).filter((entry: any) => !deletedIds.has(entry?.classId)),
                        timetable: (body.timetable ?? (classesBlob?.timetable as any) ?? []).filter((entry: any) => !deletedIds.has(entry?.classId)),
                        settings: body.settings ?? (classesBlob?.settings as any) ?? {},
                        settingsUpdatedAt: body.settings ? (body.settingsUpdatedAt || now) : ((classesBlob?.settingsUpdatedAt as any) ?? ''),
                        classMeta,
                        adminClassOverrides,
                        deletedClasses,
                        updatedAt: now,
                    };
                    return send(res, 200, { ok: true, serverTime: now, classMeta, deletedClasses });
                }
                send(res, 405, { error: 'Méthode non autorisée.' });
            });

            // Interface d'administration (/admin.html), code d'accès dev : 00000000
            server.middlewares.use('/api/calendar', async (req, res) => {
                if (req.method === 'GET') return send(res, 200, devCalendar);
                send(res, 405, { error: 'Methode non autorisee.' });
            });

            server.middlewares.use('/api/official-events', async (req, res) => {
                if (req.method === 'GET') return send(res, 200, devOfficialEvents);
                send(res, 405, { error: 'Methode non autorisee.' });
            });

            server.middlewares.use('/api/messages', async (req, res) => {
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

            server.middlewares.use('/api/admin', async (req, res) => {
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
                        devCalendar = {
                            ...(body.calendar as HolidayCalendar),
                            version: Number((body.calendar as HolidayCalendar).version || 0) + 1,
                        };
                        return send(res, 200, { ok: true, calendar: devCalendar });
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
                        return send(res, 200, { teachers: devSnapshot ? [devSnapshot] : [] });
                    }
                    if (action === 'calendar') return send(res, 200, { calendar: devCalendar });
                    if (action === 'officialEvents') return send(res, 200, { officialEvents: devOfficialEvents });
                    if (action === 'messages') return send(res, 200, { adminMessages: devAdminMessages.slice(0, 20) });
                    if (action === 'teacher') {
                        return send(res, 200, {
                            user: { ...DEV_USER, createdAt: new Date().toISOString(), lastSyncAt: (devSnapshot as any)?.lastSyncAt ?? null, blocked: devTeacherBlocked },
                            classes: (classesBlob?.classes as any) ?? [],
                            schedules: (classesBlob?.schedules as any) ?? [],
                            classMeta: (classesBlob?.classMeta as any) ?? {},
                            snapshot: devSnapshot,
                            assessmentDates: (classesBlob?.settings as any)?.assessmentDates ?? {},
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
        },
    };
};

const premiumPerformancePlugin = (): Plugin => ({
    name: 'premium-performance-budget',
    apply: 'build',
    generateBundle(_, bundle) {
        const budgetBytes = BUNDLE_OPTIMIZATION.CHUNK_WARN_LIMIT_KB * 1024;

        Object.entries(bundle).forEach(([fileName, asset]) => {
            if (asset.type !== 'chunk') return;
            const size = Buffer.byteLength(asset.code, 'utf8');
            if (size <= budgetBytes) return;

            this.warn(
                `[performance-budget] ${fileName} = ${(size / 1024).toFixed(1)} kB ` +
                `(budget ${BUNDLE_OPTIMIZATION.CHUNK_WARN_LIMIT_KB} kB). Consider lazy-loading this surface.`
            );
        });
    }
});

type ManifestLocalizedText = string | {
    value: string;
    lang?: string;
    dir?: 'ltr' | 'rtl';
};

type LocalizedShortcut = ManifestOptions['shortcuts'][number] & {
    name_localized: Record<string, ManifestLocalizedText>;
    short_name_localized: Record<string, ManifestLocalizedText>;
    description_localized: Record<string, ManifestLocalizedText>;
};

type LocalizedManifest = Partial<ManifestOptions> & {
    name_localized: Record<string, ManifestLocalizedText>;
    short_name_localized: Record<string, ManifestLocalizedText>;
    description_localized: Record<string, ManifestLocalizedText>;
    shortcuts: LocalizedShortcut[];
};

const shortcutIcon = [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }];

const PWA_MANIFEST: LocalizedManifest = {
    id: '/',
    name: 'Mon cahier de textes',
    name_localized: {
        fr: { value: 'Mon cahier de textes', lang: 'fr-MA', dir: 'ltr' },
        ar: { value: 'دفتر نصوصي', lang: 'ar-MA', dir: 'rtl' },
        en: { value: 'My lesson notebook', lang: 'en', dir: 'ltr' },
    },
    short_name: 'Mon cahier',
    short_name_localized: {
        fr: { value: 'Mon cahier', lang: 'fr-MA', dir: 'ltr' },
        ar: { value: 'دفتر نصوصي', lang: 'ar-MA', dir: 'rtl' },
        en: { value: 'My notebook', lang: 'en', dir: 'ltr' },
    },
    description: 'Cahier de textes enseignant avec progression, emploi du temps, évaluations, alertes utiles et accès hors connexion.',
    description_localized: {
        fr: {
            value: 'Cahier de textes enseignant avec progression, emploi du temps, évaluations, alertes utiles et accès hors connexion.',
            lang: 'fr-MA',
            dir: 'ltr',
        },
        ar: {
            value: 'دفتر نصوص للأستاذ يجمع التدرج واستعمال الزمن والتقويمات والتنبيهات المفيدة، ويعمل دون اتصال.',
            lang: 'ar-MA',
            dir: 'rtl',
        },
        en: {
            value: 'A teacher lesson notebook for progress, timetables, assessments, useful alerts, and offline access.',
            lang: 'en',
            dir: 'ltr',
        },
    },
    lang: 'fr-MA',
    dir: 'ltr',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'landscape',
    start_url: '/',
    scope: '/',
    launch_handler: { client_mode: 'navigate-existing' },
    prefer_related_applications: false,
    theme_color: '#2E7AF5',
    background_color: '#F8FAFC',
    categories: ['education', 'productivity', 'utilities'],
    shortcuts: [
        {
            name: 'Mes classes',
            short_name: 'Classes',
            description: 'Ouvrir la liste des classes et leurs cahiers de textes.',
            url: '/#/',
            icons: shortcutIcon,
            name_localized: {
                fr: 'Mes classes',
                ar: { value: 'أقسامي', dir: 'rtl' },
                en: 'My classes',
            },
            short_name_localized: {
                fr: 'Classes',
                ar: { value: 'الأقسام', dir: 'rtl' },
                en: 'Classes',
            },
            description_localized: {
                fr: 'Ouvrir la liste des classes et leurs cahiers de textes.',
                ar: { value: 'فتح الأقسام ودفاتر النصوص المرتبطة بها.', dir: 'rtl' },
                en: 'Open classes and their lesson notebooks.',
            },
        },
        {
            name: 'Pilotage',
            short_name: 'Pilotage',
            description: 'Consulter les repères, la progression et les informations globales.',
            url: '/#/notifications',
            icons: shortcutIcon,
            name_localized: {
                fr: 'Pilotage',
                ar: { value: 'القيادة', dir: 'rtl' },
                en: 'Overview',
            },
            short_name_localized: {
                fr: 'Pilotage',
                ar: { value: 'القيادة', dir: 'rtl' },
                en: 'Overview',
            },
            description_localized: {
                fr: 'Consulter les repères, la progression et les informations globales.',
                ar: { value: 'عرض المؤشرات والتقدم والمعلومات العامة.', dir: 'rtl' },
                en: 'View benchmarks, progress, and global information.',
            },
        },
        {
            name: 'Paramètres',
            short_name: 'Paramètres',
            description: 'Configurer le profil, les classes, l’emploi du temps et la synchronisation.',
            url: '/#/parametres',
            icons: shortcutIcon,
            name_localized: {
                fr: 'Paramètres',
                ar: { value: 'الإعدادات', dir: 'rtl' },
                en: 'Settings',
            },
            short_name_localized: {
                fr: 'Paramètres',
                ar: { value: 'الإعدادات', dir: 'rtl' },
                en: 'Settings',
            },
            description_localized: {
                fr: 'Configurer le profil, les classes, l’emploi du temps et la synchronisation.',
                ar: { value: 'ضبط الملف والأقسام واستعمال الزمن والمزامنة.', dir: 'rtl' },
                en: 'Configure the profile, classes, timetable, and synchronization.',
            },
        },
    ],
    icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        { src: '/icons/icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
    ],
};

export default defineConfig(({ mode }) => {
    loadEnv(mode, '.', '');
    return {
        server: {
            port: 3000,
            host: true,
            strictPort: true,
            allowedHosts: true,
            hmr: {
                clientPort: 3000,
            },
        },
        plugins: [
            devApiMockPlugin(),
            react(),
            tailwindcss(),
            VitePWA({
                strategies: 'injectManifest',
                srcDir: 'pwa',
                filename: 'sw.ts',
                registerType: 'autoUpdate',
                injectRegister: null, // enregistrement manuel dans registerSW.ts
                includeAssets: ['icons/*.png', 'icons/icon.svg', 'vacances-jourferie.json'],
                injectManifest: {
                    globPatterns: ['**/*.{js,css,html,woff2}'],
                    globIgnores: ['**/admin*'],
                },
                manifest: PWA_MANIFEST,
            }),
            premiumPerformancePlugin(),
        ],
        resolve: {
            alias: {
                '@': path.resolve(__dirname, '.')
            }
        },
        build: {
            minify: 'terser',
            outDir: 'dist',
            assetsDir: 'assets',
            emptyOutDir: true,
            rollupOptions: {
                input: {
                    main: path.resolve(__dirname, 'index.html'),
                    admin: path.resolve(__dirname, 'admin.html')
                },
                output: {
                    manualChunks: BUNDLE_OPTIMIZATION.MANUAL_CHUNKS
                }
            }
        }
    };
});
