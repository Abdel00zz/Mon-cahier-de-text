import assert from 'node:assert/strict';
import test from 'node:test';

test('une seule demande de permission peut être active à la fois', async context => {
  let resolvePermission!: (value: NotificationPermission) => void;
  let calls = 0;
  const NotificationMock = { permission: 'default', requestPermission: () => {
    calls++;
    return new Promise<NotificationPermission>(resolve => { resolvePermission = resolve; });
  } };
  const win = { isSecureContext: true, Notification: NotificationMock, location: { hostname: 'localhost' },
    matchMedia: () => ({ matches: false }), dispatchEvent: () => true };
  for (const [key, value] of Object.entries({ window: win, navigator: { userAgent: 'Android', serviceWorker: {} }, Notification: NotificationMock })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, value });
    context.after(() => { if (previous) Object.defineProperty(globalThis, key, previous); else Reflect.deleteProperty(globalThis, key); });
  }
  const { triggerCompanionNotificationActivation, getNotificationActivationSnapshot } = await import('../src/platform/notificationActivation');
  const first = triggerCompanionNotificationActivation({});
  assert.equal(getNotificationActivationSnapshot().activating, true);
  assert.equal(await triggerCompanionNotificationActivation({}), 'dismissed');
  assert.equal(calls, 1);
  resolvePermission('granted');
  assert.equal(await first, 'activated');
  assert.equal(getNotificationActivationSnapshot().activating, false);
});
