import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PrintView } from '../src/features/editor/PrintView';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import type { AppConfig, ClassInfo, LessonsData } from '../src/types';

test('le PDF applique le choix couleur et conserve les familles des badges dans les deux langues', () => {
  const lessons: LessonsData = [{ type: 'chapter', title: 'Chapitre 1', items: [
    { type: 'définition', title: 'Limite', date: '2026-10-01' },
    { type: 'théorème', title: 'Unicité', date: '2026-10-01' },
    { type: 'exercice', title: 'تطبيق', date: '2026-10-01' },
    { type: 'remarque', title: 'Repère', date: '2026-10-01' },
  ] }];
  const original = JSON.stringify(lessons);
  for (const locale of ['fr', 'ar'] as const) for (const colorContent of [false, true]) {
    const html = renderToStaticMarkup(React.createElement(LocaleProvider, { locale, children:
      React.createElement(PrintView, { lessonsData: lessons, classInfo: { id: 'A', name: 'Classe' } as ClassInfo,
        config: {} as AppConfig, contentDirection: locale === 'ar' ? 'rtl' : 'ltr', newlyAddedIds: [], colorContent, preview: true }) }));
    assert.ok(html.includes(`data-print-color="${colorContent ? 'color' : 'mono'}"`));
    for (const tone of ['blue', 'red', 'green', 'neutral']) assert.ok(html.includes(`data-content-tone="${tone}"`));
    assert.ok(html.includes('Limite') && html.includes('تطبيق'));
  }
  assert.equal(JSON.stringify(lessons), original);
});
