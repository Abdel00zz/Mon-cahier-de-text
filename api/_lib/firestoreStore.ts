import { createHash } from 'node:crypto';
import { Timestamp, type DocumentReference, type Firestore, type Transaction } from 'firebase-admin/firestore';
import { firebaseDb, teacherUid } from './firebaseAdmin.js';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const PART_BYTES = 600_000;
type RecordData = { key?: string; field?: string; json?: string; parts?: number; expiresAt?: Timestamp };
type Operation = ['get' | 'set' | 'del' | 'hget' | 'hset' | 'hdel', string, unknown?, unknown?];

/** Physical paths are stable, scoped by UID, and independent of phone formatting. */
export function recordPath(key: string): string {
  const [kind, phone, ...rest] = key.split(':');
  const uid = teacherUid(phone ?? '');
  if (kind === 'user') return `users/${uid}/private/account`;
  if (kind === 'classes') return `users/${uid}/workspace/classes`;
  if (kind === 'lessons') return `users/${uid}/notebooks/${digest(rest.join(':'))}`;
  if (key.startsWith('admin:messages:')) return `users/${teacherUid(rest.join(':'))}/workspace/inbox`;
  if (key.startsWith('admin:inbox-clock:')) return `users/${teacherUid(rest.join(':'))}/workspace/inbox-clock`;
  return `cloud_records/${digest(key)}`;
}
const hashPath = (key: string) => `cloud_hashes/${digest(key)}/entries`;
const hashRecordPath = (key: string, field: string) => key === 'admin:snapshots'
  ? `teacher_snapshots/${teacherUid(field)}` : `${hashPath(key)}/${digest(field)}`;

/** JSON is preserved byte-for-byte; UTF-8 chunks remain below Firestore's 1 MiB limit. */
export function encodeRecord(value: unknown): Pick<RecordData, 'json' | 'parts'> & { chunks: string[] } {
  const json = JSON.stringify(value);
  if (json === undefined) throw new Error('Undefined cloud value');
  const bytes = Buffer.from(json, 'utf8');
  if (bytes.length <= PART_BYTES) return { json, chunks: [] };
  const chunks: string[] = [];
  let offset = 0;
  while (offset < bytes.length) {
    let end = Math.min(offset + PART_BYTES, bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    chunks.push(bytes.subarray(offset, end).toString('utf8'));
    offset = end;
  }
  if (chunks.length > 100) throw new Error('Cloud value too large');
  return { parts: chunks.length, chunks };
}

/** Writes are buffered until all reads finish: required by Firestore transactions. */
export class FirestoreView {
  private cache = new Map<string, { data: RecordData; value: unknown }>();
  private pending = new Map<string, { ref: DocumentReference; data: Record<string, unknown> | null }>();
  constructor(private db: Firestore, private tx?: Transaction) {}

  private async read(path: string): Promise<unknown> {
    if (this.cache.has(path)) return this.cache.get(path)!.value;
    const ref = this.db.doc(path);
    const snapshot = this.tx ? await this.tx.get(ref) : await ref.get();
    const data = (snapshot.data() ?? {}) as RecordData;
    let value: unknown = null;
    if (snapshot.exists && (!data.expiresAt || data.expiresAt.toMillis() > Date.now())) {
      if (data.parts) {
        const refs = Array.from({ length: data.parts }, (_, i) => ref.collection('parts').doc(String(i)));
        const parts = this.tx ? await this.tx.getAll(...refs) : await this.db.getAll(...refs);
        if (parts.some(part => typeof part.data()?.json !== 'string')) throw new Error('Incomplete cloud record');
        value = JSON.parse(parts.map(part => part.data()!.json).join(''));
      } else if (typeof data.json === 'string') value = JSON.parse(data.json);
    }
    this.cache.set(path, { data, value });
    return value;
  }

  private async write(path: string, value: unknown, metadata: Record<string, unknown> = {}, remove = false) {
    await this.read(path);
    const previous = this.cache.get(path)!.data;
    const ref = this.db.doc(path);
    const encoded = remove ? null : encodeRecord(value);
    for (let i = 0; i < Math.max(previous.parts ?? 0, encoded?.chunks.length ?? 0); i++) {
      const part = ref.collection('parts').doc(String(i));
      this.pending.set(part.path, { ref: part, data: encoded?.chunks[i] === undefined ? null : { json: encoded.chunks[i] } });
    }
    const data = encoded ? { ...metadata, ...(encoded.json !== undefined ? { json: encoded.json } : { parts: encoded.parts }) } : null;
    this.pending.set(path, { ref, data });
    this.cache.set(path, { data: (data ?? {}) as RecordData, value });
  }
  get<T = unknown>(key: string): Promise<T | null> { return this.read(recordPath(key)) as Promise<T | null>; }
  private async exists(path: string) {
    await this.read(path);
    const data = this.cache.get(path)!.data;
    return (typeof data.json === 'string' || !!data.parts) && (!data.expiresAt || data.expiresAt.toMillis() > Date.now());
  }
  async set(key: string, value: unknown, options: { nx?: boolean; ex?: number } = {}) {
    if (options.nx && await this.exists(recordPath(key))) return null;
    await this.write(recordPath(key), value, { key, ...(options.ex ? { expiresAt: Timestamp.fromMillis(Date.now() + options.ex * 1000) } : {}) });
    if (key.startsWith('user:') && value && typeof value === 'object') {
      const user = value as { phone: string; nom: string; prenom: string; blocked?: boolean };
      const ref = this.db.doc(`users/${teacherUid(user.phone)}`);
      this.pending.set(ref.path, { ref, data: { phone: user.phone, nom: user.nom, prenom: user.prenom, role: 'teacher', blocked: user.blocked === true } });
    }
    return 'OK';
  }
  async del(...keys: string[]) {
    for (const key of keys) {
      await this.write(recordPath(key), null, {}, true);
      if (key.startsWith('user:')) {
        const ref = this.db.doc(`users/${teacherUid(key.slice(5))}`);
        this.pending.set(ref.path, { ref, data: null });
      }
    }
    return keys.length;
  }
  hget<T = unknown>(key: string, field: string): Promise<T | null> { return this.read(hashRecordPath(key, field)) as Promise<T | null>; }
  async hset(key: string, fields: Record<string, unknown>) {
    for (const [field, value] of Object.entries(fields)) await this.write(hashRecordPath(key, field), value, { key, field });
    return Object.keys(fields).length;
  }
  async hsetnx(key: string, field: string, value: unknown) {
    if (await this.exists(hashRecordPath(key, field))) return 0;
    await this.hset(key, { [field]: value });
    return 1;
  }
  async hdel(key: string, ...fields: string[]) {
    for (const field of fields) await this.write(hashRecordPath(key, field), null, {}, true);
    return fields.length;
  }
  async hgetall<T = Record<string, unknown>>(key: string): Promise<T | null> {
    const collection = this.db.collection(key === 'admin:snapshots' ? 'teacher_snapshots' : hashPath(key));
    const snapshot = this.tx ? await this.tx.get(collection) : await collection.get();
    const entries: Record<string, unknown> = {};
    for (const doc of snapshot.docs) {
      const data = doc.data() as RecordData;
      const field = data.field;
      if (typeof field === 'string') {
        if (!this.cache.has(doc.ref.path) && typeof data.json === 'string') {
          this.cache.set(doc.ref.path, { data, value: data.expiresAt && data.expiresAt.toMillis() <= Date.now() ? null : JSON.parse(data.json) });
        }
        const value = await this.read(doc.ref.path);
        if (value !== null) entries[field] = value;
      }
    }
    for (const [path, cached] of this.cache) {
      if (cached.data.key === key && cached.data.field && path.startsWith(collection.path + '/') && cached.value !== null) entries[cached.data.field] = cached.value;
    }
    return Object.keys(entries).length ? entries as T : null;
  }
  async incr(key: string) {
    const count = Number(await this.get(key) ?? 0) + 1;
    const expiry = this.cache.get(recordPath(key))?.data.expiresAt;
    await this.write(recordPath(key), count, { key, ...(expiry && expiry.toMillis() > Date.now() ? { expiresAt: expiry } : {}) });
    return count;
  }
  async expire(key: string, seconds: number) {
    const value = await this.get(key);
    if (value === null) return 0;
    await this.set(key, value, { ex: seconds });
    return 1;
  }
  async ttl(key: string) {
    if (await this.get(key) === null) return -2;
    const expiry = this.cache.get(recordPath(key))?.data.expiresAt;
    return expiry ? Math.max(0, Math.ceil((expiry.toMillis() - Date.now()) / 1000)) : -1;
  }
  flush() {
    if (!this.tx) throw new Error('Writes require a transaction');
    if (this.pending.size > 450) throw new Error('Cloud transaction too large');
    for (const { ref, data } of this.pending.values()) {
      if (data) this.tx.set(ref, data); else this.tx.delete(ref);
    }
  }
}

/** Transitional API adapter preserves the existing conflict/offline contracts. No Lua emulation. */
export class FirestoreStore {
  constructor(readonly db = firebaseDb()) {}
  async atomic<T>(callback: (view: FirestoreView) => Promise<T>): Promise<T> {
    return this.db.runTransaction(async tx => {
      const view = new FirestoreView(this.db, tx);
      const result = await callback(view);
      view.flush();
      return result;
    });
  }
  get<T = unknown>(key: string) { return new FirestoreView(this.db).get<T>(key); }
  hget<T = unknown>(key: string, field: string) { return new FirestoreView(this.db).hget<T>(key, field); }
  hgetall<T = Record<string, unknown>>(key: string) { return new FirestoreView(this.db).hgetall<T>(key); }
  set(key: string, value: unknown, options?: { nx?: boolean; ex?: number }) { return this.atomic(view => view.set(key, value, options)); }
  del(...keys: string[]) { return this.atomic(view => view.del(...keys)); }
  hset(key: string, fields: Record<string, unknown>) { return this.atomic(view => view.hset(key, fields)); }
  hsetnx(key: string, field: string, value: unknown) { return this.atomic(view => view.hsetnx(key, field, value)); }
  hdel(key: string, ...fields: string[]) { return this.atomic(view => view.hdel(key, ...fields)); }
  incr(key: string) { return this.atomic(view => view.incr(key)); }
  expire(key: string, seconds: number) { return this.atomic(view => view.expire(key, seconds)); }
  pipeline() {
    const operations: Operation[] = [];
    const pipeline = {
      get(key: string) { operations.push(['get', key]); return pipeline; },
      set(key: string, value: unknown) { operations.push(['set', key, value]); return pipeline; },
      del(key: string) { operations.push(['del', key]); return pipeline; },
      hget(key: string, field: string) { operations.push(['hget', key, field]); return pipeline; },
      hset(key: string, fields: Record<string, unknown>) { operations.push(['hset', key, fields]); return pipeline; },
      hdel(key: string, field: string) { operations.push(['hdel', key, field]); return pipeline; },
      exec: () => this.atomic(async view => {
        const results: unknown[] = [];
        for (const [method, key, value] of operations) {
          switch (method) {
            case 'get': results.push(await view.get(key)); break;
            case 'set': results.push(await view.set(key, value)); break;
            case 'del': results.push(await view.del(key)); break;
            case 'hget': results.push(await view.hget(key, String(value))); break;
            case 'hset': results.push(await view.hset(key, value as Record<string, unknown>)); break;
            case 'hdel': results.push(await view.hdel(key, String(value))); break;
          }
        }
        return results;
      }),
    };
    return pipeline;
  }
}
