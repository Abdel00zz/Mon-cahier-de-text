import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppConfig, ContentNumbering, LessonsData } from '../src/types';
import { buildContentNumbers, romanNumber } from '../src/domain/notebook/contentNumbering';
import { buildLessonRows } from '../src/domain/notebook/lessonRows';
import { collectSessionDates, createPrintSelection, sessionPrintSignatures } from '../src/infrastructure/printing/printMeta';
import { homeworkSessionResolver, visibleNotebookRows } from '../src/domain/evaluations/homeworkPlacement';
import { buildSessionActivityRemarks } from '../src/domain/evaluations/sessionActivityRemarks';
import { activityDocumentPreviews } from '../src/domain/evaluations/activityDocumentPreviews';
import { findNotebookAssessments, linkAssessments } from '../src/domain/evaluations/assessmentSync';
import type { PlannedAssessment } from '../src/domain/evaluations/assessments';
import { establishmentKey, listEstablishments } from '../src/admin/establishments';
import { assertValidSyncSettings } from '../api/_lib/validate';

const lessons: LessonsData = [
  { type: 'evaluation_diagnostic', title: 'Diagnostic', date: '2026-09-01' },
  { type: 'chapter', title: 'Premier', sections: [{ name: 'Section', items: [
    { type: 'définition', title: 'A', date: '2026-10-01' },
    { type: 'définition', title: 'B', date: '2026-10-02' },
  ], subsections: [{ name: 'Sous-section', subsubsections: [{ name: 'Niveau 4', items: [{ type: 'exemple', title: 'C' }] }] }] }] },
  { type: 'devoir_maison', title: 'Devoir maison 1', date: '2026-10-03', _tempId: 'dev-block-dm' },
  { type: 'correction_devoir_maison', title: 'Correction', date: '2026-10-04' },
  { type: 'chapter', title: 'Deuxième', items: [{ type: 'définition', title: 'D', date: '2026-10-08' }] },
];
const numbering: ContentNumbering = { enabled: true, structureStyle: 'roman', badgeStyle: 'hierarchical', scope: 'chapter' };
const byTitle = (data: LessonsData, settings = numbering) => {
  const map = buildContentNumbers(data, settings);
  return Object.fromEntries(buildLessonRows(data).map(row => ['name' in row.data ? row.data.name : 'title' in row.data ? row.data.title : '', map.get(row.key)]));
};

test('hierarchy numbers chapters independently of assessments and supports all four depths', () => {
  const numbers = byTitle(lessons);
  assert.equal(numbers.Premier, 'I'); assert.equal(numbers.Section, 'I.1');
  assert.equal(numbers['Sous-section'], 'I.1.1'); assert.equal(numbers['Niveau 4'], 'I.1.1.1');
  assert.equal(numbers.Deuxième, 'II'); assert.equal(numbers.A, '1.1');
  assert.equal(numbers.B, '1.2'); assert.equal(numbers.D, '2.1');
  assert.equal(numbers.Diagnostic, undefined);
  assert.equal(romanNumber(49), 'XLIX'); assert.equal(romanNumber(2026), 'MMXXVI');
});

test('badge counters support document scope and Roman notation; partial print preserves original numbers', () => {
  const numbers = byTitle(lessons, { enabled: true, badgeStyle: 'roman', scope: 'document' });
  assert.equal(numbers.A, 'I'); assert.equal(numbers.B, 'II'); assert.equal(numbers.D, 'III');
  const selection = createPrintSelection(lessons, ['2026-10-08'], numbering);
  const printed = byTitle(selection);
  assert.equal(printed.Deuxième, 'II'); assert.equal(printed.D, '2.1');
  assert.equal('number' in lessons[4], false, 'printing never mutates the source');
  assert.equal(buildContentNumbers(lessons, false).size, 0);
});

test('homework goes to the latest taught session, never to an assessment, correction or future lesson', () => {
  const resolve = homeworkSessionResolver(lessons);
  assert.equal(resolve('2026-10-07'), '2026-10-02');
  assert.equal(resolve('2026-10-08'), '2026-10-08');
  assert.equal(resolve('2026-09-30'), ''); assert.equal(resolve(''), '');
  assert.equal(resolve('07/10/2026'), '2026-10-02');
  const visible = visibleNotebookRows(lessons);
  assert.ok(!visible.some(row => 'type' in row.data && row.data.type === 'devoir_maison'));
  assert.ok(visible.some(row => 'type' in row.data && row.data.type === 'correction_devoir_maison'));
  assert.equal(findNotebookAssessments(lessons)[0].assessmentId, 'dm', 'historical identity remains recoverable');
  assert.equal(collectSessionDates(lessons).includes('2026-10-03'), false, 'hidden homework does not create an empty printable session');
  assert.equal('2026-10-03' in sessionPrintSignatures(lessons), false);
});

const translate = (key: string, values?: Record<string, string | number>) => key + (values?.num ?? '');
const config: AppConfig = { establishmentName: '', defaultTeacherName: '', printShowDescriptions: true,
  manualAssessments: { c: [{ id: 'dm', type: 'maison', num: 1, dateISO: '2026-10-02', semestre: 1 }] },
  assessmentDocuments: { c: { dm: { source: '**تمرين** $x^2$', updatedAt: '2026-10-09T12:00:00Z' } } },
};
const planned = { id: 'dm', type: 'maison', num: 1, dateISO: '2026-10-02', label: 'Devoir maison 1', semestre: 1, semaine: 1, predictionStatus: 'derived', confidence: 'high', predictionReason: 'test' } as PlannedAssessment;

test('homework date changes move both the remark and clickable source; deletion removes both', () => {
  const links = linkAssessments([planned], findNotebookAssessments(lessons), '2026-10-09');
  const preview = (settings: AppConfig) => activityDocumentPreviews(settings, 'c', lessons, links, translate);
  const remarks = (settings: AppConfig) => buildSessionActivityRemarks(settings, 'c', translate, ', ', lessons);
  assert.equal(preview(config).sessions.get('2026-10-02')?.[0].document.source, '**تمرين** $x^2$');
  assert.equal(remarks(config).size, 1);
  const moved = { ...config, assessmentDates: { c: { dm: '2026-10-08' } } };
  assert.equal(preview(moved).sessions.has('2026-10-02'), false);
  assert.equal(preview(moved).sessions.has('2026-10-08'), true);
  assert.deepEqual([...remarks(moved).keys()], ['2026-10-08']);
  const removed = { ...moved, removedAssessments: { c: ['dm'] } };
  assert.equal(preview(removed).sessions.size, 0); assert.equal(remarks(removed).size, 0);
  assert.equal(preview(config).rows.size, 0, 'the subject is not linked to a hidden homework row');
});

test('cloud accepts supported numbering only; school grouping tolerates French/Arabic accents and spacing', () => {
  assert.deepEqual(assertValidSyncSettings({ contentNumbering: numbering }, new Set())?.contentNumbering, numbering);
  assert.throws(() => assertValidSyncSettings({ contentNumbering: { enabled: true, scope: 'invalid' } }, new Set()));
  assert.equal(establishmentKey('  Lycée   Al Amal '), establishmentKey('lycee al amal'));
  assert.equal(establishmentKey('ثَانَوِيَّة الأمل'), establishmentKey('ثانوية الأمل'));
  assert.equal(listEstablishments([{ establishmentName: ' Lycée A ' }, { establishmentName: 'lycee a' }, {}, { establishmentName: 'ثانوية الأمل' }]).length, 3);
});
