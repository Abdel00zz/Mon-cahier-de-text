import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppConfig, LessonsData, PedagogicalEvent } from '../src/types';
import { syncNotebookToEvaluations, syncAssessmentDateToNotebook, removeAssessmentFromNotebook, syncEventToNotebook, removeEventFromNotebook } from '../src/domain/evaluations/notebookSyncBridge';
import { findNotebookAssessments, linkAssessments } from '../src/domain/evaluations/assessmentSync';
import { activityDocumentPreviews } from '../src/domain/evaluations/activityDocumentPreviews';
import type { PlannedAssessment } from '../src/domain/evaluations/assessments';
import { useEvaluationActions } from '../src/features/evaluations/hooks/useEvaluationActions';
import { assertValidSyncSettings } from '../api/_lib/validate';
import { extractSyncableSettings, mergeSyncableSettings } from '../src/infrastructure/sync/syncSettings';
import { commitEvaluationChange } from '../src/features/evaluations/hooks/useEvaluationNotebook';

const settings = (): AppConfig => ({ establishmentName: '', defaultTeacherName: '', printShowDescriptions: true });
const document = { source: 'Questions et critères de réussite', updatedAt: '2026-10-09T12:00:00Z' };
const plan = (id: string, dateISO: string): PlannedAssessment => ({ id, dateISO, type: 'controle', num: 1, schoolYear: '2026-2027', semestre: 1,
  label: 'Contrôle 1', semaine: 1, confidence: 'high', predictionStatus: 'manual', predictionReason: 'test' });
const event = (id: string): PedagogicalEvent => ({ id, type: 'evaluation_diagnostic', title: 'Diagnostic', date: '2026-09-09', status: 'planned', createdAt: '2026-09-01', document });

test('two same-number semesters keep separate identities through reorder, date move and deletion', () => {
  const lessons: LessonsData = [{ type: 'controle_continu', title: 'Contrôle 1', date: '2026-10-01', _tempId: 'dev-block-s1' },
    { type: 'controle_continu', title: 'Contrôle 1', date: '2027-03-01', _tempId: 'dev-block-s2' }];
  const next = syncAssessmentDateToNotebook(lessons, { id: 's2', type: 'controle', num: 1, dateISO: '2026-09-15' }).lessons;
  assert.equal(next[0].date, '2026-10-01'); assert.equal(next[1].date, '2026-09-15');
  const links = linkAssessments([plan('s1', '2026-10-01'), plan('s2', '2027-03-01')], findNotebookAssessments([...next].reverse()), '2026-10-09');
  assert.equal(links[0].entry?.assessmentId, 's1'); assert.equal(links[1].entry?.assessmentId, 's2');
  const deleted = removeAssessmentFromNotebook(next, 's2', 'controle', 1).lessons;
  assert.deepEqual(deleted, [next[0]]);
});

test('nested assessment is updated and deleted in its own chapter without moving siblings', () => {
  const lessons: LessonsData = [{ type: 'chapter', title: 'Cours', items: [{ type: 'controle_continu', title: 'Contrôle 1', _tempId: 'dev-block-a' }, { type: 'cours', title: 'Suite' }] }];
  const next = syncAssessmentDateToNotebook(lessons, { id: 'a', type: 'controle', num: 1, dateISO: '2026-10-15' }).lessons;
  assert.equal(next.length, 1); assert.equal(next[0].items?.[0].date, '2026-10-15');
  assert.equal(removeAssessmentFromNotebook(next, 'a', 'controle', 1).lessons[0].items?.[0].title, 'Suite');
});

test('reverse dates retain stable IDs across semesters; clearing, deletion and undo are idempotent', () => {
  const before: LessonsData = [{ type: 'controle_continu', title: 'Contrôle 1', date: '2026-10-01', _tempId: 'dev-block-s1' }];
  const config = { ...settings(), assessmentDocuments: { c: { s1: document } } };
  const next: LessonsData = [{ ...before[0], title: 'Titre modifié', date: '2027-03-01' }];
  const moved = syncNotebookToEvaluations('c', config, next, { previousLessons: before, planned: [plan('s1', '2026-10-01')] });
  assert.deepEqual(moved.patch.assessmentDates?.c, { s1: '2027-03-01' });
  const saved = { ...config, ...moved.patch };
  assert.equal(syncNotebookToEvaluations('c', saved, next, { previousLessons: next, planned: [plan('s1', '2026-10-01')] }).updated, false);
  const cleared = syncNotebookToEvaluations('c', saved, [{ ...next[0], date: undefined }], { previousLessons: next });
  assert.deepEqual(cleared.patch.assessmentDates?.c, {});
  const deleted = syncNotebookToEvaluations('c', saved, [], { previousLessons: next });
  assert.deepEqual(deleted.patch.removedAssessments?.c, ['s1']);
  assert.equal(deleted.patch.assessmentDocuments, undefined, 'retain source for undo, never assign it to another row');
  const undone = syncNotebookToEvaluations('c', { ...saved, ...deleted.patch }, next, { previousLessons: [] });
  assert.deepEqual(undone.patch.removedAssessments?.c, []);
});

test('multiple diagnostics do not overwrite each other; deletion and undo retain the correct document', () => {
  const first = event('a'), second = event('b');
  const one = syncEventToNotebook([], first).lessons;
  const both = syncEventToNotebook(one, second).lessons;
  assert.equal(both.length, 2);
  const config = { ...settings(), pedagogicalEvents: { c: [first, second] } };
  const next = removeEventFromNotebook(both, 'b', second.type, second.title).lessons;
  assert.equal(next.length, 1); assert.equal(next[0]._tempId, 'event-a');
  const deleted = syncNotebookToEvaluations('c', config, next, { previousLessons: both });
  assert.deepEqual(deleted.patch.pedagogicalEvents?.c.map(item => item.id), ['a']);
  const undone = syncNotebookToEvaluations('c', { ...config, ...deleted.patch }, both, { previousLessons: next, eventArchive: new Map([['b', second]]) });
  assert.equal(undone.patch.pedagogicalEvents?.c.find(item => item.id === 'b')?.document, document);
});

test('diagnostic preview follows its identity; oral preview follows the entered date without a course block', () => {
  const diag = event('a');
  const lessons: LessonsData = [{ type: 'evaluation_diagnostic', title: 'Diagnostic renommé', date: '2026-09-12', _tempId: 'event-a' }];
  const oral = { ...plan('oral', '2026-10-12'), type: 'oral' as const };
  const config = { ...settings(), pedagogicalEvents: { c: [diag] }, assessmentDocuments: { c: { oral: document } }, assessmentDates: { c: { oral: '2026-10-14' } } };
  const result = activityDocumentPreviews(config, 'c', lessons, [{ planned: oral, status: 'upcoming' }], key => key);
  assert.equal(result.rows.get('0||||')?.document, document);
  assert.equal(result.sessions.get('2026-10-14')?.[0].document, document);
  assert.equal(result.sessions.has('2026-10-12'), false);
  assert.equal(activityDocumentPreviews(config, 'other', lessons, [], key => key).rows.size, 0);
});

test('explicit assessment deletion cleans documents, participants, absences and dates for that class only', () => {
  let config = { ...settings(), assessmentDocuments: { c: { a: document }, other: { a: document } }, assessmentDates: { c: { a: '2026-10-01' } } } as AppConfig;
  useEvaluationActions('c', config, patch => { config = { ...config, ...patch }; }).deleteAssessment('a');
  assert.deepEqual(config.assessmentDocuments?.c, {}); assert.equal(config.assessmentDocuments?.other.a, document);
  assert.deepEqual(config.assessmentDates?.c, {});
});

test('clearing a diagnostic date/remark retains its source through JSON, server validation and settings merge', () => {
  const diagnostic = { ...event('a'), note: 'Ancienne remarque', endDate: '2026-09-10' };
  const config = { ...settings(), pedagogicalEvents: { c: [diagnostic] } };
  const lessons: LessonsData = [{ type: 'evaluation_diagnostic', title: 'Diagnostic', _tempId: 'event-a' }];
  const { patch } = syncNotebookToEvaluations('c', config, lessons);
  const next = { ...config, ...patch };
  assert.equal(next.pedagogicalEvents.c[0].date, '');
  assert.equal(next.pedagogicalEvents.c[0].note, undefined);
  assert.equal(next.pedagogicalEvents.c[0].endDate, undefined);
  const wire = JSON.parse(JSON.stringify(extractSyncableSettings(next)));
  assertValidSyncSettings(wire, new Set(['c']));
  const restored = mergeSyncableSettings(settings(), wire);
  assert.deepEqual(restored.pedagogicalEvents?.c[0].document, document);
  assert.equal(restored.pedagogicalEvents?.c[0].date, '');
});

test('a surviving second-semester legacy row cannot inherit the deleted first-semester document', () => {
  const entries = findNotebookAssessments([{ type: 'controle_continu', title: 'Contrôle 1', date: '2027-03-01' }]);
  const links = linkAssessments([plan('s1', '2026-10-01'), plan('s2', '2027-03-01')], entries, '2026-10-09');
  assert.equal(links[0].entry, undefined);
  assert.equal(links[1].entry?.date, '2027-03-01');
});

test('failed notebook/settings writes never leave an announced half-saved evaluation', () => {
  const before: LessonsData = [{ type: 'controle_continu', title: 'Contrôle 1', date: '2026-10-01' }];
  const next: LessonsData = [{ ...before[0], date: '2026-10-15' }];
  let stored = before;
  let settingsWrites = 0;
  assert.throws(() => commitEvaluationChange(before, next, () => { throw Error('quota'); }, () => { settingsWrites++; }));
  assert.equal(settingsWrites, 0);
  assert.throws(() => commitEvaluationChange(before, next, lessons => { stored = lessons; }, () => { throw Error('settings quota'); }));
  assert.equal(stored, before);
  commitEvaluationChange(before, next, lessons => { stored = lessons; }, () => { settingsWrites++; });
  assert.equal(stored, next); assert.equal(settingsWrites, 1);
});

test('manual oral date updates and clearing survive the same server validation as written tests', () => {
  let config: AppConfig = { ...settings(), manualAssessments: { c: [{ id: 'oral', type: 'oral', num: 1, dateISO: '2026-10-01', semestre: 1 }] } };
  const patch = (change: Partial<AppConfig>) => { config = { ...config, ...change }; };
  useEvaluationActions('c', config, patch).setAssessmentDate('oral', '2026-10-15');
  assert.equal(config.manualAssessments?.c[0].dateISO, '2026-10-15');
  useEvaluationActions('c', config, patch).setAssessmentDate('oral', '');
  assert.equal(config.manualAssessments?.c[0].dateISO, '');
  assert.equal(config.manualAssessments?.c[0].schoolYear, '2026-2027');
  assertValidSyncSettings(JSON.parse(JSON.stringify(extractSyncableSettings(config))), new Set(['c']));
});
