import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import { androidToolchain, root } from './toolchain.mjs';

const args = process.argv.slice(2);
const option = name => args[args.indexOf(name) + 1];
const serial = args.includes('--serial') ? option('--serial') : undefined;
if (!serial || !/^[\w.:-]+$/.test(serial)) throw new Error('Usage: npm run android:smoke -- --serial emulator-5580 [--apk path/to/release.apk]');
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const apk = path.resolve(root, args.includes('--apk') ? option('--apk') : `artifacts/android/mon-cahier-de-textes-${metadata.version}-release.apk`);
if (!fs.existsSync(apk)) throw new Error(`APK missing: ${apk}`);
const { sdk, environment } = androidToolchain();
const adb = path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const packageName = 'ma.cahier.textes';
const run = (...command) => {
  const result = spawnSync(adb, ['-s', serial, ...command], { env: environment, encoding: 'utf8', windowsHide: true, timeout: 60_000, maxBuffer: 4_000_000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command.join(' ')}: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
};

// Update in place: never clear or uninstall the teacher's local data.
if (run('shell', 'getprop', 'sys.boot_completed') !== '1') throw new Error('Wait until Android finishes booting before running the startup test.');
console.log(run('install', '-r', apk));
const before = run('logcat', '-b', 'crash', '-d', '-v', 'threadtime');
run('shell', 'am', 'force-stop', packageName);
const logDirectory = path.join(root, 'tmp');
fs.mkdirSync(logDirectory, { recursive: true });
let pid;
try {
  const launch = run('shell', 'am', 'start', '-W', '-n', `${packageName}/.MainActivity`);
  console.log(launch);
  if (/^Error|Exception/m.test(launch)) throw new Error('Android refused to launch MainActivity.');
  for (const interval of [5_000, 5_000, 10_000]) {
    await wait(interval);
    const current = run('shell', 'pidof', packageName);
    if (!current || (pid && current !== pid)) throw new Error('The app stopped or restarted during startup.');
    pid = current;
  }
  const activity = run('shell', 'dumpsys', 'activity', 'activities');
  fs.writeFileSync(path.join(logDirectory, 'android-startup-activity.log'), activity + '\n');
  if (!activity.split('\n').some(line => /(?:mResumedActivity|topResumedActivity)/.test(line) && line.includes(`${packageName}/`))) {
    throw new Error('The application is no longer in the foreground.');
  }
  console.log(`Startup OK: ${path.basename(apk)}, PID ${pid}, activity remained open for 20 seconds.`);
} finally {
  const after = run('logcat', '-b', 'crash', '-d', '-v', 'threadtime');
  const newCrashes = after.startsWith(before) ? after.slice(before.length) : after;
  fs.writeFileSync(path.join(logDirectory, 'android-startup-crash.log'), newCrashes.trim() + '\n');
  if (newCrashes.includes(`Process: ${packageName},`)) throw new Error('Android startup crash: see tmp/android-startup-crash.log');
}
