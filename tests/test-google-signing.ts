import assert from 'node:assert/strict';
import test from 'node:test';
import { assertGoogleSigningConfigured } from '../scripts/android/google-signing.mjs';
import { authErrorMessage } from '../src/features/auth/authErrors';

const packageName = 'ma.cahier.textes';
const hash = 'ab'.repeat(20);
const android = { client_type: 1, android_info: { package_name: packageName, certificate_hash: hash } };
const web = { client_type: 3, client_id: 'synthetic-web-client' };
const config = (oauth_client: unknown[]) => ({ client: [{ client_info: { android_client_info: { package_name: packageName } }, oauth_client }] });

test('release certificate must match the Android OAuth client for this package', () => {
  assert.doesNotThrow(() => assertGoogleSigningConfigured(config([android, web]), packageName, hash.toUpperCase().match(/../g)!.join(':')));
  assert.throws(() => assertGoogleSigningConfigured(config([android, web]), packageName, 'cd'.repeat(20)), /register this signing certificate/);
  assert.throws(() => assertGoogleSigningConfigured(config([android]), packageName, hash), /web client/);
  assert.throws(() => assertGoogleSigningConfigured(config([{ ...android, android_info: { ...android.android_info, package_name: 'another.package' } }, web]), packageName, hash), /register/);
});

test('timeouts distinguish a stalled Google selector from the session server in both languages', () => {
  for (const locale of ['fr', 'ar'] as const) {
    const google = authErrorMessage({ code: 'GOOGLE_TIMEOUT' }, locale);
    const server = authErrorMessage({ code: 'AUTH_NETWORK_TIMEOUT' }, locale);
    assert.ok(google?.includes('Google'));
    assert.ok(server);
    assert.notEqual(server, google);
  }
});
