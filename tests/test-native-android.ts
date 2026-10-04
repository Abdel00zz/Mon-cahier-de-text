import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { Capacitor } from '@capacitor/core';
import { nativeApiUrl, apiFetch } from '../src/platform/nativeHttp';
import { buildNativeReminderPlan, schoolMinuteInstant } from '../src/domain/notifications/nativeReminderPlan';
import { WORKSPACE_SCOPE_KEY } from '../src/infrastructure/storage/accountWorkspace';
import type { AppConfig, ClassInfo } from '../src/types';

const cloud = 'https://mon-cahier-de-text.vercel.app';
const local = 'https://localhost';
const owner = '0612345678';
const bridge = Capacitor as unknown as { PluginHeaders: unknown[]; nativePromise: (plugin: string, method: string, options?: unknown) => Promise<unknown> };
bridge.PluginHeaders = [{ name: 'LocalNotifications', methods: ['checkPermissions', 'requestPermissions', 'getPending', 'cancel', 'createChannel', 'schedule', 'getDeliveredNotifications', 'removeDeliveredNotifications'].map(name => ({ name, rtype: 'promise' })) }];
bridge.nativePromise = async () => { throw new Error('Missing test bridge handler'); };
const { nativeNotificationState, showNativeNotification, reconcileNativeReminders, disableNativeReminders } = await import('../src/platform/nativeNotifications');
const classInfo: ClassInfo = { id: 'c1', name: '1AC 1', level: '1AC', cycle: 'college', subject: 'Mathématiques', teacherName: '', color: '', createdAt: '2026-09-01' };
const config: AppConfig = { establishmentName: '', defaultTeacherName: '', printShowDescriptions: true, applicationLocale: 'fr',
  timetable: [{ day: 1, slot: 0, classId: 'c1' }, { day: 1, slot: 1, classId: 'c1' }],
  notificationSettings: { enabled: true, pushEnabled: true, sessionVibration: false, quietDuringVacations: true, gapThreshold: 2, inactivityThresholdDays: 5, sessionReminderMinutes: 5 } };

function replaceGlobal(t: TestContext, key: string, value: unknown) {
  const original = Object.getOwnPropertyDescriptor(globalThis, key);
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  t.after(() => { if (original) Object.defineProperty(globalThis, key, original); else Reflect.deleteProperty(globalThis, key); });
}
function workspace(t: TestContext) {
  const entries = new Map<string, string>([[WORKSPACE_SCOPE_KEY, JSON.stringify({ owner, revision: 'a' })]]);
  replaceGlobal(t, 'localStorage', {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
  });
  return entries;
}

test('le transport natif réécrit uniquement les API locales vers une origine HTTPS sûre', () => {
  assert.equal(nativeApiUrl('/api/sync?after=2', cloud, local), `${cloud}/api/sync?after=2`);
  assert.equal(nativeApiUrl('https://localhost/api/auth', cloud, local), `${cloud}/api/auth`);
  for (const url of ['/lessons/1.json', '/api-adversary', 'https://other.test/api/auth', '//other.test/api/sync']) {
    assert.equal(nativeApiUrl(url, cloud, local), null);
  }
  for (const origin of ['http://production.test', 'https://user:pass@production.test', `${cloud}/path`, `${cloud}?key=x`]) {
    assert.throws(() => nativeApiUrl('/api/auth', origin, local), /HTTPS invalide/);
  }
});

test('le navigateur garde son fetch ; Android garde les statuts et les corps JSON de l’API', async t => {
  replaceGlobal(t, 'window', { location: { origin: local } });
  let native = false;
  t.mock.method(Capacitor, 'isNativePlatform', () => native);
  const calls: { url: string; options?: RequestInit }[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request, options?: RequestInit) => {
    calls.push({ url: String(input), options });
    return new Response('{"error":"corriger"}', { status: 409, headers: { 'content-type': 'application/json', 'set-cookie': 'session=test; HttpOnly; Secure', 'x-revision': '2' } });
  });
  await apiFetch('/api/auth', { credentials: 'same-origin' });
  assert.equal(calls[0].url, '/api/auth');
  assert.equal(calls[0].options?.credentials, 'same-origin');
  native = true;
  const response = await apiFetch('/api/sync', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"revision":2}' });
  assert.equal(calls[1].url, `${cloud}/api/sync`);
  assert.deepEqual(JSON.parse(String(calls[1].options?.body)), { revision: 2 });
  assert.equal(response.status, 409);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(response.headers.get('x-revision'), '2');
  assert.deepEqual(await response.json(), { error: 'corriger' });
});

test('un appel Android déjà annulé ne démarre aucune requête', async t => {
  replaceGlobal(t, 'window', { location: { origin: local } });
  t.mock.method(Capacitor, 'isNativePlatform', () => true);
  const fetch = t.mock.method(globalThis, 'fetch', async () => new Response());
  const controller = new AbortController(); controller.abort();
  await assert.rejects(apiFetch('/api/sync', { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(fetch.mock.callCount(), 0);
});

test('une réponse Android tardive reste ignorée après annulation', async t => {
  replaceGlobal(t, 'window', { location: { origin: local } });
  t.mock.method(Capacitor, 'isNativePlatform', () => true);
  let finish!: (response: Response) => void;
  t.mock.method(globalThis, 'fetch', () => new Promise<Response>(resolve => { finish = resolve; }));
  const controller = new AbortController();
  const request = apiFetch('/api/sync', { signal: controller.signal });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(typeof finish, 'function');
  controller.abort();
  await assert.rejects(request, { name: 'AbortError' });
  finish(new Response('{"revision":99}'));
});

test('les horaires scolaires suivent Casablanca, y compris le décalage du Ramadan', () => {
  assert.equal(schoolMinuteInstant('2026-09-14', 600)?.toISOString(), '2026-09-14T09:00:00.000Z');
  assert.equal(schoolMinuteInstant('2026-02-20', 600)?.toISOString(), '2026-02-20T10:00:00.000Z');
});

test('une séance continue produit un rappel de fin, futur, localisé et lié à sa classe', () => {
  const now = new Date('2026-09-14T07:00:00Z');
  const plan = buildNativeReminderPlan(config, [classInfo], now);
  assert.equal(plan.length, 2);
  assert.equal(plan[0].at.toISOString(), '2026-09-14T08:55:00.000Z');
  assert.match(plan[0].key, /session-end/);
  assert.match(plan[0].body, /5/);
  assert.equal(plan[0].url, '/#/classe/c1');
  assert.ok(plan.every(item => item.at > now && !item.key.includes('missing')));
  assert.equal(buildNativeReminderPlan(config, [classInfo], new Date('2026-09-14T09:00:00Z')).length, 1);
});

test('désactivation, congés, absences, dimanche et classes supprimées retirent les alarmes', () => {
  const now = new Date('2026-09-14T07:00:00Z');
  assert.deepEqual(buildNativeReminderPlan({ ...config, notificationSettings: { ...config.notificationSettings!, enabled: false } }, [classInfo], now), []);
  assert.deepEqual(buildNativeReminderPlan({ ...config, notificationSettings: { ...config.notificationSettings!, sessionEndReminderEnabled: false } }, [classInfo], now), []);
  assert.deepEqual(buildNativeReminderPlan({ ...config, absences: [{ debut: '2026-09-14', fin: '2026-09-28' }] }, [classInfo], now), []);
  assert.deepEqual(buildNativeReminderPlan(config, [], now), []);
  assert.deepEqual(buildNativeReminderPlan({ ...config, timetable: [{ day: 0, slot: 0, classId: 'c1' }] }, [classInfo], now), []);
  const afterVacation = buildNativeReminderPlan(config, [classInfo], new Date('2026-10-19T07:00:00Z'));
  assert.equal(afterVacation.length, 1);
  assert.equal(afterVacation[0].at.toISOString().slice(0, 10), '2026-10-26');
});

test('le planning Android reste borné à 64 alarmes sur deux semaines', () => {
  const other = { ...classInfo, id: 'c2' };
  const timetable = Array.from({ length: 6 }, (_, day) => Array.from({ length: 8 }, (_, slot) => ({ day: day + 1, slot, classId: slot % 2 ? 'c2' : 'c1' }))).flat();
  const plan = buildNativeReminderPlan({ ...config, timetable }, [classInfo, other], new Date('2026-09-14T06:00:00Z'));
  assert.equal(plan.length, 64);
  assert.equal(new Set(plan.map(item => item.key)).size, 64);
  assert.ok(plan.every((item, index) => !index || item.at >= plan[index - 1].at));
});

test('une permission accordée après changement de compte ne réactive pas les rappels', async t => {
  const entries = workspace(t);
  t.mock.method(bridge, 'nativePromise', async () => {
    entries.set(WORKSPACE_SCOPE_KEY, JSON.stringify({ owner: '0699999999', revision: 'b' }));
    return { display: 'granted' as const };
  });
  const state = await nativeNotificationState(true);
  assert.equal(state.subscribed, false);
  assert.equal(entries.has(`cdt_native_reminders_v1_${owner}`), false);
});

test('un test de notification interrompu par un changement de compte n’est pas envoyé', async t => {
  const entries = workspace(t);
  entries.set(`cdt_native_reminders_v1_${owner}`, 'true');
  const calls = t.mock.method(bridge, 'nativePromise', async (_plugin: string, method: string) => {
    if (method === 'checkPermissions') {
      // The lease is lost between the permission check and the send.
      entries.set(WORKSPACE_SCOPE_KEY, JSON.stringify({ owner: '0699999999', revision: 'b' }));
      return { display: 'granted' };
    }
  });
  assert.equal(await showNativeNotification('Test', 'Rappel', 'test', '/#/notifications'), false);
  assert.equal(calls.mock.calls.some(call => call.arguments[1] === 'schedule'), false);
});

test('désactiver annule seulement les alarmes du cahier et réconcilie l’état local', async t => {
  const entries = workspace(t);
  entries.set(`cdt_native_reminders_v1_${owner}`, 'true');
  const calls = t.mock.method(bridge, 'nativePromise', async (_plugin: string, method: string) => {
    if (method === 'getPending') return { notifications: [{ id: 1_600_000_002 }, { id: 42 }] };
    if (method === 'getDeliveredNotifications') return { notifications: [{ id: 1_600_000_003 }, { id: 42 }] };
    if (method === 'checkPermissions') return { display: 'granted' };
  });
  await disableNativeReminders();
  assert.deepEqual(calls.mock.calls.find(call => call.arguments[1] === 'cancel')?.arguments[2], { notifications: [{ id: 1_600_000_002 }] });
  assert.deepEqual(calls.mock.calls.find(call => call.arguments[1] === 'removeDeliveredNotifications')?.arguments[2], { notifications: [{ id: 1_600_000_003 }] });
  assert.equal((await nativeNotificationState()).subscribed, false);
  await reconcileNativeReminders(config, [classInfo], owner);
  assert.equal(calls.mock.calls.filter(call => call.arguments[1] === 'cancel').length, 2);
});

test('activer planifie les rappels Android en veille profonde, sans doublon au prochain rendu', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-09-14T07:00:00Z') });
  const entries = workspace(t);
  entries.set(`cdt_native_reminders_v1_${owner}`, 'true');
  const calls = t.mock.method(bridge, 'nativePromise', async (_plugin: string, method: string) => {
    if (method === 'checkPermissions') return { display: 'granted' };
    if (method === 'getPending') return { notifications: [] };
  });
  await reconcileNativeReminders(config, [classInfo], owner);
  const scheduled = calls.mock.calls.find(call => call.arguments[1] === 'schedule')?.arguments[2] as { notifications: { id: number; schedule: { at: Date; allowWhileIdle: boolean }; smallIcon: string; extra: { owner: string; url: string } }[] };
  assert.equal(scheduled.notifications.length, 2);
  for (const item of scheduled.notifications) {
    assert.ok(Number.isInteger(item.id) && item.id < 2_147_483_647);
    assert.equal(item.schedule.allowWhileIdle, true);
    assert.ok(item.schedule.at.getTime() > Date.now());
    assert.equal(item.smallIcon, 'ic_stat_notebook');
    assert.equal(item.extra.owner, owner);
    assert.equal(item.extra.url, '/#/classe/c1');
  }
  await reconcileNativeReminders(config, [classInfo], owner);
  assert.equal(calls.mock.calls.filter(call => call.arguments[1] === 'schedule').length, 1);
});
