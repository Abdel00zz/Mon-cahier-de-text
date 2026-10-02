import assert from 'node:assert/strict';
import test from 'node:test';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { applyAppBadge, nextInboxBadge, unreadBadgeCount } from '../src/domain/notifications/appBadge';
import { notificationPresentation, serializePushNotification } from '../src/domain/notifications/notificationPresentation';
import { updateWorkerInboxBadge, presentInboxPush, clearWorkerInboxBadge, readInboxBadge } from '../src/pwa/inboxBadge';
import { fcmConfigured, sendNativePush } from '../api/_lib/fcm.js';
import { validateNativeToken } from '../api/_lib/nativePush.js';
import { pendingNativePushCleanup, rememberNativePushCleanup, forgetNativePushCleanup } from '../src/infrastructure/push/nativePushCleanup';
import { readInboxSnapshot } from '../api/_lib/adminMessages';
import { KEYS, type RedisClient } from '../api/_lib/redis';

test('inbox: server snapshots order delayed push and acknowledgements across server clocks', async () => {
  const phone = '212600000001';
  const message = { id: 'admin-example-0001', title: 'Message', body: 'Texte privé', createdAt: '2026-10-02T10:00:00Z' };
  // Protocol oracle, not a Lua interpreter: the Redis snapshot and its clock
  // arrive atomically. Exercise both raw JSON and Upstash auto-deserialization.
  const replies: unknown[] = [[JSON.stringify([message]), 100], [[{ ...message, acknowledgedAt: '2026-10-02T10:00:01Z' }], 101]];
  const redis = { eval: async (_script: string, keys: string[], args: unknown[]) => {
    assert.deepEqual(keys, [KEYS.adminMessages(phone), KEYS.inboxClock(phone), KEYS.user(phone)]);
    assert.deepEqual(args, []);
    return replies.shift();
  } } as unknown as RedisClient;
  const published = await readInboxSnapshot(redis, phone);
  const read = await readInboxSnapshot(redis, phone);
  assert.equal(published.unreadCount, 1); assert.equal(read.unreadCount, 0);
  const badge = nextInboxBadge(null, { owner: phone, count: read.unreadCount, updatedAt: read.badgeUpdatedAt })!;
  assert.equal(nextInboxBadge(badge, { owner: phone, count: published.unreadCount, updatedAt: published.badgeUpdatedAt }), null);
  await assert.rejects(readInboxSnapshot({ eval: async () => null } as unknown as RedisClient, phone), /Compte supprimé/);
});

test('badge: authoritative counts, duplicates, old acknowledgements and account changes', () => {
  const owner = '212600000001';
  const first = nextInboxBadge(null, { owner, count: 3, updatedAt: 10 })!;
  assert.equal(first.count, 3);
  assert.deepEqual(nextInboxBadge(first, first), first); // Duplicate does not increment.
  const read = nextInboxBadge(first, { owner, count: 0, updatedAt: 20 })!;
  assert.equal(nextInboxBadge(read, { owner, count: 3, updatedAt: 15 }), null);
  assert.equal(nextInboxBadge(read, { owner: '212600000002', count: 1, updatedAt: 5 })?.count, 1);
  for (const count of [-1, 1.2, NaN, Infinity, '2', undefined]) assert.equal(unreadBadgeCount(count), null);
  assert.equal(unreadBadgeCount(1000), 999);
});

test('badge: unsupported or blocked launchers never break the notebook', async () => {
  await applyAppBadge({}, 2);
  await applyAppBadge({ setAppBadge: async () => { throw new Error('Permission denied'); } }, 2);
  let cleared = false;
  await applyAppBadge({ clearAppBadge: async () => { cleared = true; } }, 0);
  assert.equal(cleared, true);
});

test('native unsubscribe retries are bounded, account-scoped and binding-specific', () => {
  const entries = new Map<string, string>();
  const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); }, removeItem: (key: string) => { entries.delete(key); } };
  const owner = '212600000001'; const token = 'a'.repeat(100); const binding = 'test-binding-00000001';
  rememberNativePushCleanup(owner, token, binding, storage);
  assert.equal(pendingNativePushCleanup('212600000002', storage).length, 0);
  rememberNativePushCleanup(owner, token, 'test-binding-00000002', storage);
  forgetNativePushCleanup(owner, token, binding, storage);
  assert.equal(pendingNativePushCleanup(owner, storage)[0].binding, 'test-binding-00000002');
  assert.equal(pendingNativePushCleanup(owner, storage, Date.now() + 15 * 86400_000).length, 0);
  for (let i = 0; i < 10; i++) rememberNativePushCleanup(owner, `${token}${i}`, binding, storage);
  assert.equal(pendingNativePushCleanup(owner, storage).length, 5);
});

test('worker: inbox persists, stale pushes cannot restore a read or signed-out badge', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  const entries = new Map<string, Response>();
  Object.defineProperty(globalThis, 'caches', { configurable: true, value: {
    open: async () => ({ match: async (key: string) => entries.get(key)?.clone(),
      put: async (key: string, response: Response) => { entries.set(key, response); } }),
    delete: async () => { entries.clear(); return true; },
  } });
  let count = 0;
  let notifications = 0;
  const target = { setAppBadge: async (value?: number) => { count = value ?? 0; }, clearAppBadge: async () => { count = 0; } };
  const state = { owner: '212600000001', count: 2, updatedAt: 10 };
  const show = async () => { notifications++; };
  try {
    await updateWorkerInboxBadge(target, { ...state, count: 0, updatedAt: 1 });
    await presentInboxPush(target, state, show);
    await presentInboxPush(target, state, show);
    assert.equal(count, 2); assert.equal(notifications, 1);
    await updateWorkerInboxBadge(target, { ...state, count: 0, updatedAt: 20 });
    await presentInboxPush(target, state, show);
    assert.equal(count, 0); assert.equal(notifications, 1);
    await updateWorkerInboxBadge(target, { ...state, owner: '212600000002', count: 1, updatedAt: 25 });
    await presentInboxPush(target, { ...state, updatedAt: 30 }, show);
    assert.equal(count, 1); assert.equal(notifications, 1);
    // Clear serialized after an in-flight push must be final.
    await Promise.all([presentInboxPush(target, { ...state, owner: '212600000002', updatedAt: 35 }, show), clearWorkerInboxBadge(target)]);
    await presentInboxPush(target, { ...state, updatedAt: 40 }, show);
    assert.equal(count, 0); assert.equal(await readInboxBadge(), null);
  } finally {
    if (original) Object.defineProperty(globalThis, 'caches', original); else Reflect.deleteProperty(globalThis, 'caches');
  }
});

test('Web Push: count is independent of the monochrome status-bar icon and reminder deliveries', () => {
  const payload = { title: 'Direction', body: 'Message', kind: 'admin' as const, url: '/#/notifications', badgeCount: 4, badgeOwner: '212600000001' };
  const serialized = JSON.parse(serializePushNotification(payload));
  assert.equal(serialized.badgeCount, 4);
  assert.equal(serialized.notification.badge, '/icons/notification-badge-96.png');
  assert.equal(notificationPresentation(payload).options.data.badgeOwner, payload.badgeOwner);
  assert.equal(JSON.parse(serializePushNotification({ ...payload, kind: 'session-reminder' })).badgeCount, undefined);
});

test('FCM: optional configuration, signed OAuth, private data-only payload, expired vs transient token failures', async () => {
  const before = { project: process.env.FCM_PROJECT_ID, email: process.env.FCM_CLIENT_EMAIL, key: process.env.FCM_PRIVATE_KEY };
  const previousFetch = globalThis.fetch;
  const device = { token: 'a'.repeat(100), binding: 'test-binding-00000001', locale: 'ar' as const };
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  let sends = 0;
  let mode = 'success';
  try {
    delete process.env.FCM_PROJECT_ID; delete process.env.FCM_CLIENT_EMAIL; delete process.env.FCM_PRIVATE_KEY;
    assert.equal(fcmConfigured(), false);
    assert.deepEqual(await sendNativePush(device, { kind: 'admin', badgeCount: 3, timestamp: 10 }), { sent: false, expired: false });
    process.env.FCM_PROJECT_ID = 'cahier-badge-test'; process.env.FCM_CLIENT_EMAIL = 'test@cahier-badge-test.iam.gserviceaccount.com';
    process.env.FCM_PRIVATE_KEY = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString().replaceAll('\n', '\\n');
    globalThis.fetch = async (url, options) => {
      if (String(url).includes('oauth2.googleapis.com')) {
        const assertion = new URLSearchParams(options?.body as URLSearchParams).get('assertion')!;
        const [header, body, signature] = assertion.split('.');
        const verify = createVerify('RSA-SHA256'); verify.update(`${header}.${body}`); verify.end();
        assert.ok(verify.verify(publicKey, Buffer.from(signature, 'base64url')));
        assert.equal(JSON.parse(Buffer.from(body, 'base64url').toString()).scope, 'https://www.googleapis.com/auth/firebase.messaging');
        return new Response(JSON.stringify({ access_token: 'synthetic-test-token', expires_in: 3600 }));
      }
      sends++;
      const message = JSON.parse(options?.body as string).message;
      assert.equal(message.notification, undefined); // No OS display bypasses the native account guard.
      assert.equal(message.data.binding, device.binding);
      assert.equal(message.data.badgeCount, '3');
      assert.equal(message.data.body, undefined); // No teacher message on the lock screen.
      if (mode === 'network') throw new TypeError('Offline');
      return mode === 'success' ? new Response('{}') : new Response(JSON.stringify({ error: { details: [{ errorCode: mode }] } }), { status: 400 });
    };
    assert.deepEqual(await sendNativePush(device, { kind: 'admin', badgeCount: 3, timestamp: 10 }), { sent: true, expired: false });
    mode = 'UNREGISTERED'; assert.deepEqual(await sendNativePush(device, { kind: 'admin', badgeCount: 3, timestamp: 10 }), { sent: false, expired: true });
    mode = 'INVALID_ARGUMENT'; assert.deepEqual(await sendNativePush(device, { kind: 'admin', badgeCount: 3, timestamp: 10 }), { sent: false, expired: false });
    mode = 'network'; assert.deepEqual(await sendNativePush(device, { kind: 'admin', badgeCount: 3, timestamp: 10 }), { sent: false, expired: false });
    assert.equal(sends, 4);
    assert.equal(validateNativeToken(device.token), device.token);
    assert.throws(() => validateNativeToken('https://example.test'));
  } finally {
    globalThis.fetch = previousFetch;
    for (const [key, value] of [['FCM_PROJECT_ID', before.project], ['FCM_CLIENT_EMAIL', before.email], ['FCM_PRIVATE_KEY', before.key]]) {
      if (value === undefined) delete process.env[key!]; else process.env[key!] = value;
    }
  }
});
