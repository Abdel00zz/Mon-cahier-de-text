import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { accountPhoneForEmptyProfile, needsProfilePhoneSync } from '../src/domain/auth/profilePhone';
import { accountOwner } from '../src/domain/auth/accountIdentity';
import { extractSyncableSettings, mergeSyncableSettings, type SyncableSettings } from '../src/infrastructure/sync/syncSettings';
import { assertValidSyncSettings } from '../api/_lib/validate';
import { HttpError } from '../api/_lib/http';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { ProfileTab } from '../src/features/settings/components/ProfileTab';
import type { AppConfig } from '../src/types';

test('le numéro du compte remplit le profil absent après connexion ou inscription', () => {
  assert.equal(accountPhoneForEmptyProfile(undefined, '0612345678'), '0612345678');
  assert.equal(accountPhoneForEmptyProfile(undefined, ' +212 612 345 678 '), '+212 612 345 678');
  assert.equal(accountPhoneForEmptyProfile(null, '0612345678'), '0612345678');
});

test('une modification ou un effacement explicite du profil prime sur le compte', () => {
  assert.equal(accountPhoneForEmptyProfile('0700000000', '0612345678'), undefined);
  assert.equal(accountPhoneForEmptyProfile('', '0612345678'), undefined);
});

test('un compte sans contact ou un identifiant technique ne devient jamais un téléphone', () => {
  for (const value of [undefined, null, '', ' ', 'acct_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 'teacher@example.com', '123', '1234567890123456', '+21x612345678', ' '.repeat(65) + '0612345678' + '-'.repeat(65)]) {
    assert.equal(accountPhoneForEmptyProfile(undefined, value), undefined);
  }
});

test('le téléphone voyage dans les réglages validés du serveur sans modifier le propriétaire', () => {
  const user = { id: `acct_${'a'.repeat(32)}`, phone: '0612345678' };
  const source = { teacherPhone: accountPhoneForEmptyProfile(undefined, user.phone) };
  const wire = JSON.parse(JSON.stringify(extractSyncableSettings(source)));
  const accepted = assertValidSyncSettings(wire, new Set()) as SyncableSettings;
  const secondDevice = mergeSyncableSettings({}, accepted);
  assert.equal(secondDevice.teacherPhone, '0612345678');
  assert.equal(accountOwner(user), user.id);
  const changed = mergeSyncableSettings(secondDevice, extractSyncableSettings({ teacherPhone: '+212 700 000 000' }));
  assert.equal(changed.teacherPhone, '+212 700 000 000');
  assert.equal(accountOwner(user), user.id);
});

test('la suppression du téléphone se transmet et les anciens réglages ne perdent pas un contact', () => {
  const local = { teacherPhone: '0612345678' };
  assert.equal(mergeSyncableSettings(local, extractSyncableSettings({})).teacherPhone, local.teacherPhone);
  const removed = mergeSyncableSettings(local, JSON.parse(JSON.stringify(extractSyncableSettings({ teacherPhone: '' }))));
  assert.equal(removed.teacherPhone, '');
  assert.equal(accountPhoneForEmptyProfile(removed.teacherPhone, '0612345678'), undefined);
});

test('la migration publie le contact après réception des réglages sans rétablir un numéro effacé dans le cloud', () => {
  const cloud = { establishmentName: 'Établissement du cloud', defaultTeacherName: 'Professeur du cloud', teacherPhone: '+212 700 000 000' };
  const received = mergeSyncableSettings({ teacherPhone: '0612345678' }, cloud);
  assert.equal(received.establishmentName, cloud.establishmentName);
  assert.equal(received.defaultTeacherName, cloud.defaultTeacherName);
  assert.equal(received.teacherPhone, cloud.teacherPhone);
  assert.equal(needsProfilePhoneSync(received.teacherPhone, cloud.teacherPhone), false);
  assert.equal(needsProfilePhoneSync('0612345678', undefined), true);
  assert.equal(needsProfilePhoneSync('', undefined), true);
  assert.equal(needsProfilePhoneSync(undefined, undefined), false);
  assert.equal(needsProfilePhoneSync('0612345678', ''), false);
});

test('le serveur refuse un contact mal typé ou démesuré et accepte son effacement', () => {
  for (const teacherPhone of [12345, null, {}, '1'.repeat(65)]) {
    assert.throws(() => assertValidSyncSettings({ teacherPhone }, new Set()), (error: unknown) => error instanceof HttpError && error.statusCode === 400);
  }
  assert.equal(assertValidSyncSettings({ teacherPhone: '' }, new Set())?.teacherPhone, '');
});

test('le champ de profil affiche le numéro en français et arabe avec saisie téléphonique native', () => {
  for (const locale of ['fr', 'ar'] as const) {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale, children: createElement(ProfileTab, {
      config: { establishmentName: '', defaultTeacherName: '', printShowDescriptions: true, teacherPhone: '0612345678' } as AppConfig,
      onDraft: () => {}, onToggleSubject: () => {}, onToggleCycle: () => {},
    }) }));
    const phoneInput = html.match(/<input[^>]*id="settings-teacher-phone"[^>]*>/)?.[0] ?? '';
    assert.match(phoneInput, /type="tel"/);
    assert.match(phoneInput, /dir="ltr"/);
    assert.match(phoneInput, /autoComplete="tel"/);
    assert.match(phoneInput, /value="0612345678"/);
  }
});
