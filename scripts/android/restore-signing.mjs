import fs from 'node:fs';
import path from 'node:path';
import { decryptSigningBackup } from './signing-backup-format.mjs';
import { spawnSync } from 'node:child_process';
import { root } from './toolchain.mjs';

if (process.platform !== 'win32') throw new Error('Automatic DPAPI restore requires Windows.');
const file = process.argv[2];
const password = process.env.ANDROID_SIGNING_BACKUP_PASSWORD;
if (!file || !password || fs.statSync(file).size > 2_000_000) throw new Error('Provide the encrypted backup path and ANDROID_SIGNING_BACKUP_PASSWORD.');
const payload = JSON.stringify(decryptSigningBackup(JSON.parse(fs.readFileSync(file, 'utf8')), password));
const environment = { ...process.env };
delete environment.PSModulePath;
const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'scripts/android/signing.ps1'), '-Mode', 'Import'], { input: payload, env: environment, encoding: 'utf8', windowsHide: true });
if (result.status !== 0) throw new Error('Restore refused. Preserve the existing signing directory; a key is never overwritten.');
console.log('Upload key restored outside the repository, with Windows DPAPI protection.');
