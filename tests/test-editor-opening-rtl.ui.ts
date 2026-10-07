import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MainTable } from '../src/features/editor/MainTable';
import { ContentRenderer } from '../src/features/editor/ContentRenderer';
import { Toolbar } from '../src/features/editor/Toolbar';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { buildLessonRows } from '../src/domain/notebook/lessonRows';
import { lastDatedContentKey } from '../src/domain/notebook/notebookOpening';
import type { LessonsData } from '../src/types';

const noop = () => {};
const render = (child: React.ReactElement, locale: 'ar' | 'fr' = 'ar') => renderToStaticMarkup(
  React.createElement(LocaleProvider, { locale, manageDocument: false, children: child }));

test('the last row of a merged session owns the scroll anchor, not its entire group', () => {
  const lessons: LessonsData = [{ type: 'chapter', title: 'درس', items: [
    { type: 'cours', title: 'أول سطر', date: '2026-09-01' },
    { type: 'cours', title: 'آخر سطر', date: '2026-09-01' },
    { type: 'cours', title: 'لاحقاً' },
  ] }];
  const rows = buildLessonRows(lessons);
  const key = lastDatedContentKey(rows)!;
  const html = render(React.createElement(MainTable, { lessonsData: lessons, visibleRows: rows,
    contentDirection: 'rtl', onClearSearch: noop, onOpenAddContentModal: noop, selectedKeys: new Set<string>(),
    onToggleSelect: noop, onOpenContentEditor: noop, newlyAddedIds: [], focusKey: key }));
  assert.equal((html.match(/data-focus-key=/g) ?? []).length, 1);
  assert.match(html, /data-session-cell="content" data-focus-key="0\|\|\|\|1"/);
  assert.doesNotMatch(html, /editor-type-item-title\]:text-center/);
});

test('Arabic item markers and prose begin on the right, including in a Latin notebook', () => {
  const html = render(React.createElement(ContentRenderer, { data: { type: 'cours', title: 'نص عربي', description: 'وصف عربي' },
    elementType: 'item', indices: { chapterIndex: 0, itemIndex: 0 }, showDescriptions: true }));
  assert.match(html, /dir="rtl" class="editor-lesson-row[^\"]*text-start/);
  assert.match(html, /dir="rtl" class="editor-type-item-title text-start/);
  assert.match(html, /editor-type-description text-start/);
  const latin = render(React.createElement(ContentRenderer, { data: { type: 'cours', title: 'Latin text' },
    elementType: 'item', indices: { chapterIndex: 0, itemIndex: 0 } }));
  assert.match(latin, /dir="ltr" class="editor-lesson-row/);
});

test('toolbar and search direction comes from its locale before document effects run', () => {
  const html = render(React.createElement(Toolbar, { onUndo: noop, onRedo: noop, canUndo: true, canRedo: true,
    saveStatus: 'saved', onOpenDataTransfer: noop, onOpenManageLessons: noop, onOpenGuide: noop, onOpenAnalyse: noop,
    onOpenEvaluations: noop, onPrint: noop, searchQuery: '', setSearchQuery: noop }));
  assert.match(html, /data-editor-toolbar="true" dir="rtl"/);
  assert.match(html, /type="search"[^>]*dir="rtl"/);
});
