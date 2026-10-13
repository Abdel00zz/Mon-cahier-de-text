import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { HttpError, type ApiRequest, type ApiResponse } from './http.js';
import { isFirestoreStore, type RedisClient } from './redis.js';

/*
 * Limites de débit de la console d'administration.
 *
 * Une seule mécanique (INCR + expiration indivisibles) pour la connexion ET pour les écritures : sans
 * cela, une session volée ou un script pouvait envoyer des centaines de notifications ou de suppressions
 * en quelques secondes. Le budget est compté par adresse (l'en-tête n'est cru que sur Vercel).
 */
const clientDigest = (req: ApiRequest): string => {
    // Vercel overwrites this header. Never trust client-supplied X-Forwarded-For.
    const forwarded = process.env.VERCEL === '1' ? req.headers['x-vercel-forwarded-for'] : undefined;
    const candidate = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '';
    return createHash('sha256').update(isIP(candidate) ? candidate : 'unknown').digest('hex');
};

/** Consomme un jeton ; renvoie 0 si le budget tient, sinon les secondes à attendre. */
const consume = async (redis: RedisClient, key: string, max: number, windowSeconds: number): Promise<number> =>
    isFirestoreStore(redis) ? redis.atomic(async view => {
        const count = await view.incr(key);
        if (count === 1) await view.expire(key, windowSeconds);
        return count > max ? Math.max(1, await view.ttl(key)) : 0;
    }) : redis.eval<unknown[], number>(`
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[2]) end
if count > tonumber(ARGV[1]) then return math.max(1, redis.call('TTL', KEYS[1])) end
return 0`, [key], [max, windowSeconds]);

const refuse = (res: ApiResponse, retryAfter: number, message: string): never => {
    res.setHeader('Retry-After', String(retryAfter));
    throw new HttpError(429, message);
};

export const enforceAdminLoginLimit = async (redis: RedisClient, req: ApiRequest, res: ApiResponse) => {
    // INCR + expiry are indivisible; successful logins also consume the budget.
    const retryAfter = await consume(redis, `rl:admin-login:${clientDigest(req)}`, 8, 900);
    if (retryAfter > 0) refuse(res, retryAfter, 'Trop de tentatives. Réessayez dans quelques minutes.');
};

/** Familles d'écritures, de la plus sensible à la plus courante. */
export type AdminActionBucket = 'notify' | 'delete' | 'import' | 'write';

/** [écritures autorisées, fenêtre en secondes]. Un usage normal reste très en dessous. */
export const ADMIN_ACTION_LIMITS: Readonly<Record<AdminActionBucket, readonly [number, number]>> = {
    notify: [30, 600],
    delete: [10, 600],
    import: [20, 600],
    write: [120, 600],
};

const BUCKET_OF: Readonly<Record<string, AdminActionBucket>> = {
    notifyTeacher: 'notify',
    deleteTeacher: 'delete',
    deleteTeacherClass: 'delete',
    importClassLessons: 'import',
};

export const bucketForAdminAction = (action: string | undefined): AdminActionBucket =>
    (action && Object.hasOwn(BUCKET_OF, action) ? BUCKET_OF[action] : undefined) ?? 'write';

export const enforceAdminActionLimit = async (redis: RedisClient, req: ApiRequest, res: ApiResponse, action: string | undefined) => {
    const bucket = bucketForAdminAction(action);
    const [max, windowSeconds] = ADMIN_ACTION_LIMITS[bucket];
    const retryAfter = await consume(redis, `rl:admin-${bucket}:${clientDigest(req)}`, max, windowSeconds);
    if (retryAfter > 0) refuse(res, retryAfter, 'Trop d’actions en peu de temps. Patientez un instant avant de continuer.');
};