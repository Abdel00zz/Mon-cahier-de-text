import assert from 'node:assert/strict';
import test from 'node:test';
import { notifySyncProgress, readSyncProgress, subscribeSyncProgress, type SyncProgress } from '../src/infrastructure/sync/syncBus';

test('avancement : les phases se succèdent sans reculer', () => {
  notifySyncProgress({ state: 'pulling', total: 0, done: 0, classId: null });
  assert.deepEqual(readSyncProgress(), { state: 'pulling', total: 0, done: 0, classId: null });
  notifySyncProgress({ state: 'ready', total: 8 });
  assert.equal(readSyncProgress().state, 'ready');
  assert.equal(readSyncProgress().total, 8);
  notifySyncProgress({ state: 'notebooks', done: 3, classId: 'c3' });
  assert.deepEqual(readSyncProgress(), { state: 'notebooks', total: 8, done: 3, classId: 'c3' });
});

test('avancement : une mise à jour partielle ne touche pas au reste', () => {
  notifySyncProgress({ state: 'ready', total: 4, done: 0, classId: null });
  notifySyncProgress({ done: 2, classId: 'c2' });
  const value = readSyncProgress();
  assert.equal(value.total, 4);
  assert.equal(value.done, 2);
  assert.equal(value.classId, 'c2');
  assert.equal(value.state, 'ready');
});

test('avancement : les abonnés sont prévenus, une valeur identique ne les réveille pas', () => {
  const seen: SyncProgress[] = [];
  const stop = subscribeSyncProgress(value => { seen.push(value); });
  notifySyncProgress({ state: 'pulling', total: 0, done: 0, classId: null });
  notifySyncProgress({ state: 'pulling', total: 0, done: 0, classId: null });
  assert.equal(seen.length, 1);
  notifySyncProgress({ state: 'failed' });
  assert.equal(seen.length, 2);
  stop();
  notifySyncProgress({ state: 'idle', total: 0, done: 0, classId: null });
  assert.equal(seen.length, 2);
});
