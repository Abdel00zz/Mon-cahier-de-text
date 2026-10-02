import assert from 'node:assert/strict';
import test from 'node:test';
import { encryptSigningBackup, decryptSigningBackup } from '../scripts/android/signing-backup-format.mjs';

// Synthetic fixtures only: tests never read or replace the production key.
const payload = { store: Buffer.from('synthetic-keystore').toString('base64'), alias: 'test-upload',
  storePassword: 'synthetic-private-store-password', keyPassword: 'synthetic-private-store-password' };
const passphrase = 'synthetic-backup-passphrase';

test('la sauvegarde de signature se récupère avec la phrase secrète et utilise un aléa par export', () => {
  const first = encryptSigningBackup(payload, passphrase);
  const second = encryptSigningBackup(payload, passphrase);
  assert.deepEqual(decryptSigningBackup(first, passphrase), payload);
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.iv, second.iv);
  assert.notEqual(first.data, second.data);
  assert.ok(!JSON.stringify(first).includes(payload.storePassword));
});

test('la restauration refuse le mauvais mot de passe, les octets modifiés et les formats inconnus', () => {
  const backup = encryptSigningBackup(payload, passphrase);
  const modified = Buffer.from(backup.data, 'base64');
  modified[0] ^= 1;
  for (const candidate of [
    { ...backup, data: modified.toString('base64') },
    { ...backup, format: 'unknown' }, { ...backup, kdf: 'unknown' },
    { ...backup, cipher: 'unknown' }, { ...backup, iv: '' },
  ]) assert.throws(() => decryptSigningBackup(candidate, passphrase), /authentication failed/);
  assert.throws(() => decryptSigningBackup(backup, 'wrong-private-passphrase'), /authentication failed/);
});

test('la sauvegarde refuse une phrase trop courte et les clés incomplètes', () => {
  assert.throws(() => encryptSigningBackup(payload, 'short'), /at least 16/);
  assert.throws(() => encryptSigningBackup({ ...payload, store: '' }, passphrase), /payload/);
  assert.throws(() => encryptSigningBackup({ ...payload, keyPassword: 'different' }, passphrase), /payload/);
});
