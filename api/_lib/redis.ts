import { HttpError } from './http.js';

type RedisClient = import('@upstash/redis').Redis;

// MOCKED — in-memory, data lost on container sleep
const store = new Map();
const hStore = new Map();

class Pipeline {
  queue: Array<() => Promise<any>>;
  constructor() { this.queue = []; }
  get<T = any>(k: string) { this.queue.push(async () => store.get(k) ?? null); return this; }
  set(k: string, v: any) { this.queue.push(async () => { store.set(k, v); return 'OK'; }); return this; }
  del(k: string) { this.queue.push(async () => { store.delete(k); return 1; }); return this; }
  hget<T = any>(k: string, f: string) { this.queue.push(async () => { const hash = hStore.get(k); return hash ? (hash.get(f) ?? null) : null; }); return this; }
  hgetall<T = any>(k: string) { this.queue.push(async () => Object.fromEntries(hStore.get(k) ?? new Map())); return this; }
  hset(k: string, obj: any) {
    this.queue.push(async () => {
      if (!hStore.has(k)) hStore.set(k, new Map());
      const hash = hStore.get(k);
      for (const [key, val] of Object.entries(obj)) {
        hash.set(key, val);
      }
      return 1;
    });
    return this;
  }
  async exec<T = any[]>() {
    const results = [];
    for (const op of this.queue) {
      results.push(await op());
    }
    return results as unknown as T;
  }
}

export const getRedis = async (): Promise<RedisClient> => {
  return {
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: any) => { store.set(k, v); return 'OK'; },
    del: async (k: string) => { store.delete(k); return 1; },
    incr: async (k: string) => { const n = (store.get(k) || 0) + 1; store.set(k, n); return n; },
    expire: async (k: string, ttl: number) => 1,
    hget: async (k: string, f: string) => { const hash = hStore.get(k); return hash ? (hash.get(f) ?? null) : null; },
    hgetall: async (k: string) => Object.fromEntries(hStore.get(k) ?? new Map()),
    hset: async (k: string, obj: any) => {
      if (!hStore.has(k)) hStore.set(k, new Map());
      const hash = hStore.get(k);
      for (const [key, val] of Object.entries(obj)) {
        hash.set(key, val);
      }
      return 1;
    },
    hdel: async (k: string, f: string) => {
      const hash = hStore.get(k);
      if (hash && hash.has(f)) {
        hash.delete(f);
        return 1;
      }
      return 0;
    },
    pipeline: () => new Pipeline()
  } as unknown as RedisClient;
};

export const KEYS = {
  user: (phone: string) => `user:${phone}`,
  classes: (phone: string) => `classes:${phone}`,
  lessons: (phone: string, classId: string) => `lessons:${phone}:${classId}`,
  adminSnapshots: 'admin:snapshots',
  pushSubs: 'push:subs',
  adminCalendar: 'admin:calendar',
  adminOfficialEvents: 'admin:official-events',
  adminMessages: (phone: string) => `admin:messages:${phone}`,
  loginRateLimit: (phone: string) => `rl:login:${phone}`,
} as const;
