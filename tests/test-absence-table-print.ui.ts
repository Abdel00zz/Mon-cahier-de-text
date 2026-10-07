import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MainTable } from '../src/features/editor/MainTable';
import { PrintView } from '../src/features/editor/PrintView';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { buildLessonRows } from '../src/domain/notebook/lessonRows';
import { buildAbsenceSessions } from '../src/domain/notebook/absenceSessions';
import type { AppConfig, ClassInfo, LessonsData } from '../src/types';

const noop = () => {};
const classInfo = { id: 'A', name: 'Classe A', subject: 'Mathématiques', cycle: 'college' } as ClassInfo;
const config = { absences: [{ debut: '2026-09-14', fin: '2026-09-14', motif: 'Repos prescrit' }],
    timetable: [{ day: 1, slot: 0, classId: 'A' }] } as AppConfig;
const lessons: LessonsData = [{ type: 'chapter', title: 'Cours', items: [
    { type: 'exercice', title: 'Avant', date: '2026-09-07' },
    { type: 'exercice', title: 'Après', date: '2026-09-21' },
] }];
const sessions = buildAbsenceSessions(config, 'A', lessons);
const render = (child: React.ReactElement, locale: 'fr' | 'ar' = 'fr') => renderToStaticMarkup(
    React.createElement(LocaleProvider, { locale, children: child }));
const table = (data: LessonsData, locale: 'fr' | 'ar' = 'fr') => render(React.createElement(MainTable, {
    lessonsData: data, visibleRows: buildLessonRows(data), absenceSessions: sessions,
    onClearSearch: noop, contentDirection: locale === 'ar' ? 'rtl' : 'ltr',
    onOpenAddContentModal: noop, selectedKeys: new Set<string>(), onToggleSelect: noop,
    onOpenContentEditor: noop, newlyAddedIds: [],
}), locale);

test('editor renders the absence date and reason between sessions, without a course control', () => {
    const html = table(lessons);
    assert.ok(html.indexOf('Avant') < html.indexOf('data-absence-session="2026-09-14"'));
    assert.ok(html.indexOf('data-absence-session="2026-09-14"') < html.indexOf('Après'));
    const row = html.match(/data-absence-session="2026-09-14"[\s\S]*?Repos prescrit<\/div>/)?.[0] ?? '';
    assert.ok(row.includes('14/09/2026'));
    assert.ok(row.includes('Certificat de maladie'));
    assert.ok(row.includes('Repos prescrit'));
    assert.ok(!row.includes('editor-indent'));
    assert.ok(!row.includes('<button'));
});

test('paper uses the same independent chronological row, including absence-only jobs', () => {
    const html = render(React.createElement(PrintView, { lessonsData: lessons, classInfo, config,
        contentDirection: 'ltr', newlyAddedIds: [], preview: true }));
    assert.ok(html.indexOf('Avant') < html.indexOf('data-absence-session="2026-09-14"'));
    assert.ok(html.indexOf('data-absence-session="2026-09-14"') < html.indexOf('Après'));
    const row = html.split('data-absence-session="2026-09-14"')[1].split('</tr>')[0];
    assert.ok(row.includes('14/09/2026') && row.includes('Repos prescrit'));
    assert.ok(!row.includes('editor-indent'));
    const onlyAbsence = render(React.createElement(PrintView, { lessonsData: [], absenceSessions: sessions,
        classInfo, config, contentDirection: 'ltr', newlyAddedIds: [], preview: true }));
    assert.ok(onlyAbsence.includes('data-absence-session="2026-09-14"'));
    assert.ok(!onlyAbsence.includes('Aucun contenu à afficher'));
    const noAbsence = render(React.createElement(PrintView, { lessonsData: [], absenceSessions: [],
        classInfo, config, contentDirection: 'ltr', newlyAddedIds: [], preview: true }));
    assert.ok(!noAbsence.includes('data-absence-session'), 'explicit filtered scope does not restore every configured date');
});

test('empty and RTL editor tables still expose scheduled absence dates', () => {
    assert.ok(table([]).includes('data-absence-session="2026-09-14"'));
    const html = table([], 'ar');
    assert.ok(html.includes('شهادة مرضية'));
    assert.ok(html.includes('data-content-direction="rtl"'));
    assert.ok(html.includes('dir="ltr" class="whitespace-nowrap">14/09</bdi>'));
});


test('printing an absence from an untouched notebook does not print the starter placeholder', () => {
    const pristine: LessonsData = [{ type: 'evaluation_diagnostic', title: 'Évaluation diagnostique 1', sections: [] }];
    assert.ok(!table(pristine).includes('Évaluation diagnostique 1'));
    const html = render(React.createElement(PrintView, { lessonsData: pristine, classInfo, config,
        contentDirection: 'ltr', newlyAddedIds: [], preview: true }));
    assert.ok(html.includes('data-absence-session="2026-09-14"'));
    assert.ok(!html.includes('Évaluation diagnostique 1'));
});
