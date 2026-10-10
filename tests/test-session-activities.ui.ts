import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { MainTable } from '../src/features/editor/MainTable';
import { PrintView } from '../src/features/editor/PrintView';
import { buildLessonRows } from '../src/domain/notebook/lessonRows';
import { buildSessionActivityRemarks } from '../src/domain/evaluations/sessionActivityRemarks';
import { translateLocaleMessage } from '../src/i18n/messages';
import type { AppConfig, ClassInfo, LessonsData } from '../src/types';
import { createPrintSelection } from '../src/infrastructure/printing/printMeta';

const noop = () => {};
const config = { establishmentName: '', defaultTeacherName: '', printShowDescriptions: false, pedagogicalEvents: { A: [
  { id: 'check', type: 'controle_cahiers', title: 'مراقبة دفاتر التلاميذ', date: '2026-10-01', status: 'planned', createdAt: '2026-09-01T00:00:00Z' },
  { id: 'remediate', type: 'remediation', title: 'معالجة التعثرات', date: '2026-10-01', status: 'planned', createdAt: '2026-09-01T00:00:00Z' },
] }, manualAssessments: { A: [{ id: 'oral', type: 'oral', num: 1, semestre: 1, dateISO: '2026-10-01' }] } } as AppConfig;
const annotations = buildSessionActivityRemarks(config, 'A', (key, values) => translateLocaleMessage('ar', key, values), '، ');
const render = (element: React.ReactElement) => renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'ar', children: element }));
const table = (data: LessonsData) => render(React.createElement(MainTable, { lessonsData: data, visibleRows: buildLessonRows(data),
  contentDirection: 'rtl', onClearSearch: noop, onOpenAddContentModal: noop, selectedKeys: new Set<string>(), onToggleSelect: noop,
  onOpenContentEditor: noop, newlyAddedIds: [], getSessionAnnotation: date => annotations.get(date ?? '') }));

for (const count of [1, 2]) test(`the three activities reach a ${count === 1 ? 'single row' : 'merged session'} and paper without changing course content`, () => {
  const lessons: LessonsData = [{ type: 'chapter', title: 'Cours', items: Array.from({ length: count }, (_, index) =>
    ({ type: 'cours', title: `Lesson ${index + 1}`, date: '2026-10-01', remark: index === 0 ? 'ملاحظة الأستاذ' : undefined })) }];
  const before = JSON.stringify(lessons);
  for (const html of [table(lessons), render(React.createElement(PrintView, { lessonsData: lessons, config,
    classInfo: { id: 'A', name: 'Classe' } as ClassInfo, contentDirection: 'rtl', newlyAddedIds: [], preview: true }))]) {
    assert.ok(html.includes('ملاحظة الأستاذ'));
    for (const label of ['مراقبة دفاتر التلاميذ', 'معالجة التعثرات', 'تقويم شفهي']) assert.ok(html.includes(label));
    assert.ok(html.includes(count === 1 ? 'Lesson 1' : 'Lesson 2'));
  }
  assert.equal(JSON.stringify(lessons), before);
});

test('an activity has no table annotation on content dated a different day', () => {
  const lessons: LessonsData = [{ type: 'chapter', title: 'Cours', items: [{ type: 'cours', title: 'Next', date: '2026-10-02' }] }];
  assert.ok(!table(lessons).includes('data-session-annotation'));
});

test('homework is printed as a remark, corrections stay rows, and partial prints do not reassign homework', () => {
  const data: LessonsData = [
    { type: 'chapter', title: 'Cours', items: [{ type: 'cours', title: 'Ancien', date: '2026-10-01' }, { type: 'cours', title: 'Récent', date: '2026-10-04' }] },
    { type: 'devoir_maison', title: 'Hidden homework row', date: '2026-10-05', _tempId: 'dev-block-dm' },
    { type: 'correction_devoir_maison', title: 'Correction conservée', date: '2026-10-06' },
  ];
  const settings: AppConfig = { ...config, manualAssessments: { A: [{ id: 'dm', type: 'maison', num: 1, semestre: 1, dateISO: '2026-10-04' }] } };
  const print = (lessons: LessonsData) => render(React.createElement(PrintView, { lessonsData: lessons, annotationLessons: data, config: settings,
    classInfo: { id: 'A', name: 'Classe' } as ClassInfo, contentDirection: 'rtl', newlyAddedIds: [], preview: true }));
  assert.doesNotMatch(print(data), /Hidden homework row/);
  assert.match(print(data), /Correction conservée/);
  assert.match(print(data), /تم إعطاء الفرض المنزلي/);
  assert.doesNotMatch(print(createPrintSelection(data, ['2026-10-01'])), /تم إعطاء الفرض المنزلي/);
  assert.match(print(createPrintSelection(data, ['2026-10-04'])), /تم إعطاء الفرض المنزلي/);
});

test('a multi-session course prints an oral assessment on its second date without losing the remark', () => {
  const data: LessonsData = [{ type: 'chapter', title: 'Cours', items: [{ type: 'cours', title: 'Leçon', date: '2026-10-04 et 2026-10-05' }] }];
  const settings: AppConfig = { ...config, manualAssessments: { A: [{ id: 'oral', type: 'oral', num: 1, semestre: 1, dateISO: '2026-10-05' }] } };
  const html = render(React.createElement(PrintView, { lessonsData: data, config: settings,
    classInfo: { id: 'A', name: 'Classe' } as ClassInfo, contentDirection: 'rtl', newlyAddedIds: [], preview: true }));
  assert.match(html, /تقويم شفهي/);
  assert.equal(html.split('تقويم شفهي').length - 1, 1);
});
