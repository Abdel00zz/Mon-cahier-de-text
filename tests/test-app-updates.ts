import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebUpdateControl } from '../src/platform/appUpdates';
import { trustedApkUrl, validateNativeRelease } from '../src/platform/nativeRelease';

const installed = { state: 'manual' as const, source: 'apk' as const, versionCode: 6, signatureSha256: 'a'.repeat(64) };
const release = { package: 'ma.cahier.textes', version: '1.2.5', versionCode: 7, sha256: 'b'.repeat(64),
  signatureSha256: 'a'.repeat(64), downloadUrl: 'https://github.com/Abdel00zz/Mon-cahier-de-text/releases/download/v1.2.5/application.apk' };

test('APK : une version Web seule, un autre certificat et un ancien binaire ne déclenchent pas de mise à jour', () => {
  assert.equal(validateNativeRelease(release, installed)?.state, 'available');
  assert.equal(validateNativeRelease({ ...release, versionCode: 6 }, installed)?.state, 'current');
  for (const invalid of [{}, 'index.html', { ...release, versionCode: 5 }, { ...release, versionCode: 7.1 },
    { ...release, signatureSha256: 'c'.repeat(64) }, { ...release, package: 'other.app' }, { ...release, sha256: '' }]) {
    assert.equal(validateNativeRelease(invalid, installed), null);
  }
  assert.equal(validateNativeRelease(release, { ...installed, signatureSha256: '' }), null);
});

test('APK : seuls les téléchargements HTTPS du domaine et des releases du dépôt sont acceptés', () => {
  assert.ok(trustedApkUrl(release.downloadUrl));
  assert.ok(trustedApkUrl('https://mon-cahier-de-text.vercel.app/android/release.apk'));
  for (const url of ['http://mon-cahier-de-text.vercel.app/a.apk', 'https://evil.test/a.apk', 'javascript:alert(1)',
    'https://mon-cahier-de-text.vercel.app@evil.test/a.apk', 'https://user@mon-cahier-de-text.vercel.app/a.apk',
    'https://github.com/another/repo/releases/download/v1/a.apk', 'https://github.com/Abdel00zz/Mon-cahier-de-text/blob/main/a.apk',
    'https://mon-cahier-de-text.vercel.app:8443/a.apk', 'https://mon-cahier-de-text.vercel.app/a.html']) assert.equal(trustedApkUrl(url), null, url);
});

function fixture(options: { published?: string | null; current?: string; fail?: boolean } = {}) {
  let online = true;
  let failing = options.fail === true;
  let action: (() => void) | undefined;
  let reloads = 0;
  const control = createWebUpdateControl({
    online: () => online,
    publishedVersion: async () => {
      if (failing) throw new Error('Network error');
      return options.published === undefined ? '2.0.0' : options.published;
    },
    currentVersion: () => options.current ?? '1.0.0',
    reload: () => { reloads += 1; },
    schedule: callback => { action = callback; return () => { action = undefined; }; },
  });
  return { control, offline: () => { online = false; }, recover: () => { failing = false; },
    activate: () => { action?.(); action = undefined; }, reloads: () => reloads };
}

test('mise à jour web : vérification dédupliquée, hors ligne explicite, jamais de faux « à jour » sans version publiée', async () => {
  const f = fixture();
  const first = f.control.check(); const second = f.control.check();
  assert.equal(first, second);
  await first; assert.equal(f.control.getSnapshot(), 'downloaded');
  f.offline(); await f.control.check(); assert.equal(f.control.getSnapshot(), 'offline');
  const unsupported = fixture({ published: null });
  await unsupported.control.check(); assert.equal(unsupported.control.getSnapshot(), 'unavailable');
});

test('mise à jour web : la version servie identique à la version compilée signifie « à jour »', async () => {
  const f = fixture({ published: '1.0.0', current: '1.0.0' });
  await f.control.check(); assert.equal(f.control.getSnapshot(), 'current');
});

test('mise à jour web : rechargement différé, annulable et déclenché une seule fois', async () => {
  const f = fixture();
  await f.control.check();
  f.control.apply(); f.control.apply(); assert.equal(f.control.getSnapshot(), 'pending');
  f.control.cancel(); assert.equal(f.control.getSnapshot(), 'downloaded');
  f.control.apply(); f.activate();
  assert.equal(f.reloads(), 1); assert.equal(f.control.getSnapshot(), 'applying');
});

test('mise à jour web : un échec de vérification peut être retenté', async () => {
  const f = fixture({ fail: true });
  await f.control.check(); assert.equal(f.control.getSnapshot(), 'error');
  f.recover(); await f.control.check(); assert.equal(f.control.getSnapshot(), 'downloaded');
});
