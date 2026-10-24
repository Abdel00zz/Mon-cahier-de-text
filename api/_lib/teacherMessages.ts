import type { AdminMessage, ClassInfo, TeacherRequestDraft, TeacherSnapshot } from '../../src/types.js';
import { pendingAdminMessages, pendingTeacherRequests } from '../../src/domain/messages/conversation.js';
import { beginAccountWrite } from './atomicWrite.js';
import { appendConversationMessage, normalizeAdminMessages } from './adminMessages.js';
import { HttpError } from './http.js';
import { KEYS, type RedisClient } from './redis.js';

export function parseTeacherRequest(value: unknown): TeacherRequestDraft {
    if (!value || typeof value !== 'object') throw new HttpError(400, 'Demande invalide.');
    const input = value as Record<string, unknown>;
    if (typeof input.requestId !== 'string' || !/^teacher-[a-f0-9-]{36}$/i.test(input.requestId)) throw new HttpError(400, 'Identifiant invalide.');
    if (typeof input.body !== 'string' || !input.body.trim() || input.body.length > 1200) throw new HttpError(400, 'Saisissez un message de 1 à 1200 caractères.');
    if (input.kind !== 'help') throw new HttpError(400, 'Les demandes de contenu personnalisé passent par WhatsApp.');
    if (input.classId !== undefined && (typeof input.classId !== 'string' || !input.classId || input.classId.length > 200)) throw new HttpError(400, 'Classe invalide.');
    if (input.replyTo !== undefined && (typeof input.replyTo !== 'string' || !/^admin-[a-zA-Z0-9-]{8,100}$/.test(input.replyTo))) throw new HttpError(400, 'Réponse invalide.');
    return { requestId: input.requestId, body: input.body.trim(), kind: input.kind,
        ...(typeof input.classId === 'string' ? { classId: input.classId } : {}),
        ...(typeof input.replyTo === 'string' ? { replyTo: input.replyTo } : {}) };
}

/** Authenticated account only; shared CAS prevents concurrent admin/sync writes being lost. */
export async function sendTeacherRequest(redis: RedisClient, owner: string, input: unknown): Promise<AdminMessage> {
    const draft = parseTeacherRequest(input);
    return persistContact(redis, owner, draft);
}

/** Only authenticated click metadata is recorded; never accepts a WhatsApp message body. */
export async function recordWhatsAppContact(redis: RedisClient, owner: string, input: unknown): Promise<AdminMessage> {
    const value = input && typeof input === 'object' ? input as Record<string, unknown> : {};
    const draft = parseTeacherRequest({ requestId: value.requestId, classId: value.classId, kind: 'help',
        body: 'L’enseignant a cliqué sur « Contacter via WhatsApp » pour ses cours personnalisés. L’envoi du message sur WhatsApp n’est pas confirmé.' });
    return persistContact(redis, owner, draft, 'whatsapp-contact');
}

async function persistContact(redis: RedisClient, owner: string, draft: TeacherRequestDraft, event?: AdminMessage['event']): Promise<AdminMessage> {
    const write = await beginAccountWrite(redis, owner);
    const messages = normalizeAdminMessages(await redis.get(KEYS.adminMessages(owner)));
    const duplicate = messages.find(message => message.id === draft.requestId);
    if (duplicate) {
        if (duplicate.sender !== 'teacher' || duplicate.event !== event || duplicate.body !== draft.body || duplicate.classId !== draft.classId || duplicate.requestKind !== (event ? undefined : draft.kind) || duplicate.replyTo !== draft.replyTo) throw new HttpError(409, 'Cette demande a déjà été envoyée.');
        return duplicate;
    }
    // Repeated link clicks do not flood the admin history or consume help quotas.
    const recentContact = event && messages.find(message => message.event === event && message.classId === draft.classId && Date.parse(message.createdAt) > Date.now() - 300_000);
    if (recentContact) return recentContact;
    if ((!event && pendingTeacherRequests(messages).length >= 10) || messages.filter(message => message.sender === 'teacher' && Boolean(message.event) === Boolean(event) && Date.parse(message.createdAt) > Date.now() - 86400000).length >= 20) throw new HttpError(429, 'Plusieurs demandes sont déjà en cours. Patientez avant de réessayer.');
    const reply = draft.replyTo ? messages.find(message => message.id === draft.replyTo && message.sender !== 'teacher') : undefined;
    if (draft.replyTo && !reply) throw new HttpError(404, 'Message introuvable.');
    if (reply && draft.classId !== reply.classId) throw new HttpError(400, 'La réponse doit conserver la classe de la conversation.');
    let target: Pick<ClassInfo, 'id' | 'name'> | undefined;
    if (draft.classId) {
        const blob = await redis.get<{ classes?: ClassInfo[] }>(KEYS.classes(owner));
        target = blob?.classes?.find(item => item.id === draft.classId);
        if (!target && reply?.classId) target = { id: reply.classId, name: reply.className ?? reply.classId };
        if (!target) throw new HttpError(409, 'Synchronisez cette classe avant d’envoyer la demande.', 'CLASS_NOT_SYNCED');
    }
    const message: AdminMessage = {
        id: draft.requestId, sender: 'teacher', ...(event ? { event } : { requestKind: draft.kind }),
        title: event ? 'Contact WhatsApp · contenu personnalisé' : 'Demande d’accompagnement',
        body: draft.body, createdAt: new Date().toISOString(),
        ...(target ? { classId: target.id, className: target.name } : {}),
        ...(draft.replyTo ? { replyTo: draft.replyTo } : {}),
    };
    const next = appendConversationMessage(messages, message);
    // A first contact before the initial sync must still appear in the admin overview, and keep counters current.
    const existingSnapshot = await redis.hget<TeacherSnapshot>(KEYS.adminSnapshots, owner);
    const snapshotBase = existingSnapshot ?? await (async () => {
        const user = await redis.get<{ phone: string; email?: string; nom: string; prenom: string; blocked?: boolean }>(KEYS.user(owner));
        if (!user) throw new HttpError(404, 'Compte supprimé.');
        return {
            phone: owner,
            establishmentName: '',
            contactPhone: user.phone,
            ...(user.email ? { email: user.email } : {}),
            blocked: user.blocked === true,
            nom: user.nom,
            prenom: user.prenom,
            lastSyncAt: null,
            classes: [],
        } satisfies TeacherSnapshot;
    })();
    write.hset(KEYS.adminSnapshots, {
        [owner]: {
            ...snapshotBase,
            pendingMessages: pendingAdminMessages(next).length,
            pendingRequests: pendingTeacherRequests(next).length,
            lastMessageAt: next[0]?.createdAt ?? null,
        } satisfies TeacherSnapshot,
    });
    write.set(KEYS.adminMessages(owner), next);
    await write.exec();
    return message;
}
