import assert from 'node:assert/strict';
import test from 'node:test';
import { assertValidSyncSettings } from '../api/_lib/validate';
import { countNotebookConditions, retainNotebookConditions } from '../src/domain/evaluations/notebookConditions';
import { buildSessionActivityRemarks } from '../src/domain/evaluations/sessionActivityRemarks';
import { extractSyncableSettings } from '../src/infrastructure/sync/syncSettings';
import { sessionPrintSignatures } from '../src/infrastructure/printing/printMeta';
import { translateLocaleMessage } from '../src/i18n/messages';
import type { AppConfig, LessonsData, NotebookCondition } from '../src/types';

const conditions: Record<string, NotebookCondition> = { Amine: 'good', Salma: 'average', Ali: 'needs_work', Lina: 'missing' };
const names = [...Object.keys(conditions), 'Youssef'];
const config = (): Partial<AppConfig> => ({ pedagogicalEvents: { A: [{ id: 'check', type: 'controle_cahiers',
  title: 'Contrôle des cahiers', date: '2026-10-08', createdAt: '2026-10-08T08:00:00Z', status: 'planned',
  students: { names, notebookConditions: conditions, updatedAt: '2026-10-08T08:00:00Z' },
}] } });

test('counts cover the four chosen states; legacy or unchecked names have no presumed result', () => {
  assert.deepEqual(countNotebookConditions(names, conditions), { good: 1, average: 1, needs_work: 1, missing: 1 });
  assert.deepEqual(countNotebookConditions(names), { good: 0, average: 0, needs_work: 0, missing: 0 });
  assert.deepEqual(retainNotebookConditions(['Salma', 'Youssef'], conditions), { Salma: 'average' });
});

test('cloud settings and JSON preserve the notebook classifications and accept legacy name lists', () => {
  const settings = assertValidSyncSettings(extractSyncableSettings(config()), new Set(['A']))!;
  assert.deepEqual(JSON.parse(JSON.stringify(settings)).pedagogicalEvents.A[0].students.notebookConditions, conditions);
  const legacy = config();
  delete legacy.pedagogicalEvents!.A[0].students!.notebookConditions;
  assert.doesNotThrow(() => assertValidSyncSettings(legacy, new Set(['A'])));
});

test('cloud refuses invalid states, states for absent names, and notebook states on another activity', () => {
  for (const value of [{ Amine: 'excellent' }, { Unknown: 'good' }, [], null]) {
    const invalid = JSON.parse(JSON.stringify(config()));
    invalid.pedagogicalEvents.A[0].students.notebookConditions = value;
    assert.throws(() => assertValidSyncSettings(invalid, new Set(['A'])), /Suivi de cahier invalide/);
  }
  const invalid = config();
  invalid.pedagogicalEvents!.A[0].type = 'remediation';
  assert.throws(() => assertValidSyncSettings(invalid, new Set(['A'])), /Suivi de cahier invalide/);
});

test('the dated remark includes a compact condition summary and changing it updates the print revision', () => {
  const settings = config();
  const remarks = () => buildSessionActivityRemarks(settings, 'A', (key, values) => translateLocaleMessage('fr', key, values), ', ');
  const text = remarks().get('2026-10-08')!;
  assert.match(text, /Contrôle des cahiers : Amine, Salma, Ali \+2/);
  assert.match(text, /Bon: 1, Moyen: 1, À améliorer: 1, Non apporté: 1/);
  const lessons: LessonsData = [{ type: 'chapter', title: 'Cours', items: [{ type: 'cours', title: 'Lesson', date: '2026-10-08' }] }];
  const before = JSON.stringify(lessons);
  const signature = sessionPrintSignatures(lessons, [], remarks())['2026-10-08'];
  settings.pedagogicalEvents!.A[0].students!.notebookConditions = { ...conditions, Lina: 'good' };
  assert.notEqual(sessionPrintSignatures(lessons, [], remarks())['2026-10-08'], signature);
  assert.equal(JSON.stringify(lessons), before);
});
