import { ApiRequest, ApiResponse, HttpError, getQueryParam, parseBody, sendError } from './_lib/http';
import { PushEntry, PushSubscriptionJSON, configureVapid, sendToEntry } from './_lib/webpush';
import { getRedis, KEYS } from './_lib/redis';
import { requireUser } from './_lib/auth';
import { getBundledCalendar, isHoliday, isVacation, todayInMorocco } from '../utils/calendar';
import { ClassLateness, computeLateness, summarizeForTeacher } from '../utils/lateness';
import type { TeacherSnapshot } from '../types';

interface NotifyBody {
    action?: string;
    subscription?: PushSubscriptionJSON & { device?: string };
    endpoint?: string;
    device?: string;
}

const SEVERITY_RANK: Record<string, number> = { ok: 0, notice: 1, warning: 2, critical: 3 };

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
    const redis = getRedis();
    const existing = (await redis.hget<PushEntry>(KEYS.pushSubs, phone)) ?? { subs: [] };
    const subs = dedupeSubs([
        ...existing.subs.filter(s => s.endpoint !== body.subscription!.endpoint),
        { endpoint: body.subscription.endpoint, keys: body.subscription.keys, device: body.device },
    ]);
    await redis.hset(KEYS.pushSubs, { [phone]: { ...existing, subs } });
    res.status(200).json({ ok: true });
};

const handleUnsubscribe = async (body: NotifyBody, res: ApiResponse, phone: string) => {
    const redis = getRedis();
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
    const redis = getRedis();
    const entry = await redis.hget<PushEntry>(KEYS.pushSubs, phone);
    if (!entry || entry.subs.length === 0) throw new HttpError(400, 'Aucun appareil abonné.');
    const { survivingSubs, sent } = await sendToEntry(entry, {
        title: 'Cahier de textes',
        body: 'Notification de test — tout fonctionne !',
        url: '/',
    });
    await redis.hset(KEYS.pushSubs, { [phone]: { ...entry, subs: survivingSubs } });
    res.status(200).json({ ok: sent > 0, sent });
};

const runCron = async (req: ApiRequest, res: ApiResponse) => {
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.authorization;
    const provided = Array.isArray(auth) ? auth[0] : auth;
    if (!secret || provided !== `Bearer ${secret}`) {
        throw new HttpError(401, 'Non autorisé.');
    }

    const dryRun = getQueryParam(req, 'dry') === '1';
    const calendar = getBundledCalendar();
    const today = todayInMorocco(new Date(), calendar);

    if (isHoliday(today, calendar) || isVacation(today, calendar)) {
        return res.status(200).json({ today, skipped: 'vacances', sent: 0 });
    }

    const vapidReady = configureVapid();
    const redis = getRedis();
    const [snapshots, subsMap] = await Promise.all([
        redis.hgetall<Record<string, TeacherSnapshot>>(KEYS.adminSnapshots),
        redis.hgetall<Record<string, PushEntry>>(KEYS.pushSubs),
    ]);

    const report: Array<{ phone: string; severity: string; gap: number; wouldSend: boolean }> = [];
    const updates: Record<string, PushEntry> = {};
    let totalSent = 0;

    const [ty, tm, td] = today.split('-').map(Number);
    const todayWeekday = new Date(Date.UTC(ty, tm - 1, td)).getUTCDay();

    for (const [phone, snapshot] of Object.entries(snapshots ?? {})) {
        const entry = subsMap?.[phone];
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
                    absences: snapshot.absences,
                    settings: prefs
                        ? { gapThreshold: prefs.gapThreshold, inactivityThresholdDays: prefs.inactivityThresholdDays }
                        : undefined,
                }),
                classId: c.id,
                className: c.name,
            }));

        const summary = summarizeForTeacher(perClass);
        if (!summary) continue;

        // anti-spam : pas de re-notif < 2 jours sauf aggravation
        const lastNotified = entry.lastNotifiedAt ? new Date(entry.lastNotifiedAt).getTime() : 0;
        const twoDaysMs = 2 * 24 * 3600 * 1000;
        const severityIncreased = SEVERITY_RANK[summary.severity] > SEVERITY_RANK[entry.lastSeverity ?? 'ok'];
        const recentlyNotified = Date.now() - lastNotified < twoDaysMs;
        const wouldSend = !recentlyNotified || severityIncreased;

        report.push({ phone, severity: summary.severity, gap: perClass.reduce((m, c) => Math.max(m, c.gapSessions), 0), wouldSend });

        if (!wouldSend || dryRun || !vapidReady) continue;

        const { survivingSubs, sent } = await sendToEntry(entry, {
            title: summary.title,
            body: summary.body,
            url: '/',
        });
        totalSent += sent;
        updates[phone] = {
            ...entry,
            subs: survivingSubs,
            lastNotifiedAt: new Date().toISOString(),
            lastSeverity: summary.severity,
        };
    }

    if (!dryRun && Object.keys(updates).length > 0) {
        await redis.hset(KEYS.pushSubs, updates);
    }

    res.status(200).json({ today, dryRun, users: report, sent: totalSent });
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
