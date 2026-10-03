import { spawn } from 'node:child_process';
import path from 'node:path';
import { androidToolchain, root } from '../android/toolchain.mjs';

const { java } = androidToolchain({ requireSdk: false });
const cli = path.join(root, 'node_modules/firebase-tools/lib/bin/firebase.js');
const child = spawn(process.execPath, [cli, 'emulators:exec', '--project', 'demo-cahier-text', '--only', 'firestore,auth',
  'node --import tsx --test tests/firebase-emulator.integration.ts'], {
  cwd: root, stdio: 'inherit', windowsHide: true,
  env: { ...process.env, JAVA_HOME: java, PATH: `${path.join(java, 'bin')}${path.delimiter}${process.env.PATH}`,
    CLOUD_PROVIDER: 'firestore', FCM_PROJECT_ID: 'demo-cahier-text', FIREBASE_WEB_API_KEY: 'emulator-key' },
});
child.on('exit', code => { process.exitCode = code ?? 1; });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
