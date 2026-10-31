import { randomUUID } from 'node:crypto';
import { clamp } from 'es-toolkit';
import { appendAudit, auditDetailFor, normalizeAudit, type AdminAuditEntry } from '../../src/domain/admin/auditLog.js';
import { KEYS, type RedisClient } from './redis.js';

/*
 * Journal de l'administration, côté serveur.
 *
 * L'écriture est « au mieux » : un journal indisponible ne doit jamais empêcher (ni annuler) l'action de
 * la direction qui vient de réussir. Lecture-puis-écriture sans verrou : deux actions strictement
 * simultanées peuvent perdre une ligne, jamais une action.
 */
export const recordAdminAudit = async (
  redis: RedisClient,
  action: string,
  body: Record<string, unknown>,
  now: Date = new Date(),
): Promise<void> => {
  try {
    const entry: AdminAuditEntry = {
      id: randomUUID(),
      at: now.toISOString(),
      action,
      ...(typeof body.phone === 'string' && body.phone ? { phone: body.phone.slice(0, 80) } : {}),
      ...(auditDetailFor(action, body) ? { detail: auditDetailFor(action, body) } : {}),
    };
    const current = normalizeAudit(await redis.get(KEYS.adminAudit));
    await redis.set(KEYS.adminAudit, appendAudit(current, entry));
  } catch (error) {
    console.error('[admin] journal indisponible', error);
  }
};

export const readAdminAudit = async (redis: RedisClient, limit = 100): Promise<AdminAuditEntry[]> =>
  normalizeAudit(await redis.get(KEYS.adminAudit)).slice(0, clamp(limit, 1, 300));
