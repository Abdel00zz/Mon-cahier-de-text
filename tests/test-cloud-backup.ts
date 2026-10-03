import assert from 'node:assert/strict';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { backupDigest, decryptBackup, encryptBackup, restoreFirestoreEmulator, type CloudBackup } from '../scripts/firebase/backup-format';

const backup: CloudBackup = {format: 'cdt-firestore-backup', version: 1, projectId: 'cahier-text', exportedAt: '2026-10-03T00:00:00Z', readTime: '2026-10-03T00:00:00Z', scope: 'firestore-only', records: [{path: 'users/test/workspace/classes', value: ['map', [['json', ['string', 'رياضيات 🧮']]]]}]};
test('Firestore backup: authenticated encryption preserves Unicode and hides plaintext', () => {
  const key = randomBytes(32); const encrypted = encryptBackup(backup, key);
  assert.equal(encrypted.includes(Buffer.from('رياضيات')), false);
  assert.deepEqual(decryptBackup(encrypted, key), backup);
  assert.match(backupDigest(encrypted), /^[a-f0-9]{64}$/);
  assert.notDeepEqual(encryptBackup(backup, key), encrypted);
});
test('Firestore backup: wrong keys, tampering, unknown paths and duplicate documents fail', () => {
  const key = randomBytes(32); const encrypted = encryptBackup(backup, key);
  assert.throws(() => decryptBackup(encrypted, randomBytes(32)));
  const changed = Buffer.from(encrypted); changed[changed.length - 1] ^= 1;
  assert.throws(() => decryptBackup(changed, key));
  for (const records of [[{path: 'unrelated/x', value: ['map', []]}], [...backup.records, ...backup.records]]) {
    assert.throws(() => decryptBackup(encryptBackup({...backup, records}, key), key));
  }
});
test('Firestore restore: production and remote emulator addresses are refused before access', async () => {
  const previous = process.env.FIRESTORE_EMULATOR_HOST;
  try {
    delete process.env.FIRESTORE_EMULATOR_HOST;
    await assert.rejects(restoreFirestoreEmulator(backup), /local demo emulator/);
    process.env.FIRESTORE_EMULATOR_HOST = 'remote.example:8080';
    await assert.rejects(restoreFirestoreEmulator(backup), /local demo emulator/);
  } finally { if (previous === undefined) delete process.env.FIRESTORE_EMULATOR_HOST; else process.env.FIRESTORE_EMULATOR_HOST = previous; }
});
