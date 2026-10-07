import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { MAX_SYNC_WIRE_BYTES, PUSH_BATCH_BUDGET_BYTES } from '../src/infrastructure/sync/syncProtocol';
import { isRetryableSyncError, planPushBatches, requestSyncJson, retryDelayMs, syncJsonBytes, SyncRequestError } from '../src/infrastructure/sync/syncTransport';

const entry = (classId: string, bytes: number) => ({ classId, bytes });

test('le budget d’un lot garde une marge sur la limite de fil', () => {
  // Un lot doit rester nettement sous le plafond du transport : la marge porte
  // le cadrage (liste, réglages, instantané) et l’enveloppe éventuelle.
  assert.ok(PUSH_BATCH_BUDGET_BYTES < MAX_SYNC_WIRE_BYTES, 'le budget reste sous la limite de fil');
  assert.ok(MAX_SYNC_WIRE_BYTES - PUSH_BATCH_BUDGET_BYTES >= 150_000, 'marge suffisante pour le cadrage');
});

test('découpage du push : les lots tiennent sous le budget, l’ordre est conservé', () => {
  const entries = [entry('a', 300), entry('b', 300), entry('c', 300), entry('d', 50)];
  const plan = planPushBatches(entries, 700);
  assert.deepEqual(plan.batches.map(batch => batch.map(e => e.classId)), [['a', 'b'], ['c', 'd']]);
  assert.deepEqual(plan.oversized, [], 'aucune classe hors budget');
  // Chaque lot respecte le budget, sauf une classe seule qui le dépasse.
  for (const batch of plan.batches) {
    const total = batch.reduce((sum, e) => sum + e.bytes, 0);
    assert.ok(total <= 700 || batch.length === 1, `lot ${batch.length} = ${total} octets`);
  }
});

test('découpage du push : un cahier trop gros part SEUL et reste nommé', () => {
  const plan = planPushBatches([entry('petit', 100), entry('geant', 2_000_000), entry('autre', 100)], 700_000);
  assert.deepEqual(plan.batches.map(batch => batch.map(e => e.classId)), [['petit'], ['geant'], ['autre']]);
  assert.deepEqual(plan.oversized.map(e => e.classId), ['geant'], 'la classe est signalée pour ne pas arrêter la file');
});

test('découpage du push : sans classe en attente, le lot vide porte les métadonnées', () => {
  // Liste, réglages et suppressions partent dans le premier lot : même sans
  // cahier à envoyer, il faut UN lot pour les transporter.
  assert.deepEqual(planPushBatches([], 700_000).batches, [[]]);
  assert.deepEqual(planPushBatches([entry('a', 1)], 700_000).batches.map(b => b.length), [1]);
});

test('la file de push ne s’arrête plus sur un cahier insynchronisable', () => {
  // Défaut réel : un cahier officiel trop gros était refusé (413) et la boucle
  // s'interrompait, donc AUCUNE autre classe ne montait au cloud.
  const source = readFileSync('src/contexts/SyncContext.tsx', 'utf8');
  assert.match(source, /planPushBatches\(entries, PUSH_BATCH_BUDGET_BYTES\)/, 'le découpage est planifié, jamais recopié');
  assert.match(source, /networkError\.status === 413 && batches\[i\]\.length === 1 && oversizedIds\.has\(batches\[i\]\[0\]\.classId\)/);
  assert.match(source, /notifySyncError\(413, syncText\('sync\.classTooLarge', \{ name \}\)\)/, 'le message nomme la classe à répartir');
  assert.match(source, /const oversizedIds = new Set\(plan\.oversized\.map\(entry => entry\.classId\)\)/);
  // Ce qui compte pour les données : le cahier écarté N'EST PAS marqué synchronisé.
  // Le nettoyage complet est donc réservé au cas sans cahier écarté…
  assert.match(source, /if \(!failure && !blockedByOversized\) \{[\s\S]{0,200}clearPendingWork\(work\);/, 'nettoyage complet réservé au succès total');
  // …sinon on retombe sur le nettoyage partiel (seuls les lots acceptés sont oubliés)
  // et l'état reste « en attente », jamais « erreur ».
  assert.match(source, /dirtyClassIds: pushedIds/, 'nettoyage partiel');
  assert.match(source, /setSyncStatus\(!failure \? 'pending' : failure\.status === 0 \? 'offline' : 'error'\)/);
});

test('sync batching: Arabic notebooks and emoji are budgeted in transmitted UTF-8 bytes', () => {
  const notebook = {classId: 'ar', lessonsData: Array.from({length: 30}, () => ({description: 'درس 🧮'.repeat(1800)}))};
  // Two copies appear below 700 KB when counted as JavaScript characters,
  // but exceed the server's 950 KB UTF-8 request limit.
  assert.ok(JSON.stringify(notebook).length * 2 < 700_000);
  assert.ok(syncJsonBytes(notebook) * 2 > 950_000);
  assert.equal(syncJsonBytes(notebook), Buffer.byteLength(JSON.stringify(notebook), 'utf8'));
});

test('sync transport: timeout covers a stalled response body and releases the request', async context => {
  context.mock.method(globalThis, 'fetch', async (_: unknown, options: RequestInit) => ({
    ok: true, json: () => new Promise((_, reject) => options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {once: true})),
  }));
  await assert.rejects(requestSyncJson('/api/sync', {}, 20), (error: unknown) => error instanceof SyncRequestError && error.status === 0 && isRetryableSyncError(error));
});
test('sync transport: caller cancellation keeps its identity instead of reporting a timeout', async context => {
  context.mock.method(globalThis, 'fetch', (_: unknown, options: RequestInit) => new Promise((_, reject) => {
    options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {once: true});
  }));
  const owner = new AbortController();
  const pending = requestSyncJson('/api/sync', {signal: owner.signal}, 1000);
  owner.abort();
  await assert.rejects(pending, (error: unknown) => error instanceof DOMException && error.name === 'AbortError');
});
test('sync transport: typed rate limit, Retry-After and conflict retries preserve server intent', async context => {
  context.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({error: 'Réessayez plus tard.'}), {status: 429, headers: {'Retry-After': '90', 'Content-Type': 'application/json'}}));
  await assert.rejects(requestSyncJson('/api/sync'), (error: unknown) => {
    assert.ok(error instanceof SyncRequestError);
    assert.equal(error.retryAfter, '90');
    assert.equal(retryDelayMs(0, error.retryAfter, 0, 0.5), 90_000);
    return isRetryableSyncError(error);
  });
  assert.equal(isRetryableSyncError(new SyncRequestError('Conflit', 409, 'WRITE_CONFLICT')), true);
  assert.equal(isRetryableSyncError(new SyncRequestError('Compte changé', 409)), false);
  assert.equal(isRetryableSyncError(new SyncRequestError('Reconnexion', 401)), false);
});
