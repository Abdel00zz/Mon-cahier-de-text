import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { androidToolchain, run, gradle, root } from './toolchain.mjs';
import { loadSigningEnvironment } from './load-signing.mjs';

const release = process.argv.includes('--release');
const toolchain = androidToolchain();
if (release) toolchain.environment = loadSigningEnvironment(toolchain.environment);
const { java, sdk, environment } = toolchain;
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (!/^\d+\.\d+\.\d+$/.test(metadata.version) || !Number.isInteger(metadata.androidVersionCode) || metadata.androidVersionCode < 1 || metadata.androidVersionCode > 2_100_000_000) throw new Error('Invalid Android version metadata.');
run(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', 'android'], environment);
run(process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', 'sync', 'android'], environment);
fs.writeFileSync(path.join(root, 'android/local.properties'), `sdk.dir=${sdk.replaceAll('\\', '/').replaceAll(':', '\\:')}\n`);
gradle([...(process.argv.includes('--clean') ? [':app:clean'] : []),
  ...(release ? ['bundleRelease', 'assembleRelease', 'lintRelease'] : ['assembleDebug'])], toolchain);
const outputs = path.join(root, 'artifacts/android');
fs.mkdirSync(outputs, { recursive: true });
const publish = (source, filename) => {
  const destination = path.join(outputs, filename);
  fs.copyFileSync(path.join(root, 'android/app/build/outputs', source), destination);
  const hash = crypto.createHash('sha256').update(fs.readFileSync(destination)).digest('hex');
  fs.writeFileSync(`${destination}.sha256`, `${hash}  ${filename}\n`);
  console.log(`${filename}: ${(fs.statSync(destination).size / 1_000_000).toFixed(2)} MB, SHA256 ${hash}`);
  return destination;
};
if (release) {
  const aab = publish('bundle/release/app-release.aab', `mon-cahier-de-textes-${metadata.version}.aab`);
  const apk = publish('apk/release/app-release.apk', `mon-cahier-de-textes-${metadata.version}-release.apk`);
  run(path.join(java, 'bin', process.platform === 'win32' ? 'jarsigner.exe' : 'jarsigner'), ['-verify', aab], environment);
  const verification = spawnSync(path.join(java, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'),
    ['-jar', path.join(sdk, 'build-tools/35.0.0/lib/apksigner.jar'), 'verify', '--verbose', '--print-certs', apk],
    { env: environment, encoding: 'utf8', windowsHide: true });
  if (verification.error || verification.status !== 0) throw new Error('APK signature verification failed.');
  console.log(verification.stdout);
  const signatureSha256 = verification.stdout.match(/Signer #1 certificate SHA-256 digest: ([a-f0-9]{64})/i)?.[1].toLowerCase();
  if (!signatureSha256) throw new Error('Verified APK certificate missing.');
  // The Android build copies public assets selectively. Verify the actual signed
  // archives, including the calendars and Arabic fonts needed without a network.
  const requiredAssets = fs.readdirSync(path.join(root, 'public')).filter(name => /\.(json|ttf)$/.test(name) || name === 'icone.png');
  for (const [archive, prefix] of [[apk, 'assets/public/'], [aab, 'base/assets/public/']]) {
    const listing = spawnSync(path.join(java, 'bin', process.platform === 'win32' ? 'jar.exe' : 'jar'), ['tf', archive], { env: environment, encoding: 'utf8', windowsHide: true });
    if (listing.error || listing.status !== 0) throw new Error(`Unable to verify assets in ${archive}`);
    const entries = new Set(listing.stdout.split(/\r?\n/));
    for (const name of requiredAssets) if (!entries.has(prefix + name)) throw new Error(`Required Android asset missing: ${name}`);
  }
  console.log(`Offline assets verified in APK and AAB: ${requiredAssets.length} calendars, data files, fonts and icons.`);
  fs.copyFileSync(path.join(root, 'android/app/build/outputs/mapping/release/mapping.txt'), path.join(outputs, `mapping-${metadata.version}.txt`));
  run(path.join(java, 'bin', process.platform === 'win32' ? 'keytool.exe' : 'keytool'), ['-exportcert', '-rfc', '-keystore', environment.ANDROID_UPLOAD_STORE_FILE, '-alias', environment.ANDROID_UPLOAD_KEY_ALIAS, '-storepass:env', 'ANDROID_UPLOAD_STORE_PASSWORD', '-file', path.join(outputs, 'upload-certificate.pem')], environment);
  const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', windowsHide: true });
  const dirty = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8', windowsHide: true });
  fs.writeFileSync(path.join(outputs, 'release.json'), JSON.stringify({ version: metadata.version, versionCode: metadata.androidVersionCode,
    package: 'ma.cahier.textes', targetSdk: 36, artifacts: [path.basename(aab), path.basename(apk)], signed: true, signatureSha256,
    builtAt: new Date().toISOString(), sourceCommit: git.status === 0 ? git.stdout.trim() : null,
    workingTreeDirty: dirty.status === 0 ? Boolean(dirty.stdout.trim()) : null,
    files: [aab, apk].map(file => ({ name: path.basename(file), bytes: fs.statSync(file).size,
      sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') })),
  }, null, 2) + '\n');
} else publish('apk/debug/app-debug.apk', 'mon-cahier-de-textes-debug.apk');
