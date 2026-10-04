import { ApiRequest, ApiResponse, HttpError, parseBody, sendError } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';
import { assertWorkspaceOwner } from './_lib/workspaceOwner.js';
import { subscribeNativeDevice, unsubscribeNativeDevice, nativeDeviceStatus, sendNativeToOwner, validateNativeToken } from './_lib/nativePush.js';

/*
 * Push serveur réservé à l'application Android (FCM HTTP v1).
 *
 * Le Web Push a été retiré : plus d'abonnement navigateur, plus d'index
 * d'endpoints, plus de cron quotidien côté Vercel. Le rappel de retard
 * quotidien revient avec la tâche des notifications natives planifiées ; les
 * rappels locaux et le fil in-app restent indépendants de ce point d'entrée.
 */
interface NotifyBody {
    action?: string;
    token?: unknown;
    binding?: unknown;
    locale?: unknown;
    installationId?: unknown;
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
    res.setHeader('Cache-Control', 'no-store');
    try {
        if (req.method !== 'POST') throw new HttpError(405, 'Méthode non autorisée.');
        const { phone } = await requireUser(req);
        if (req.headers['x-workspace-owner'] !== undefined) assertWorkspaceOwner(req.headers['x-workspace-owner'], phone);
        const body = parseBody<NotifyBody>(req.body);
        if (body.action === 'nativeSubscribe') return res.status(200).json(await subscribeNativeDevice(phone, body.token, body.locale, body.installationId));
        if (body.action === 'nativeUnsubscribe') return res.status(200).json(await unsubscribeNativeDevice(phone, body.token, body.binding));
        if (body.action === 'nativeStatus') return res.status(200).json(await nativeDeviceStatus(phone, body.token, body.binding));
        if (body.action === 'nativeTest') {
            const status = await nativeDeviceStatus(phone, body.token, body.binding);
            const sent = status.registered ? await sendNativeToOwner(phone, { kind: 'test', timestamp: Date.now() }, validateNativeToken(body.token)) : 0;
            return res.status(200).json({ ok: sent > 0, sent });
        }
        throw new HttpError(400, 'Action inconnue.');
    } catch (error) {
        sendError(res, error);
    }
}
