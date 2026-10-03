import { spawn } from 'node:child_process';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { androidToolchain, root } from '../android/toolchain.mjs';

const {values} = parseArgs({options: {'backup-file': {type: 'string'}, 'key-file': {type: 'string'}, 'inside-emulator': {type: 'boolean'}}});
let args;
let env = {...process.env};
if (values['inside-emulator']) {
  if (!env.FIRESTORE_EMULATOR_HOST || !env.CDT_BACKUP_FILE || !env.CDT_BACKUP_KEY) throw new Error('Missing local rehearsal configuration');
  args = ['--import', 'tsx', 'scripts/firebase/backup-cloud.ts', '--backup-file', env.CDT_BACKUP_FILE, '--key-file', env.CDT_BACKUP_KEY, '--apply'];
} else {
  if (!values['backup-file'] || !values['key-file']) throw new Error('Use --backup-file <encrypted snapshot> --key-file <protected key>');
  const {java} = androidToolchain({requireSdk: false});
  env = {...env, JAVA_HOME: java, PATH: `${path.dirname(process.execPath)}${path.delimiter}${path.join(java, 'bin')}${path.delimiter}${env.PATH}`,
    CDT_BACKUP_FILE: path.resolve(values['backup-file']), CDT_BACKUP_KEY: path.resolve(values['key-file'])};
  // The fixed demo project and localhost-only restore prohibit production writes.
  args = [path.join(root, 'node_modules/firebase-tools/lib/bin/firebase.js'), 'emulators:exec', '--project', 'demo-cahier-text-backup', '--only', 'firestore',
    'node scripts/firebase/rehearse-backup.mjs --inside-emulator'];
}
const child = spawn(process.execPath, args, {cwd: root, stdio: 'inherit', windowsHide: true, env});
child.on('exit', code => {process.exitCode = code ?? 1;});
child.on('error', error => {console.error(error.message); process.exitCode = 1;});
