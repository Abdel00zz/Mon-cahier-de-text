import assert from 'node:assert/strict';
import test from 'node:test';
import { isRetryableSyncError, requestSyncJson, retryDelayMs, syncJsonBytes, SyncRequestError } from '../src/infrastructure/sync/syncTransport';

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
