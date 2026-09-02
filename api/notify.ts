import { ApiRequest, ApiResponse, HttpError, getQueryParam, parseBody, sendError } from './_lib/http.js';
import { PushEntry, PushSubscriptionJSON, configureVapid, pushEndpointField, sendToEntry } from './_lib/webpush.js';
import { getRedis, KEYS } from './_lib/redis.js';
import { requireUser } from './_lib/auth.js';
import { getBundledCalendar, isHoliday, isVacation, todayInMorocco, type HolidayCalendar } from '../utils/calendar.js';
import { ClassLateness, computeLateness, summarizeForTeacher } from '../utils/lateness.js';
import { assertValidTeacherSnapshot } from './_lib/validate.js';
import type { AppLocale, TeacherSnapshot } from '../types.js';

interface NotifyBody {
    action?: string;
    subscription?: PushSubscriptionJSON & { device?: string };
    endpoint?: string;
    device?: string;
}

const SEVERITY_RANK: Record<string, number> = { ok: 0, notice: 1, warning: 2, critical: 3 };
const MAX_PUSH_SUBSCRIPTIONS = 5;
const MAX_ENDPOINT_LENGTH = 2_048;
const MAX_PUSH_KEY_LENGTH = 512;
const DEFAULT_QUIET_DURING_VACATIONS = true;
const TEST_NOTIFICATION_COPY: Record<AppLocale, { title: string; body: string }> = {
    fr: { title: 'Cahier de textes', body: 'Notification de test : tout fonctionne correctement.' },
    en: { title: 'Lesson notebook', body: 'Test notification: everything is working correctly.' },
    ar: { title: 'دفتر النصوص', body: 'إشعار تجريبي: تعمل الخدمة بشكل سليم.' },
};

/*
 * Le cron parcourt tous les enseignants dans une seule invocation de fonction.
 * Trois garde-fous rendent ce parcours sûr quand l'effectif grandit :
 *   • les envois Web Push partent par paquets concurrents, pas un par un ;
 *   • l'anti-spam est enregistré à la fin de CHAQUE paquet, si bien qu'une
 *     interruption ne perd au pire qu'un paquet au lieu de tout le passage
 *     (sinon le lendemain renvoyait l'intégralité des notifications) ;
 *   • un budget de temps arrête l'envoi avant la coupure de la plateforme et
 *     le signale dans la réponse, au lieu d'échouer en silence.
 */
const CRON_SEND_CONCURRENCY = 8;
const CRON_TIME_BUDGET_MS = 45_000;

interface CronCandidate {
    phone: string;
    entry: PushEntry;
    severity: string;
    gap: number;
    title: string;
    body: string;
    wouldSend: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);

const validateEndpoint = (value: unknown): string => {
    if (typeof value !== 'string' || value.length === 0 || value.length > MAX_ENDPOINT_LENGTH) {
        throw new HttpError(400, 'Endpoint push invalide.');
    }
    try {
        const url = new URL(value);
        if (url.protocol !== 'https:') throw new Error('protocol');
    } catch {
        throw new HttpError(400, 'Endpoint push invalide.');
    }
    return value;
};

const validatePushKey = (value: unknown, label: string): string => {
    if (typeof value !== 'string' || value.length < 16 || value.length > MAX_PUSH_KEY_LENGTH) {
        throw new HttpError(400, `${label} invalide.`);
    }
    return value;
};

const validateSubscription = (value: unknown): PushSubscriptionJSON & { device?: string } => {
    if (!isRecord(value)) throw new HttpError(400, 'Abonnement push invalide.');
    const endpoint = validateEndpoint(value.endpoint);
    if (!isRecord(value.keys)) throw new HttpError(400, 'Clés de l’abonnement push invalides.');
    const keys = {
        p256dh: validatePushKey(value.keys.p256dh, 'Clé p256dh'),
        auth: validatePushKey(value.keys.auth, 'Clé auth'),
    };
    const device = typeof value.device === 'string' && value.device.trim()
        ? value.device.trim().slice(0, 60)
        : undefined;
    return { endpoint, keys, ...(device ? { device } : {}) };
};

const normalizeEntry = (value: unknown): PushEntry => {
    if (!isRecord(value) || !Array.isArray(value.subs)) return { subs: [] };
    const subs: PushEntry['subs'] = [];
    const seen = new Set<string>();
    for (const raw of value.subs) {
        try {
            const sub = validateSubscription(raw);
            if (!seen.has(sub.endpoint)) {
                seen.add(sub.endpoint);
                subs.push(sub);
            }
        } catch {
            // Une ancienne entrée corrompue ne doit pas interrompre le cron.
        }
    }
    return {
        subs,
        ...(typeof value.lastNotifiedAt === 'string' && Number.isFinite(Date.parse(value.lastNotifiedAt))
            ? { lastNotifiedAt: new Date(value.lastNotifiedAt).toISOString() }
            : {}),
        ...(typeof value.lastSeverity === 'string' && SEVERITY_RANK[value.lastSeverity] !== undefined
            ? { lastSeverity: value.lastSeverity }
            : {}),
    };
};

const ownerField = (endpoint: string): string => pushEndpointField(endpoint);

/**
 * Migration paresseuse des abonnements créés avant l'index global. Elle n'est
 * appelée qu'à l'inscription d'un endpoint dont le champ d'index est absent,
 * donc elle ne pénalise ni le cron ni la lecture courante des réglages.
 */
const findLegacyEndpointOwner = async (
    redis: Awaited<ReturnType<typeof getRedis>>,
    endpoint: string,
    currentPhone: string,
): Promise<string | undefined> => {
    const entries = await redis.hgetall<Record<string, unknown>>(KEYS.pushSubs);
    for (const [phone, rawEntry] of Object.entries(entries ?? {})) {
        if (phone === currentPhone) continue;
        if (normalizeEntry(rawEntry).subs.some(sub => sub.endpoint === endpoint)) return phone;
    }
    return undefined;
};

const releaseEndpointOwners = async (
    redis: Awaited<ReturnType<typeof getRedis>>,
    phone: string,
    endpoints: string[],
): Promise<void> => {
    if (endpoints.length === 0) return;
    const currentEntry = normalizeEntry(await redis.hget<PushEntry>(KEYS.pushSubs, phone));
    const fields = await Promise.all(endpoints.map(async endpoint => {
        // Une réinscription peut arriver entre l'envoi et le nettoyage. Ne
        // jamais supprimer l'index si le nouvel état du compte le réclame.
        if (currentEntry.subs.some(sub => sub.endpoint === endpoint)) return null;
        const field = ownerField(endpoint);
        const owner = await redis.hget<string>(KEYS.pushEndpointOwners, field);
        return owner === phone ? field : null;
    }));
    const toDelete = fields.filter((field): field is string => Boolean(field));
    if (toDelete.length === 0) return;
    const pipeline = redis.pipeline();
    for (const field of toDelete) pipeline.hdel(KEYS.pushEndpointOwners, field);
    await pipeline.exec();
};

const persistEntry = async (
    redis: Awaited<ReturnType<typeof getRedis>>,
    phone: string,
    entry: PushEntry,
): Promise<void> => {
    const normalized = normalizeEntry(entry);
    if (normalized.subs.length === 0) {
        await redis.hdel(KEYS.pushSubs, phone);
        return;
    }
    await redis.hset(KEYS.pushSubs, { [phone]: normalized });
};

const handleSubscribe = async (body: NotifyBody, res: ApiResponse, phone: string) => {
    const subscription = validateSubscription({
        ...(body.subscription ?? {}),
        ...(body.device !== undefined ? { device: body.device } : {}),
    });
    const redis = await getRedis();
    const field = ownerField(subscription.endpoint);
    let currentOwner = await redis.hget<string>(KEYS.pushEndpointOwners, field);
    if (!currentOwner) {
        const legacyOwner = await findLegacyEndpointOwner(redis, subscription.endpoint, phone);
        if (legacyOwner) {
            // Best effort : hsetnx empêche une seconde migration concurrente de
            // remplacer le propriétaire déjà observé.
            await redis.hsetnx(KEYS.pushEndpointOwners, field, legacyOwner);
            currentOwner = legacyOwner;
        }
    }

    // L'index peut avoir été laissé par une ancienne version. Il n'est
    // supprimé que si le compte annoncé ne possède plus réellement l'endpoint.
    if (currentOwner && currentOwner !== phone) {
        const ownerEntry = normalizeEntry(await redis.hget<PushEntry>(KEYS.pushSubs, currentOwner));
        if (ownerEntry.subs.some(sub => sub.endpoint === subscription.endpoint)) {
            throw new HttpError(409, 'Cet appareil est déjà associé à un autre compte.');
        }
        await redis.hdel(KEYS.pushEndpointOwners, field);
    }

    // hsetnx rend la réservation atomique lorsque deux appareils s'inscrivent
    // simultanément avec le même endpoint.
    const reserved = await redis.hsetnx(KEYS.pushEndpointOwners, field, phone);
    if (reserved === 0) {
        const owner = await redis.hget<string>(KEYS.pushEndpointOwners, field);
        if (owner !== phone) throw new HttpError(409, 'Cet appareil est déjà associé à un autre compte.');
    }

    const existing = normalizeEntry(await redis.hget<PushEntry>(KEYS.pushSubs, phone));
    const alreadyRegistered = existing.subs.some(sub => sub.endpoint === subscription.endpoint);
    if (!alreadyRegistered && existing.subs.length >= MAX_PUSH_SUBSCRIPTIONS) {
        if (reserved === 1) await redis.hdel(KEYS.pushEndpointOwners, field);
        throw new HttpError(429, `Limite de ${MAX_PUSH_SUBSCRIPTIONS} appareils atteinte.`);
    }

    const subs = [
        ...existing.subs.filter(sub => sub.endpoint !== subscription.endpoint),
        subscription,
    ];
    try {
        await persistEntry(redis, phone, { ...existing, subs });
    } catch (error) {
        if (reserved === 1) await redis.hdel(KEYS.pushEndpointOwners, field).catch(() => undefined);
        throw error;
    }
    res.status(200).json({ ok: true, registered: true });
};

const handleUnsubscribe = async (body: NotifyBody, res: ApiResponse, phone: string) => {
    const endpoint = validateEndpoint(body.endpoint);
    const redis = await getRedis();
    const existing = normalizeEntry(await redis.hget<PushEntry>(KEYS.pushSubs, phone));
    const subs = existing.subs.filter(sub => sub.endpoint !== endpoint);
    if (subs.length !== existing.subs.length) {
        await persistEntry(redis, phone, { ...existing, subs });
    }
    await releaseEndpointOwners(redis, phone, [endpoint]);
    res.status(200).json({ ok: true, removed: subs.length !== existing.subs.length });
};

const handleStatus = async (body: NotifyBody, res: ApiResponse, phone: string) => {
    const endpoint = validateEndpoint(body.endpoint);
    const redis = await getRedis();
    const entry = normalizeEntry(await redis.hget<PushEntry>(KEYS.pushSubs, phone));
    const present = entry.subs.some(sub => sub.endpoint === endpoint);
    if (!present) return res.status(200).json({ ok: true, registered: false });

    const field = ownerField(endpoint);
    const owner = await redis.hget<string>(KEYS.pushEndpointOwners, field);
    if (!owner) {
        // Répare les abonnements créés avant l'index global, sans réattribuer
        // silencieusement un endpoint déjà réservé entre-temps.
        const claimed = await redis.hsetnx(KEYS.pushEndpointOwners, field, phone);
        if (claimed === 0 && (await redis.hget<string>(KEYS.pushEndpointOwners, field)) !== phone) {
            return res.status(200).json({ ok: true, registered: false });
        }
    }
    res.status(200).json({ ok: true, registered: owner === phone || !owner });
};

const handleTest = async (res: ApiResponse, phone: string) => {
    if (!configureVapid()) throw new HttpError(500, 'Clés VAPID non configurées sur le serveur.');
    const redis = await getRedis();
    const entry = normalizeEntry(await redis.hget<PushEntry>(KEYS.pushSubs, phone));
    if (entry.subs.length === 0) throw new HttpError(400, 'Aucun appareil abonné.');
    const snapshot = await redis.hget<TeacherSnapshot>(KEYS.adminSnapshots, phone);
    const copy = TEST_NOTIFICATION_COPY[snapshot?.applicationLocale ?? 'ar'];
    const { survivingSubs, sent } = await sendToEntry(entry, {
        title: copy.title,
        body: copy.body,
        url: '/#/notifications',
        kind: 'test',
        tag: 'cdt-test',
        timestamp: Date.now(),
    });
    await persistEntry(redis, phone, { ...entry, subs: survivingSubs });
    await releaseEndpointOwners(redis, phone, entry.subs
        .filter(sub => !survivingSubs.some(next => next.endpoint === sub.endpoint))
        .map(sub => sub.endpoint));
    // HTTP 200 signifie « requête traitée », pas « notification livrée » : le
    // client lit `sent` et affiche le résultat métier exact.
    res.status(200).json({ ok: sent > 0, sent });
};

/**
 * Décide, sans aucun accès réseau, qui doit être notifié aujourd'hui.
 * Séparer la décision de l'envoi permet de renvoyer un rapport complet même
 * lorsque la phase d'envoi est écourtée par le budget de temps.
 */
const collectCronCandidates = (
    snapshots: Record<string, unknown>,
    subsMap: Record<string, unknown>,
    today: string,
    calendar: HolidayCalendar,
): CronCandidate[] => {
    const candidates: CronCandidate[] = [];
    const [ty, tm, td] = today.split('-').map(Number);
    const todayWeekday = new Date(Date.UTC(ty, tm - 1, td)).getUTCDay();
    const twoDaysMs = 2 * 24 * 3600 * 1000;
    const now = Date.now();

    for (const [phone, rawSnapshot] of Object.entries(snapshots)) {
        let snapshot: TeacherSnapshot;
        try {
            snapshot = assertValidTeacherSnapshot(rawSnapshot, phone);
        } catch {
            // Un snapshot endommagé ne doit pas rendre le passage cron entier
            // indisponible. La prochaine synchronisation le remplacera.
            continue;
        }
        const entry = normalizeEntry(subsMap[phone]);
        if (entry.subs.length === 0) continue;

        // Absence justifiée en cours (certificat de maladie...) : silence total.
        if (snapshot.absences?.some(a => today >= a.debut && today <= a.fin)) continue;

        const prefs = snapshot.notifyPrefs;
        const quietDuringVacations = prefs?.quietDuringVacations ?? DEFAULT_QUIET_DURING_VACATIONS;
        if (quietDuringVacations && (isHoliday(today, calendar) || isVacation(today, calendar))) continue;

        const teachesToday = snapshot.classes.some(c => (c.weekdays ?? []).includes(todayWeekday));
        if (!teachesToday) continue; // "week-end" personnel de l'enseignant

        const perClass: ClassLateness[] = snapshot.classes
            .filter(c => (c.weekdays ?? []).length > 0)
            .map(c => ({
                ...computeLateness({
                    slots: c.scheduleSlots ?? c.weekdays.map(weekday => ({ weekday })),
                    calendar,
                    sessionsCount: c.sessionsCount,
                    lastDate: c.lastDate,
                    today,
                    from: snapshot.schoolYearStart,
                    absences: snapshot.absences,
                    settings: prefs
                        ? { gapThreshold: prefs.gapThreshold, inactivityThresholdDays: prefs.inactivityThresholdDays }
                        : undefined,
                }),
                classId: c.id,
                className: c.name,
            }));

        const summary = summarizeForTeacher(perClass, snapshot.applicationLocale ?? 'ar');
        if (!summary) continue;

        // anti-spam : pas de re-notif < 2 jours sauf aggravation
        const lastNotified = entry.lastNotifiedAt ? new Date(entry.lastNotifiedAt).getTime() : 0;
        const severityIncreased = SEVERITY_RANK[summary.severity] > SEVERITY_RANK[entry.lastSeverity ?? 'ok'];
        const recentlyNotified = now - lastNotified < twoDaysMs;

        candidates.push({
            phone,
            entry,
            severity: summary.severity,
            gap: perClass.reduce((m, c) => Math.max(m, c.gapSessions), 0),
            title: summary.title,
            body: summary.body,
            wouldSend: !recentlyNotified || severityIncreased,
        });
    }

    return candidates;
};

const runCron = async (req: ApiRequest, res: ApiResponse) => {
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.authorization;
    const provided = Array.isArray(auth) ? auth[0] : auth;
    if (!secret || provided !== `Bearer ${secret}`) {
        throw new HttpError(401, 'Non autorisé.');
    }

    const dryRun = getQueryParam(req, 'dry') === '1';
    const redis = await getRedis();
    const calendar = (await redis.get<HolidayCalendar>(KEYS.adminCalendar)) ?? getBundledCalendar();
    const today = todayInMorocco(new Date(), calendar);

    const vapidReady = configureVapid();
    const [snapshots, subsMap] = await Promise.all([
        redis.hgetall<Record<string, unknown>>(KEYS.adminSnapshots),
        redis.hgetall<Record<string, unknown>>(KEYS.pushSubs),
    ]);

    const candidates = collectCronCandidates(snapshots ?? {}, subsMap ?? {}, today, calendar);
    const report = candidates.map(({ phone, severity, gap, wouldSend }) => ({ phone, severity, gap, wouldSend }));

    const queue = dryRun || !vapidReady ? [] : candidates.filter(candidate => candidate.wouldSend);
    const startedAt = Date.now();
    let totalSent = 0;
    let truncated = false;

    for (let offset = 0; offset < queue.length; offset += CRON_SEND_CONCURRENCY) {
        if (Date.now() - startedAt > CRON_TIME_BUDGET_MS) {
            truncated = true;
            break;
        }
        const batch = queue.slice(offset, offset + CRON_SEND_CONCURRENCY);
        const results = await Promise.all(batch.map(async candidate => {
            try {
                const result = await sendToEntry(candidate.entry, {
                    title: candidate.title,
                    body: candidate.body,
                    url: '/#/notifications',
                    kind: 'lateness',
                    // Un seul emplacement pour le rappel quotidien : un
                    // nouvel envoi remplace le précédent au lieu d'empiler les
                    // alertes identiques dans le centre du téléphone.
                    tag: 'cdt-lateness',
                    timestamp: Date.now(),
                });
                return { candidate, ...result };
            } catch {
                return { candidate, survivingSubs: candidate.entry.subs, sent: 0 };
            }
        }));

        const nowISO = new Date().toISOString();
        const pipeline = redis.pipeline();
        const deadEndpoints: Array<{ phone: string; endpoint: string }> = [];
        for (const { candidate, survivingSubs, sent } of results) {
            totalSent += sent;
            const removed = candidate.entry.subs.filter(sub =>
                !survivingSubs.some(next => next.endpoint === sub.endpoint)
            );
            removed.forEach(sub => deadEndpoints.push({ phone: candidate.phone, endpoint: sub.endpoint }));
            const nextEntry: PushEntry = {
                ...candidate.entry,
                subs: survivingSubs,
                // Un échec transitoire ou une livraison nulle ne doit pas
                // armer l'anti-spam pour deux jours.
                ...(sent > 0 ? { lastNotifiedAt: nowISO, lastSeverity: candidate.severity } : {}),
            };
            if (survivingSubs.length === 0) pipeline.hdel(KEYS.pushSubs, candidate.phone);
            else pipeline.hset(KEYS.pushSubs, { [candidate.phone]: nextEntry });
        }
        // Enregistré à chaque paquet : une coupure ne réarme pas tout l'effectif.
        await pipeline.exec();
        const removedByPhone = new Map<string, string[]>();
        for (const item of deadEndpoints) {
            const endpoints = removedByPhone.get(item.phone) ?? [];
            endpoints.push(item.endpoint);
            removedByPhone.set(item.phone, endpoints);
        }
        await Promise.all([...removedByPhone.entries()].map(([ownerPhone, endpoints]) =>
            releaseEndpointOwners(redis, ownerPhone, endpoints)
        ));
    }

    res.status(200).json({
        today,
        dryRun,
        vapidConfigured: vapidReady,
        users: report,
        sent: totalSent,
        queued: queue.length,
        truncated,
    });
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
    res.setHeader('Cache-Control', 'no-store');
    try {
        if (req.method === 'GET') {
            return await runCron(req, res);
        }
        if (req.method === 'POST') {
            const { phone } = await requireUser(req);
            const body = parseBody<NotifyBody>(req.body);
            if (body.action === 'subscribe') return await handleSubscribe(body, res, phone);
            if (body.action === 'unsubscribe') return await handleUnsubscribe(body, res, phone);
            if (body.action === 'status') return await handleStatus(body, res, phone);
            if (body.action === 'test') return await handleTest(res, phone);
            throw new HttpError(400, 'Action inconnue.');
        }
        throw new HttpError(405, 'Méthode non autorisée.');
    } catch (error) {
        sendError(res, error);
    }
}
