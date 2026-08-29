import { ApiRequest, ApiResponse, HttpError, getQueryParam, parseBody, sendError } from './_lib/http.js';
import { PushEntry, PushSubscriptionJSON, configureVapid, sendToEntry } from './_lib/webpush.js';
import { getRedis, KEYS } from './_lib/redis.js';
import { requireUser } from './_lib/auth.js';
import { getBundledCalendar, isHoliday, isVacation, todayInMorocco, type HolidayCalendar } from '../utils/calendar.js';
import { ClassLateness, computeLateness, summarizeForTeacher } from '../utils/lateness.js';
import type { AppLocale, TeacherSnapshot } from '../types.js';

interface NotifyBody {
    action?: string;
    subscription?: PushSubscriptionJSON & { device?: string };
    endpoint?: string;
    device?: string;
}

const SEVERITY_RANK: Record<string, number> = { ok: 0, notice: 1, warning: 2, critical: 3 };
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

const dedupeSubs = (subs: PushEntry['subs']): PushEntry['subs'] => {
    const seen = new Set<string>();
    return subs.filter(s => {
        if (!s?.endpoint || seen.has(s.endpoint)) return false;
        seen.add(s.endpoint);
        return true;
    });
};

const handleSubscribe = async (body: NotifyBody, res: ApiResponse, phone: string) => {
    if (!body.subscription?.endpoint || !body.subscription.keys) {
        throw new HttpError(400, 'Abonnement push invalide.');
    }
    const redis = await getRedis();
    const existing = (await redis.hget<PushEntry>(KEYS.pushSubs, phone)) ?? { subs: [] };
    const subs = dedupeSubs([
        ...existing.subs.filter(s => s.endpoint !== body.subscription!.endpoint),
        { endpoint: body.subscription.endpoint, keys: body.subscription.keys, device: body.device },
    ]);
    await redis.hset(KEYS.pushSubs, { [phone]: { ...existing, subs } });
    res.status(200).json({ ok: true });
};

const handleUnsubscribe = async (body: NotifyBody, res: ApiResponse, phone: string) => {
    const redis = await getRedis();
    const existing = await redis.hget<PushEntry>(KEYS.pushSubs, phone);
    if (existing) {
        const subs = existing.subs.filter(s => s.endpoint !== body.endpoint);
        if (subs.length === 0) {
            await redis.hdel(KEYS.pushSubs, phone);
        } else {
            await redis.hset(KEYS.pushSubs, { [phone]: { ...existing, subs } });
        }
    }
    res.status(200).json({ ok: true });
};

const handleTest = async (res: ApiResponse, phone: string) => {
    if (!configureVapid()) throw new HttpError(500, 'Clés VAPID non configurées sur le serveur.');
    const redis = await getRedis();
    const entry = await redis.hget<PushEntry>(KEYS.pushSubs, phone);
    if (!entry || entry.subs.length === 0) throw new HttpError(400, 'Aucun appareil abonné.');
    const snapshot = await redis.hget<TeacherSnapshot>(KEYS.adminSnapshots, phone);
    const copy = TEST_NOTIFICATION_COPY[snapshot?.applicationLocale ?? 'ar'];
    const { survivingSubs, sent } = await sendToEntry(entry, {
        title: copy.title,
        body: copy.body,
        url: '/',
        kind: 'test',
        tag: 'cdt-test',
        timestamp: Date.now(),
    });
    await redis.hset(KEYS.pushSubs, { [phone]: { ...entry, subs: survivingSubs } });
    res.status(200).json({ ok: sent > 0, sent });
};

/**
 * Décide, sans aucun accès réseau, qui doit être notifié aujourd'hui.
 * Séparer la décision de l'envoi permet de renvoyer un rapport complet même
 * lorsque la phase d'envoi est écourtée par le budget de temps.
 */
const collectCronCandidates = (
    snapshots: Record<string, TeacherSnapshot>,
    subsMap: Record<string, PushEntry>,
    today: string,
    calendar: HolidayCalendar,
): CronCandidate[] => {
    const candidates: CronCandidate[] = [];
    const [ty, tm, td] = today.split('-').map(Number);
    const todayWeekday = new Date(Date.UTC(ty, tm - 1, td)).getUTCDay();
    const twoDaysMs = 2 * 24 * 3600 * 1000;
    const now = Date.now();

    for (const [phone, snapshot] of Object.entries(snapshots)) {
        const entry = subsMap[phone];
        if (!entry || entry.subs.length === 0) continue;

        // Absence justifiée en cours (certificat de maladie...) : silence total.
        if (snapshot.absences?.some(a => today >= a.debut && today <= a.fin)) continue;

        const teachesToday = snapshot.classes.some(c => (c.weekdays ?? []).includes(todayWeekday));
        if (!teachesToday) continue; // "week-end" personnel de l'enseignant

        const prefs = snapshot.notifyPrefs;
        const perClass: ClassLateness[] = snapshot.classes
            .filter(c => (c.weekdays ?? []).length > 0)
            .map(c => ({
                ...computeLateness({
                    slots: c.weekdays.map(weekday => ({ weekday })),
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

    if (isHoliday(today, calendar) || isVacation(today, calendar)) {
        return res.status(200).json({ today, skipped: 'vacances', sent: 0 });
    }

    const vapidReady = configureVapid();
    const [snapshots, subsMap] = await Promise.all([
        redis.hgetall<Record<string, TeacherSnapshot>>(KEYS.adminSnapshots),
        redis.hgetall<Record<string, PushEntry>>(KEYS.pushSubs),
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
            const { survivingSubs, sent } = await sendToEntry(candidate.entry, {
                title: candidate.title,
                body: candidate.body,
                url: '/',
                kind: 'lateness',
                tag: `cdt-lateness-${today}`,
                timestamp: Date.now(),
            });
            return { candidate, survivingSubs, sent };
        }));

        const updates: Record<string, PushEntry> = {};
        for (const { candidate, survivingSubs, sent } of results) {
            totalSent += sent;
            updates[candidate.phone] = {
                ...candidate.entry,
                subs: survivingSubs,
                lastNotifiedAt: new Date().toISOString(),
                lastSeverity: candidate.severity,
            };
        }
        // Enregistré à chaque paquet : une coupure ne réarme pas tout l'effectif.
        await redis.hset(KEYS.pushSubs, updates);
    }

    res.status(200).json({ today, dryRun, users: report, sent: totalSent, queued: queue.length, truncated });
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
            if (body.action === 'test') return await handleTest(res, phone);
            throw new HttpError(400, 'Action inconnue.');
        }
        throw new HttpError(405, 'Méthode non autorisée.');
    } catch (error) {
        sendError(res, error);
    }
}
