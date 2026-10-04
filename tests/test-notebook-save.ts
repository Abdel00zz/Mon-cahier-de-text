import assert from 'node:assert/strict';
import test from 'node:test';
import { saveNotebook } from '../src/infrastructure/storage/saveNotebook';
import { clearPendingWork, getPendingWork, readSyncMeta, reloadSyncState, subscribe } from '../src/infrastructure/sync/syncBus';
import type { LessonsData } from '../src/types';

test('import/save queues only durable content and preserves edits made during a cloud upload', context => {
  const values = new Map<string, string>();
  let full = false;
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { if (full) throw new Error('QuotaExceededError'); values.set(key, value); },
  };
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  context.after(() => { if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else Reflect.deleteProperty(globalThis, 'localStorage'); });
  reloadSyncState();
  const lessons: LessonsData = [{ type: 'chapter', title: 'الأعداد 🧮', items: [{ type: 'cours', description: '$x^2$' }] }];
  let observed = 0;
  const off = subscribe('dirty', () => {
    observed++;
    assert.ok(storage.getItem('classData_v1_a'), 'content must exist before a sync listener is called');
  });
  context.after(off);
  saveNotebook('a', lessons, 'rtl');
  assert.deepEqual(JSON.parse(storage.getItem('classData_v1_a')!), { lessonsData: lessons, contentDirection: 'rtl' });
  assert.ok(readSyncMeta().a.localUpdatedAt);
  const sent = getPendingWork();
  saveNotebook('a', [...lessons, { type: 'chapter', title: 'Suite' }], 'rtl');
  clearPendingWork(sent);
  assert.deepEqual(getPendingWork().dirtyClassIds, ['a']);
  reloadSyncState();
  assert.deepEqual(getPendingWork().dirtyClassIds, ['a'], 'pending upload survives restart');
  const stored = storage.getItem('classData_v1_a');
  const work = getPendingWork();
  full = true;
  assert.throws(() => saveNotebook('a', [], 'ltr'), /QuotaExceeded/);
  assert.equal(storage.getItem('classData_v1_a'), stored);
  assert.deepEqual(getPendingWork(), work);
  assert.equal(observed, 2);
});
