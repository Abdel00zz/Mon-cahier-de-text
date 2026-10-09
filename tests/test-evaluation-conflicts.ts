import assert from 'node:assert/strict';
import test from 'node:test';
import { produce } from 'immer';
import type { AppConfig, LessonsData, PedagogicalEvent } from '../src/types';
import type { PlannedAssessment } from '../src/domain/evaluations/assessments';
import { assessmentSlot, eventSlot, evaluationSlots, detectEvaluationConflicts, newEvaluationWarnings } from '../src/domain/evaluations/evaluationConflicts';
import { applySessionEdit } from '../src/domain/notebook/sessionEditing';
import { syncNotebookToEvaluations, syncEventToNotebook, syncAssessmentDateToNotebook, extractDateRange, removeAssessmentFromNotebook, removeEventFromNotebook } from '../src/domain/evaluations/notebookSyncBridge';
import { findNotebookAssessments } from '../src/domain/evaluations/assessmentSync';
import { useEvaluationActions } from '../src/features/evaluations/hooks/useEvaluationActions';

const plan = (id: string, num = 1, dateISO = '2026-10-09'): PlannedAssessment => ({ id, num, dateISO, type: 'controle', schoolYear: '2026-2027', semestre: 1,
  label: `Contrôle ${num}`, semaine: 1, confidence: 'high', predictionStatus: 'manual', predictionReason: 'teacher' });
const event = (id: string, date = '2026-10-09', title = 'Diagnostic'): PedagogicalEvent => ({ id, date, title, type: 'evaluation_diagnostic', status: 'planned', createdAt: '2026-10-01' });
const settings = (): AppConfig => ({ establishmentName: '', defaultTeacherName: '', printShowDescriptions: true });

test('assessment identity distinguishes semesters and school years but catches another date with the same number', () => {
  const first = assessmentSlot(plan('a'));
  assert.equal(detectEvaluationConflicts(assessmentSlot(plan('b', 1, '2026-10-15')), [first])[0].kind, 'identity');
  assert.deepEqual(detectEvaluationConflicts(assessmentSlot({ ...plan('s2', 1, '2027-03-01'), semestre: 2 }), [first]), []);
  assert.deepEqual(detectEvaluationConflicts(assessmentSlot({ ...plan('y2', 1, '2027-10-09'), schoolYear: '2027-2028' }), [first]), []);
  assert.deepEqual(detectEvaluationConflicts(first, [first]), [], 'self is not a duplicate');
});

test('same-kind overlaps are inclusive; different dates and different kinds remain legitimate', () => {
  const existing = eventSlot({ ...event('a'), endDate: '2026-10-12' });
  assert.equal(detectEvaluationConflicts(eventSlot(event('b', '2026-10-12', 'Diagnostic groupe 2')), [existing])[0].kind, 'overlap');
  assert.deepEqual(detectEvaluationConflicts(eventSlot(event('b', '2026-10-13')), [existing]), []);
  assert.deepEqual(detectEvaluationConflicts(eventSlot({ ...event('b'), type: 'correction_controle_continu' }), [existing]), []);
  assert.deepEqual(detectEvaluationConflicts(eventSlot(event('b', '')), [existing]), []);
  assert.deepEqual(detectEvaluationConflicts(eventSlot(event('b', '2026-02-30')), [existing]), []);
});

test('a list of three session dates preserves its final boundary during reverse synchronization', () => {
  assert.deepEqual(extractDateRange('2026-10-09, 2026-10-12 et 2026-10-15'), { startDate: '2026-10-09', endDate: '2026-10-15' });
  assert.deepEqual(extractDateRange('09/10/2026, 12/10/2026 و 15/10/2026'), { startDate: '2026-10-09', endDate: '2026-10-15' });
  const diagnostic = event('a');
  const before = syncEventToNotebook([], diagnostic).lessons;
  const next = [{ ...before[0], date: '2026-10-09, 2026-10-12 et 2026-10-15' }];
  const result = syncNotebookToEvaluations('c', { ...settings(), pedagogicalEvents: { c: [diagnostic] } }, next, { previousLessons: before });
  assert.equal(result.patch.pedagogicalEvents?.c[0].endDate, '2026-10-15');
});

test('Arabic spacing and vocalization do not hide repeated activity on the same date', () => {
  const first = eventSlot(event('a', '2026-10-09', 'تَقْوِيم  تَشْخِيصِي'));
  const copy = eventSlot(event('b', '2026-10-09', 'تقويم تشخيصي'));
  assert.equal(detectEvaluationConflicts(copy, [first])[0].kind, 'duplicate');
});

test('settings mirrors are counted once, predictions do not cause false overlap warnings', () => {
  const assessment = plan('a');
  const diagnostic = event('diag');
  let notebook = syncAssessmentDateToNotebook([], assessment).lessons;
  notebook = syncEventToNotebook(notebook, diagnostic).lessons;
  const slots = evaluationSlots(notebook, [assessment, { ...plan('projected', 2), predictionStatus: 'derived' }], [diagnostic]);
  assert.equal(slots.length, 3);
  assert.deepEqual(slots.flatMap(slot => detectEvaluationConflicts(slot, slots)), []);
});

test('table date assignment reviews only newly introduced conflicts including multi-row changes', () => {
  const plans = [plan('a'), plan('b', 2, '2026-10-15')];
  let before: LessonsData = [];
  for (const assessment of plans) before = syncAssessmentDateToNotebook(before, assessment).lessons;
  const after = produce(before, draft => { applySessionEdit(draft, [{ chapterIndex: 1 }], { date: '2026-10-09' }); });
  const oldSlots = evaluationSlots(before, plans, []), newSlots = evaluationSlots(after, plans, []);
  const warnings = newEvaluationWarnings(oldSlots, newSlots, 'ar');
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].type, 'evaluation-conflict');
  assert.match(warnings[0].message, /مبرمج/);
  assert.deepEqual(newEvaluationWarnings(newSlots, newSlots, 'fr'), [], 'old conflict does not nag during an unrelated edit');
  const sameDateCourse: LessonsData = [{ type: 'chapter', title: 'Lesson', date: '2026-10-09' }];
  assert.equal(evaluationSlots(sameDateCourse, [], []).length, 0, 'ordinary course sessions are not assessments');
});

test('copied bound rows are detected and cannot overwrite the saved assessment date', () => {
  const assessment = plan('a');
  const original = syncAssessmentDateToNotebook([], assessment).lessons;
  const copied = [...original, { ...original[0], date: '2026-10-20' }];
  const slots = evaluationSlots(copied, [assessment], []);
  assert.equal(detectEvaluationConflicts(slots[0], slots)[0].kind, 'binding');
  assert.equal(newEvaluationWarnings(evaluationSlots(original, [assessment], []), slots, 'fr')[0].blocking, true);
  const config = { ...settings(), assessmentDates: { c: { a: assessment.dateISO } } };
  const reconciled = syncNotebookToEvaluations('c', config, copied, { previousLessons: original, planned: [assessment] });
  assert.equal(reconciled.updated, false);
});

test('renumbering in the table catches a duplicate number even on different dates', () => {
  const plans = [plan('a'), plan('b', 2, '2026-10-15')];
  let before: LessonsData = [];
  for (const assessment of plans) before = syncAssessmentDateToNotebook(before, assessment).lessons;
  const after = [before[0], { ...before[1], title: 'فرض ١' }];
  const warnings = newEvaluationWarnings(evaluationSlots(before, plans, []), evaluationSlots(after, plans, []), 'fr');
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].blocking, true);
});

test('copied diagnostic identity does not overwrite or delete its original document and date', () => {
  const diagnostic = { ...event('a'), document: { source: 'Questions', updatedAt: '2026-10-09' } };
  const original = syncEventToNotebook([], diagnostic).lessons;
  const copy = [...original, { ...original[0], date: '2026-10-20' }];
  const result = syncNotebookToEvaluations('c', { ...settings(), pedagogicalEvents: { c: [diagnostic] } }, copy, { previousLessons: original });
  assert.equal(result.updated, false);
});

test('explicit deletion removes every copy of that identity, preserving other events and chapter content', () => {
  const assessment = plan('a'), diagnostic = event('diag');
  const row = syncAssessmentDateToNotebook([], assessment).lessons[0];
  const diag = syncEventToNotebook([], diagnostic).lessons[0];
  const lessons: LessonsData = [row, { type: 'chapter', title: 'Cours', items: [{ type: 'cours', title: 'Suite' },
    { type: 'controle_continu', title: row.title, _tempId: row._tempId }] }, diag, { ...diag }, { ...diag, _tempId: 'event-other' }];
  const withoutAssessment = removeAssessmentFromNotebook(lessons, 'a', 'controle', 1).lessons;
  assert.equal(findNotebookAssessments(withoutAssessment).length, 0);
  assert.equal(withoutAssessment[0].items?.length, 1);
  const withoutEvent = removeEventFromNotebook(withoutAssessment, 'diag').lessons;
  assert.equal(withoutEvent.length, 2);
  assert.equal(withoutEvent[1]._tempId, 'event-other');
});

test('Arabic numerals link correctly and a renamed unnumbered title retains assessment number', () => {
  assert.equal(findNotebookAssessments([{ type: 'controle_continu', title: 'فرض ٣' }])[0].num, 3);
  assert.equal(findNotebookAssessments([{ type: 'controle_continu', title: 'فرض ۳' }])[0].num, 3);
  const assessment = plan('a', 3);
  const original = syncAssessmentDateToNotebook([], assessment).lessons;
  const renamed = [{ ...original[0], title: 'Évaluation algèbre', date: '2026-10-10' }];
  const result = syncNotebookToEvaluations('c', { ...settings(), manualAssessments: { c: [assessment] } }, renamed, { previousLessons: original, planned: [assessment] });
  assert.equal(result.patch.manualAssessments?.c[0].num, 3);
});

test('replayed additions keep a single persistent record', () => {
  const diagnostic = event('a');
  const assessment = plan('a');
  let config = { ...settings(), pedagogicalEvents: { c: [diagnostic] }, manualAssessments: { c: [assessment] } } as AppConfig;
  const actions = useEvaluationActions('c', config, patch => { config = { ...config, ...patch }; });
  actions.addEvent(diagnostic);
  actions.saveAssessment(assessment);
  assert.equal(config.pedagogicalEvents?.c.length, 1);
  assert.equal(config.manualAssessments?.c.length, 1);
});
