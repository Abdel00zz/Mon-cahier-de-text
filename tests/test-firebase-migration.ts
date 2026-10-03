import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeRecord, recordPath } from '../api/_lib/firestoreStore.js';
import { firebasePasswordImport, STANDARD_SCRYPT_OPTIONS } from '../api/_lib/firebaseIdentity.js';
import { teacherUid } from '../api/_lib/firebaseAdmin.js';
import { hashPassword, verifyPassword } from '../api/_lib/auth.js';

test('migration preserves UTF-8 content and chunks large notebooks below document limits', () => {
  const original = { lessonsData: [{ content: 'رياضيات 🧮 é漢'.repeat(100_000) }], updatedAt: '2026-10-03T00:00:00.000Z' };
  const encoded = encodeRecord(original);
  assert.ok(encoded.chunks.length > 1);
  assert.deepEqual(JSON.parse(encoded.chunks.join('')), original);
  assert.ok(encoded.chunks.every(chunk => Buffer.byteLength(chunk, 'utf8') <= 600_000));
});

test('cloud paths isolate accounts, hash class IDs and never interpret path separators', () => {
  const a = '0611111111'; const b = '0622222222';
  assert.notEqual(teacherUid(a), teacherUid(b));
  assert.ok(recordPath(`user:${a}`).startsWith(`users/${teacherUid(a)}/private/`));
  assert.notEqual(recordPath(`lessons:${a}:c1`), recordPath(`lessons:${b}:c1`));
  assert.equal(recordPath(`lessons:${a}:../../admin`).split('/').length, 4);
  assert.equal(recordPath(`admin:messages:${a}`), `users/${teacherUid(a)}/workspace/inbox`);
});

test('existing scrypt passwords import without reset and with the exact original parameters', async () => {
  const passwordHash = await hashPassword('A long password 123!');
  const user = { phone: '0611111111', nom: 'Prof', prenom: 'Test', passwordHash, blocked: true };
  const imported = firebasePasswordImport(user);
  assert.equal(imported.disabled, true);
  assert.deepEqual(imported.customClaims, { role: 'teacher' });
  assert.equal(imported.uid, teacherUid(user.phone));
  assert.equal(imported.emailVerified, false);
  const restored = `scrypt$N=16384,r=8,p=1$${imported.passwordSalt.toString('base64')}$${imported.passwordHash.toString('base64')}`;
  assert.ok(await verifyPassword('A long password 123!', restored));
  assert.deepEqual(STANDARD_SCRYPT_OPTIONS.hash, { algorithm: 'STANDARD_SCRYPT', memoryCost: 16384, parallelization: 1, blockSize: 8, derivedKeyLength: 64 });
  assert.throws(() => firebasePasswordImport({ ...user, passwordHash: passwordHash.replace('16384', '1024') }));
});
import { isCahierRecord } from '../scripts/firebase/source-scope.js';

test('shared legacy database: only exact cahier API keys are migrated', () => {
  assert.equal(isCahierRecord('user:0612345678'), true);
  assert.equal(isCahierRecord('lessons:0612345678:class-one'), true);
  assert.equal(isCahierRecord('user:metadata:0612345678'), false);
  assert.equal(isCahierRecord('user:abc123:settings'), false);
  assert.equal(isCahierRecord('content:file:data.json'), false);
  assert.equal(isCahierRecord('users:0612345678'), false);
  assert.equal(isCahierRecord('push:unrelated'), false);
});
