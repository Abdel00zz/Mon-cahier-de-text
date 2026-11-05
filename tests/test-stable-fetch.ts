import assert from 'node:assert/strict';
import test from 'node:test';
import { createStableFetch, isWrapperFailure } from '../src/platform/stableFetch';

/* Un wrapper cassé doit être abandonné au profit du fetch natif, sans doubler
   une écriture réseau ni masquer une vraie panne. */

const response = (body: string) => new Response(body, { status: 200 });

test('fetch : un wrapper qui plante dans son propre code est remplacé par le natif', async () => {
  let nativeCalls = 0;
  let wrapperCalls = 0;
  const native = (async () => { nativeCalls += 1; return response('native'); }) as typeof fetch;
  const stable = createStableFetch(native);
  stable.adopt(async () => { wrapperCalls += 1; throw new TypeError("Cannot read properties of undefined (reading 'M_ID')"); });

  const first = await stable.fetch('/api/calendar');
  assert.equal(await first.text(), 'native');
  assert.equal(wrapperCalls, 1);
  assert.equal(nativeCalls, 1);

  // Le wrapper cassé n'est plus consulté pour les requêtes suivantes.
  const second = await stable.fetch('/api/calendar');
  assert.equal(await second.text(), 'native');
  assert.equal(wrapperCalls, 1);
  assert.equal(nativeCalls, 2);
});

test('fetch : un wrapper qui fonctionne reste utilisé', async () => {
  let nativeCalls = 0;
  let wrapperCalls = 0;
  const native = (async () => { nativeCalls += 1; return response('native'); }) as typeof fetch;
  const stable = createStableFetch(native);
  stable.adopt(async () => { wrapperCalls += 1; return response('wrapped'); });

  const result = await stable.fetch('/api/classes');
  assert.equal(await result.text(), 'wrapped');
  assert.equal(wrapperCalls, 1);
  assert.equal(nativeCalls, 0);
});

test('fetch : une lecture peut être rejouée en natif, mais un échec natif reste visible', async () => {
  let nativeCalls = 0;
  const recovered = createStableFetch((async () => { nativeCalls += 1; return response('native'); }) as typeof fetch);
  recovered.adopt(async () => { throw new TypeError('Failed to fetch'); });
  const result = await recovered.fetch('/api/messages');
  assert.equal(await result.text(), 'native');
  assert.equal(nativeCalls, 1);

  const offline = createStableFetch((async () => { throw new TypeError('Failed to fetch'); }) as typeof fetch);
  offline.adopt(async () => { throw new TypeError('Failed to fetch'); });
  await assert.rejects(offline.fetch('/api/messages'));
});

test('fetch : une écriture n’est rejouée que si l’échec vient du wrapper', async () => {
  let nativeCalls = 0;
  const native = (async () => { nativeCalls += 1; return response('native'); }) as typeof fetch;

  const broken = createStableFetch(native);
  broken.adopt(async () => { throw new TypeError("Cannot read properties of undefined (reading 'M_ID')"); });
  const written = await broken.fetch('/api/sync', { method: 'POST', body: '{}' });
  assert.equal(await written.text(), 'native');
  assert.equal(nativeCalls, 1);

  const offline = createStableFetch(native);
  offline.adopt(async () => { throw new TypeError('Load failed'); });
  await assert.rejects(offline.fetch('/api/sync', { method: 'POST', body: '{}' }));
  assert.equal(nativeCalls, 1);
});

test('fetch : la détection ne confond pas erreur de wrapper et erreur réseau', () => {
  assert.equal(isWrapperFailure(new TypeError("Cannot read properties of undefined (reading 'M_ID')")), true);
  assert.equal(isWrapperFailure(new TypeError('Failed to fetch')), false);
  assert.equal(isWrapperFailure(new TypeError('Load failed')), false);
  assert.equal(isWrapperFailure(new DOMException('The operation was aborted.', 'AbortError')), false);
  assert.equal(isWrapperFailure(new Error('other')), false);
});

test('fetch : adopter la fonction stable elle-même ne crée pas de boucle', async () => {
  let nativeCalls = 0;
  const native = (async () => { nativeCalls += 1; return response('native'); }) as typeof fetch;
  const stable = createStableFetch(native);
  stable.adopt(stable.fetch);
  assert.equal(await (await stable.fetch('/version.json')).text(), 'native');
  assert.equal(nativeCalls, 1);
});
