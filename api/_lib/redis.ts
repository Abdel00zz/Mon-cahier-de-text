import { HttpError } from './http.js';
import { FirestoreStore } from './firestoreStore.js';

export type RedisClient = import('@upstash/redis').Redis;
export const isFirestoreStore = (store: RedisClient): store is RedisClient & FirestoreStore => store instanceof FirestoreStore;

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
  if (process.env.CLOUD_MIGRATION_FREEZE === '1') throw new HttpError(503, 'Migration cloud en cours. Vos modifications locales seront synchronisées après la reprise.');
  if (client) return client;
  if (process.env.CLOUD_PROVIDER === 'firestore') {
    client = new FirestoreStore() as unknown as RedisClient;
    return client;
  }

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
  nativePushOwners: 'push:native-owners',
  nativePushDevices: (phone: string) => `push:native:${phone}`,
  adminCalendar: 'admin:calendar',
  adminOfficialEvents: 'admin:official-events',
  /** Translation horaire globale publiée par la direction. */
  adminTimetableClock: 'admin:timetable-clock',
  /** Surcharge horaire d'un compte ; une valeur nulle hérite du global. */
  adminTimetableClockForUser: (phone: string) => `admin:timetable-clock:${phone}`,
  adminMessages: (phone: string) => `admin:messages:${phone}`,
  inboxClock: (phone: string) => `admin:inbox-clock:${phone}`,
  loginRateLimit: (phone: string) => `rl:login:${phone}`,
} as const;
