import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function worker(fail = false, options = {}) {
  const listeners = new Map();
  const stores = new Map();
  let skipped = false;
  const cacheApi = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const values = stores.get(name);
      return {
        async addAll(urls) {
          for (const url of urls) {
            if (fail && url === '/assets/editor.js') throw new Error('offline');
            values.set(url, `cached:${url}`);
          }
        },
        async match(request) { return values.get(typeof request === 'string' ? request : new URL(request.url).pathname); },
        async put(request, response) {
          if (options.quotaFailure) throw new Error('quota');
          values.set(new URL(request.url).pathname, response);
        },
      };
    },
    async delete(name) { return stores.delete(name); },
    async keys() { return [...stores.keys()]; },
    async match(request) {
      for (const name of stores.keys()) {
        const response = await (await this.open(name)).match(request);
        if (response) return response;
      }
    },
  };
  const self = { location: { origin: 'https://app.test' }, addEventListener: (name, fn) => listeners.set(name, fn),
    skipWaiting: async () => { skipped = true; }, clients: { claim: async () => {}, ...options.clients } };
  const source = readFileSync('public/sw.js', 'utf8').replace('const BUILD_ASSETS = [];', "const BUILD_ASSETS = ['/assets/editor.js', '/SamsungOneArabic-400.ttf'];");
  runInNewContext(source, { self, caches: cacheApi, URL, Response, fetch: options.fetch ?? (async () => { throw new Error('offline'); }), Set });
  const install = () => { let result; listeners.get('install')({ waitUntil: promise => { result = promise; } }); return result; };
  let pending = Promise.resolve();
  const request = (url, mode = 'cors') => {
    let result;
    listeners.get('fetch')({ request: { method: 'GET', cache: 'default', url: `https://app.test${url}`, mode }, respondWith: promise => { result = promise; }, waitUntil: promise => { pending = promise; } });
    return result;
  };
  const click = (url, action = '') => {
    let result = Promise.resolve();
    listeners.get('notificationclick')({ action, notification: { data: { url }, close() {} }, waitUntil: promise => { result = promise; } });
    return result;
  };
  return { install, request, click, stores, pending: () => pending, skipped: () => skipped };
}

test('offline shell and editor are available after installation without a network', async () => {
  const sw = worker();
  await sw.install();
  assert.equal(sw.skipped(), true);
  assert.equal(await sw.request('/', 'navigate'), 'cached:/index.html');
  assert.equal(await sw.request('/assets/editor.js'), 'cached:/assets/editor.js');
  assert.equal(await sw.request('/SamsungOneArabic-400.ttf'), 'cached:/SamsungOneArabic-400.ttf');
});

test('incomplete download does not activate or retain a partial shell', async () => {
  const sw = worker(true);
  await assert.rejects(sw.install());
  assert.equal(sw.skipped(), false);
  assert.equal(sw.stores.size, 0);
});

test('a full cache never discards a successful network response', async () => {
  const response = { ok: true, type: 'basic', clone() { return this; } };
  const sw = worker(false, { quotaFailure: true, fetch: async () => response });
  assert.equal(await sw.request('/contenus/new.json'), response);
  await sw.pending();
});

test('cached resources respond immediately while revalidation remains alive', async () => {
  let resolveNetwork;
  const network = new Promise(resolve => { resolveNetwork = resolve; });
  const sw = worker(false, { fetch: () => network });
  sw.stores.set('cahier-runtime-v2', new Map([['/contenus/course.json', 'old']]));
  assert.equal(await sw.request('/contenus/course.json'), 'old');
  let finished = false;
  const pending = sw.pending().then(() => { finished = true; });
  await Promise.resolve();
  assert.equal(finished, false);
  const response = { ok: true, type: 'basic', clone() { return this; } };
  resolveNetwork(response);
  await pending;
  assert.equal(sw.stores.get('cahier-runtime-v2').get('/contenus/course.json'), response);
});

test('notification clicks reuse the notebook window, not admin, and reject external URLs', async () => {
  const calls = [];
  const client = url => ({ url, focused: false, visibilityState: 'visible',
    focus: async () => { calls.push(`focus:${url}`); }, postMessage: message => { calls.push(message.url); } });
  const admin = client('https://app.test/admin.html');
  const teacher = client('https://app.test/#/');
  const sw = worker(false, { clients: { matchAll: async () => [admin, teacher], openWindow: async url => calls.push(url) } });
  await sw.click('/#/classe/a');
  assert.deepEqual(calls, ['focus:https://app.test/#/', '/#/classe/a']);
  calls.length = 0;
  await sw.click('https://example.test/');
  assert.deepEqual(calls, ['focus:https://app.test/#/']);
  calls.length = 0;
  await sw.click('/#/classe/a', 'dismiss');
  assert.deepEqual(calls, []);
});
