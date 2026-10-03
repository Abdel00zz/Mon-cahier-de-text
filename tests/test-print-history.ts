import assert from 'node:assert/strict';
import test from 'node:test';
import { collectSessionDates, getNewDates, readPrintMeta, recordPrint, savePrintPrefs, sessionPrintSignatures } from '../src/infrastructure/printing/printMeta';
import type { LessonsData } from '../src/types';

const notebook: LessonsData = [{ type: 'chapter', title: 'Limites', sections: [
  { name: 'Définition', date: '2026-10-01', remark: 'Limite en un point', items: [] },
] }];

function storage(context: test.TestContext) {
  const data = new Map<string, string>();
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  } });
  context.after(() => { if (original) Object.defineProperty(globalThis, 'localStorage', original); else Reflect.deleteProperty(globalThis, 'localStorage'); });
  return data;
}

test('impression : les anciens aperçus ne masquent plus les séances, les préférences sont conservées', context => {
  const data = storage(context);
  const prefs = { textSize: 'l', lineSpacing: 'aere', pageNumbers: true, headerMode: 'all' } as const;
  data.set('printMeta_v1_class', JSON.stringify({ printedDates: ['2026-10-01'], lastPrintedAt: new Date().toISOString(), prefs }));
  assert.deepEqual(getNewDates(notebook, 'class'), ['2026-10-01']);
  assert.equal(readPrintMeta('class').lastPrintedAt, null);
  assert.deepEqual(readPrintMeta('class').prefs, prefs);
});

test('impression : un tirage confirmé marque le contenu exact et toute correction redevient nouvelle', context => {
  storage(context);
  const signatures = sessionPrintSignatures(notebook);
  assert.equal(recordPrint('class', signatures), true);
  assert.deepEqual(getNewDates(notebook, 'class'), []);
  const changed = structuredClone(notebook);
  changed[0].sections![0].remark = 'Définition corrigée';
  assert.deepEqual(getNewDates(changed, 'class'), ['2026-10-01']);
  changed[0].title = 'Nouveau contexte';
  assert.notDeepEqual(sessionPrintSignatures(changed), signatures);
  assert.deepEqual(getNewDates(notebook, 'other-class'), ['2026-10-01']);
});

test('impression : les réglages et une annulation ne créent aucun historique', context => {
  storage(context);
  savePrintPrefs('class', { textSize: 'm', lineSpacing: 'normal', pageNumbers: false, headerMode: 'first' });
  assert.deepEqual(getNewDates(notebook, 'class'), ['2026-10-01']);
  assert.deepEqual(readPrintMeta('class').printedDates, []);
  assert.equal(readPrintMeta('class').lastPrintedAt, null);
});

test('impression : confirmation tardive conserve le snapshot et un cahier sans dates reste sans filtre', context => {
  storage(context);
  const frozen = sessionPrintSignatures(notebook);
  const changed = structuredClone(notebook);
  changed[0].sections![0].remark = 'Saisie pendant le tirage';
  recordPrint('class', frozen);
  assert.deepEqual(getNewDates(changed, 'class'), ['2026-10-01']);
  delete changed[0].sections![0].date;
  assert.deepEqual(collectSessionDates(changed), []);
  assert.deepEqual(getNewDates(changed, 'class'), []);
});
