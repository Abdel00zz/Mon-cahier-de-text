import { ApiRequest, ApiResponse, HttpError, parseBody, sendError } from './_lib/http.js';
import { beginAccountWrite } from './_lib/atomicWrite.js';
import { normalizeAdminMessages } from './_lib/adminMessages.js';
import { requireUser } from './_lib/auth.js';
import { getRedis, KEYS } from './_lib/redis.js';
import type { AdminMessage } from '../types.js';

interface MessageBody {
    action?: string;
    messageId?: unknown;
}

const readMessages = async (phone: string): Promise<AdminMessage[]> => {
    const redis = await getRedis();
    const value = await redis.get<AdminMessage[]>(KEYS.adminMessages(phone));
    return normalizeAdminMessages(value);
};

const isMessageId = (value: unknown): value is string =>
    typeof value === 'string' && /^admin-[a-zA-Z0-9-]{8,100}$/.test(value);

const handleList = async (res: ApiResponse, phone: string) => {
    const messages = await readMessages(phone);
    // L'enseignant ne reçoit que les messages qui nécessitent encore son accusé.
    res.status(200).json({ messages: messages.filter(message => !message.acknowledgedAt) });
};

const handleAcknowledge = async (body: MessageBody, res: ApiResponse, phone: string) => {
    if (!isMessageId(body.messageId)) throw new HttpError(400, 'Identifiant de message invalide.');
    const redis = await getRedis();
    // Le message est publié par la direction sur la même clé : un simple
    // read-modify-write écrasait un message arrivé entre la lecture et
    // l'écriture. La révision de compte sérialise les deux écrivains.
    const write = await beginAccountWrite(redis, phone);
    const messages = normalizeAdminMessages(await redis.get<AdminMessage[]>(KEYS.adminMessages(phone)));
    const index = messages.findIndex(message => message.id === body.messageId);
    if (index === -1) throw new HttpError(404, 'Message introuvable.');

    const message = messages[index];
    if (!message.acknowledgedAt) {
        messages[index] = { ...message, acknowledgedAt: new Date().toISOString() };
        write.set(KEYS.adminMessages(phone), messages);
        await write.exec();
    }
    res.status(200).json({ ok: true, message: messages[index] });
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
    res.setHeader('Cache-Control', 'no-store');
    try {
        const { phone } = await requireUser(req);
        if (req.method === 'GET') return await handleList(res, phone);
        if (req.method === 'POST') {
            const body = parseBody<MessageBody>(req.body);
            if (body.action === 'acknowledge') return await handleAcknowledge(body, res, phone);
            throw new HttpError(400, 'Action inconnue.');
        }
        throw new HttpError(405, 'Méthode non autorisée.');
    } catch (error) {
        sendError(res, error);
    }
}
