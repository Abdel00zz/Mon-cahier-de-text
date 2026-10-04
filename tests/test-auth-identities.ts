import assert from 'node:assert/strict';
import test from 'node:test';
import { firebaseAccountId, normalizeEmail } from '../api/_lib/authAccounts.js';
import { teacherUid } from '../api/_lib/firebaseAdmin.js';
import { accountOwner, isAccountId } from '../src/domain/auth/accountIdentity';
import { authErrorMessage } from '../src/features/auth/authErrors';
import { switchAccountWorkspace, readWorkspaceScope } from '../src/infrastructure/storage/accountWorkspace';

test('account identities remain stable when contact information changes', () => {
  const uid = 'google-verified-identity';
  const first = firebaseAccountId({ uid, email: 'first@example.com' });
  const second = firebaseAccountId({ uid, email: 'changed@example.com' });
  assert.equal(first, second);
  assert.ok(isAccountId(first));
  assert.notEqual(first, firebaseAccountId({ uid: 'another-identity', email: 'first@example.com' }));
  assert.equal(accountOwner({ id: first, phone: '' }), first);
  assert.equal(accountOwner({ phone: '0612345678' }), '0612345678');
});

test('legacy phone identities retain their paths only when the Firebase UID also matches', () => {
  const phone = '0612345678';
  assert.equal(firebaseAccountId({ uid: teacherUid(phone), email: `${phone}@cahier.internal` }), phone);
  assert.notEqual(firebaseAccountId({ uid: 'forged', email: `${phone}@cahier.internal` }), phone);
  assert.throws(() => normalizeEmail(`${phone}@cahier.internal`));
  assert.equal(normalizeEmail(' Teacher@Example.com '), 'teacher@example.com');
  for (const email of ['', 'a@', 'a@b', 'a b@example.com']) assert.throws(() => normalizeEmail(email));
});

test('email and Google workspaces preserve unsynced notebooks without a phone', () => {
  const entries = new Map<string, string>();
  const storage = { get length() { return entries.size; }, key(i: number) { return [...entries.keys()][i] ?? null; },
    getItem(k: string) { return entries.get(k) ?? null; }, setItem(k: string, v: string) { entries.set(k, v); }, removeItem(k: string) { entries.delete(k); } };
  const google = firebaseAccountId({ uid: 'google-one' });
  const email = firebaseAccountId({ uid: 'email-two' });
  switchAccountWorkspace(google, { storage });
  storage.setItem('classData_v1_math', 'Google unsynced notebook');
  switchAccountWorkspace(email, { storage });
  assert.equal(storage.getItem('classData_v1_math'), null);
  storage.setItem('classData_v1_physics', 'Email unsynced notebook');
  switchAccountWorkspace(google, { storage });
  assert.equal(storage.getItem('classData_v1_math'), 'Google unsynced notebook');
  assert.equal(storage.getItem('classData_v1_physics'), null);
  assert.equal(readWorkspaceScope(storage)?.owner, google);
  assert.throws(() => switchAccountWorkspace('user:another-owner', { storage }));
});

test('Google cancellation is silent and actionable failures are localized', () => {
  assert.equal(authErrorMessage({ code: 'AUTH_CANCELLED' }, 'fr'), null);
  assert.equal(authErrorMessage({ code: 'auth/popup-closed-by-user' }, 'ar'), null);
  assert.match(authErrorMessage({ code: 'auth/popup-blocked' }, 'fr')!, /Autorisez/);
  assert.match(authErrorMessage({ code: 'GOOGLE_UNAVAILABLE' }, 'ar')!, /الهاتف/);
  // Les trois méthodes restent distinguées : mot de passe, Google, ou adresse déjà utilisée ailleurs.
  assert.match(authErrorMessage({ code: 'PROVIDER_GOOGLE' }, 'fr')!, /Google/);
  assert.match(authErrorMessage({ code: 'PROVIDER_GOOGLE' }, 'ar')!, /Google/);
  assert.match(authErrorMessage({ code: 'auth/account-exists-with-different-credential' }, 'fr')!, /habituelle/);
  assert.match(authErrorMessage({ code: 'ACCOUNT_EXISTS' }, 'fr')!, /existe déjà/);
  assert.ok(!authErrorMessage({ code: 'auth/internal-error' }, 'fr')!.includes('auth/'));
});
