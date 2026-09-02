import { HttpError } from './http.js';

export type RedisClient = import('@upstash/redis').Redis;

let client: RedisClient | null = null;
let redisCtor: Promise<typeof import('@upstash/redis').Redis> | null = null;

/**
 * Accès au stockage Redis persistant commun à toutes les fonctions Vercel.
 *
 * L'intégration Marketplace peut injecter les variables historiques KV_REST_*
 * au lieu des variables UPSTASH_*. Aucun fallback mémoire n'est autorisé ici :
 * il rendrait les comptes invisibles entre les fonctions auth, sync et admin.
 */
export const getRedis = async (): Promise<RedisClient> => {
  if (client) return client;

  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  const credentials = upstashUrl && upstashToken
    ? { url: upstashUrl, token: upstashToken }
    : kvUrl && kvToken
      ? { url: kvUrl, token: kvToken }
      : null;

  if (!credentials) {
    throw new HttpError(
      500,
      'Base de données non configurée. Ajoutez UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN sur Vercel.'
    );
  }

  const Redis = await (redisCtor ??= import('@upstash/redis').then(module => module.Redis));
  client = new Redis(credentials);
  return client;
};

export const KEYS = {
  user: (phone: string) => `user:${phone}`,
  classes: (phone: string) => `classes:${phone}`,
  lessons: (phone: string, classId: string) => `lessons:${phone}:${classId}`,
  adminSnapshots: 'admin:snapshots',
  pushSubs: 'push:subs',
  /** endpoint Web Push -> téléphone propriétaire (unicité globale). */
  pushEndpointOwners: 'push:endpoint-owners',
  adminCalendar: 'admin:calendar',
  adminOfficialEvents: 'admin:official-events',
  adminMessages: (phone: string) => `admin:messages:${phone}`,
  loginRateLimit: (phone: string) => `rl:login:${phone}`,
} as const;
