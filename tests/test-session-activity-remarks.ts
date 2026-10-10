import assert from 'node:assert/strict';
import test from 'node:test';
import { buildSessionActivityRemarks } from '../src/domain/evaluations/sessionActivityRemarks';
import { translateLocaleMessage } from '../src/i18n/messages';
import { assertValidSyncSettings } from '../api/_lib/validate';
import { sessionPrintSignatures } from '../src/infrastructure/printing/printMeta';
import { getLastNotebookDate } from '../src/domain/evaluations/homeworkPlacement';
import { applySessionEdit } from '../src/domain/notebook/sessionEditing';
import type { AppConfig, LessonsData, PedagogicalEvent } from '../src/types';

const event = (id: string, type: PedagogicalEvent['type'], date = '2026-10-01'): PedagogicalEvent => ({
  id, type, title: type === 'controle_cahiers' ? 'مراقبة دفاتر التلاميذ' : 'معالجة التعثرات', date,
  status: 'planned', createdAt: '2026-09-01T00:00:00.000Z',
});
const config = (): Partial<AppConfig> => ({
  pedagogicalEvents: { A: [event('check', 'controle_cahiers'), event('remediate', 'remediation')],
    B: [event('other-class', 'controle_cahiers', '2026-10-02')] },
  manualAssessments: { A: [{ id: 'oral', type: 'oral', num: 1, dateISO: '2026-10-01', semestre: 1 }] },
});
const translated = (value: Partial<AppConfig>, classId = 'A') => buildSessionActivityRemarks(value, classId,
  (key, values) => translateLocaleMessage('ar', key, values), '، ');

test('all three activities coexist in the remark of their entered date, scoped to their class', () => {
  const settings = config();
  const before = JSON.stringify(settings);
  assert.equal(translated(settings).get('2026-10-01'), 'مراقبة دفاتر التلاميذ\nمعالجة التعثرات\nتقويم شفهي');
  assert.equal(translated(settings).has('2026-10-02'), false);
  assert.equal(translated(settings, 'B').has('2026-10-01'), false);
  assert.equal(JSON.stringify(settings), before);
});

test('moving/deleting an activity updates remarks without keeping an old injected copy', () => {
  const settings = config();
  settings.assessmentDates = { A: { oral: '2026-10-03' } };
  settings.pedagogicalEvents!.A[1].date = '2026-10-02';
  assert.equal(translated(settings).get('2026-10-01'), 'مراقبة دفاتر التلاميذ');
  assert.equal(translated(settings).get('2026-10-02'), 'معالجة التعثرات');
  assert.equal(translated(settings).get('2026-10-03'), 'تقويم شفهي');
  settings.removedAssessments = { A: ['oral'] };
  settings.pedagogicalEvents!.A = [];
  assert.equal(translated(settings).size, 0);
});

test('official oral assessments require a chosen date; overrides and legacy ids are deduplicated', () => {
  const settings: Partial<AppConfig> = { assessmentDates: { A: {
    '2026-2027:s1-oral1': '2026-10-02', 's1-oral1': '2026-10-01', '2026-2027:s1-controle1': '2026-10-03',
  } } };
  assert.deepEqual([...translated(settings)], [['2026-10-02', 'تقويم شفهي']]);
  settings.removedAssessments = { A: ['s1-oral1'] };
  assert.equal(translated(settings).size, 0);
});

test('multiple notebook checks and remediation periods do not replace one another', () => {
  const settings = config();
  settings.pedagogicalEvents!.A.push({ ...event('check-two', 'controle_cahiers'), title: 'فحص إضافي' });
  settings.pedagogicalEvents!.A[1].endDate = '2026-10-02';
  assert.ok(translated(settings).get('2026-10-01')!.includes('فحص إضافي'));
  assert.equal(translated(settings).get('2026-10-02'), 'معالجة التعثرات');
});

test('cloud validation accepts supervised-test corrections and activity remarks survive JSON roundtrip', () => {
  const settings = config();
  settings.pedagogicalEvents!.A.push({ ...event('correction', 'correction_controle_continu'), title: 'تصحيح الفرض المحروس' });
  const checked = assertValidSyncSettings(settings, new Set(['A', 'B']))!;
  const restored = JSON.parse(JSON.stringify(checked));
  assert.deepEqual([...translated(restored)], [...translated(settings)]);
  assert.equal(restored.pedagogicalEvents.A.at(-1).type, 'correction_controle_continu');
});

test('changing a remark activity invalidates that printed session without adding a course date', () => {
  const lessons: LessonsData = [{ type: 'chapter', title: 'Cours', items: [{ type: 'cours', title: 'Lesson', date: '2026-10-01' }] }];
  const empty = sessionPrintSignatures(lessons);
  const settings = config();
  const annotated = sessionPrintSignatures(lessons, [], translated(settings));
  assert.notEqual(empty['2026-10-01'], annotated['2026-10-01']);
  assert.deepEqual(Object.keys(annotated), ['2026-10-01']);
  settings.pedagogicalEvents!.A[1].title = 'Remédiation modifiée';
  assert.notEqual(sessionPrintSignatures(lessons, [], translated(settings))['2026-10-01'], annotated['2026-10-01']);
});

test('homework assessments (devoir maison) add "تم إعطاء الفرض المنزلي" to the session remark', () => {
  const settings: Partial<AppConfig> = {
    assessmentDates: { A: { '2026-2027:s1-maison1': '2026-10-15', 's1-maison2': '2026-11-20' } },
    manualAssessments: { A: [{ id: 'manual-dm', type: 'maison', num: 3, dateISO: '2026-12-05', semestre: 1 }] },
  };
  assert.equal(translated(settings).get('2026-10-15'), 'تم إعطاء الفرض المنزلي رقم 1');
  assert.equal(translated(settings).get('2026-11-20'), 'تم إعطاء الفرض المنزلي رقم 2');
  assert.equal(translated(settings).get('2026-12-05'), 'تم إعطاء الفرض المنزلي رقم 3');
});

test('getLastNotebookDate extracts the date of the last content in the editor table', () => {
  const empty: LessonsData = [];
  assert.equal(getLastNotebookDate(empty), undefined);

  const lessons: LessonsData = [
    { type: 'chapter', title: 'Ch 1', items: [{ type: 'cours', title: 'L1', date: '2026-10-01' }, { type: 'exercice', title: 'Ex 1', date: '2026-10-05' }] },
    { type: 'chapter', title: 'Ch 2', items: [{ type: 'cours', title: 'L2', date: '2026-10-12' }] },
  ];
  assert.equal(getLastNotebookDate(lessons), '2026-10-12');
});

test('clearing free text preserves the homework owner and its pedagogical content', () => {
  const lessons: LessonsData = [
    { type: 'chapter', title: 'Ch 1', items: [{ type: 'cours', title: 'L1', date: '2026-10-10', remark: 'Initial' }] },
    { type: 'devoir_maison', title: 'Devoir maison 1', date: '2026-10-10' },
  ];
  const draft = JSON.parse(JSON.stringify(lessons));
  applySessionEdit(draft, [{ chapterIndex: 0, itemIndex: 0 }], { remark: '' });
  assert.equal(draft[0].items[0].remark, undefined);
  assert.equal(draft.some((it: any) => it.type === 'devoir_maison'), true);
});
