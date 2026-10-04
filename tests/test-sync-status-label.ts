import assert from 'node:assert/strict';
import test from 'node:test';
import { syncStatusLabel } from '../src/domain/sync/syncStatusLabel';

const now = Date.parse('2026-10-04T12:00:00.000Z');
const at = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

test('état de synchronisation : la préparation des cahiers prime sur le reste', () => {
  assert.deepEqual(
    syncStatusLabel({ status: 'syncing', lastSyncAt: at(5), progress: { state: 'notebooks', total: 8, done: 3 }, now }),
    { key: 'sync.status.preparing', values: { done: 3, total: 8 } },
  );
  // Terminée, la préparation ne masque plus l'état réel.
  assert.equal(syncStatusLabel({ status: 'syncing', lastSyncAt: at(0), progress: { state: 'notebooks', total: 8, done: 8 }, now }).key, 'sync.status.syncing');
  assert.equal(syncStatusLabel({ status: 'idle', lastSyncAt: at(0), progress: { state: 'ready', total: 0, done: 0 }, now }).key, 'sync.status.synced');
});

test('état de synchronisation : chaque état a son message, l’erreur et le hors-ligne sont distincts', () => {
  assert.equal(syncStatusLabel({ status: 'error', lastSyncAt: at(1), now }).key, 'sync.status.error');
  assert.equal(syncStatusLabel({ status: 'offline', lastSyncAt: at(1), now }).key, 'sync.status.offline');
  assert.equal(syncStatusLabel({ status: 'syncing', lastSyncAt: at(1), now }).key, 'sync.status.syncing');
  assert.equal(syncStatusLabel({ status: 'pending', lastSyncAt: at(1), now }).key, 'sync.status.pending');
});

test('état de synchronisation : l’ancienneté se compte en minutes, jamais négative', () => {
  assert.deepEqual(syncStatusLabel({ status: 'synced', lastSyncAt: at(2), now }), { key: 'sync.status.synced', values: { minutes: 2 } });
  assert.deepEqual(syncStatusLabel({ status: 'synced', lastSyncAt: at(0.4), now }).values, { minutes: 0 });
  assert.equal(syncStatusLabel({ status: 'synced', lastSyncAt: null, now }).key, 'sync.status.ready');
  assert.equal(syncStatusLabel({ status: 'synced', lastSyncAt: 'pas-une-date', now }).key, 'sync.status.ready');
  assert.equal(syncStatusLabel({ status: 'synced', lastSyncAt: new Date(now + 60_000).toISOString(), now }).key, 'sync.status.ready');
});
