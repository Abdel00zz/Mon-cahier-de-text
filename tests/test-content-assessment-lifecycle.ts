import assert from 'node:assert/strict';
import test from 'node:test';
import { materializeContentAssessments, correctionBlockId, syncHomeworkCorrectionContent } from '../src/domain/evaluations/homeworkCorrectionContent';
import { syncNotebookToEvaluations, syncAssessmentDateToNotebook, removeAssessmentFromNotebook, removeHomeworkCorrectionFromNotebook } from '../src/domain/evaluations/notebookSyncBridge';
import { buildSessionRemarkEntries } from '../src/domain/evaluations/sessionActivityRemarks';
import { activityDocumentPreviews } from '../src/domain/evaluations/activityDocumentPreviews';
import { buildLessonRows } from '../src/domain/notebook/lessonRows';
import type { AppConfig, LessonsData, ManualAssessment } from '../src/types';
import type { PlannedAssessment } from '../src/domain/evaluations/assessments';

const homework: ManualAssessment = { id: '2026-2027:s1-maison1', type: 'maison', num: 1, dateISO: '2026-10-05',
  semestre: 1, schoolYear: '2026-2027', correctionDateISO: '2026-10-12' };
const config = { manualAssessments: { c: [homework] } } as unknown as AppConfig;
const course: LessonsData = [{ type: 'chapter', title: 'Cours', items: [{ type: 'exercice', date: '2026-10-12',
  remark: 'Correction du devoir à la maison 1\nReprendre la méthode.', _tempId: 'exercise' }] }];

test('migration : crée une correction autonome et retire seulement son ancienne mention automatique', () => {
  const migrated = materializeContentAssessments(course, config, 'c', 'fr');
  const rows = buildLessonRows(migrated);
  assert.equal(rows.filter(row => row.elementType === 'correction_devoir_maison').length, 1);
  assert.equal(rows.find(row => row.data._tempId === 'exercise')?.data.remark, 'Reprendre la méthode.');
  assert.equal(materializeContentAssessments(migrated, config, 'c', 'fr'), migrated);
  assert.equal(materializeContentAssessments(course, config, 'other', 'fr'), course);
  assert.equal([...buildSessionRemarkEntries(config, 'c', key => key, ', ', migrated).values()].flat()
    .some(entry => entry.id.endsWith(':correction')), false);
});

test('une correction imbriquée se déplace seule et conserve son corrigé et le devoir', () => {
  const before: LessonsData = [{ type: 'chapter', title: 'Cours', items: [
    { type: 'correction_devoir_maison', title: 'Correction 1', date: homework.correctionDateISO, _tempId: correctionBlockId(homework.id) },
    { type: 'exercice', title: 'Suite', date: homework.correctionDateISO, _tempId: 'other' },
  ] }];
  const after = syncHomeworkCorrectionContent(before, { ...homework, correctionDateISO: '2026-10-19' }, 'fr');
  assert.equal(after[0].items?.[1].date, '2026-10-12');
  const { patch } = syncNotebookToEvaluations('c', config, after, { previousLessons: before });
  assert.equal(patch.manualAssessments?.c[0].correctionDateISO, '2026-10-19');
  assert.equal(patch.manualAssessments?.c[0].dateISO, '2026-10-05');
  assert.equal(patch.assessmentDocuments, undefined);
  assert.equal(patch.assessmentParticipants, undefined);
});

test('effacer la date ou supprimer le contenu ne fait pas renaître la correction', () => {
  const before = materializeContentAssessments([], config, 'c', 'fr');
  for (const after of [[], syncHomeworkCorrectionContent(before, { ...homework, correctionDateISO: '' }, 'fr')]) {
    const { patch } = syncNotebookToEvaluations('c', config, after, { previousLessons: before });
    assert.equal(patch.manualAssessments?.c[0].correctionDateISO, undefined);
    assert.equal(materializeContentAssessments(after, { ...config, ...patch }, 'c', 'fr'), after);
  }
});

test('deux devoirs de même numéro : supprimer la correction du premier semestre conserve la seconde', () => {
  const second = { ...homework, id: '2026-2027:s2-maison1', semestre: 2 as const, dateISO: '2027-03-01', correctionDateISO: '2027-03-08' };
  const both = { ...config, manualAssessments: { c: [homework, second] } };
  const before = materializeContentAssessments([], both, 'c', 'fr');
  const after = removeHomeworkCorrectionFromNotebook(before, 1, { id: homework.id, date: homework.correctionDateISO }).lessons;
  assert.equal(after.length, 1);
  assert.equal(after[0]._tempId, correctionBlockId(second.id));
  const { patch } = syncNotebookToEvaluations('c', both, after, { previousLessons: before });
  assert.equal(patch.manualAssessments?.c[0].correctionDateISO, undefined);
  assert.equal(patch.manualAssessments?.c[1].correctionDateISO, '2027-03-08');
});

test('le corrigé est attaché au contenu même sans cours ce jour-là et malgré une remarque masquée', () => {
  const withDocument: AppConfig = { ...config, assessmentDocuments: { c: { [`${homework.id}:correction`]: { source: 'Solution', updatedAt: '2026-10-12' } } },
    sessionRemarkOverrides: { c: { [`assessment:${homework.id}`]: { hidden: true } } } };
  const notebook = materializeContentAssessments([], withDocument, 'c', 'fr');
  const previews = activityDocumentPreviews(withDocument, 'c', notebook,
    [{ planned: homework as PlannedAssessment, status: 'done' }], key => key);
  assert.equal(previews.rows.size, 1);
  assert.equal([...previews.rows.values()][0].document.source, 'Solution');
  assert.equal(previews.sessions.size, 0);
});

test('colle : création, redatation, suppression et retour de synchronisation conservent une identité', () => {
  const colle = { id: '2026-2027:s1-colle1', type: 'colle' as const, num: 1, dateISO: '2026-10-12', semestre: 1 as const };
  const before = syncAssessmentDateToNotebook(course, colle, 'fr').lessons;
  const after = syncAssessmentDateToNotebook(before, { ...colle, dateISO: '2026-10-19' }, 'fr').lessons;
  assert.equal(buildLessonRows(after).filter(row => row.elementType === 'colle').length, 1);
  const settings = { manualAssessments: { c: [colle] } } as unknown as AppConfig;
  const { patch } = syncNotebookToEvaluations('c', settings, after, { previousLessons: before });
  assert.equal(patch.manualAssessments?.c[0].dateISO, '2026-10-19');
  const removed = removeAssessmentFromNotebook(after, colle.id, 'colle', 1).lessons;
  assert.equal(buildLessonRows(removed).some(row => row.elementType === 'colle'), false);
  assert.equal(removed[0], course[0]);
  assert.equal([...buildSessionRemarkEntries(settings, 'c', key => key, ', ', after).values()].flat().length, 0);
});
