import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root } from './toolchain.mjs';

export function loadSigningEnvironment(currentEnvironment) {
  const environment = { ...currentEnvironment };
  const keys = ['ANDROID_UPLOAD_STORE_FILE', 'ANDROID_UPLOAD_STORE_PASSWORD', 'ANDROID_UPLOAD_KEY_ALIAS', 'ANDROID_UPLOAD_KEY_PASSWORD'];
  if (keys.some(key => environment[key]) && !keys.every(key => environment[key])) throw new Error('All four ANDROID_UPLOAD_* variables are required.');
  if (!keys.every(key => environment[key]) && process.platform === 'win32') {
    const signingEnvironment = { ...environment };
    delete signingEnvironment.PSModulePath;
    const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(root, 'scripts/android/signing.ps1'), '-Mode', 'Read'], { env: signingEnvironment, encoding: 'utf8', windowsHide: true });
    // Captured credentials must never be echoed or included in errors.
    if (result.status !== 0) throw new Error('Private upload key unavailable. Run npm run android:signing.');
    Object.assign(environment, JSON.parse(result.stdout.replace(/^\uFEFF/, '')));
  }
  if (!keys.every(key => environment[key]) || !fs.existsSync(environment.ANDROID_UPLOAD_STORE_FILE)) throw new Error('Release requires the private upload key.');
  return environment;
}
