import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { parseArgs, parseEnv } from 'node:util';
import { Redis } from '@upstash/redis';
import { FirestoreStore } from '../../api/_lib/firestoreStore.js';
import { importFirebaseTeacher, type MigratableUser } from '../../api/_lib/firebaseIdentity.js';
import { isCahierRecord } from './source-scope.js';

type ExportRecord = { key: string; type: string; value: unknown; expiresAt?: number };
const { values } = parseArgs({ options: {
  credentials: { type: 'string' }, 'source-env': { type: 'string' }, backup: { type: 'string' },
  apply: { type: 'boolean', default: false }, 'initialize-empty': { type: 'boolean', default: false },
  'source-frozen': { type: 'boolean', default: false },
} });
if (!values.credentials) throw new Error('--credentials must point to the protected service-account file');
const credentials = JSON.parse(await fs.readFile(values.credentials, 'utf8'));
if (credentials.project_id !== 'cahier-text') throw new Error('Unexpected Firebase target project');
process.env.FCM_PROJECT_ID = credentials.project_id;
process.env.FCM_CLIENT_EMAIL = credentials.client_email;
process.env.FCM_PRIVATE_KEY = credentials.private_key;
const target = new FirestoreStore();
let records: ExportRecord[] = [];

if (values['source-env']) {
  if (!values['source-frozen']) throw new Error('Freeze the legacy application before export, then pass --source-frozen');
  if (!values.backup) throw new Error('--backup is required before reading a legacy source');
  const backup = path.resolve(values.backup);
  const root = path.resolve('.');
  if (backup === root || backup.startsWith(root + path.sep)) throw new Error('Backup must be outside the repository, in a protected folder');
  const sourceEnv = parseEnv(await fs.readFile(values['source-env'], 'utf8'));
  const url = sourceEnv.UPSTASH_REDIS_REST_URL || sourceEnv.KV_REST_API_URL;
  const token = sourceEnv.UPSTASH_REDIS_REST_TOKEN || sourceEnv.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('Legacy Redis credentials missing');
  const source = new Redis({ url, token });
  const keys = new Set<string>();
  let cursor = '0';
  do {
    const result = await source.scan(cursor, { count: 100 });
    cursor = String(result[0]);
    result[1].forEach(key => keys.add(key));
  } while (cursor !== '0');
  const exported: ExportRecord[] = [];
  for (const key of [...keys].sort()) {
    const type: string = await source.type(key);
    let value: unknown;
    if (type === 'string') value = await source.get(key);
    else if (type === 'hash') value = await source.hgetall(key);
    else if (type === 'list') value = await source.lrange(key, 0, -1);
    else if (type === 'set') value = await source.smembers(key);
    else if (type === 'zset') value = await source.zrange(key, 0, -1, { withScores: true });
    else if (type === 'stream') value = await source.xrange(key, '-', '+');
    else throw new Error('Unsupported legacy record type; source may have changed during export');
    const ttl = await source.ttl(key);
    exported.push({ key, type, value, ...(ttl > 0 ? { expiresAt: Date.now() + ttl * 1000 } : {}) });
  }
  // A source freeze is required: an unchanged scan is not a cross-cloud transaction.
  const json = JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), records: exported });
  await fs.writeFile(backup, json, { flag: 'wx', mode: 0o600 });
  const saved = await fs.readFile(backup, 'utf8');
  if (saved !== json) throw new Error('Backup verification failed');
  records = exported.filter(record => isCahierRecord(record.key));
  if (records.some(record => record.type !== 'string' && record.type !== 'hash')) throw new Error('Unsupported cahier record type');
  console.log(JSON.stringify({ backupVerified: true, totalSourceRecords: exported.length, migrationRecords: records.length, sha256: createHash('sha256').update(saved).digest('hex') }));
} else if (!values['initialize-empty']) {
  throw new Error('Specify --source-env, or explicitly --initialize-empty after confirming no legacy cloud database exists');
}

const users = records.filter(record => record.key.startsWith('user:')).map(record => record.value as MigratableUser);
console.log(JSON.stringify({ dryRun: !values.apply, users: users.length, records: records.length, project: 'cahier-text' }));
if (values.apply) {
  for (const user of users) await importFirebaseTeacher(user);
  for (const record of records) {
    if (record.type === 'string') {
      await target.atomic(async view => {
        const existing = await view.get(record.key);
        if (existing !== null && !isDeepStrictEqual(existing, record.value)) throw new Error('Target record differs; refusing overwrite');
        await view.set(record.key, record.value, record.expiresAt ? { ex: Math.max(1, Math.ceil((record.expiresAt - Date.now()) / 1000)) } : {});
      });
    } else {
      for (const [field, value] of Object.entries(record.value as Record<string, unknown>)) {
        await target.atomic(async view => {
          const existing = await view.hget(record.key, field);
          if (existing !== null && !isDeepStrictEqual(existing, value)) throw new Error('Target hash entry differs; refusing overwrite');
          await view.hset(record.key, { [field]: value });
        });
      }
    }
  }
  for (const record of records) {
    const copied = record.type === 'string' ? await target.get(record.key) : await target.hgetall(record.key);
    if (!isDeepStrictEqual(copied, record.value)) throw new Error('Post-import comparison failed');
  }
  const calendar = JSON.parse(await fs.readFile('public/vacances-jourferie.json', 'utf8'));
  const events = JSON.parse(await fs.readFile('public/official-student-events.json', 'utf8'));
  await target.set('admin:calendar', calendar, { nx: true });
  await target.set('admin:official-events', events, { nx: true });
  console.log(JSON.stringify({ importVerified: true, users: users.length, records: records.length, calendarSeeded: true, sourceModified: false }));
}
