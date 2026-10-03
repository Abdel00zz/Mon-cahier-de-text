import assert from 'node:assert/strict';
import test from 'node:test';
import { readLocalSyncSnapshot } from '../src/infrastructure/sync/localSnapshot';
import { LocalSyncDataError } from '../src/infrastructure/storage/localJson';
import { readStoredNotebook } from '../src/infrastructure/storage/notebookStorage';

const memory = (values: Record<string, string>) => ({ getItem: (key: string) => values[key] ?? null });
const classes = JSON.stringify([{ id: 'ar', name: 'Classe A' }, { id: 'fr', name: 'Classe B' }]);

test('sync snapshot distinguishes absent/empty notebooks from a damaged local copy', () => {
  const values = { classManager_v1: classes, classData_v1_ar: '[]' };
  const snapshot = readLocalSyncSnapshot(memory(values));
  assert.deepEqual(snapshot.notebooks.get('ar')?.lessonsData, []);
  assert.deepEqual(snapshot.notebooks.get('fr')?.lessonsData, []);
  assert.deepEqual(snapshot.config, {});
  for (const damaged of ['', '{broken', 'null', '{}', '"text"', '{"lessonsData":null}', '[{"items":{}}]']) {
    const stored = { ...values, classData_v1_fr: damaged };
    const before = JSON.stringify(stored);
    assert.throws(() => readLocalSyncSnapshot(memory(stored)), LocalSyncDataError);
    assert.equal(JSON.stringify(stored), before);
  }
});

test('sync snapshot keeps Arabic, formulas, direction and legitimate legacy migration', () => {
  const lessons = [{ chapter: 'الأعداد', items: [{ type: 'définition', title: '  Fraction  ', description: '$\\frac{a}{b}$', date: '02/10/2026', page: 12 }] }];
  const stored = { classManager_v1: classes, classData_v1_ar: JSON.stringify({ lessonsData: lessons, contentDirection: 'rtl' }) };
  const snapshot = readLocalSyncSnapshot(memory(stored));
  const notebook = snapshot.notebooks.get('ar')!;
  assert.equal(notebook.contentDirection, 'rtl');
  assert.deepEqual(notebook.lessonsData, [{ title: 'الأعداد', type: 'chapter', items: lessons[0].items }]);
  assert.equal(JSON.parse(stored.classData_v1_ar).lessonsData[0].chapter, 'الأعداد');
});

test('sync snapshot refuses unreadable settings, class lists, direction and storage access', () => {
  for (const value of ['{broken', 'null', '[]', 'false']) {
    assert.throws(() => readLocalSyncSnapshot(memory({ classManager_v1: classes, appConfig_v1: value })), LocalSyncDataError);
  }
  for (const value of ['{broken', 'null', '{}', '[{"name":"Missing id"}]']) {
    assert.throws(() => readLocalSyncSnapshot(memory({ classManager_v1: value })), LocalSyncDataError);
  }
  assert.throws(() => readLocalSyncSnapshot(memory({ classManager_v1: classes, classData_v1_ar: '{"lessonsData":[],"contentDirection":"auto"}' })), LocalSyncDataError);
  assert.throws(() => readLocalSyncSnapshot({ getItem: () => { throw new Error('SecurityError'); } }), LocalSyncDataError);
});

test('all notebooks must validate before a snapshot can be sent or applied', () => {
  let cloudWrites = 0;
  const values = { classManager_v1: classes, classData_v1_ar: '[{"title":"Valid work"}]', classData_v1_fr: '{broken' };
  const send = () => { const snapshot = readLocalSyncSnapshot(memory(values)); cloudWrites += snapshot.notebooks.size; };
  assert.throws(send, LocalSyncDataError);
  assert.equal(cloudWrites, 0);
  values.classData_v1_fr = '[]'; // An explicit restoration/repair makes the next attempt safe.
  send();
  assert.equal(cloudWrites, 2);
});

test('unchanged pulls avoid notebook reads; replacements still require validation', () => {
  const values = { classManager_v1: classes, classData_v1_ar: '{broken' };
  const reads: string[] = [];
  const storage = { getItem: (key: string) => { reads.push(key); return memory(values).getItem(key); } };
  readLocalSyncSnapshot(storage, { includeNotebooks: false });
  assert.equal(reads.some(key => key.startsWith('classData_v1_')), false);
  assert.throws(() => readStoredNotebook('ar', storage), LocalSyncDataError);
});

test('strict notebook cache is reused and invalidated by the stored JSON', () => {
  const values = { classData_v1_cache: '[{"title":"First"}]' };
  const storage = memory(values);
  const first = readStoredNotebook('cache', storage);
  assert.equal(readStoredNotebook('cache', storage), first);
  values.classData_v1_cache = '{broken';
  assert.throws(() => readStoredNotebook('cache', storage), LocalSyncDataError);
  values.classData_v1_cache = '[{"title":"Second"}]';
  assert.equal(readStoredNotebook('cache', storage).lessonsData[0].title, 'Second');
});
