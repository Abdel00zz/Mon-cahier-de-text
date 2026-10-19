import assert from 'node:assert/strict';
import test from 'node:test';
import { isNetworkOnline, startNativeNetworkMonitoring } from '../src/platform/networkStatus';

const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
function fixture() {
  let event = (_status: { connected: boolean }) => {};
  let resume = () => {};
  let removed = 0;
  const published: boolean[] = [];
  const queries: Array<(status: { connected: boolean }) => void> = [];
  const stop = startNativeNetworkMonitoring({
    getStatus: () => new Promise(resolve => queries.push(resolve)),
    addListener: async (_name, callback) => { event = callback; return { remove: async () => { removed++; } }; },
  }, {
    publish: connected => published.push(connected),
    subscribeResume: callback => { resume = callback; return () => { resume = () => {}; }; },
  });
  return { published, queries, event: (connected: boolean) => event({ connected }), resume: () => resume(), removed: () => removed, stop };
}

test('Android : un événement natif récent gagne sur une lecture réseau ancienne', async () => {
  const f = fixture();
  await flush();
  f.event(false);
  f.queries[0]({ connected: true });
  await flush();
  assert.deepEqual(f.published, [false]);
  f.stop();
});

test('Android : état initial, reprise et désinscription sans minuteur de scrutation', async () => {
  const f = fixture();
  await flush();
  f.queries[0]({ connected: false }); await flush();
  f.resume();
  assert.equal(f.queries.length, 2);
  f.queries[1]({ connected: true }); await flush();
  assert.deepEqual(f.published, [false, true]);
  f.resume(); f.stop();
  f.queries[2]({ connected: false }); f.event(false); f.resume(); await flush();
  assert.deepEqual(f.published, [false, true]);
  assert.equal(f.queries.length, 3);
  assert.equal(f.removed(), 1);
});

test('Android : une inscription tardive est nettoyée après démontage', async () => {
  const f = fixture();
  f.stop(); await flush();
  assert.equal(f.removed(), 1);
  assert.equal(f.queries.length, 0);
});

test('Android : échec du listener, lecture initiale conservée', async () => {
  const published: boolean[] = [];
  const stop = startNativeNetworkMonitoring({
    getStatus: async () => ({ connected: false }),
    addListener: async () => { throw new Error('Unavailable listener'); },
  }, { publish: value => published.push(value), subscribeResume: () => () => {} });
  await flush(); await flush();
  assert.deepEqual(published, [false]); stop();
});

test('Android : le statut natif fait foi ; navigateur : repli sur navigator.onLine', context => {
  const originals = ['document', 'navigator'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  const dataset: Record<string, string> = {};
  const browser = { onLine: true };
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { documentElement: { dataset } } });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: browser });
  context.after(() => { for (const [key, value] of originals) {
    if (value) Object.defineProperty(globalThis, key, value); else Reflect.deleteProperty(globalThis, key);
  } });
  assert.equal(isNetworkOnline(), true);
  dataset.nativeOnline = 'false'; assert.equal(isNetworkOnline(), false);
  dataset.nativeOnline = 'true'; browser.onLine = false; assert.equal(isNetworkOnline(), true);
  delete dataset.nativeOnline; assert.equal(isNetworkOnline(), false);
});
