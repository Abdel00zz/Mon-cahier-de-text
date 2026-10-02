import fs from 'node:fs';
import path from 'node:path';
import { encryptSigningBackup } from './signing-backup-format.mjs';
import { loadSigningEnvironment } from './load-signing.mjs';
import { root } from './toolchain.mjs';

const password = process.env.ANDROID_SIGNING_BACKUP_PASSWORD;
if (!password || password.length < 16) throw new Error('Set ANDROID_SIGNING_BACKUP_PASSWORD to a private passphrase of at least 16 characters; keep it in your password manager.');
const signing = loadSigningEnvironment(process.env);
const backup = encryptSigningBackup({ store: fs.readFileSync(signing.ANDROID_UPLOAD_STORE_FILE).toString('base64'),
  alias: signing.ANDROID_UPLOAD_KEY_ALIAS, storePassword: signing.ANDROID_UPLOAD_STORE_PASSWORD, keyPassword: signing.ANDROID_UPLOAD_KEY_PASSWORD }, password);
const output = path.join(root, 'artifacts/android/signing-backup.encrypted.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
// Do not silently replace a previous owner's recovery package.
fs.writeFileSync(output, JSON.stringify(backup, null, 2) + '\n', { flag: 'wx' });
console.log(`Encrypted, portable recovery package: ${output}. Store it separately from its passphrase.`);
