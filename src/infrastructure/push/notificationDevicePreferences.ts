/** Device-local preference shared with the service worker, including offline. */
const CACHE = 'notification-device-preferences-v1';
const KEY = '/__notification-device-preferences__';

let pendingWrite = Promise.resolve();
export function writeNotificationVibration(enabled: boolean): Promise<void> {
  pendingWrite = pendingWrite.then(async () => {
    try {
      const cache = await caches.open(CACHE);
      await cache.put(KEY, new Response(JSON.stringify({ vibration: enabled })));
    } catch { /* Storage unavailable: the worker defaults to no vibration. */ }
  });
  return pendingWrite;
}

/** Device-local preference shared with the service worker, including offline. */
