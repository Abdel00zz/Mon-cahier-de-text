import { readFile } from 'node:fs/promises';
import { parseArgs, parseEnv } from 'node:util';
import { Redis } from '@upstash/redis';
const { values } = parseArgs({ options: { 'source-env': { type: 'string' } } });
if (!values['source-env']) throw new Error('Use --source-env <protected file>');
const env = parseEnv(await readFile(values['source-env'], 'utf8'));
const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
if (!url || !token) throw new Error('Legacy credentials missing');
const source = new Redis({ url, token });
const keys = new Set<string>();
let cursor = '0';
do {
  const result = await source.scan(cursor, { count: 100 });
  cursor = String(result[0]); result[1].forEach(key => keys.add(key));
} while (cursor !== '0');
const counts: Record<string, number> = {};
for (const key of keys) counts[key.split(':')[0]] = (counts[key.split(':')[0]] ?? 0) + 1;
const accountKeys = [...keys].filter(key => /^user:\d{6,15}$/.test(key));
const users = await Promise.all(accountKeys.map(key => source.get<Record<string, unknown>>(key)));
const hashFormats: Record<string, number> = {};
for (const user of users) {
  const hash = user?.passwordHash;
  const format = typeof hash !== 'string' ? 'missing' : hash.startsWith('scrypt$N=16384,r=8,p=1$') ? 'standard-scrypt' : 'unsupported';
  hashFormats[format] = (hashFormats[format] ?? 0) + 1;
}
console.log(JSON.stringify({ keys: keys.size, counts, accountKeys: accountKeys.length, hashFormats, accountShapes: users.map(user => ({ keys: Object.keys(user ?? {}), hashLength: typeof user?.passwordHash === 'string' ? user.passwordHash.length : 0, scrypt: typeof user?.passwordHash === 'string' && user.passwordHash.startsWith('scrypt$') })), sourceModified: false }));
