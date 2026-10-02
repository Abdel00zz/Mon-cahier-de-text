import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../..', import.meta.url));
const portableJava = path.join(root, 'tmp/android-toolchain/jdk');
const java = process.env.JAVA_HOME || (fs.existsSync(portableJava)
  ? fs.readdirSync(portableJava).map(name => path.join(portableJava, name)).find(directory => fs.existsSync(path.join(directory, 'bin/java.exe')))
  : undefined);
const candidates = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT,
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android/Sdk'), path.join(root, 'tmp/android-toolchain/sdk')];
const sdk = candidates.find(directory => directory && fs.existsSync(path.join(directory, 'platforms/android-35/android.jar')));
if (!java || !sdk) throw new Error('Java 21 et Android SDK 35 requis. Configurer JAVA_HOME et ANDROID_HOME ; voir docs/operations/android.md.');
const environment = { ...process.env, JAVA_HOME: java, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk };
const run = (command, args, cwd = root) => {
  const result = spawnSync(command, args, { cwd, env: environment, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
run(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', 'android']);
run(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', 'sync', 'android']);
fs.writeFileSync(path.join(root, 'android/local.properties'), `sdk.dir=${sdk.replaceAll('\\', '/')}\n`);
const android = path.join(root, 'android');
const portableGradle = path.join(root, 'tmp/android-toolchain/gradle/gradle-8.11.1');
const launcher = path.join(portableGradle, 'lib/gradle-gradle-cli-main-8.11.1.jar');
const portable = fs.existsSync(launcher);
// Invoke Java directly: paths with spaces stay intact, with no shell interpolation.
run(path.join(java, process.platform === 'win32' ? 'bin/java.exe' : 'bin/java'), [
  '-Xmx64m', '-Xms64m',
  ...(portable ? [`-javaagent:${path.join(portableGradle, 'lib/agents/gradle-instrumentation-agent-8.11.1.jar')}`] : []),
  '-classpath', portable ? launcher : path.join(android, 'gradle/wrapper/gradle-wrapper.jar'),
  portable ? 'org.gradle.launcher.GradleMain' : 'org.gradle.wrapper.GradleWrapperMain',
  'assembleDebug', '--no-daemon', '--max-workers=2',
], android);
const destination = path.join(root, 'artifacts/android/mon-cahier-de-textes-debug.apk');
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.copyFileSync(path.join(android, 'app/build/outputs/apk/debug/app-debug.apk'), destination);
const hash = crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex');
fs.writeFileSync(`${destination}.sha256`, `${hash}  ${path.basename(destination)}\n`);
console.log(`APK installable : ${destination}\nSHA256 : ${hash}`);
