import assert from 'node:assert/strict';
import test from 'node:test';
import { produce } from 'immer';
import type { AppConfig, LessonsData } from '../src/types';
import { applySessionEdit, readSessionSelection } from '../src/domain/notebook/sessionEditing';
import { applyContentEdit } from '../src/domain/notebook/contentEditing';
import { buildSessionActivityRemarks, buildSessionRemarkEntries } from '../src/domain/evaluations/sessionActivityRemarks';
import { restoreSessionRemarkSettings, sessionRemarkSettingsPatch, withoutActivityCopies } from '../src/domain/evaluations/sessionRemarkChanges';
import { homeworkSessionResolver, lastCourseSessionDate } from '../src/domain/evaluations/homeworkPlacement';
import { extractSyncableSettings, mergeSyncableSettings, type SyncableSettings } from '../src/infrastructure/sync/syncSettings';
import { assertValidSyncSettings, assertValidLessonsPayload } from '../api/_lib/validate';
import { planContentTransfer, applyContentTransfer } from '../src/domain/notebook/contentReorder';
import { buildSessionTargets, buildContentEditTargetsGrouped } from '../src/domain/notebook/contentEditing';
import { groupLessonRows } from '../src/domain/notebook/tableRows';
import { buildLessonRows, indicesKey } from '../src/domain/notebook/lessonRows';
import { buildContentNumbers } from '../src/domain/notebook/contentNumbering';
import { syncNotebookToEvaluations } from '../src/domain/evaluations/notebookReconciliation';

const translate = (key: string) => key;
const lessons: LessonsData = [{ type: 'chapter', title: 'Cours', items: [
  { type: 'cours', title: 'Avant', date: '2026-10-01' },
  { type: 'cours', title: 'Dernier', date: '2026-10-05', remark: 'À revoir' },
] }];
const target = [{ chapterIndex: 0, itemIndex: 1 }];
const config: AppConfig = { establishmentName: '', defaultTeacherName: '', printShowDescriptions: true,
  manualAssessments: { c: [{ id: 'dm', type: 'maison', num: 1, dateISO: '2026-10-05', semestre: 1 }] },
  assessmentDocuments: { c: { dm: { source: 'Sujet conservé', updatedAt: '2026-10-05T12:00:00Z' } } },
};
const entries = (settings = config, data = lessons) => buildSessionRemarkEntries(settings, 'c', translate, ', ', data);
const remarks = (settings = config, data = lessons) => buildSessionActivityRemarks(settings, 'c', translate, ', ', data);

test('one free remark belongs to a merged session; reading it does not treat the empty siblings as mixed', () => {
  const data = produce(lessons, draft => { applySessionEdit(draft, [{ chapterIndex: 0, itemIndex: 0 }, ...target], { date: '2026-10-05', remark: 'Unique' }); });
  assert.deepEqual(data[0].items!.map(item => item.remark), [undefined, 'Unique']);
  const selected = readSessionSelection(data, [{ chapterIndex: 0, itemIndex: 0 }, ...target])!;
  assert.equal(selected.remark, 'Unique'); assert.equal(selected.mixedRemarks, false);
  assert.equal(produce(data, draft => { assert.equal(applySessionEdit(draft, [...target, ...target], { remark: 'Duplicate' }), false); }), data);
});

test('date dissociation clears free remarks and removes the badge without relocating it to an older lesson', () => {
  const patch = { date: '' };
  const next = produce(lessons, draft => { applySessionEdit(draft, target, patch); });
  const settings = { ...config, ...sessionRemarkSettingsPatch(config, 'c', lessons, target, patch, entries()) };
  assert.equal(next[0].items![1].remark, undefined);
  assert.equal(remarks(settings, next).size, 0);
  assert.equal(settings.assessmentDocuments!.c.dm.source, 'Sujet conservé');
  assert.equal(settings.manualAssessments!.c.length, 1);
  const edited = produce(lessons, draft => { applyContentEdit(draft, target, { date: '' }); });
  assert.equal(edited[0].items![1].remark, undefined);
});

test('partially dissociating a shared date preserves the other content and its activity', () => {
  const shared = produce(lessons, draft => { draft[0].items![0].date = '2026-10-05'; });
  const patch = sessionRemarkSettingsPatch(config, 'c', shared, target, { date: '' }, entries(config, shared));
  assert.deepEqual(patch, {});
  const next = produce(shared, draft => { applySessionEdit(draft, target, { date: '' }); });
  assert.ok(remarks(config, next).has('2026-10-05'));
});

test('moving a complete session transmits the homework date and moves its badge', () => {
  const patch = { date: '2026-10-07' };
  const settings = { ...config, ...sessionRemarkSettingsPatch(config, 'c', lessons, target, patch, entries()) };
  const next = produce(lessons, draft => { applySessionEdit(draft, target, patch); });
  assert.equal(settings.assessmentDates!.c.dm, '2026-10-07');
  assert.equal(settings.manualAssessments!.c[0].dateISO, '2026-10-07');
  assert.deepEqual([...remarks(settings, next).keys()], ['2026-10-07']);
});

test('undo and redo restore the linked date and badge, preserving concurrent edits and other classes', () => {
  const after = sessionRemarkSettingsPatch(config, 'c', lessons, target, { date: '2026-10-07' }, entries());
  const before = { assessmentDates: config.assessmentDates, manualAssessments: config.manualAssessments };
  const current: AppConfig = { ...config, ...after, sessionRemarkOverrides: { other: { abc: { hidden: true } } } };
  const undone = { ...current, ...restoreSessionRemarkSettings(current, 'c', after, before) };
  assert.equal(undone.manualAssessments!.c[0].dateISO, '2026-10-05');
  assert.equal(undone.assessmentDates!.c.dm, undefined);
  const redone = { ...undone, ...restoreSessionRemarkSettings(undone, 'c', before, after) };
  assert.equal(redone.manualAssessments!.c[0].dateISO, '2026-10-07');
  assert.deepEqual(redone.sessionRemarkOverrides, current.sessionRemarkOverrides);
  const changed = { ...current, assessmentDates: { c: { dm: '2026-10-09' } } };
  assert.equal(restoreSessionRemarkSettings(changed, 'c', after, before).assessmentDates, undefined, 'a cloud date edit is not overwritten by undo');
  const removal = sessionRemarkSettingsPatch(config, 'c', lessons, target, { activityRemarks: { 'assessment:dm': null } }, entries());
  const restored = restoreSessionRemarkSettings({ ...config, ...removal }, 'c', removal, { sessionRemarkOverrides: undefined });
  assert.equal(restored.sessionRemarkOverrides!.c['assessment:dm'], undefined);
});

test('a hidden historical homework row cannot reset the new activity date during automatic saving', () => {
  const source: LessonsData = [...lessons, { type: 'devoir_maison', title: 'Devoir maison 1', date: '2026-10-05', _tempId: 'dev-block-dm' }];
  const next = produce(source, draft => { applySessionEdit(draft, target, { date: '2026-10-07' }); });
  const settings = { ...config, ...sessionRemarkSettingsPatch(config, 'c', source, target, { date: '2026-10-07' }, entries(config, source)) };
  const saved = { ...settings, ...syncNotebookToEvaluations('c', settings, next, { previousLessons: source }).patch };
  assert.equal(saved.assessmentDates!.c.dm, '2026-10-07');
  assert.equal(saved.manualAssessments!.c[0].dateISO, '2026-10-07');
});

test('activity text edits, removal and restoration survive settings validation and JSON cloud roundtrip', () => {
  const change = (text: string | null) => ({ ...config, ...sessionRemarkSettingsPatch(config, 'c', lessons, target,
    { activityRemarks: { 'assessment:dm': text } }, entries()) });
  const modified = change('تم إعطاء واجب منزلي للمراجعة');
  const wire = JSON.parse(JSON.stringify(extractSyncableSettings(modified)));
  const restored = { ...config, ...mergeSyncableSettings(config, assertValidSyncSettings(wire, new Set(['c']))! as SyncableSettings) };
  assert.equal(remarks(restored).get('2026-10-05'), 'تم إعطاء واجب منزلي للمراجعة');
  assert.equal(remarks(change(null)).size, 0);
  assert.equal(remarks(change('Rétabli')).get('2026-10-05'), 'Rétabli');
  assert.throws(() => assertValidSyncSettings({ sessionRemarkOverrides: { c: { dm: { hidden: 'yes' } } } }, new Set(['c'])));
  assert.throws(() => assertValidSyncSettings({ sessionRemarkOverrides: { other: {} } }, new Set(['c'])));
  assert.equal(withoutActivityCopies('Note personnelle\n' + entries().get('2026-10-05')![0].text, entries().get('2026-10-05')!), 'Note personnelle');
});

test('new homework defaults to the last course in document order, excludes assessments and handles multi-session dates', () => {
  const data: LessonsData = [
    ...lessons, { type: 'chapter', title: 'Dernier chapitre', items: [{ type: 'exo', date: '04/10/2026 ; 06/10/2026' }] },
    { type: 'controle_continu', title: 'Contrôle', date: '2026-10-20' },
    { type: 'devoir_maison', title: 'Ancien devoir', date: '2026-10-21' },
  ];
  assert.equal(lastCourseSessionDate(data), '2026-10-06');
  assert.equal(lastCourseSessionDate([]), '');
  const resolve = homeworkSessionResolver(data);
  assert.equal(resolve('2026-10-06', true), '2026-10-04');
  assert.equal(resolve('2026-10-07', true), '');
});

test('all dates of a shared content expose their badges; dissociation and date changes handle the complete range', () => {
  const ranged = produce(lessons, draft => { draft[0].items![1].date = '2026-10-05 et 2026-10-06'; });
  const settings: AppConfig = { ...config, manualAssessments: { c: [{ ...config.manualAssessments!.c[0], dateISO: '2026-10-06' }] } };
  const indexed = entries(settings, ranged);
  const removed = sessionRemarkSettingsPatch(settings, 'c', ranged, target, { date: '' }, indexed);
  assert.equal(removed.sessionRemarkOverrides!.c['assessment:dm'].hidden, true);
  const changed = sessionRemarkSettingsPatch(settings, 'c', ranged, target, { date: '2026-10-07 et 2026-10-08' }, indexed);
  assert.equal(changed.assessmentDates!.c.dm, '2026-10-08');
  assert.equal(changed.manualAssessments!.c[0].dateISO, '2026-10-08');
});

test('annual and legacy homework identities produce only one editable badge', () => {
  const settings: AppConfig = { ...config,
    manualAssessments: { c: [{ ...config.manualAssessments!.c[0], id: 's1-maison1' }] },
    assessmentDates: { c: { '2026-2027:s1-maison1': '2026-10-05' } },
  };
  const data: LessonsData = [...lessons, { type: 'devoir_maison', title: 'Devoir maison 1', date: '2026-10-05', _tempId: 'dev-block-s1-maison1' }];
  const badges = entries(settings, data).get('2026-10-05')!;
  assert.equal(badges.length, 1);
  assert.equal(badges[0].id, 'assessment:2026-2027:s1-maison1');
  const hidden = { ...settings, sessionRemarkOverrides: { c: { [badges[0].id]: { hidden: true } } } };
  assert.equal(remarks(hidden, data).size, 0);
});

test('exo travels both ways between chapters without changing content identity, dates or the JSON structure', () => {
  const data: LessonsData = [
    { type: 'chapter', title: 'I', sections: [{ name: 'A', items: [{ type: 'exo', title: 'Exercice', _tempId: 'exercise-id', date: '2026-10-05', description: '$x^2$', remark: 'Note' }] }] },
    { type: 'chapter', title: 'II' },
  ];
  const source = { chapterIndex: 0, sectionIndex: 0, itemIndex: 0 };
  const plan = planContentTransfer(data, buildSessionTargets(buildLessonRows(data)), new Set([indicesKey(source)]), 'down')!;
  assert.ok(plan);
  const moved = produce(data, draft => { applyContentTransfer(draft, plan); });
  assert.deepEqual(moved[1].items![0], data[0].sections![0].items![0]);
  assert.equal(buildContentNumbers(moved, { enabled: true, badgeStyle: 'hierarchical' }).get(indicesKey(plan.selection[0])), '2.1');
  const wire = assertValidLessonsPayload([{ classId: 'c', lessonsData: JSON.parse(JSON.stringify(moved)), contentDirection: 'rtl' }], new Set(['c']))[0].lessonsData;
  const back = planContentTransfer(wire, buildSessionTargets(buildLessonRows(wire)), new Set(plan.selection.map(indicesKey)), 'up')!;
  const returned = produce(wire, draft => { applyContentTransfer(draft, back); });
  assert.deepEqual(returned[0].sections![0].items![0], data[0].sections![0].items![0]);
  assert.equal(returned[1].items!.length, 0);
});

test('a dated exercise can leave its chapter without carrying other contents of the same session', () => {
  const data: LessonsData = [
    { type: 'chapter', title: 'I', items: [{ type: 'définition', title: 'Cours', date: '2026-10-05' }, { type: 'exo', title: 'Exercice', date: '2026-10-05' }] },
    { type: 'chapter', title: 'II' },
  ];
  const groups = buildContentEditTargetsGrouped(groupLessonRows(buildLessonRows(data)).renderRows);
  const plan = planContentTransfer(data, groups, new Set([indicesKey({ chapterIndex: 0, itemIndex: 1 })]), 'down')!;
  assert.ok(plan);
  const next = produce(data, draft => { applyContentTransfer(draft, plan); });
  assert.equal(next[0].items!.length, 1);
  assert.equal(next[0].items![0].title, 'Cours');
  assert.equal(next[1].items![0].title, 'Exercice');
  assert.equal(next[1].items![0].date, '2026-10-05');
  const mixed = produce(next, draft => { draft[1].items!.push({ type: 'exercice', title: 'Autre' }); });
  assert.equal(buildContentNumbers(mixed).get(indicesKey({ chapterIndex: 1, itemIndex: 1 })), '2', 'exo and exercice share the same numbering counter');
});

test('unified remark containing homework activity is preserved and allows clearing without ghost badges', () => {
  const patch = { remark: 'تم إعطاء الفرض المنزلي 1', activityRemarks: {} };
  const next = produce(lessons, draft => { applySessionEdit(draft, target, patch); });
  assert.equal(next[0].items![1].remark, 'تم إعطاء الفرض المنزلي 1');
  const cleared = produce(next, draft => { applySessionEdit(draft, target, { remark: '' }); });
  assert.equal(cleared[0].items![1].remark, undefined);
  const settings = { ...config, ...sessionRemarkSettingsPatch(config, 'c', lessons, target, { activityRemarks: { 'assessment:dm': null } }, entries()) };
  assert.equal(settings.sessionRemarkOverrides!.c['assessment:dm'].hidden, true);
  assert.equal(remarks(settings, cleared).size, 0);
});
