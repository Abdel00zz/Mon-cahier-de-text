import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { firebaseDb } from '../../api/_lib/firebaseAdmin.js';
import { backupDigest, decryptBackup, encryptBackup, restoreFirestoreEmulator, snapshotFirestore } from './backup-format.js';

const {values} = parseArgs({options: {credentials: {type: 'string'}, output: {type: 'string'}, 'key-file': {type: 'string'}, 'backup-file': {type: 'string'}, apply: {type: 'boolean', default: false}}});
if (!values['key-file'] || (!!values.output === !!values['backup-file'])) throw new Error('Use --output <new encrypted backup> or --backup-file <backup to verify>, plus --key-file <protected 32-byte key>');
function outsideRepository(file: string) {
  const resolved = path.resolve(file);
  const relative = path.relative(process.cwd(), resolved);
  if (!relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)) throw new Error('Backup and key must stay outside the repository');
  return resolved;
}
const keyPath = outsideRepository(values['key-file']);
const filePath = outsideRepository(values.output ?? values['backup-file']!);
if (keyPath === filePath) throw new Error('Backup and key paths must differ');
async function protectedFolder(file: string) {
  const folder = path.dirname(file);
  if (process.platform === 'win32') {
    const privateRoot = path.resolve(process.env.LOCALAPPDATA ?? '', 'MonCahierDeTextes', 'backups');
    const relative = path.relative(privateRoot, folder);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Use the private LOCALAPPDATA/MonCahierDeTextes/backups directory on Windows');
  }
  await mkdir(folder, {recursive: true, mode: 0o700});
  if (process.platform === 'win32') {
    const who = execFileSync('whoami.exe', ['/user', '/fo', 'csv', '/nh'], {encoding: 'utf8', windowsHide: true});
    const sid = who.match(/S-1-\d+(?:-\d+)+/)?.[0];
    if (!sid) throw new Error('Cannot determine Windows account SID');
    execFileSync('icacls.exe', [folder, '/inheritance:r', '/grant:r', `*${sid}:(OI)(CI)F`, '*S-1-5-18:(OI)(CI)F'], {stdio: 'pipe', windowsHide: true});
  }
}
if (values.output) {
  if (!values.credentials || process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Cloud export requires protected service credentials and no emulator');
  const account = JSON.parse(await readFile(values.credentials, 'utf8'));
  if (account.project_id !== 'cahier-text') throw new Error('Unexpected Firebase project');
  process.env.FCM_PROJECT_ID = account.project_id; process.env.FCM_CLIENT_EMAIL = account.client_email; process.env.FCM_PRIVATE_KEY = account.private_key;
  await protectedFolder(filePath); await protectedFolder(keyPath);
  await access(filePath).then(() => { throw new Error('Backup already exists: use a new filename'); }, error => { if (error.code !== 'ENOENT') throw error; });
  let key: Buffer;
  try { key = await readFile(keyPath); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; key = randomBytes(32); await writeFile(keyPath, key, {flag: 'wx', mode: 0o600}); }
  if (key.length !== 32) throw new Error('Invalid backup key');
  const backup = await snapshotFirestore(firebaseDb(), account.project_id);
  const encrypted = encryptBackup(backup, key);
  await writeFile(filePath, encrypted, {flag: 'wx', mode: 0o600});
  const verified = decryptBackup(await readFile(filePath), key);
  if (JSON.stringify(verified) !== JSON.stringify(backup)) throw new Error('Backup read-back failed');
  console.log(JSON.stringify({project: backup.projectId, scope: backup.scope, documents: backup.records.length, readTime: backup.readTime, encryptedBytes: encrypted.length, sha256: backupDigest(encrypted), readBackVerified: true}));
} else {
  const backup = decryptBackup(await readFile(filePath), await readFile(keyPath));
  if (backup.projectId !== 'cahier-text') throw new Error('Unexpected backup project');
  console.log(JSON.stringify({project: backup.projectId, scope: backup.scope, documents: backup.records.length, dryRun: !values.apply}));
  if (values.apply) {
    console.log(JSON.stringify(await restoreFirestoreEmulator(backup)));
  }
}
