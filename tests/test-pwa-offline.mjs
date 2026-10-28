import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function worker(fail = false) {
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
    skipWaiting: async () => { skipped = true; }, clients: { claim: async () => {} } };
  const source = readFileSync('public/sw.js', 'utf8').replace('const BUILD_ASSETS = [];', "const BUILD_ASSETS = ['/assets/editor.js', '/SamsungOneArabic-400.ttf'];");
  runInNewContext(source, { self, caches: cacheApi, URL, Response, fetch: async () => { throw new Error('offline'); }, Set });
  const install = () => { let result; listeners.get('install')({ waitUntil: promise => { result = promise; } }); return result; };
  const request = (url, mode = 'cors') => {
    let result;
    listeners.get('fetch')({ request: { method: 'GET', cache: 'default', url: `https://app.test${url}`, mode }, respondWith: promise => { result = promise; } });
    return result;
  };
  return { install, request, stores, skipped: () => skipped };
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
