import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../..', import.meta.url));
export function androidToolchain({ requireSdk = true } = {}) {
  const bin = process.platform === 'win32' ? 'java.exe' : 'java';
  const portable = path.join(root, 'tmp/android-toolchain/jdk');
  const java = process.env.JAVA_HOME || (fs.existsSync(portable)
    ? fs.readdirSync(portable).map(name => path.join(portable, name)).find(directory => fs.existsSync(path.join(directory, 'bin', bin))) : undefined);
  const sdk = [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Android/Sdk'), path.join(root, 'tmp/android-toolchain/sdk')]
    .find(directory => directory && fs.existsSync(path.join(directory, 'platforms/android-36/android.jar')));
  if (!java || (requireSdk && !sdk)) throw new Error('Java 21 et Android SDK 36 requis ; voir docs/operations/android.md.');
  return { java, sdk, environment: { ...process.env, JAVA_HOME: java, ...(sdk ? { ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk } : {}) } };
}
export function run(command, args, environment, cwd = root) {
  const result = spawnSync(command, args, { cwd, env: environment, stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Build failed (${result.status ?? 1}).`);
}
export function gradle(tasks, { java, environment }) {
  const android = path.join(root, 'android');
  const portable = path.join(root, 'tmp/android-toolchain/gradle/gradle-8.11.1');
  const launcher = path.join(portable, 'lib/gradle-gradle-cli-main-8.11.1.jar');
  const installed = fs.existsSync(launcher);
  run(path.join(java, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'), [
    '-Xmx64m', '-Xms64m',
    ...(installed ? [`-javaagent:${path.join(portable, 'lib/agents/gradle-instrumentation-agent-8.11.1.jar')}`] : []),
    '-classpath', installed ? launcher : path.join(android, 'gradle/wrapper/gradle-wrapper.jar'),
    installed ? 'org.gradle.launcher.GradleMain' : 'org.gradle.wrapper.GradleWrapperMain',
    ...tasks, '--no-daemon', '--max-workers=2',
  ], environment, android);
}
