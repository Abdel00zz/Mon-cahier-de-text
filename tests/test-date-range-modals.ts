import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { produce } from 'immer';
import type { LessonsData } from '../src/types';
import { extractDateRange, formatPedagogicalDateCell } from '../src/domain/evaluations/notebookSyncBridge';
import { createContentDraft, contentDraftChanged } from '../src/domain/notebook/contentDraft';
import { applyContentEdit } from '../src/domain/notebook/contentEditing';

test('extractDateRange handles single date, "Du XX au YY", and "من XX إلى YY"', () => {
  assert.deepEqual(extractDateRange('2026-09-08'), { startDate: '2026-09-08', endDate: undefined });
  assert.deepEqual(extractDateRange('Du 2026-09-08 au 2026-09-15'), { startDate: '2026-09-08', endDate: '2026-09-15' });
  assert.deepEqual(extractDateRange('من 2026-09-08 إلى 2026-09-15'), { startDate: '2026-09-08', endDate: '2026-09-15' });
  assert.deepEqual(extractDateRange('2026-09-08 et 2026-09-09'), { startDate: '2026-09-08', endDate: '2026-09-09' });
  assert.deepEqual(extractDateRange(undefined), {});
});

test('createContentDraft and contentDraftChanged track date and endDate', () => {
  const item = { type: 'evaluation_diagnostic', title: 'Test Diag', date: 'Du 2026-09-08 au 2026-09-15' };
  const draft = createContentDraft(item as any);
  assert.equal(draft.date, '2026-09-08');
  assert.equal(draft.endDate, '2026-09-15');
  assert.equal(contentDraftChanged(draft, draft), false);

  const modifiedEnd = { ...draft, endDate: '2026-09-18' };
  assert.equal(contentDraftChanged(modifiedEnd, draft), true);

  const modifiedStart = { ...draft, date: '2026-09-09' };
  assert.equal(contentDraftChanged(modifiedStart, draft), true);
});

test('applyContentEdit writes pedagogical date range cell format in French and Arabic without raw ranges', () => {
  const lessons: LessonsData = [
    { type: 'evaluation_diagnostic', title: 'Diag', date: '2026-09-08', _tempId: 'diag-1' }
  ];

  // French formatting (without timetable: bounds joined with 'et')
  const updatedFr = produce(lessons, draft => {
    applyContentEdit(draft, [{ chapterIndex: 0 }], { date: '2026-09-08', endDate: '2026-09-15' }, 'fr');
  });
  assert.equal(updatedFr[0].date, '2026-09-08 et 2026-09-15');

  // Arabic formatting
  const updatedAr = produce(lessons, draft => {
    applyContentEdit(draft, [{ chapterIndex: 0 }], { date: '2026-09-08', endDate: '2026-09-15' }, 'ar');
  });
  assert.equal(updatedAr[0].date, '2026-09-08 و 2026-09-15');

  // Consecutive days formatting (French "et", Arabic "و")
  const consecutiveFr = produce(lessons, draft => {
    applyContentEdit(draft, [{ chapterIndex: 0 }], { date: '2026-09-08', endDate: '2026-09-09' }, 'fr');
  });
  assert.equal(consecutiveFr[0].date, '2026-09-08 et 2026-09-09');

  const consecutiveAr = produce(lessons, draft => {
    applyContentEdit(draft, [{ chapterIndex: 0 }], { date: '2026-09-08', endDate: '2026-09-09' }, 'ar');
  });
  assert.equal(consecutiveAr[0].date, '2026-09-08 و 2026-09-09');

  // With timetable context: resolves intersecting session dates!
  // Tuesday 2026-09-08 (day 2) and Friday 2026-09-11 (day 5)
  const timetable = [
    { day: 2, slot: 0, classId: 'cls-1' },
    { day: 5, slot: 2, classId: 'cls-1' },
  ];
  // Range up to 2026-09-14: Tuesday 08 and Friday 11 (2 sessions)
  const withTimetable2 = produce(lessons, draft => {
    applyContentEdit(draft, [{ chapterIndex: 0 }], { date: '2026-09-08', endDate: '2026-09-14' }, 'fr', {
      classId: 'cls-1',
      timetable,
    });
  });
  assert.equal(withTimetable2[0].date, '2026-09-08 et 2026-09-11');

  // Range up to 2026-09-15: Tuesday 08, Friday 11, Tuesday 15 (3 sessions)
  const withTimetable3 = produce(lessons, draft => {
    applyContentEdit(draft, [{ chapterIndex: 0 }], { date: '2026-09-08', endDate: '2026-09-15' }, 'fr', {
      classId: 'cls-1',
      timetable,
    });
  });
  assert.equal(withTimetable3[0].date, '2026-09-08, 2026-09-11 et 2026-09-15');
});

test('CreateClassModal renders neutral uncolored branch choice cards without tone', () => {
  const code = readFileSync('src/features/dashboard/modals/CreateClassModal.tsx', 'utf8');
  assert.doesNotMatch(code, /ChoiceCard[^>]*tone=/);
  assert.doesNotMatch(code, /keepToneForClass/);
});

test('classCards.css has +5% font size (3.15rem), tracking -.04em, and opacity 1 for group number', () => {
  const css = readFileSync('src/features/dashboard/classCards.css', 'utf8');
  assert.match(css, /\.class-card \.class-card__group \{[^}]*font-size:\s*3\.15rem;/s);
  assert.match(css, /\.class-card \.class-card__group \{[^}]*letter-spacing:\s*-\.04em;/s);
  assert.match(css, /\.class-card \.class-card__group \{[^}]*opacity:\s*1;/s);
  assert.match(css, /\.class-card \.class-card__group \{ font-size:\s*2\.625rem; \}/);
  assert.match(css, /\.class-card \.class-card__group \{ font-size:\s*2\.1rem; \}/);
});

test('sidebar background harmonizes with canvas background in index.css and icon size is balanced', () => {
  const indexCss = readFileSync('src/styles/index.css', 'utf8');
  assert.match(indexCss, /\[data-app-sidebar\]\s*\{[^}]*backdrop-filter:\s*blur\(24px\)/s);
  assert.match(indexCss, /\[data-app-sidebar\]\s*\{[^}]*rgba\(246,\s*245,\s*240/s);
  assert.match(indexCss, /\.dark \[data-app-sidebar\]\s*\{[^}]*rgba\(26,\s*25,\s*22/s);

  const tabBar = readFileSync('src/components/navigation/TabBar.tsx', 'utf8');
  assert.ok(tabBar.includes('size-[20.5px]'), 'sidebar icons are rebalanced to 20.5px');
  assert.ok(!tabBar.includes('size-[23px]'), 'old oversized 23px icons removed');
});
