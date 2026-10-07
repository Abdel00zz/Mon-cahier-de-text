import assert from 'node:assert/strict';
import test from 'node:test';
import { saveNotebook } from '../src/infrastructure/storage/saveNotebook';
import { QUARANTINE_PREFIX, isQuotaError, quarantineRaw, releaseComfortSpace, writeDurably } from '../src/infrastructure/storage/safeStorage';
import { clearPendingWork, getPendingWork, readSyncMeta, reloadSyncState, subscribe } from '../src/infrastructure/sync/syncBus';
import type { LessonsData } from '../src/types';
import { buildLessonRows } from '../src/domain/notebook/lessonRows';
import { lastDatedContentKey } from '../src/domain/notebook/notebookOpening';
import { readInitialNotebook } from '../src/features/editor/initialNotebook';

/** In-memory Storage with an optional character budget that throws like a browser. */
const memoryStorage = (budget = Infinity) => {
  const values = new Map<string, string>();
  const used = () => [...values].reduce((sum, [key, value]) => sum + key.length + value.length, 0);
  const quota = () => Object.assign(new Error('The quota has been exceeded.'), { name: 'QuotaExceededError', code: 22 });
  const storage = {
    full: false,
    get length() { return values.size; },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (storage.full) throw quota();
      const before = values.get(key);
      values.set(key, value);
      if (used() > budget) { if (before === undefined) values.delete(key); else values.set(key, before); throw quota(); }
    },
    removeItem: (key: string) => { values.delete(key); },
  };
  return storage;
};

const installGlobal = (context: test.TestContext, storage: ReturnType<typeof memoryStorage>) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  context.after(() => { if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else Reflect.deleteProperty(globalThis, 'localStorage'); });
  reloadSyncState();
};

test('import/save queues only durable content and preserves edits made during a cloud upload', context => {
  const storage = memoryStorage();
  installGlobal(context, storage);
  const lessons: LessonsData = [{ type: 'chapter', title: 'الأعداد 🧮', items: [{ type: 'cours', description: '$x^2$', date: '2026-10-01' }] }];
  let observed = 0;
  const off = subscribe('dirty', () => {
    observed++;
    assert.ok(storage.getItem('classData_v1_a'), 'content must exist before a sync listener is called');
  });
  context.after(off);
  saveNotebook('a', lessons, 'rtl');
  assert.deepEqual(JSON.parse(storage.getItem('classData_v1_a')!), { lessonsData: lessons, contentDirection: 'rtl' });
  assert.ok(readSyncMeta().a.localUpdatedAt);
  assert.equal(lastDatedContentKey(buildLessonRows(readInitialNotebook({ classId: 'a', locale: 'ar', storage })!.lessons)), '0||||0');
  const sent = getPendingWork();
  saveNotebook('a', [...lessons, { type: 'chapter', title: 'Suite' }], 'rtl');
  clearPendingWork(sent);
  assert.deepEqual(getPendingWork().dirtyClassIds, ['a']);
  reloadSyncState();
  assert.deepEqual(getPendingWork().dirtyClassIds, ['a'], 'pending upload survives restart');
  const stored = storage.getItem('classData_v1_a');
  const work = getPendingWork();
  storage.full = true;
  assert.throws(() => saveNotebook('a', [], 'ltr'), error => isQuotaError(error));
  assert.equal(storage.getItem('classData_v1_a'), stored);
  assert.deepEqual(getPendingWork(), work);
  assert.equal(observed, 2);
});

test('an unreadable stored notebook is quarantined before being replaced', context => {
  const storage = memoryStorage();
  installGlobal(context, storage);
  storage.setItem('classData_v1_b', '{"lessonsData": [ truncated');
  saveNotebook('b', [{ type: 'chapter', title: 'Nouveau' }], 'ltr');
  const copies = Array.from({ length: storage.length }, (_, i) => storage.key(i)!).filter(key => key.startsWith(`${QUARANTINE_PREFIX}b_`));
  assert.equal(copies.length, 1);
  assert.equal(storage.getItem(copies[0]), '{"lessonsData": [ truncated', 'raw bytes preserved exactly');
  assert.equal(JSON.parse(storage.getItem('classData_v1_b')!).lessonsData[0].title, 'Nouveau');
});

test('the save is aborted when even the quarantine copy cannot be stored', context => {
  const corrupt = '{"lessonsData": [ broken ' + 'x'.repeat(200);
  const storage = memoryStorage(corrupt.length + 'classData_v1_c'.length + 10);
  installGlobal(context, storage);
  storage.setItem('classData_v1_c', corrupt);
  assert.throws(() => saveNotebook('c', [], 'ltr'), error => isQuotaError(error));
  assert.equal(storage.getItem('classData_v1_c'), corrupt, 'unreadable data is never destroyed');
});

test('quarantine keeps at most three distinct copies and never duplicates', context => {
  const storage = memoryStorage();
  installGlobal(context, storage);
  for (let i = 0; i < 5; i++) quarantineRaw('d', `raw-${i}`, storage, 1_000 + i);
  quarantineRaw('d', 'raw-4', storage, 2_000);
  const copies = Array.from({ length: storage.length }, (_, i) => storage.key(i)!).filter(key => key.startsWith(`${QUARANTINE_PREFIX}d_`)).sort();
  assert.deepEqual(copies.map(key => storage.getItem(key)), ['raw-2', 'raw-3', 'raw-4']);
});

test('a full quota trims comfort journals only, then the write succeeds', context => {
  const journal = JSON.stringify(Array.from({ length: 60 }, (_, i) => ({ op: 'cell-edit', at: `2026-10-0${i % 9 + 1}T08:00:00.000Z` })));
  const notebook = '{"lessonsData":[]}';
  const storage = memoryStorage('editJournal_v1_e'.length + journal.length + 'classData_v1_keep'.length + notebook.length + 40);
  installGlobal(context, storage);
  storage.setItem('classData_v1_keep', notebook);
  storage.setItem('editJournal_v1_e', journal);
  writeDurably('classData_v1_new', '{"lessonsData":[1,2,3]}'.padEnd(400, ' '), storage);
  assert.equal(JSON.parse(storage.getItem('editJournal_v1_e')!).length, 10);
  assert.equal(storage.getItem('classData_v1_keep'), notebook, 'notebooks are never evicted');
  assert.equal(releaseComfortSpace(storage), 0, 'nothing more to release');
});
