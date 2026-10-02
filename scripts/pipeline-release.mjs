import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { root } from './android/toolchain.mjs';

const args = process.argv.slice(2);
const serial = args.includes('--serial') ? args[args.indexOf('--serial') + 1] : undefined;
const next = args.includes('--version') ? args[args.indexOf('--version') + 1] : undefined;
const skipSmoke = args.includes('--skip-smoke');
if ((!serial && !skipSmoke) || (serial && !/^[\w.:-]+$/.test(serial))) throw new Error('Select a test device: npm run release -- --serial emulator-5580 [--version 1.2.5]. CI without an emulator: --skip-smoke.');
if (next && !/^\d+\.\d+\.\d+$/.test(next)) throw new Error('Version must be x.y.z.');
const run = (command, commandArgs) => {
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error('Release validation failed; no deployment was performed.');
};
run(process.execPath, ['tests/run-all.mjs']);
// Use npm's JS entry point to avoid cmd.exe quoting and shell injection on Windows.
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Start this pipeline using npm run release.');
run(process.execPath, [npm, 'run', 'check']);
if (next) run(process.execPath, ['scripts/android/bump-version.mjs', next]);
run(process.execPath, ['scripts/android/build-apk.mjs', '--release']);
if (serial) run(process.execPath, ['scripts/android/smoke-test.mjs', '--serial', serial]);
const release = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/android/release.json'), 'utf8'));
fs.writeFileSync(path.join(root, 'artifacts/android/validation.json'), JSON.stringify({ version: release.version,
  versionCode: release.versionCode, validatedAt: new Date().toISOString(), tests: 'passed', checks: 'passed',
  signature: 'verified', nativeStartup: serial ? 'passed' : 'skipped', device: serial ?? null }, null, 2) + '\n');
console.log('Signed release prepared. Upload the AAB to the internal Play track, or publish the APK and its verified metadata.');
