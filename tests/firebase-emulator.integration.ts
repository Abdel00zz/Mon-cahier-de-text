import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FirestoreStore } from '../api/_lib/firestoreStore.js';
import { beginAccountWrite, saveVersionedDocument } from '../api/_lib/atomicWrite.js';
import { KEYS, type RedisClient } from '../api/_lib/redis.js';
import { readInboxSnapshot } from '../api/_lib/adminMessages.js';
import { hashPassword, signSession, SESSION_COOKIE, ADMIN_COOKIE } from '../api/_lib/auth.js';
import authHandler from '../api/auth.js';
import syncHandler from '../api/sync.js';
import adminHandler from '../api/admin.js';
import messagesHandler from '../api/messages.js';
import type { ApiRequest, ApiResponse } from '../api/_lib/http.js';
import { subscribeNativeDevice, unsubscribeNativeDevice, nativeDeviceStatus } from '../api/_lib/nativePush.js';
import { importFirebaseTeacher, verifyFirebasePassword } from '../api/_lib/firebaseIdentity.js';
import { firebaseAuth, teacherUid } from '../api/_lib/firebaseAdmin.js';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Emulators required; refusing production integration tests');
const store = new FirestoreStore();
const client = store as unknown as RedisClient;
const phone = '0611111111';

test('native notification bindings survive transfer, token rotation and late unsubscribe', async () => {
  const savedKey = process.env.FCM_PRIVATE_KEY; const savedEmail = process.env.FCM_CLIENT_EMAIL;
  process.env.FCM_PRIVATE_KEY = 'emulator-only-not-a-private-key';
  process.env.FCM_CLIENT_EMAIL = 'test@demo-cahier-text.iam.gserviceaccount.com';
  try {
    const firstPhone = '0618888801'; const secondPhone = '0618888802';
    for (const number of [firstPhone, secondPhone]) await store.set(KEYS.user(number), { phone: number, nom: 'QA', prenom: 'Test' });
    const token = 'emulator-token-'.padEnd(80, 'a'); const replacement = 'emulator-token-'.padEnd(80, 'b');
    const installation = 'emulator-installation-123';
    const first = await subscribeNativeDevice(firstPhone, token, 'ar', installation);
    const moved = await subscribeNativeDevice(secondPhone, token, 'fr', installation);
    assert.ok(first.binding && moved.binding && first.binding !== moved.binding);
    await unsubscribeNativeDevice(firstPhone, token, first.binding);
    assert.equal((await nativeDeviceStatus(secondPhone, token, moved.binding)).registered, true);
    const rotated = await subscribeNativeDevice(secondPhone, replacement, 'fr', installation);
    assert.equal((await nativeDeviceStatus(secondPhone, token, moved.binding)).registered, false);
    assert.equal((await nativeDeviceStatus(secondPhone, replacement, rotated.binding)).registered, true);
    await unsubscribeNativeDevice(secondPhone, replacement, rotated.binding);
    assert.equal((await nativeDeviceStatus(secondPhone, replacement, rotated.binding)).registered, false);
  } finally {
    if (savedKey === undefined) delete process.env.FCM_PRIVATE_KEY; else process.env.FCM_PRIVATE_KEY = savedKey;
    if (savedEmail === undefined) delete process.env.FCM_CLIENT_EMAIL; else process.env.FCM_CLIENT_EMAIL = savedEmail;
  }
});

async function call(handler: (req: ApiRequest, res: ApiResponse) => Promise<unknown>, req: ApiRequest) {
  let status = 200; let body: unknown;
  const headers: Record<string, string | string[]> = {};
  const res: ApiResponse = {
    status(code) { status = code; return res; }, json(value) { body = value; },
    setHeader(name, value) { headers[name] = value; }, end(value) { body = value; },
  };
  await handler(req, res);
  return { status, body, headers };
}

test('existing HTTP contracts work across registration, sync, admin messages, block and deletion', async () => {
  process.env.AUTH_SECRET = 'emulator-only-secret-with-sufficient-length';
  const number = '0619999988';
  const registered = await call(authHandler, { method: 'POST', headers: {}, body: { action: 'register', phone: number, nom: 'Test', prenom: 'Teacher', password: 'Test-password-123' } });
  assert.equal(registered.status, 201);
  const cookie = String(registered.headers['Set-Cookie']).split(';')[0];
  assert.ok(cookie.startsWith(SESSION_COOKIE + '='));
  assert.equal(JSON.stringify(registered.body).includes('passwordHash'), false);
  // Imported hashes cannot be checked by the emulator; real scrypt verification
  // is covered by scripts/firebase/verify-auth.ts with a disposable QA identity.
  await firebaseAuth().updateUser(teacherUid(number), { password: 'Test-password-123' });
  const login = await call(authHandler, { method: 'POST', headers: {}, body: { action: 'login', phone: number, password: 'Test-password-123' } });
  assert.equal(login.status, 200);
  const headers = { cookie, 'x-workspace-owner': number };
  assert.equal((await call(syncHandler, { method: 'POST', headers, body: { classes: [], schedules: [], timetable: [] } })).status, 200);
  assert.equal((await call(syncHandler, { method: 'GET', headers })).status, 200);
  const adminCookie = `${ADMIN_COOKIE}=${await signSession({ role: 'admin' }, 60)}`;
  const adminHeaders = { cookie: adminCookie };
  assert.equal((await call(adminHandler, { method: 'POST', headers: adminHeaders, body: { action: 'notifyTeacher', phone: number, message: 'Votre cahier est à jour.' } })).status, 200);
  assert.equal((await call(messagesHandler, { method: 'GET', headers })).status, 200);
  assert.equal((await call(adminHandler, { method: 'POST', headers: adminHeaders, body: { action: 'blockTeacher', phone: number } })).status, 200);
  assert.equal((await call(syncHandler, { method: 'GET', headers })).status, 403);
  assert.equal((await firebaseAuth().getUser(teacherUid(number))).disabled, true);
  assert.equal((await call(adminHandler, { method: 'POST', headers: adminHeaders, body: { action: 'blockTeacher', phone: number, blocked: false } })).status, 200);
  assert.equal((await call(syncHandler, { method: 'GET', headers })).status, 200);
  assert.equal((await call(adminHandler, { method: 'POST', headers: adminHeaders, body: { action: 'deleteTeacher', phone: number } })).status, 200);
  assert.equal((await call(syncHandler, { method: 'GET', headers })).status, 401);
  await assert.rejects(firebaseAuth().getUser(teacherUid(number)));
});

test('Firestore preserves notebooks, settings, revisions, inbox and NX writes', async () => {
  await store.set(KEYS.user(phone), { phone, nom: 'Test', prenom: 'Prof' });
  assert.equal(await store.set(KEYS.user(phone), { phone, nom: 'Overwrite' }, { nx: true }), null);
  const [first, stale] = await Promise.all([beginAccountWrite(client, phone), beginAccountWrite(client, phone)]);
  const notebook = { lessonsData: [{ id: 'a', content: 'رياضيات 🧮'.repeat(100_000) }], updatedAt: '2026-10-03T00:00:00.000Z' };
  first.set(KEYS.lessons(phone, 'c1'), notebook);
  first.set(KEYS.classes(phone), { classes: [{ id: 'c1', name: 'A' }], settings: { locale: 'ar' } });
  first.hset(KEYS.adminSnapshots, { [phone]: { phone, classes: [{ id: 'c1' }] } });
  first.set(KEYS.adminMessages(phone), [{ id: 'm1', title: 'Message', body: 'Test', createdAt: new Date().toISOString() }]);
  await first.exec();
  stale.set(KEYS.classes(phone), { classes: [] });
  await assert.rejects(stale.exec(), (error: { statusCode?: number }) => error.statusCode === 409);
  assert.deepEqual(await store.get(KEYS.lessons(phone, 'c1')), notebook);
  assert.equal((await readInboxSnapshot(client, phone)).unreadCount, 1);
  const before = await readInboxSnapshot(client, phone);
  const after = await readInboxSnapshot(client, phone);
  assert.ok(after.badgeUpdatedAt > before.badgeUpdatedAt);
  const pipeline = store.pipeline();
  pipeline.get(KEYS.classes(phone)).hget(KEYS.adminSnapshots, phone);
  assert.equal((await pipeline.exec()).length, 2);
  await store.set('nullable', null);
  assert.equal(await store.set('nullable', 'overwrite', { nx: true }), null);
  assert.equal((await store.db.doc('users/' + teacherUid(phone)).get()).data()?.role, 'teacher');
});

test('transactions enforce document versions and rate limits with expiry', async () => {
  await saveVersionedDocument(client, 'calendar', 0, { version: 1 });
  await assert.rejects(saveVersionedDocument(client, 'calendar', 0, { version: 1 }));
  const counts = await Promise.all(Array.from({ length: 5 }, () => store.incr('rl:test')));
  assert.deepEqual(counts.sort(), [1, 2, 3, 4, 5]);
  await store.set('rl:expired', 99, { ex: -1 });
  assert.equal(await store.incr('rl:expired'), 1);
});

test('deleting/recreating an account fences an earlier writer', async () => {
  const stale = await beginAccountWrite(client, phone);
  const deletion = await beginAccountWrite(client, phone);
  deletion.del(KEYS.user(phone));
  await deletion.exec();
  await store.set(KEYS.user(phone), { phone, nom: 'New', prenom: 'Account' });
  stale.set(KEYS.classes(phone), { stale: true });
  await assert.rejects(stale.exec());
});

test('Firebase Authentication imports a real scrypt hash and verifies the original password', async () => {
  const user = { phone, nom: 'Test', prenom: 'Prof', passwordHash: await hashPassword('Strong-test-password-123') };
  await importFirebaseTeacher(user);
  assert.equal((await firebaseAuth().getUser(teacherUid(phone))).customClaims?.role, 'teacher');
  // The Auth emulator does not verify imported password hashes. Metadata/import
  // is tested here; real standard-scrypt password verification is separately required.
  await firebaseAuth().updateUser(teacherUid(phone), { password: 'Strong-test-password-123' });
  assert.equal(await verifyFirebasePassword(phone, 'Strong-test-password-123'), true);
  assert.equal(await verifyFirebasePassword(phone, 'Wrong-password'), false);
  assert.equal(await importFirebaseTeacher(user), false);
  await assert.rejects(importFirebaseTeacher(user, false));
});

test('security rules refuse anonymous, teacher, other account and forged admin access', async () => {
  const env = await initializeTestEnvironment({ projectId: 'demo-cahier-text', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
  try {
    for (const context of [env.unauthenticatedContext(), env.authenticatedContext(teacherUid(phone)), env.authenticatedContext('another-teacher'), env.authenticatedContext('forged-admin', { role: 'admin' })]) {
      const db = context.firestore();
      await assertFails(getDoc(doc(db, `users/${teacherUid(phone)}/private/account`)));
      await assertFails(setDoc(doc(db, `teacher_snapshots/${teacherUid(phone)}`), { role: 'admin' }));
    }
  } finally { await env.cleanup(); }
});
