import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { produce } from 'immer';
import type { AppConfig, ClassInfo, LessonsData } from '../types';
import { buildLessonRows, filterLessonRows } from '../utils/lessonRows';
import { groupLessonRows } from '../utils/tableRows';
import { findItem, addItem, addSection } from '../utils/dataUtils';
import { prepareImportedLessons } from '../utils/importPipeline';
import { renderDescriptionWithBold } from '../utils/textFormat';
import { hasMathSyntax, splitMathText } from '../utils/math';
import { listViewport, visibleRange } from '../utils/virtualGeometry';
import { MainTable } from '../features/editor/MainTable';
import { LocaleProvider } from '../i18n/LocaleProvider';
import { useNotificationFeed, type NotificationFeed } from '../hooks/useNotificationFeed';
import { hasOnlyPristineStarterDiagnostic, withStarterDiagnostic } from '../utils/starterDiagnostic';

const fixture: LessonsData = [
  { type: 'chapter', title: 'Premier', items: [{ type: 'exercice', title: 'Autre' }] },
  { type: 'chapter', title: 'Deuxième', sections: [
    { name: 'A', items: [{ type: 'exercice', title: 'Ignoré' }] },
    { name: 'B', subsections: [{ name: 'Sous-section', items: [
      { type: 'exercice', title: 'Ignoré aussi' },
      { type: 'exercice', title: 'Cible', page: 42, separatorAfter: { content: 'Fin cible', date: '' } },
    ] }] },
  ] },
];

test('diagnostic initial : création et import commencent exactement une fois par le type dédié', () => {
  const manual = withStarterDiagnostic([{ type: 'chapter', title: 'Chapitre 1' }], 'fr');
  assert.equal(manual[0].type, 'evaluation_diagnostic');
  assert.equal(manual[0].title, 'Évaluation diagnostique 1');
  assert.equal(manual[1].title, 'Chapitre 1');

  const imported = withStarterDiagnostic([
    { type: 'chapter', title: 'Chapitre 1' },
    { type: 'evaluation_diagnostic', title: 'Ancien titre', date: '2026-09-08' },
    { type: 'chapter', title: 'Chapitre 2' },
  ], 'fr');
  assert.equal(imported[0].type, 'evaluation_diagnostic');
  assert.equal(imported[0].title, 'Évaluation diagnostique 1');
  assert.equal(imported[0].date, '2026-09-08');
  assert.equal(imported.filter(item => item.type === 'evaluation_diagnostic').length, 1);
  assert.equal(withStarterDiagnostic(imported, 'fr'), imported);
  assert.equal(hasOnlyPristineStarterDiagnostic([manual[0]]), true);
  assert.equal(hasOnlyPristineStarterDiagnostic([{ ...manual[0], date: '2026-09-08' }]), false);
});

test('pilotage : les alertes horaires quittent les cartes de classe et se résolvent avec les créneaux', () => {
  const classes: ClassInfo[] = [{ id: 'schedule-test', name: 'Classe test', subject: 'Test', cycle: 'lycee', teacherName: 'Test', createdAt: '2026-09-01', color: 'blue' }];
  const capture = (config: AppConfig) => {
    let result: NotificationFeed | undefined;
    function Probe() { result = useNotificationFeed(classes, config, 'fr'); return null; }
    renderToStaticMarkup(React.createElement(Probe));
    return result!;
  };
  const config = { timetable: [], notificationSettings: { enabled: true } } as unknown as AppConfig;
  const feed = capture(config);
  assert.equal(feed.corrections.some(signal => signal.kind === 'schedule'), false);
  const schedule = feed.insights.filter(signal => signal.kind === 'schedule');
  assert.equal(schedule.length, 1);
  assert.equal(schedule[0].action, 'timetable');
  assert.equal(schedule[0].classId, classes[0].id);
  const resolved = capture({ ...config, timetable: [{ classId: classes[0].id, day: 1, slot: 0 }] });
  assert.equal(resolved.insights.some(signal => signal.kind === 'schedule'), false);
  const disabled = capture({ ...config, notificationSettings: { ...config.notificationSettings, enabled: false } });
  assert.equal(disabled.insights.length, 0);
});

test('évaluations identiques : un titre commun et toutes les dates reliées par et', () => {
  const data: LessonsData = ['2026-09-14', '2026-09-16', '2026-10-01'].map(date => ({
    type: 'evaluation_diagnostic', title: 'Évaluation diagnostique 1', date,
  }));
  const rows = buildLessonRows(data);
  const grouped = groupLessonRows(rows).renderRows;
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].kind, 'session');
  const noop = () => {};
  const html = renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', children:
    React.createElement(MainTable, { lessonsData: data, visibleRows: rows, onClearSearch: noop,
      contentDirection: 'ltr', onCellUpdate: noop, onDeleteSeparator: noop, onOpenAddContentModal: noop,
      selectedKeys: new Set<string>(), onToggleSelect: noop, onOpenContentEditor: noop, newlyAddedIds: [],
    }),
  }));
  assert.equal(html.split('Évaluation diagnostique 1').length - 1, 1);
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(text, /14\/09/);
  assert.match(text, /16\/09/);
  assert.match(text, /01\/10/);
  assert.equal(/\b26\b/.test(text), false);
  assert.equal(text.includes('2026'), false);
  assert.equal(text.split(' et ').length - 1, 2);
  assert.equal(data.length, 3);
});

test('fusion : même date, dates inversées, absence de date et contenus distincts', () => {
  const entry = { type: 'evaluation_diagnostic' as const, title: 'Évaluation diagnostique 1' };
  for (const dates of [['2026-09-16', '2026-09-14'], ['2026-09-14', '2026-09-14'], ['', '']]) {
    const rows = groupLessonRows(buildLessonRows(dates.map(date => ({ ...entry, date }))));
    assert.equal(rows.renderRows.length, 1);
    assert.equal(rows.flatData[0].dateMerge?.mergeType, 'content');
  }
  for (const second of [{ title: 'Évaluation diagnostique 2' }, { description: 'Autre contenu' }, { date: '' }]) {
    const data = [{ ...entry, date: '2026-09-14' }, { ...entry, date: '2026-09-16', ...second }];
    assert.equal(groupLessonRows(buildLessonRows(data)).renderRows.length, 2);
  }
  const preceded: LessonsData = [
    { type: 'chapter', title: 'Chapitre précédent', date: '2026-09-14' },
    { ...entry, date: '2026-09-14' },
    { ...entry, date: '2026-09-16' },
  ];
  const grouped = groupLessonRows(buildLessonRows(preceded));
  assert.equal(grouped.renderRows.length, 2);
  assert.equal(grouped.flatData[1].dateMerge?.mergeType, 'content');
});

test('recherche : modifier, dater et insérer après le résultat conserve le chemin source', () => {
  const filtered = filterLessonRows(buildLessonRows(fixture), 'Cible');
  const row = filtered.find(row => row.elementType === 'item')!;
  assert.deepEqual(row.indices, { chapterIndex: 1, sectionIndex: 1, subsectionIndex: 0, itemIndex: 1 });
  assert.equal(findItem(fixture, row.indices).item, row.data);
  const updated = produce(fixture, draft => {
    const target = findItem(draft, row.indices).item!;
    target.date = '2026-09-05';
    (target as { title: string }).title = 'Modifié';
    const { itemIndex, ...parent } = row.indices;
    addItem(draft, parent, { type: 'exercice', title: 'Nouveau' }, itemIndex);
  });
  assert.equal((findItem(updated, row.indices).item as { title: string }).title, 'Modifié');
  assert.equal(updated[0].items![0].title, 'Autre');
  assert.equal(updated[1].sections![1].subsections![0].items![2].title, 'Nouveau');
  assert.equal(fixture[1].sections![1].subsections![0].items![1].title, 'Cible');
});

test('recherche : ancêtres, champs numériques et séparateurs gardent leur identité', () => {
  const rows = buildLessonRows(fixture);
  const result = filterLessonRows(rows, '42');
  assert.deepEqual(result.map(row => row.elementType), ['chapter', 'section', 'subsection', 'item']);
  const separator = filterLessonRows(rows, 'Fin cible').at(-1)!;
  assert.equal(findItem(fixture, separator.indices).item, separator.data);
  assert.equal(filterLessonRows(rows, 'absent').length, 0);
  assert.equal(filterLessonRows(rows, '  '), rows);
});

test('import : ajouter dans une section sans items et dans un chapitre sans sections', () => {
  const imported = prepareImportedLessons([{ type: 'chapter', title: 'Import', sections: [{ name: 'Vide' }] }]).lessonsData;
  const updated = produce(imported, draft => addItem(draft, { chapterIndex: 0, sectionIndex: 0 }, { type: 'exercice', title: 'Ajout' }));
  assert.equal(updated[0].sections![0].items![0].title, 'Ajout');
  const chapter = produce<LessonsData>([{ type: 'chapter', title: 'Minimal' }], draft => addSection(draft, { chapterIndex: 0 }, { name: 'Section' }));
  assert.equal(chapter[0].sections![0].name, 'Section');
});

test('regroupement : une recherche ne fusionne pas deux séances séparées dans la source', () => {
  const data: LessonsData = [{ type: 'chapter', title: 'Cours', items: [
    { type: 'exercice', title: 'Cible 1', date: '2026-09-05' },
    { type: 'exercice', title: 'Masqué', date: '2026-09-06' },
    { type: 'exercice', title: 'Cible 2', date: '2026-09-05' },
  ] }];
  const { renderRows } = groupLessonRows(filterLessonRows(buildLessonRows(data), 'Cible'));
  assert.ok(renderRows.every(row => row.kind === 'single'));
});

test('regroupement : même date, remarques distinctes et grandes séances bornées', () => {
  const data: LessonsData = [{ type: 'chapter', title: 'Long', items: Array.from({ length: 1000 }, (_, i) => ({ type: 'exercice', title: `Ex ${i}`, date: '2026-09-05', remark: i === 1 ? 'Différente' : '' })) }];
  const rows = buildLessonRows(data);
  const { renderRows } = groupLessonRows(rows);
  assert.equal(renderRows.reduce((n, row) => n + (row.kind === 'single' ? 1 : row.items.length), 0), 1001);
  assert.ok(renderRows.every(row => row.kind === 'single' || row.items.length <= 24));
  assert.equal((renderRows[1] as { items: { dateMerge?: { shouldMergeRemark?: boolean } }[] }).items[0].dateMerge?.shouldMergeRemark, false);
  assert.equal('dateMerge' in rows[1], false);
});

test('virtualisation : la fenêtre reste bornée après 600 000 pixels de défilement', () => {
  const offsets = Array.from({ length: 10001 }, (_, i) => i * 72);
  for (const top of [0, -5000, -600000]) {
    const view = listViewport(top, 720000, 900);
    assert.ok(view.height <= 900);
    const range = visibleRange(offsets, view.top, view.height, 16);
    assert.ok(range.end - range.start + 1 <= 47);
  }
  assert.deepEqual(visibleRange([0], 0, 900, 16), { start: 0, end: -1 });
  assert.equal(listViewport(1200, 720000, 900).height, 0);
});

test('math : les cinq formes de délimiteurs sont reconnues et préservées', () => {
  for (const formula of ['$x*y*z$', '$$x*y*z$$', String.raw`\(x*y*z\)`, String.raw`\[x*y*z\]`, String.raw`\begin{aligned}x&=1\\y&=2\end{aligned}`]) {
    assert.equal(hasMathSyntax(formula), true);
    assert.deepEqual(splitMathText(formula), [{ text: formula, math: true }]);
    const html = renderToStaticMarkup(React.createElement('div', null, ...renderDescriptionWithBold(formula)));
    assert.ok(!html.includes('<em>'));
    assert.ok(!html.includes('\uE000'));
  }
  assert.equal(hasMathSyntax(String.raw`Prix : \$20`), false);
  assert.equal(hasMathSyntax('Texte simple'), false);
});

test('math et listes : formule et texte restent ensemble dans la puce', () => {
  const source = '- Calculer $x^2$ puis **conclure**.\n1. Vérifier \\(a*b*c\\).';
  const html = renderToStaticMarkup(React.createElement('div', null, ...renderDescriptionWithBold(source)));
  assert.match(html, /flex-1">Calculer \$x\^2\$ puis <strong[^>]*>conclure<\/strong>\.<\/span>/);
  assert.ok(html.includes('\\(a*b*c\\)'));
  assert.ok(!html.includes('<em>'));
});
