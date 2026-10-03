import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
import { FieldPath, Firestore, GeoPoint, Timestamp, type DocumentSnapshot } from 'firebase-admin/firestore';

export const CLOUD_COLLECTIONS = ['users', 'private', 'workspace', 'notebooks', 'parts', 'teacher_snapshots', 'cloud_records', 'cloud_hashes', 'entries'] as const;
const ROOT_COLLECTIONS = new Set(['users', 'teacher_snapshots', 'cloud_records', 'cloud_hashes']);
const MAGIC = Buffer.from('CDT-FS1\n');
const MAX_BYTES = 64 * 1024 * 1024;
type Value = unknown[];
export interface CloudBackup {
  format: 'cdt-firestore-backup'; version: 1; projectId: string; exportedAt: string; readTime: string;
  scope: 'firestore-only'; records: {path: string; value: Value}[];
}

function encode(value: unknown): Value {
  if (value === null) return ['null'];
  if (typeof value === 'string' || typeof value === 'boolean') return [typeof value, value];
  if (typeof value === 'number') return ['number', Object.is(value, -0) ? '-0' : String(value)];
  if (value instanceof Timestamp) return ['timestamp', value.seconds, value.nanoseconds];
  if (value instanceof GeoPoint) return ['geopoint', value.latitude, value.longitude];
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return ['bytes', Buffer.from(value).toString('base64')];
  if (Array.isArray(value)) return ['array', value.map(encode)];
  if (value && typeof value === 'object') {
    // DocumentReference is a supported Firestore value, with a database-local path.
    if ('path' in value && 'firestore' in value && typeof value.path === 'string') return ['reference', value.path];
    return ['map', Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, encode(item)])];
  }
  throw new Error('Unsupported Firestore backup value');
}

function decode(value: Value, db?: Firestore, depth = 0): unknown {
  if (!Array.isArray(value) || depth > 40) throw new Error('Invalid backup value');
  const [kind, a, b] = value;
  switch (kind) {
    case 'null': return null;
    case 'string': if (typeof a === 'string') return a; break;
    case 'boolean': if (typeof a === 'boolean') return a; break;
    case 'number': if (typeof a === 'string' && (a === '-0' || String(Number(a)) === a)) return Number(a); break;
    case 'timestamp': if (Number.isInteger(a) && Number.isInteger(b)) return new Timestamp(a as number, b as number); break;
    case 'geopoint': if (typeof a === 'number' && typeof b === 'number') return new GeoPoint(a, b); break;
    case 'bytes': if (typeof a === 'string' && Buffer.from(a, 'base64').toString('base64') === a) return Buffer.from(a, 'base64'); break;
    case 'reference': if (typeof a === 'string' && validPath(a)) return db ? db.doc(a) : {path: a}; break;
    case 'array': if (Array.isArray(a)) return a.map(item => decode(item as Value, db, depth + 1)); break;
    case 'map': if (Array.isArray(a)) {
      if (a.some(entry => !Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string')) break;
      if (new Set(a.map(entry => entry[0])).size !== a.length) break;
      return Object.fromEntries(a.map(([key, item]) => [key, decode(item, db, depth + 1)]));
    }
  }
  throw new Error('Invalid backup value');
}

function validPath(path: string) {
  const segments = path.split('/');
  return segments.length % 2 === 0 && segments.length >= 2 && ROOT_COLLECTIONS.has(segments[0])
    && segments.every(segment => !!segment && segment !== '.' && segment !== '..')
    && segments.filter((_, index) => index % 2 === 0).every(collection => (CLOUD_COLLECTIONS as readonly string[]).includes(collection));
}

/** A read-only transaction provides one consistent view across documents and chunks. */
export async function snapshotFirestore(db: Firestore, projectId: string): Promise<CloudBackup> {
  const roots = await db.listCollections();
  if (roots.some(collection => !ROOT_COLLECTIONS.has(collection.id))) throw new Error('Unknown collection: update the backup schema before exporting');
  return db.runTransaction(async tx => {
    const records: CloudBackup['records'] = [];
    let bytes = 0;
    let readTime = '';
    for (const collection of CLOUD_COLLECTIONS) {
      let last: DocumentSnapshot | undefined;
      for (;;) {
        let query = db.collectionGroup(collection).orderBy(FieldPath.documentId()).limit(100);
        if (last) query = query.startAfter(last);
        const page = await tx.get(query);
        readTime ||= page.readTime.toDate().toISOString();
        for (const doc of page.docs) {
          if (!validPath(doc.ref.path)) throw new Error('Unexpected backup document path');
          const record = {path: doc.ref.path, value: encode(doc.data())};
          bytes += Buffer.byteLength(JSON.stringify(record));
          if (bytes > MAX_BYTES) throw new Error('Backup byte budget exceeded');
          records.push(record);
          if (records.length > 100_000) throw new Error('Backup document budget exceeded');
        }
        if (page.size < 100) break;
        last = page.docs.at(-1);
      }
    }
    records.sort((a, b) => a.path.localeCompare(b.path));
    return {format: 'cdt-firestore-backup', version: 1, projectId, exportedAt: new Date().toISOString(), readTime, scope: 'firestore-only', records};
  }, {readOnly: true});
}

export function encryptBackup(backup: CloudBackup, key: Buffer): Buffer {
  if (key.length !== 32) throw new Error('Backup key must contain 32 bytes');
  const json = Buffer.from(JSON.stringify(backup));
  if (json.length > MAX_BYTES) throw new Error('Backup byte budget exceeded');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(MAGIC);
  const encrypted = Buffer.concat([cipher.update(gzipSync(json)), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), encrypted]);
}

export function decryptBackup(file: Buffer, key: Buffer): CloudBackup {
  if (key.length !== 32 || file.length < 36 || file.length > MAX_BYTES || !file.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Invalid encrypted backup');
  const decipher = createDecipheriv('aes-256-gcm', key, file.subarray(8, 20));
  decipher.setAAD(MAGIC); decipher.setAuthTag(file.subarray(20, 36));
  const json = gunzipSync(Buffer.concat([decipher.update(file.subarray(36)), decipher.final()]), {maxOutputLength: MAX_BYTES});
  const backup = JSON.parse(json.toString('utf8')) as CloudBackup;
  if (backup.format !== 'cdt-firestore-backup' || backup.version !== 1 || backup.scope !== 'firestore-only'
    || typeof backup.projectId !== 'string' || !Array.isArray(backup.records) || backup.records.length > 100_000) throw new Error('Unsupported backup format');
  const paths = new Set<string>();
  for (const record of backup.records) {
    if (!record || typeof record.path !== 'string' || !validPath(record.path) || paths.has(record.path) || !Array.isArray(record.value) || record.value[0] !== 'map') throw new Error('Invalid backup document');
    paths.add(record.path);
    decode(record.value);
  }
  return backup;
}

export const backupDigest = (file: Buffer) => createHash('sha256').update(file).digest('hex');

/** Restores are deliberately restricted to an empty local emulator for rehearsal. */
export async function restoreFirestoreEmulator(backup: CloudBackup) {
  const host = process.env.FIRESTORE_EMULATOR_HOST ?? '';
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) throw new Error('Restore requires a local demo emulator; production is never overwritten');
  const projectId = 'demo-cahier-text-backup';
  const db = new Firestore({projectId, host, ssl: false});
  try {
    const prepared = backup.records.map(record => ({ref: db.doc(record.path), data: decode(record.value, db) as Record<string, unknown>}));
    const existing = await snapshotFirestore(db, projectId);
    if (existing.records.length) throw new Error('Restore target must be empty');
    for (let offset = 0; offset < prepared.length; offset += 400) {
      const batch = db.batch();
      for (const {ref, data} of prepared.slice(offset, offset + 400)) batch.create(ref, data);
      await batch.commit();
    }
    const verified = await snapshotFirestore(db, projectId);
    if (JSON.stringify(verified.records) !== JSON.stringify(backup.records)) throw new Error('Restored document comparison failed');
    return {restoredDocuments: verified.records.length, comparisonVerified: true};
  } finally { await db.terminate(); }
}
