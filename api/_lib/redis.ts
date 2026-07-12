import { HttpError } from './http.js';

type RedisClient = import('@upstash/redis').Redis;

let client: RedisClient | null = null;
let redisCtor: Promise<typeof import('@upstash/redis').Redis> | null = null;

// L'intégration Marketplace Vercel injecte parfois KV_REST_API_* au lieu d'UPSTASH_*.
export const getRedis = async (): Promise<RedisClient> => {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new HttpError(500, 'Base de données non configurée. Ajoutez UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN sur Vercel.');
  }
  const Redis = await (redisCtor ??= import('@upstash/redis').then(module => module.Redis));
  client = new Redis({ url, token });
  return client;
};

export const KEYS = {
  user: (phone: string) => `user:${phone}`,
  classes: (phone: string) => `classes:${phone}`,
  lessons: (phone: string, classId: string) => `lessons:${phone}:${classId}`,
  adminSnapshots: 'admin:snapshots',
  pushSubs: 'push:subs',
  adminCalendar: 'admin:calendar',
  loginRateLimit: (phone: string) => `rl:login:${phone}`,
} as const;
