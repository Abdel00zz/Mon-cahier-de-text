import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLessonRows } from '../src/domain/notebook/lessonRows';
import { lastDatedContentKey } from '../src/domain/notebook/notebookOpening';
import { readInitialNotebook } from '../src/features/editor/initialNotebook';
import { readLocalSyncSnapshot } from '../src/infrastructure/sync/localSnapshot';
import type { LessonsData } from '../src/types';

const lessons: LessonsData = [{ type: 'chapter', title: 'الدوال', date: '2026-09-01', sections: [
  { name: 'قسم', items: [{ type: 'cours', title: 'البداية', date: '2026-09-02' }], subsections: [
    { name: 'جزء', subsubsections: [{ name: 'تفصيل', items: [
      { type: 'cours', title: 'آخر محتوى مؤرخ', date: '03/09/2026' },
      { type: 'cours', title: 'لاحقاً' }, { type: 'cours', title: 'خطأ', date: 'invalid' },
    ] }] },
  ] },
] }];

test('opening targets the last dated source line at every hierarchy depth, before an undated tail', () => {
  const rows = buildLessonRows(lessons);
  const before = JSON.stringify(lessons);
  assert.equal(lastDatedContentKey(rows), '0|0|0|0|0');
  assert.equal(JSON.stringify(lessons), before);
  assert.equal(lastDatedContentKey(buildLessonRows([{ type: 'chapter', title: 'Vide' }])), null);
  assert.equal(lastDatedContentKey([]), null);
});

test('removing or adding a date changes the opening target without a separate cached progress cursor', () => {
  const edited = structuredClone(lessons);
  const items = edited[0].sections![0].subsections![0].subsubsections![0].items!;
  items[0].date = '';
  assert.equal(lastDatedContentKey(buildLessonRows(edited)), '0|0|||0');
  items[1].date = '2026-09-04';
  assert.equal(lastDatedContentKey(buildLessonRows(edited)), '0|0|0|0|1');
});

test('local reopen and cloud snapshot use the same persisted dates and Arabic direction', () => {
  const values: Record<string, string> = { classManager_v1: JSON.stringify([{ id: 'opening', name: 'قسم' }]),
    classData_v1_opening: JSON.stringify({ lessonsData: lessons, contentDirection: 'rtl' }) };
  const storage = { getItem: (key: string) => values[key] ?? null };
  const first = readInitialNotebook({ classId: 'opening', locale: 'ar', storage })!;
  const sent = readLocalSyncSnapshot(storage).notebooks.get('opening')!;
  const secondDevice = { getItem: (key: string) => key === 'classData_v1_opening' ? JSON.stringify(sent) : null };
  const reopened = readInitialNotebook({ classId: 'opening', locale: 'fr', storage: secondDevice })!;
  assert.equal(first.direction, 'rtl');
  assert.equal(reopened.direction, 'rtl');
  assert.equal(lastDatedContentKey(buildLessonRows(first.lessons)), '0|0|0|0|0');
  assert.equal(lastDatedContentKey(buildLessonRows(reopened.lessons)), '0|0|0|0|0');
});
