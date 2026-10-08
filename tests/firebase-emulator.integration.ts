import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { FirestoreStore } from '../api/_lib/firestoreStore.js';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { initializeFirestore, Timestamp } from 'firebase-admin/firestore';
import { randomBytes } from 'node:crypto';
import { snapshotFirestore, encryptBackup, decryptBackup, restoreFirestoreEmulator } from '../scripts/firebase/backup-format.js';
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
import { firebaseIdentityRequest } from '../api/_lib/firebaseSignIn.js';
import { firebaseAccountId } from '../api/_lib/authAccounts.js';
import { encodeSyncPayload } from '../src/infrastructure/sync/syncTransport.js';
import { SYNC_ENCODING } from '../src/infrastructure/sync/syncProtocol.js';
import { buildLessonRows } from '../src/domain/notebook/lessonRows.js';
import { lastDatedContentKey } from '../src/domain/notebook/notebookOpening.js';
import { buildSessionActivityRemarks } from '../src/domain/evaluations/sessionActivityRemarks.js';
import { translateLocaleMessage } from '../src/i18n/messages.js';
import type { AppConfig, ClassInfo, ClassRoster } from '../src/types.js';
import type { LessonsData } from '../src/types.js';

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

test('email accounts work without phone across authentication, sync, messages, push and administration', async () => {
  process.env.AUTH_SECRET = 'emulator-only-secret-with-sufficient-length';
  const email = 'teacher-no-phone@example.com'; const password = 'Strong-password-123';
  const register = await call(authHandler, { method: 'POST', headers: {}, body: { action: 'register', email, password, nom: 'Teacher', prenom: 'Email' } });
  assert.equal(register.status, 201);
  const { user } = register.body as { user: { id: string; email: string; phone: string } };
  assert.match(user.id, /^acct_[a-f0-9]{32}$/); assert.equal(user.phone, ''); assert.equal(user.email, email);
  assert.ok(!JSON.stringify(register.body).includes('firebaseUid'));
  assert.ok(!JSON.stringify(register.body).includes(password));
  assert.ok(!JSON.stringify(register.body).includes('passwordHash'));
  const identity = await firebaseAuth().getUserByEmail(email);
  assert.equal(firebaseAccountId(identity), user.id);
  assert.equal((await store.db.doc(`users/${teacherUid(user.id)}`).get()).data()?.phone, '');
  const duplicate = await call(authHandler, { method: 'POST', headers: {}, body: { action: 'register', email: email.toUpperCase(), password, nom: 'Duplicate', prenom: 'Test' } });
  assert.equal(duplicate.status, 409);
  assert.equal((await firebaseAuth().getUserByEmail(email)).uid, identity.uid);
  const invalid = await call(authHandler, { method: 'POST', headers: {}, body: { action: 'login', email, password: 'wrong' } });
  assert.equal(invalid.status, 401);
  const login = await call(authHandler, { method: 'POST', headers: {}, body: { action: 'login', email, password } });
  assert.equal(login.status, 200);
  const cookie = String(login.headers['Set-Cookie']).split(';')[0];
  const headers = { cookie, 'x-workspace-owner': user.id };
  assert.equal((await call(syncHandler, { method: 'POST', headers, body: { classes: [], schedules: [], timetable: [] } })).status, 200);
  assert.equal((await call(syncHandler, { method: 'GET', headers })).status, 200);
  assert.equal((await call(syncHandler, { method: 'GET', headers: { cookie, 'x-workspace-owner': '0612345678' } })).status, 409);
  const adminHeaders = { cookie: `${ADMIN_COOKIE}=${await signSession({ role: 'admin' }, 60)}` };
  assert.equal((await call(adminHandler, { method: 'POST', headers: adminHeaders, body: { action: 'notifyTeacher', phone: user.id, message: 'Votre cahier est prêt.' } })).status, 200);
  assert.equal((await call(messagesHandler, { method: 'GET', headers })).status, 200);
  const completed = await call(authHandler, { method: 'POST', headers, body: { action: 'completeWelcome' } });
  assert.equal(completed.status, 200);
  assert.equal((await call(adminHandler, { method: 'POST', headers: adminHeaders, body: { action: 'blockTeacher', phone: user.id } })).status, 200);
  assert.equal((await firebaseAuth().getUser(identity.uid)).disabled, true);
  assert.equal((await call(authHandler, { method: 'GET', headers, query: { action: 'me' } })).status, 403);
  assert.equal((await call(authHandler, { method: 'POST', headers: {}, body: { action: 'login', email, password } })).status, 403);
  assert.equal((await call(adminHandler, { method: 'POST', headers: adminHeaders, body: { action: 'deleteTeacher', phone: user.id } })).status, 200);
  await assert.rejects(firebaseAuth().getUser(identity.uid));
});

test('optional contact numbers never identify or merge email accounts', async () => {
  const register = (email: string, phone = '') => call(authHandler, { method: 'POST', headers: {}, body: { action: 'register', email, phone, password: 'Strong-password-123', nom: 'Test', prenom: 'Contact' } });
  const first = await register('contact-first@example.com', '0612345678');
  const second = await register('contact-second@example.com', '0612345678');
  assert.equal(first.status, 201); assert.equal(second.status, 201);
  assert.notEqual((first.body as any).user.id, (second.body as any).user.id);
  assert.equal((await register('bad-contact@example.com', '123')).status, 400);
  const phoneLogin = await call(authHandler, { method: 'POST', headers: {}, body: { action: 'login', phone: '0612345678', password: 'Strong-password-123' } });
  assert.equal(phoneLogin.status, 401);
});

test('Google provisions one account, preserves profiles, rejects non-Google tokens and observes admin revocation', async () => {
  process.env.AUTH_SECRET = 'emulator-only-secret-with-sufficient-length';
  const now = Math.floor(Date.now() / 1000);
  const mockGoogleToken = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: 'google-emulator-teacher', email: 'google-teacher@gmail.com', email_verified: true, name: 'Google Teacher', iat: now, exp: now + 3600 })).toString('base64url')}.`;
  const native = await call(authHandler, { method: 'POST', headers: {}, body: { action: 'googleNative', idToken: mockGoogleToken } });
  assert.equal(native.status, 200, JSON.stringify(native.body));
  const { user } = native.body as { user: { id: string; phone: string } };
  assert.equal(user.phone, ''); assert.equal((native.body as any).isNewAccount, true);
  const firebase = await firebaseIdentityRequest('signInWithIdp', { postBody: new URLSearchParams({ id_token: mockGoogleToken, providerId: 'google.com' }).toString(), requestUri: 'http://localhost', returnSecureToken: true });
  const again = await call(authHandler, { method: 'POST', headers: {}, body: { action: 'google', idToken: firebase.idToken } });
  assert.equal(again.status, 200); assert.equal((again.body as any).user.id, user.id); assert.equal((again.body as any).isNewAccount, false);
  const password = await firebaseIdentityRequest('signInWithPassword', { email: 'contact-first@example.com', password: 'Strong-password-123', returnSecureToken: true });
  const forged = await call(authHandler, { method: 'POST', headers: {}, body: { action: 'google', idToken: password.idToken } });
  assert.equal(forged.status, 401);
  const adminHeaders = { cookie: `${ADMIN_COOKIE}=${await signSession({ role: 'admin' }, 60)}` };
  assert.equal((await call(adminHandler, { method: 'POST', headers: adminHeaders, body: { action: 'blockTeacher', phone: user.id } })).status, 200);
  assert.equal((await call(authHandler, { method: 'POST', headers: {}, body: { action: 'google', idToken: firebase.idToken } })).status, 401);
  assert.equal((await call(adminHandler, { method: 'POST', headers: adminHeaders, body: { action: 'deleteTeacher', phone: user.id } })).status, 200);
  await assert.rejects(firebaseAuth().getUser(firebase.localId!));
});

test('password recovery hides account existence and public configuration contains no server credential', async () => {
  for (const email of ['contact-first@example.com', 'unknown-account@example.com']) {
    const result = await call(authHandler, { method: 'POST', headers: {}, body: { action: 'resetPassword', email, locale: 'ar' } });
    assert.equal(result.status, 200); assert.deepEqual(result.body, { ok: true });
  }
  const config = await call(authHandler, { method: 'GET', headers: {}, query: { action: 'config' } });
  assert.equal(config.status, 200);
  assert.deepEqual(Object.keys(config.body as object).sort(), ['apiKey', 'authDomain', 'projectId']);
});

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

test('Firestore admin/user circuits preserve imports, dates, acknowledgements and class tombstones', async () => {
  const number = '0617779988';
  const registered = await call(authHandler, {method: 'POST', headers: {}, body: {action: 'register', phone: number, nom: 'Circuit', prenom: 'QA', password: 'Test-password-123'}});
  assert.equal(registered.status, 201);
  const teacherHeaders = {cookie: String(registered.headers['Set-Cookie']).split(';')[0], 'x-workspace-owner': number};
  const adminHeaders = {cookie: `${ADMIN_COOKIE}=${await signSession({role: 'admin'}, 60)}`};
  const postAdmin = (body: unknown) => call(adminHandler, {method: 'POST', headers: adminHeaders, body});
  const created = await postAdmin({action: 'upsertTeacherClass', phone: number, classInfo: {name: '1AC1', cycle: 'college', subject: 'Mathématiques', level: '1AC', group: '1'}});
  assert.equal(created.status, 200);
  const classInfo = (created.body as {classInfo: {id: string}}).classInfo;
  assert.equal((classInfo as { level?: string }).level, '1AC');
  assert.equal((classInfo as { group?: string }).group, '1');
  const invalidIdentity = await postAdmin({action: 'upsertTeacherClass', phone: number, classInfo: {id: classInfo.id, name: '1AC1', subject: 'Mathématiques', cycle: 'college', level: {bad: true}}});
  assert.equal(invalidIdentity.status, 400);
  const initial = await call(syncHandler, {method: 'GET', headers: teacherHeaders, query: {classId: classInfo.id}});
  assert.equal(initial.status, 200);
  const expectedUpdatedAt = (initial.body as {updatedAt: string}).updatedAt;
  const lessonsPayload = [{type: 'chapter', title: 'الأعداد', items: [{type: 'exercice', title: 'الحساب', description: '$x^2$', date: '2026-10-03'}]}];
  assert.equal((await postAdmin({action: 'importClassLessons', phone: number, classId: classInfo.id, lessonsPayload, importMode: 'replace', expectedUpdatedAt})).status, 200);
  assert.equal((await postAdmin({action: 'importClassLessons', phone: number, classId: classInfo.id, lessonsPayload, importMode: 'replace', expectedUpdatedAt: '2020-01-01T00:00:00Z'})).status, 409);
  const imported = await call(syncHandler, {method: 'GET', headers: teacherHeaders, query: {classId: classInfo.id}});
  assert.equal((imported.body as {contentDirection: string}).contentDirection, 'rtl');
  assert.ok(JSON.stringify(imported.body).includes('الأعداد'));
  assert.equal((await postAdmin({action: 'saveAssessmentDate', phone: number, classId: 'missing-class', assessmentId: 'controle-1', date: '2026-10-10'})).status, 404);
  assert.equal((await postAdmin({action: 'saveAssessmentDate', phone: number, classId: classInfo.id, assessmentId: 'controle-1', date: '2026-10-10'})).status, 200);
  const stalePush = await call(syncHandler, {method: 'POST', headers: teacherHeaders, body: {classes: [classInfo], schedules: [], timetable: [], settings: {assessmentDates: {[classInfo.id]: {'controle-1': '2026-10-09'}}}, settingsUpdatedAt: '2020-01-01T00:00:00Z', lessons: [{classId: classInfo.id, lessonsData: [{type: 'chapter', title: 'Stale'}], updatedAt: '2020-01-01T00:00:00Z'}]}});
  assert.equal(stalePush.status, 200);
  const workspace = await call(syncHandler, {method: 'GET', headers: teacherHeaders});
  const syncedClass = (workspace.body as { classes: Array<{ id: string; level?: string; group?: string }> }).classes.find(item => item.id === classInfo.id);
  assert.equal(syncedClass?.level, '1AC');
  assert.equal(syncedClass?.group, '1');
  assert.equal((workspace.body as {settings: {assessmentDates: Record<string, Record<string, string>>}}).settings.assessmentDates[classInfo.id]['controle-1'], '2026-10-10');
  assert.deepEqual((await call(syncHandler, {method: 'GET', headers: teacherHeaders, query: {classId: classInfo.id}})).body, imported.body);
  const activitySettings = {
    ...(workspace.body as { settings: Partial<AppConfig> }).settings,
    pedagogicalEvents: { [classInfo.id]: [
      { id: 'check', type: 'controle_cahiers', title: 'مراقبة دفاتر التلاميذ', date: '2026-10-03', status: 'planned', createdAt: '2026-10-01T00:00:00Z',
        students: { names: ['أمين', 'سلمى'], notebookConditions: { 'أمين': 'good', 'سلمى': 'missing' }, updatedAt: '2026-10-03T08:00:00Z' } },
      { id: 'remediate', type: 'remediation', title: 'معالجة التعثرات', date: '2026-10-03', status: 'planned', createdAt: '2026-10-01T00:00:00Z' },
      { id: 'correction', type: 'correction_controle_continu', title: 'تصحيح الفرض المحروس', date: '2026-10-04', status: 'planned', createdAt: '2026-10-01T00:00:00Z' },
    ] },
    manualAssessments: { [classInfo.id]: [{ id: 'oral', type: 'oral', num: 1, semestre: 1, dateISO: '2026-10-03' }] },
  };
  const activityPush = await call(syncHandler, { method: 'POST', headers: teacherHeaders, body: {
    classes: [classInfo], schedules: [], timetable: [], settings: activitySettings, settingsUpdatedAt: new Date().toISOString(),
  } });
  assert.equal(activityPush.status, 200, JSON.stringify(activityPush.body));
  const restored = (await call(syncHandler, { method: 'GET', headers: teacherHeaders })).body as { settings: Partial<AppConfig> };
  assert.deepEqual(restored.settings.pedagogicalEvents, activitySettings.pedagogicalEvents);
  assert.equal(buildSessionActivityRemarks(restored.settings, classInfo.id,
    (key, values) => translateLocaleMessage('ar', key, values), '، ').get('2026-10-03'),
  'مراقبة الدفاتر: أمين، سلمى\nجيد: 1، لم يُحضَر: 1\nمعالجة التعثرات\nتقويم شفهي');
  assert.deepEqual((await call(syncHandler, {method: 'GET', headers: teacherHeaders, query: {classId: classInfo.id}})).body, imported.body,
    'syncing activities keeps the imported course hierarchy intact');
  const notification = await postAdmin({action: 'notifyTeacher', phone: number, message: 'Votre cahier est prêt.'});
  assert.equal(notification.status, 200);
  const inbox = await call(messagesHandler, {method: 'GET', headers: teacherHeaders});
  const messages = (inbox.body as {messages: {id: string}[]; unreadCount: number});
  assert.equal(messages.unreadCount, 1);
  assert.equal((await call(messagesHandler, {method: 'POST', headers: teacherHeaders, body: {action: 'acknowledge', messageId: messages.messages[0].id}})).status, 200);
  assert.equal(((await call(messagesHandler, {method: 'GET', headers: teacherHeaders})).body as {unreadCount: number}).unreadCount, 0);
  assert.equal((await postAdmin({action: 'deleteTeacherClass', phone: number, classId: classInfo.id})).status, 200);
  assert.equal((await call(syncHandler, {method: 'POST', headers: teacherHeaders, body: {classes: [classInfo], schedules: [], timetable: []}})).status, 200);
  const afterDelete = await call(syncHandler, {method: 'GET', headers: teacherHeaders});
  const deletedWorkspace = afterDelete.body as {classes: unknown[]; deletedClasses: Record<string, unknown>};
  assert.deepEqual(deletedWorkspace.classes, []);
  assert.ok(deletedWorkspace.deletedClasses[classInfo.id]);
  assert.equal((await call(syncHandler, {method: 'GET', headers: teacherHeaders, query: {classId: classInfo.id}})).status, 404);
});

test('admin class rosters reach the right email account and survive stale pushes with independent notebook and oral observations', async () => {
  process.env.AUTH_SECRET = 'emulator-only-secret-with-sufficient-length';
  const registered = await call(authHandler, { method: 'POST', headers: {}, body: {
    action: 'register', email: 'roster-teacher@example.com', nom: 'Roster', prenom: 'QA', password: 'Test-password-123',
  } });
  assert.equal(registered.status, 201);
  const owner = (registered.body as { user: { id: string } }).user.id;
  const headers = { cookie: String(registered.headers['Set-Cookie']).split(';')[0], 'x-workspace-owner': owner };
  const adminHeaders = { cookie: `${ADMIN_COOKIE}=${await signSession({ role: 'admin' }, 60)}` };
  const postAdmin = (body: unknown) => call(adminHandler, { method: 'POST', headers: adminHeaders, body });
  const create = async (name: string) => {
    const response = await postAdmin({ action: 'upsertTeacherClass', phone: owner, classInfo: { name, cycle: 'college', subject: 'Mathématiques' } });
    assert.equal(response.status, 200);
    return (response.body as { classInfo: ClassInfo }).classInfo;
  };
  const x = await create('1AC 1'); const y = await create('2AC 2');
  const request = { action: 'saveClassRoster', phone: owner, classId: x.id, studentNames: [' أحمد  العلوي ', 'سلمى الفاسي', 'أحمد العلوي'], expectedRosterVersion: 0 };
  assert.equal((await call(adminHandler, { method: 'POST', headers, body: request })).status, 401, 'teacher sessions cannot publish lists');
  assert.equal((await postAdmin({ ...request, classId: 'class-of-another-teacher' })).status, 404);
  assert.equal((await postAdmin({ ...request, studentNames: [123] })).status, 400);
  const first = await postAdmin(request); assert.equal(first.status, 200);
  const roster = (first.body as { roster: ClassRoster }).roster;
  assert.deepEqual(roster.names, ['أحمد العلوي', 'سلمى الفاسي']); assert.equal(roster.version, 1);
  assert.equal((await postAdmin(request)).status, 409, 'stale admin sessions cannot replace a newer list');
  assert.equal((await postAdmin({ ...request, classId: y.id, studentNames: ['Classe Y uniquement'] })).status, 200);
  const observedAt = new Date().toISOString();
  const observations = {
    pedagogicalEvents: { [x.id]: [{ id: 'check', type: 'controle_cahiers', title: 'Contrôle des cahiers', date: '2026-10-08', status: 'planned', createdAt: observedAt,
      students: { names: roster.names, notebookConditions: { 'أحمد العلوي': 'good' }, updatedAt: observedAt } }] },
    assessmentParticipants: { [x.id]: { oral: { names: roster.names, oralOutcomes: { 'سلمى الفاسي': 'needs_support' }, updatedAt: observedAt } } },
  };
  const push = (settings: unknown, offset = 5_000) => call(syncHandler, { method: 'POST', headers, body: {
    classes: [x, y], schedules: [], timetable: [], settings, settingsUpdatedAt: new Date(Date.now() + offset).toISOString(),
  } });
  assert.equal((await push({ ...observations, classRosters: { [x.id]: { ...roster, names: ['Forged'] } } })).status, 200);
  const pull = async () => (await call(syncHandler, { method: 'GET', headers })).body as { settings: Partial<AppConfig> };
  let restored = (await pull()).settings;
  assert.deepEqual(restored.classRosters?.[x.id], roster);
  assert.deepEqual(restored.classRosters?.[y.id]?.names, ['Classe Y uniquement']);
  assert.deepEqual(restored.assessmentParticipants, observations.assessmentParticipants);
  assert.deepEqual(restored.pedagogicalEvents, observations.pedagogicalEvents);
  const next = await postAdmin({ ...request, studentNames: [...roster.names, 'يوسف'], expectedRosterVersion: 1 });
  assert.equal(next.status, 200);
  assert.equal((await push({ ...observations, classRosters: { [x.id]: roster } }, 10_000)).status, 200);
  restored = (await pull()).settings;
  assert.deepEqual(restored.classRosters?.[x.id]?.names, [...roster.names, 'يوسف']);
  assert.equal(restored.classRosters?.[x.id]?.version, 2);
  assert.deepEqual(restored.assessmentParticipants, observations.assessmentParticipants, 'publishing a roster cannot rewrite an oral decision');
  const detail = await call(adminHandler, { method: 'GET', headers: adminHeaders, query: { action: 'teacher', phone: owner } });
  assert.deepEqual((detail.body as { classRosters: Record<string, ClassRoster> }).classRosters, restored.classRosters);
  assert.equal((await postAdmin({ ...request, studentNames: [], expectedRosterVersion: 2 })).status, 200);
  assert.equal((await push(observations, 15_000)).status, 200);
  assert.deepEqual((await pull()).settings.classRosters?.[x.id]?.names, [], 'empty publication must not resurrect after an old client push');
  assert.equal((await postAdmin({ action: 'deleteTeacherClass', phone: owner, classId: x.id })).status, 200);
  restored = (await pull()).settings;
  assert.equal(restored.classRosters?.[x.id], undefined);
  assert.equal(restored.assessmentParticipants?.[x.id], undefined);
  assert.deepEqual(restored.classRosters?.[y.id]?.names, ['Classe Y uniquement']);
});

test('large imported notebook crosses the HTTP contract and is restored intact from Firestore', async () => {
  const number = '0617779977';
  const registered = await call(authHandler, { method: 'POST', headers: {}, body: { action: 'register', phone: number, nom: 'Import', prenom: 'QA', password: 'Test-password-123' } });
  assert.equal(registered.status, 201);
  const headers = { cookie: String(registered.headers['Set-Cookie']).split(';')[0], 'x-workspace-owner': number };
  const capabilities = await call(syncHandler, { method: 'GET', headers, query: { scope: 'capabilities' } });
  assert.equal((capabilities.body as { encoding: string }).encoding, SYNC_ENCODING);
  const classInfo = { id: 'large-import', name: '1AC1', cycle: 'college', subject: 'Mathématiques', teacherName: 'QA', establishment: 'Test', color: 'sky' };
  const lessonsData = [{ type: 'chapter', title: 'الأعداد', items: Array.from({ length: 500 }, (_, i) => ({ type: 'cours', title: `درس ${i}`, description: 'الجبر 🧮 $x^2$ définition. '.repeat(100), ...(i < 490 ? { date: '2026-10-03' } : {}) })) }];
  const updatedAt = new Date().toISOString();
  const body = { classes: [classInfo], schedules: [], timetable: [], lessons: [{ classId: classInfo.id, lessonsData, contentDirection: 'rtl', updatedAt }] };
  assert.ok(Buffer.byteLength(JSON.stringify(body)) > 950_000);
  const wire = await encodeSyncPayload(body);
  const pushed = await call(syncHandler, { method: 'POST', headers, body: wire });
  assert.equal(pushed.status, 200, JSON.stringify(pushed.body));
  assert.deepEqual((pushed.body as { acceptedClassIds: string[] }).acceptedClassIds, [classInfo.id]);
  const pulled = await call(syncHandler, { method: 'GET', headers, query: { classId: classInfo.id } });
  assert.equal(pulled.status, 200);
  assert.deepEqual(pulled.body, { lessonsData, contentDirection: 'rtl', updatedAt });
  const restoredLessons = (pulled.body as { lessonsData: LessonsData }).lessonsData;
  assert.equal(lastDatedContentKey(buildLessonRows(restoredLessons)), '0||||489', 'Firestore preserves the dated progress before the undated tail');
  const oldDevice = await call(syncHandler, { method: 'POST', headers, body: {
    ...body, lessons: [{ ...body.lessons[0], lessonsData: [{ type: 'chapter', title: 'Older offline draft' }], updatedAt: '2020-01-01T00:00:00Z' }],
  } });
  assert.equal(oldDevice.status, 200);
  assert.deepEqual((oldDevice.body as { acceptedClassIds: string[] }).acceptedClassIds, []);
  assert.deepEqual((await call(syncHandler, { method: 'GET', headers, query: { classId: classInfo.id } })).body, pulled.body);
  const wrongOwner = await call(syncHandler, { method: 'POST', headers: { ...headers, 'x-workspace-owner': phone }, body: wire });
  assert.equal(wrongOwner.status, 409);
  const invalid = await encodeSyncPayload({ ...body, lessons: [{ ...body.lessons[0], classId: 'another-class' }] });
  assert.equal((await call(syncHandler, { method: 'POST', headers, body: invalid })).status, 400);
  assert.deepEqual((await call(syncHandler, { method: 'GET', headers, query: { classId: classInfo.id } })).body, pulled.body);
});

test('Firestore backup restores an encrypted consistent snapshot to an empty isolated emulator', async () => {
  await store.db.doc('cloud_records/backup-typed').set({json: JSON.stringify({text: 'رياضيات 🧮'}), expiresAt: Timestamp.fromMillis(1_800_000_000_123)});
  const original = await snapshotFirestore(store.db, 'demo-cahier-text');
  const key = randomBytes(32); const backup = decryptBackup(encryptBackup(original, key), key);
  const app = initializeApp({projectId: 'demo-cahier-text-backup'}, 'backup-restore');
  const target = initializeFirestore(app, {preferRest: false});
  try {
    const result = await restoreFirestoreEmulator(backup);
    assert.equal(result.comparisonVerified, true);
    assert.equal(result.restoredDocuments, original.records.length);
    assert.deepEqual((await snapshotFirestore(target, 'demo-cahier-text-backup')).records, original.records);
    await assert.rejects(restoreFirestoreEmulator(backup), /empty/);
  } finally { await target.terminate(); await deleteApp(app); }
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
