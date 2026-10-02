import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { root } from './toolchain.mjs';

// Publishing the feed is separate from compiling or deploying the web site:
// a newer package.json must never advertise an APK which isn't downloadable.
const raw = process.argv[2];
let url;
try { url = new URL(raw); } catch { throw new Error('Usage: npm run android:publish-metadata -- https://.../version-release.apk'); }
if (url.protocol !== 'https:' || url.username || url.password || url.port || !url.pathname.endsWith('.apk')
  || !(url.origin === 'https://mon-cahier-de-text.vercel.app'
    || (url.hostname === 'github.com' && url.pathname.startsWith('/Abdel00zz/Mon-cahier-de-text/releases/download/')))) throw new Error('APK must be hosted on the application domain or the repository’s GitHub releases.');
const directory = path.join(root, 'artifacts/android');
const release = JSON.parse(fs.readFileSync(path.join(directory, 'release.json'), 'utf8'));
const apk = release.files?.find(file => file.name === `mon-cahier-de-textes-${release.version}-release.apk`);
if (release.signed !== true || release.package !== 'ma.cahier.textes' || !/^[a-f0-9]{64}$/.test(release.signatureSha256)
  || !apk || !Number.isSafeInteger(apk.bytes) || apk.bytes <= 0) throw new Error('Build a verified signed release first.');
const localHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(directory, apk.name))).digest('hex');
if (localHash !== apk.sha256) throw new Error('The APK differs from the verified release. Rebuild it.');
const output = path.join(root, 'public/native-release.json');
if (fs.existsSync(output)) {
  const previous = JSON.parse(fs.readFileSync(output, 'utf8'));
  if (previous.versionCode > release.versionCode || (previous.versionCode === release.versionCode && previous.sha256 !== apk.sha256)) throw new Error('Increase the Android version before replacing a published binary.');
}
const abort = new AbortController();
const timeout = setTimeout(() => abort.abort(), 30_000);
try {
  const response = await fetch(url, { signal: abort.signal, cache: 'no-store' });
  if (!response.ok || !response.body || new URL(response.url).protocol !== 'https:') throw new Error('The uploaded APK must be publicly downloadable over HTTPS.');
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for await (const chunk of response.body) {
    bytes += chunk.length;
    if (bytes > apk.bytes) { abort.abort(); throw new Error('Published download differs from the signed APK.'); }
    hash.update(chunk);
  }
  if (bytes !== apk.bytes || hash.digest('hex') !== apk.sha256) throw new Error('Published download differs from the signed APK.');
} finally { clearTimeout(timeout); }
fs.writeFileSync(output, JSON.stringify({ package: release.package, version: release.version, versionCode: release.versionCode,
  signatureSha256: release.signatureSha256, sha256: apk.sha256, downloadUrl: url.href, publishedAt: new Date().toISOString() }, null, 2) + '\n');
console.log('Verified native-release.json generated. Deploy this file after the APK; the application checks its own signature and version.');
