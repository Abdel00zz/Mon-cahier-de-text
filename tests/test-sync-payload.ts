import assert from 'node:assert/strict';
import test from 'node:test';
import { gzipSync } from 'node:zlib';
import { encodeSyncPayload, requestSyncPush, SyncRequestError } from '../src/infrastructure/sync/syncTransport';
import { MAX_SYNC_EXPANDED_BYTES, MAX_SYNC_WIRE_BYTES, SYNC_ENCODING } from '../src/infrastructure/sync/syncProtocol';
import { decodeSyncPayload } from '../api/_lib/syncPayload';
import { HttpError } from '../api/_lib/http';

const largeNotebook = () => ({ classes: [], lessons: [{ classId: 'math', lessonsData: [{ type: 'chapter', title: 'الرياضيات',
  items: Array.from({ length: 600 }, (_, id) => ({ type: 'cours', title: `Séance ${id}`, description: 'درس 🧮 $x^2$ — définition. '.repeat(100) })),
}], updatedAt: '2026-10-04T09:00:00.000Z' }] });

test('large sync: gzip roundtrip preserves Arabic, emoji, mathematics and every lesson', async () => {
  const body = largeNotebook();
  assert.ok(Buffer.byteLength(JSON.stringify(body)) > MAX_SYNC_WIRE_BYTES);
  const wire = await encodeSyncPayload(body);
  assert.equal(JSON.parse(wire).encoding, SYNC_ENCODING);
  assert.ok(Buffer.byteLength(wire) < MAX_SYNC_WIRE_BYTES);
  assert.deepEqual(await decodeSyncPayload(wire, true), body);
  await assert.rejects(decodeSyncPayload(wire, false), (e: unknown) => e instanceof HttpError && e.statusCode === 413);
});

test('small sync remains backward compatible and does not negotiate compression', async context => {
  const body = { classes: [], lessons: [] };
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async (url: unknown, options: RequestInit) => {
    calls++;
    assert.equal(url, '/api/sync');
    assert.deepEqual(JSON.parse(options.body as string), body);
    return Response.json({ ok: true });
  });
  assert.deepEqual(await requestSyncPush(body, {}), { ok: true });
  assert.equal(calls, 1);
  assert.deepEqual(await decodeSyncPayload(await encodeSyncPayload(body), false), body);
});

test('large sync refuses an older server without sending an unsupported POST', async context => {
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async (url: unknown, options: RequestInit) => {
    calls++;
    assert.equal(url, '/api/sync?scope=capabilities');
    assert.equal(options.method, undefined);
    assert.equal((options.headers as Record<string, string>)['X-Workspace-Owner'], 'owner-a');
    return Response.json({ classes: [] });
  });
  await assert.rejects(requestSyncPush(largeNotebook(), { headers: { 'X-Workspace-Owner': 'owner-a' } }),
    (e: unknown) => e instanceof SyncRequestError && e.status === 413);
  assert.equal(calls, 1);
});

test('sync rejects oversized expansion, broken gzip and nested transport envelopes', async () => {
  const pack = (s: string) => ({ encoding: SYNC_ENCODING, data: gzipSync(s).toString('base64') });
  await assert.rejects(decodeSyncPayload(pack('x'.repeat(MAX_SYNC_EXPANDED_BYTES + 1)), true),
    (e: unknown) => e instanceof HttpError && e.statusCode === 413);
  for (const payload of [pack('{broken'), pack(JSON.stringify({ encoding: SYNC_ENCODING })), { encoding: SYNC_ENCODING, data: 'eA==' }]) {
    await assert.rejects(decodeSyncPayload(payload, true), (e: unknown) => e instanceof HttpError && e.statusCode === 400);
  }
  await assert.rejects(encodeSyncPayload({ text: 'x'.repeat(MAX_SYNC_EXPANDED_BYTES) }),
    (e: unknown) => e instanceof SyncRequestError && e.status === 413);
});

test('closing the app never starts a large keepalive upload', async context => {
  context.mock.method(globalThis, 'fetch', async () => { assert.fail('No network request on pagehide for a large body'); });
  await assert.rejects(requestSyncPush(largeNotebook(), { keepalive: true }), SyncRequestError);
});
