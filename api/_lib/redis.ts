import { Redis } from '@upstash/redis';
import { HttpError } from './http';

let client: Redis | null = null;

// L'intégration Marketplace Vercel injecte parfois KV_REST_API_* au lieu d'UPSTASH_*.
export const getRedis = (): Redis => {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new HttpError(500, 'Base de données non configurée. Ajoutez UPSTASH_REDIS_REST_URL et UPSTASH_REDIS_REST_TOKEN sur Vercel.');
  }
  client = new Redis({ url, token });
  return client;
};

export const KEYS = {
  user: (phone: string) => `user:${phone}`,
  classes: (phone: string) => `classes:${phone}`,
  lessons: (phone: string, classId: string) => `lessons:${phone}:${classId}`,
  adminSnapshots: 'admin:snapshots',
  pushSubs: 'push:subs',
  loginRateLimit: (phone: string) => `rl:login:${phone}`,
} as const;
