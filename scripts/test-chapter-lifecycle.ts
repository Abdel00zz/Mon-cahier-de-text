import assert from 'node:assert/strict';
import test from 'node:test';
import type { LessonsData, TopLevelItem } from '../types';
import { detectChapterLifecycles, isNonCourseActivity } from '../utils/chapterLifecycle';

const period = { start: '2026-09-07', end: '2027-06-30', today: '2026-10-01' };
const chapter = (patch: Partial<TopLevelItem> = {}): TopLevelItem => ({ type: 'chapter', title: 'Cours', date: '2026-09-14', items: [{ type: 'definition' }, { type: 'exercice', date: '2026-09-21' }], ...patch });
const detect = (data: LessonsData) => detectChapterLifecycles(data, period).chapters.get(0)!;

test('only the title establishes start; dating an inner item never substitutes for it', () => {
  const result = detect([chapter({ date: undefined })]);
  assert.equal(result.startDate, undefined); assert.equal(result.issue, 'missing_start');
  assert.equal(result.completionRate, null); assert.notEqual(result.state, 'completed');
});

test('last course content date completes the chapter even with undated intermediate content', () => {
  const result = detect([chapter()]);
  assert.equal(result.startDate, '2026-09-14'); assert.equal(result.endDate, '2026-09-21');
  assert.equal(result.state, 'completed'); assert.equal(result.completionRate, 1);
});

test('terminal content follows table order: direct items before sections and nested descendants', () => {
  const result = detect([chapter({ items: [{ type: 'exercice', date: '2026-09-15' }], sections: [{ name: 'I', items: [{ type: 'theorem', date: '2026-09-16' }], subsections: [{ name: 'A', items: [{ type: 'proof' }], subsubsections: [{ name: 'a', items: [{ type: 'application', date: '2026-09-21' }] }] }] }] })]);
  assert.equal(result.itemsCount, 4); assert.equal(result.endDate, '2026-09-21'); assert.equal(result.state, 'completed');
});

test('DM, DS, corrections, diagnostic and activity aliases never move chapter boundaries', () => {
  for (const type of ['devoir_maison', 'devoir_surveille', 'contrôle continu', 'DS', 'DM', 'correction_controle_continu', 'evaluation_diagnostic', 'activité', 'activity', 'act', 'soutien', 'remédiation', 'examen_blanc', 'olympiade', 'autre', 'نشاط']) {
    assert.equal(isNonCourseActivity(type), true, type);
    const result = detect([chapter({ items: [...chapter().items!, { type, date: '2026-12-01' }] })]);
    assert.equal(result.itemsCount, 2, type); assert.equal(result.endDate, '2026-09-21', type); assert.equal(result.state, 'completed', type);
  }
});

test('the whole assessment subtree is excluded, including ordinary definitions inside it', () => {
  const assessment = { type: 'controle_continu' as const, title: 'DS', date: '2026-12-01', sections: [{ name: 'Exercices du DS', items: [{ type: 'definition', date: '2026-12-02' }] }] };
  const result = detect([chapter({ items: [...chapter().items!, assessment] })]);
  assert.equal(result.itemsCount, 2); assert.equal(result.state, 'completed');
});

test('separators and structural dates neither start nor complete a chapter', () => {
  const result = detect([chapter({ date: undefined, items: [], separatorAfter: { content: '', date: '2026-09-21' }, sections: [{ name: 'Section', date: '2026-09-14' }] })]);
  assert.equal(result.startDate, undefined); assert.equal(result.endDate, undefined); assert.equal(result.state, 'not_started');
});

test('empty or activity-only chapter can start but cannot be complete', () => {
  for (const items of [[], [{ type: 'activité', date: '2026-09-21' }]]) {
    const result = detect([chapter({ items })]);
    assert.equal(result.state, 'in_progress'); assert.equal(result.endDate, undefined); assert.equal(result.completionRate, null);
  }
});

test('future title/terminal dates remain scheduled or ongoing, never prematurely complete', () => {
  const future = detect([chapter({ date: '2026-10-05', items: [{ type: 'definition', date: '2026-10-05' }] })]);
  assert.equal(future.state, 'scheduled'); assert.equal(future.completionRate, 0);
  const ongoing = detect([chapter({ items: [{ type: 'definition', date: '2026-09-14' }, { type: 'exercice', date: '2026-10-05' }] })]);
  assert.equal(ongoing.state, 'in_progress'); assert.equal(ongoing.completionRate, 0.5);
});

test('invalid, previous-year and inverted dates are flagged rather than converted to completion', () => {
  for (const date of ['2026-02-31', '2025-09-21', '2026-09-10']) {
    const result = detect([chapter({ items: [{ type: 'exercice', date }] })]);
    assert.equal(result.state, 'inconsistent', date); assert.equal(result.completionRate, null, date);
  }
  const inverted = detect([chapter({ items: [{ type: 'definition', date: '2026-09-28' }, { type: 'exercice', date: '2026-09-21' }] })]);
  assert.equal(inverted.issue, 'chronology'); assert.notEqual(inverted.state, 'completed');
});

test('clear, append, reorder and undo immediately recompute boundaries without stale cache', () => {
  const original = [chapter()];
  assert.equal(detect(original).state, 'completed');
  const cleared = structuredClone(original); delete cleared[0].items![1].date;
  assert.equal(detect(cleared).state, 'in_progress');
  const appended = structuredClone(original); appended[0].items!.push({ type: 'exercice' });
  assert.equal(detect(appended).state, 'in_progress'); assert.equal(detect(appended).endDate, undefined);
  const reordered = structuredClone(original); reordered[0].items!.reverse();
  assert.equal(detect(reordered).state, 'in_progress');
  assert.equal(detect(original).state, 'completed');
  const noStart = structuredClone(original); delete noStart[0].date;
  assert.equal(detect(noStart).issue, 'missing_start');
});

test('same-day completion is allowed; scientific and custom teaching content remain supported', () => {
  for (const type of ['expérience', 'observation', 'conclusion', 'loi', 'document', 'cours', 'custom_concept']) {
    const result = detect([chapter({ items: [{ type, date: '2026-09-14' }] })]);
    assert.equal(result.state, 'completed', type); assert.equal(result.itemsCount, 1, type);
  }
});

test('a changed terminal date from a cloud snapshot replaces the local completion date', () => {
  const local = [chapter()]; const remote = JSON.parse(JSON.stringify(local)) as LessonsData;
  remote[0].items![1].date = '2026-09-28';
  assert.equal(detect(local).endDate, '2026-09-21'); assert.equal(detect(remote).endDate, '2026-09-28');
});

test('cached structure reevaluates dates when the Morocco calendar day changes', () => {
  const data = [chapter({ items: [{ type: 'exercice', date: '2026-10-02' }] })];
  assert.equal(detect(data).state, 'in_progress');
  assert.equal(detectChapterLifecycles(data, { ...period, today: '2026-10-02' }).chapters.get(0)!.state, 'completed');
});

test('unchanged notebook and period share the evaluation; content and year changes invalidate it', () => {
  const data = [chapter()];
  const first = detectChapterLifecycles(data, period);
  assert.equal(detectChapterLifecycles(data, { ...period }), first);
  const changed = structuredClone(data); delete changed[0].items![1].date;
  assert.notEqual(detectChapterLifecycles(changed, period), first);
  assert.equal(detect(changed).state, 'in_progress');
  const nextYear = detectChapterLifecycles(data, { start: '2027-09-01', end: '2028-06-30', today: '2027-10-01' });
  assert.notEqual(nextYear, first); assert.equal(nextYear.chapters.get(0)!.issue, 'invalid_date');
  assert.equal(detect(data).state, 'completed');
});

test('period objects are copied and incomplete imported types never crash classification', () => {
  const data = [chapter()]; const mutablePeriod = { ...period };
  const first = detectChapterLifecycles(data, mutablePeriod);
  mutablePeriod.today = '2026-09-15';
  const changed = detectChapterLifecycles(data, mutablePeriod);
  assert.notEqual(first, changed); assert.equal(changed.chapters.get(0)!.state, 'in_progress');
  for (const type of [undefined, null, 123]) assert.equal(isNonCourseActivity(type), false);
});
