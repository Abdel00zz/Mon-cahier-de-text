import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeContentJson } from '../src/domain/notebook/contentDiagnostics';
import { prepareImportedLessons } from '../src/domain/notebook/importPipeline';
import { parseBoundedJson } from '../src/domain/notebook/jsonInput';
import { buildFullBackup, restoreBackup, serializeBackup, validateBackup } from '../src/infrastructure/storage/backup';
import { createArchive, downloadArchive, listArchives } from '../src/infrastructure/storage/archives';
import { assertValidLessonsPayload } from '../api/_lib/validate';
import { writeStorageBatch } from '../src/infrastructure/storage/storageBatch';
import { subscribe } from '../src/infrastructure/sync/syncBus';

const lesson = { type: 'chapter', title: 'Continuité', sections: [{ name: 'Cours', items: [{ type: 'definition', title: 'Limite', description: 'Soit $x$ réel.' }] }] };
const info = { id: 'json-test', name: '2ème Bac Sciences Physiques 1', teacherName: 'Professeur', subject: 'Mathématiques', color: '', createdAt: '2026-09-01' };
const backup = () => ({ format: 'cdt-backup', version: 2, config: {}, classes: [{ classInfo: { ...info }, lessonsData: [structuredClone(lesson)], contentDirection: 'rtl' }] });

test('toutes les enveloppes diagnostiquent les mêmes champs avant import', () => {
  const broken = structuredClone(lesson);
  broken.sections[0].items[0].description = 'Formule $non fermée';
  for (const input of [[broken], { lessonsData: [broken] }, { data: [broken] }, { lessons: [broken] }, { classes: [{ lessonsData: [broken] }] }]) {
    const result = analyzeContentJson(JSON.stringify(input));
    assert.equal(result.ok, true);
    assert.equal(result.stats.nodes, 3);
    assert.equal(result.issues.filter(i => i.code === 'formulaUnclosed').length, 1);
  }
});
test('les doublons sont limités aux frères, pas aux autres chapitres', () => {
  const result = analyzeContentJson(JSON.stringify([lesson, { ...lesson, title: 'Dérivabilité' }]));
  assert.equal(result.issues.some(i => i.code === 'duplicate'), false);
  const duplicate = analyzeContentJson(JSON.stringify([lesson, lesson]));
  assert.equal(duplicate.issues.filter(i => i.code === 'duplicate').length, 1);
});
test('les budgets de profondeur correspondent entre diagnostic et moteur', () => {
  let node: object = { type: 'definition', title: 'Fin' };
  for (let i = 0; i < 12; i++) node = { type: 'chapter', title: `Niveau ${i}`, items: [node] };
  assert.equal(analyzeContentJson(JSON.stringify([node])).ok, true);
  assert.doesNotThrow(() => prepareImportedLessons([node]));
  assert.equal(analyzeContentJson(JSON.stringify([{ type: 'chapter', items: [node] }])).ok, false);
  assert.throws(() => prepareImportedLessons([{ type: 'chapter', items: [node] }]));
});
test('une racine arbitraire est refusée, un tableau vide reste valide', () => {
  assert.throws(() => prepareImportedLessons({ hello: 'world' }));
  assert.equal(analyzeContentJson('{"hello":"world"}').ok, false);
  assert.deepEqual(prepareImportedLessons([]).lessonsData, []);
  assert.throws(() => prepareImportedLessons(Array(12_001).fill(null)), /volumineuse/);
  assert.doesNotThrow(() => analyzeContentJson('['.repeat(8_000) + '0' + ']'.repeat(8_000)));
});
test('taille UTF-8 exacte, BOM et limite des titres', () => {
  const source = JSON.stringify([{ type: 'chapter', title: 'العربية' }]);
  assert.equal(analyzeContentJson(source).stats.bytes, new TextEncoder().encode(source).length);
  assert.deepEqual(parseBoundedJson('\uFEFF' + source), JSON.parse(source));
  assert.throws(() => parseBoundedJson(source, source.length), /volumineux/);
  const bad = analyzeContentJson(JSON.stringify([{ title: 'a'.repeat(501) }]));
  assert.equal(bad.ok, false);
  assert.ok(bad.issues.some(i => i.code === 'textTooLong' && i.path.endsWith('title')));
});
test('restauration : une classe invalide en fin de fichier bloque avant toute écriture', () => {
  const data = backup();
  data.classes.push({ ...data.classes[0], classInfo: { ...info } });
  assert.throws(() => validateBackup(data), /dupliqué/);
  assert.throws(() => validateBackup({ ...backup(), version: 99 }), /version/);
  assert.throws(() => validateBackup({ ...backup(), config: [] }), /invalide/);
  const malformed = backup();
  (malformed.classes[0].lessonsData[0].sections[0].items as unknown[]).push(null);
  assert.throws(() => validateBackup(malformed), /invalide/);
});

class MemoryStorage {
  values = new Map<string, string>();
  failKey: string | null = null;
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) {
    if (key === this.failKey) { this.failKey = null; throw new Error('QuotaExceededError'); }
    this.values.set(key, value);
  }
  removeItem(key: string) { this.values.delete(key); }
}

test('sauvegarde : un cahier corrompu ne devient jamais un export vide', () => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {value: storage, configurable: true});
  storage.setItem('classManager_v1', JSON.stringify([info]));
  try {
    for (const value of ['{invalide', '{"lessonsData":null}']) {
      storage.setItem(`classData_v1_${info.id}`, value);
      assert.throws(buildFullBackup, /illisibles/);
      assert.equal(storage.getItem(`classData_v1_${info.id}`), value);
    }
  } finally { Reflect.deleteProperty(globalThis, 'localStorage'); }
});

test('sauvegarde : export complet multi-cahiers réimportable, textes et dates exacts', () => {
  const data = backup();
  data.classes[0].lessonsData[0].title = '  الرياضيات $x$  ';
  data.classes.push({...structuredClone(data.classes[0]), classInfo: {...info, id: 'second'}});
  const serialized = serializeBackup(data);
  assert.deepEqual(validateBackup(parseBoundedJson(serialized)), data);
  assert.ok(serialized.length < JSON.stringify(data, null, 2).length);
});

test('archives : données corrompues refusées, archives Unicode réimportables et taille exacte', () => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', {value: storage, configurable: true});
  storage.setItem('classManager_v1', JSON.stringify([info]));
  const notebookKey = `classData_v1_${info.id}`;
  try {
    storage.setItem(notebookKey, '{invalide');
    assert.equal(createArchive('2025-2026'), null);
    assert.deepEqual(listArchives(), []);
    assert.equal(storage.getItem(notebookKey), '{invalide');
    const lessons = [{type: 'chapter', title: '  الرياضيات 🧮  '}];
    storage.setItem(notebookKey, JSON.stringify(lessons));
    const meta = createArchive('2025-2026');
    assert.ok(meta);
    const payload = storage.getItem(`archive_v1_${meta.id}`)!;
    assert.equal(meta.bytes, Buffer.byteLength(payload));
    assert.deepEqual(validateBackup(parseBoundedJson(payload)).classes[0].lessonsData, lessons);
    storage.setItem(`archive_v1_${meta.id}`, '{"invalid":true}');
    assert.equal(downloadArchive(meta), false);
  } finally { Reflect.deleteProperty(globalThis, 'localStorage'); }
});

test('synchro : structures et doublons invalides refusés avant stockage, valeurs intactes', () => {
  const valid = [{classId: info.id, lessonsData: [{type: 'chapter', title: '  الرياضيات  ', items: [{type: 'exercice', page: 12, description: '$x^2$'}]}]}];
  assert.deepEqual(assertValidLessonsPayload(valid, new Set([info.id]))[0].lessonsData, valid[0].lessonsData);
  assert.throws(() => assertValidLessonsPayload([...valid, ...valid], new Set([info.id, 'other'])), /dupliqué/);
  for (const lessonsData of [[null], [{type: 'chapter', items: {bad: true}}], Array(12_001).fill({type: 'chapter'})]) {
    assert.throws(() => assertValidLessonsPayload([{classId: info.id, lessonsData}], new Set([info.id])));
  }
});
test('échec de stockage : retour aux anciennes valeurs, y compris les clés absentes', () => {
  const storage = new MemoryStorage();
  storage.values.set('config', 'old');
  storage.values.set('journal', 'history');
  const before = new Map(storage.values);
  storage.failKey = 'lessons';
  assert.throws(() => writeStorageBatch(new Map([['config', 'new'], ['new-key', 'new'], ['journal', null], ['lessons', 'data']]), storage), /conservées/);
  assert.deepEqual(storage.values, before);
});
test('restauration : pas de synchro sur échec ; direction et métadonnées correctes après succès', () => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  storage.values.set('appConfig_v1', '{"old":true}');
  storage.values.set(`printMeta_v1_${info.id}`, '{"lastPrintedAt":"old"}');
  const before = new Map(storage.values);
  let events = 0;
  const unsubscribe = subscribe('dirty', () => events++);
  try {
    storage.failKey = `classData_v1_${info.id}`;
    assert.throws(() => restoreBackup(backup()), /conservées/);
    assert.deepEqual(storage.values, before);
    assert.equal(events, 0);
    assert.equal(restoreBackup(backup()), 1);
    assert.equal(JSON.parse(storage.getItem(`classData_v1_${info.id}`)!).contentDirection, 'rtl');
    assert.equal(storage.getItem(`printMeta_v1_${info.id}`), null);
    assert.ok(events > 0);
  } finally { unsubscribe(); Reflect.deleteProperty(globalThis, 'localStorage'); }
});
