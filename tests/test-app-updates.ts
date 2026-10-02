import assert from 'node:assert/strict';
import test from 'node:test';
import { createWebUpdateControl } from '../src/pwa/updateControl';
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

function fixture() {
  let online = true;
  let action: (() => void) | undefined;
  let activations = 0;
  let checks = 0;
  let finish!: () => void;
  const target = new EventTarget();
  const registration = Object.assign(target, { active: {} as ServiceWorker, installing: null as ServiceWorker | null,
    waiting: null as ServiceWorker | null, update: () => { checks++; return new Promise<void>(resolve => { finish = resolve; }); } }) as unknown as ServiceWorkerRegistration;
  const control = createWebUpdateControl({ online: () => online, schedule: callback => { action = callback; return () => { action = undefined; }; } });
  control.attach(registration, async () => { activations++; });
  return { control, registration, checks: () => checks, complete: () => finish(), activate: () => { action?.(); action = undefined; },
    activations: () => activations, offline: () => { online = false; } };
}

test('PWA : vérification manuelle dédupliquée, hors ligne explicite, jamais de faux « à jour » sans worker actif', async () => {
  const f = fixture();
  const first = f.control.check(); const second = f.control.check();
  assert.equal(first, second);
  await Promise.resolve(); assert.equal(f.checks(), 1);
  f.complete(); await first; assert.equal(f.control.getSnapshot(), 'current');
  f.offline(); await f.control.check(); assert.equal(f.checks(), 1); assert.equal(f.control.getSnapshot(), 'offline');
  const unsupported = createWebUpdateControl({ online: () => true, schedule: () => () => {} });
  await unsupported.check(); assert.equal(unsupported.getSnapshot(), 'unavailable');
});

test('PWA : une mise à jour réellement téléchargée reste prioritaire face à une vérification plus ancienne', async () => {
  const f = fixture();
  const check = f.control.check(); await Promise.resolve();
  f.control.ready(); f.complete(); await check;
  assert.equal(f.control.getSnapshot(), 'downloaded');
  await f.control.check(); assert.equal(f.checks(), 1);
});

test('PWA : téléchargement suivi, installation différée annulable et une seule activation', async () => {
  const f = fixture();
  const worker = Object.assign(new EventTarget(), { state: 'installing' as ServiceWorkerState }) as unknown as ServiceWorker;
  Object.defineProperty(f.registration, 'installing', { value: worker, configurable: true });
  f.registration.dispatchEvent(new Event('updatefound'));
  assert.equal(f.control.getSnapshot(), 'downloading');
  Object.defineProperty(f.registration, 'waiting', { value: worker });
  Object.defineProperty(worker, 'state', { value: 'installed' });
  worker.dispatchEvent(new Event('statechange'));
  assert.equal(f.control.getSnapshot(), 'downloaded');
  f.control.apply(false); f.control.apply(); assert.equal(f.control.getSnapshot(), 'pending');
  f.control.cancel(); f.activate(); assert.equal(f.activations(), 0); assert.equal(f.control.getSnapshot(), 'downloaded');
  f.control.apply(); f.control.apply(); f.activate(); await Promise.resolve();
  assert.equal(f.activations(), 1); assert.equal(f.control.getSnapshot(), 'applying');
});

test('PWA : un échec de vérification peut être retenté', async () => {
  const f = fixture();
  Object.defineProperty(f.registration, 'update', { value: () => { throw new Error('Network error'); }, configurable: true });
  await f.control.check(); assert.equal(f.control.getSnapshot(), 'error');
  Object.defineProperty(f.registration, 'update', { value: async () => {} });
  await f.control.check(); assert.equal(f.control.getSnapshot(), 'current');
});
