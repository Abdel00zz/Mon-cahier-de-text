import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { produce } from 'immer';
import type { AppConfig, ClassInfo, LessonsData } from '../types';
import { buildLessonRows, filterLessonRows, indicesKey } from '../utils/lessonRows';
import { buildContentDateOrder, dateOrderWarnings } from '../utils/dateOrder';
import { abbreviateClassName, scheduleClassLabel } from '../utils/classAbbreviation';
import { teachesSeveralSubjects, collectTeacherSubjects } from '../utils/subjectScope';
import { classCardLabelFor, classIdentityFor } from '../utils/classIdentity';
import { CLASS_LEVELS_BY_CYCLE } from '../constants/class-levels';
import { ClassCard } from '../features/dashboard/ClassCard';
import { dateTimeFormat, numberFormat } from '../utils/formatters';
import { buildContentNumbers } from '../utils/contentNumbering';
import { ContentRenderer } from '../features/editor/ContentRenderer';
import { contentBadgeClass } from '../constants/type-keys';
import { SUBJECTS } from '../constants/subjects';
import { SUBJECT_ABBREV_MAP } from '../constants/type-keys';
import { groupLessonRows } from '../utils/tableRows';
import { findItem, addItem, addSection } from '../utils/dataUtils';
import { prepareImportedLessons } from '../utils/importPipeline';
import { renderDescriptionWithBold } from '../utils/textFormat';
import { hasMathContent, hasMathSyntax, splitMathText } from '../utils/math';
import { listViewport, visibleRange } from '../utils/virtualGeometry';
import { MainTable } from '../features/editor/MainTable';
import { LocaleProvider } from '../i18n/LocaleProvider';
import { useNotificationFeed, type NotificationFeed } from '../hooks/useNotificationFeed';
import { hasOnlyPristineStarterDiagnostic, withStarterDiagnostic } from '../utils/starterDiagnostic';
import { validateSessionDate, toDisplayWarnings } from '../utils/dateValidation';
import { countExpectedSessions, countSchoolDaysBetween, isWeeklyRestDay, type HolidayCalendar } from '../utils/calendar';
import { collectClassSignals, dateActionId } from '../utils/notificationSignals';
import { SelectionBar } from '../features/editor/SelectionBar';
import { assignClassColors, classColorAttributes, isClassColor } from '../utils/classColors';
import { insertFreeContent } from '../utils/freeContent';
import { assertValidClasses, assertValidLessonsPayload } from '../api/_lib/validate';
import { filterLessonsByDates } from '../utils/printMeta';

test('couleurs : 120 classes distinctes, stables après tri, renommage et aller-retour serveur', () => {
  const source = Array.from({ length: 120 }, (_, i) => ({ ...dateClass, id: `class-${i}`, color: i < 3 ? 'sky' : '' }));
  const assigned = assignClassColors(source);
  assert.equal(new Set(assigned.map(c => c.color)).size, 120);
  assert.ok(assigned.every(c => isClassColor(c.color)));
  assert.deepEqual(assignClassColors([...source].reverse()).reverse(), assigned);
  const roundtrip = assignClassColors(assertValidClasses(JSON.parse(JSON.stringify(assigned))));
  assert.deepEqual(roundtrip.map(c => c.color), assigned.map(c => c.color));
  const renamed = assigned.slice(1).map(c => ({ ...c, name: 'Nouveau nom' }));
  assert.deepEqual(assignClassColors(renamed).map(c => c.color), renamed.map(c => c.color));
  const added = assignClassColors([...renamed, { ...dateClass, id: 'new', color: '' }]);
  assert.deepEqual(added.slice(0, -1), renamed);
  assert.equal(new Set(added.map(c => c.color)).size, added.length);
  assert.ok(classColorAttributes(assigned.find(c => c.color.startsWith('class-hue:'))!).style);
  assert.equal(isClassColor('url(javascript:alert(1))'), false);
  assert.ok(source.some(c => c.color === ''));
});

test('ligne libre : création vide, insertion imbriquée et aucune fusion ou numérotation', () => {
  let data = produce([] as LessonsData, draft => insertFreeContent(draft, undefined, {}, 'one'));
  data = produce(data, draft => insertFreeContent(draft, { chapterIndex: 0 }, {}, 'two'));
  assert.equal(data.length, 2);
  assert.ok(data.every(row => row.type === 'free' && row.title === '' && row.description === ''));
  assert.equal(groupLessonRows(buildLessonRows(data)).renderRows.length, 2);
  assert.equal(buildContentNumbers(data).size, 0);
  const tree: LessonsData = [{ type: 'chapter', title: 'Chapitre', sections: [{ name: 'Section', items: [{ type: 'exercice', title: 'Avant', description: '' }] }] }];
  const nested = produce(tree, draft => insertFreeContent(draft, { chapterIndex: 0, sectionIndex: 0, itemIndex: 0 }, { description: '$x^2$' }, 'nested'));
  assert.equal(nested[0].sections![0].items![1].type, 'free');
  assert.equal(tree[0].sections![0].items!.length, 1);
});

test('ligne libre : texte, LaTeX et retour au vide survivent à la synchronisation, import et filtre impression', () => {
  for (const description of ['', 'Texte du professeur\n\\(x^2 + \\frac{1}{2}\\)\nنص حر']) {
    const data: LessonsData = [{ type: 'free', title: '', description, date: '2026-09-21' }, { type: 'free', title: '', description: '' }];
    const before = JSON.stringify(data);
    const payload = assertValidLessonsPayload(JSON.parse(JSON.stringify([{ classId: 'test', lessonsData: data, contentDirection: 'rtl' }])), new Set(['test']));
    assert.deepEqual(payload[0].lessonsData, data);
    const imported = prepareImportedLessons(payload[0].lessonsData).lessonsData.filter(item => item.type === 'free');
    assert.equal(imported.length, 2);
    assert.equal(imported[0].description, description);
    assert.equal(imported[1].title, '');
    assert.equal(filterLessonsByDates(data, ['2026-09-21'])[0].description, description);
    assert.equal(JSON.stringify(data), before);
  }
});

test('ligne libre : repère écran seulement, contenu imprimé même si les descriptions sont masquées', () => {
  const render = (description: string, isPrint: boolean) => renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', children:
    React.createElement(ContentRenderer, { data: { type: 'free', title: '', description }, indices: { chapterIndex: 0 }, elementType: 'item', isPrint, showDescriptions: false }),
  }));
  assert.match(render('', false), /à remplir/);
  assert.doesNotMatch(render('', true), /à remplir|editor-kind-badge/);
  assert.match(render('Texte libre $x^2$', true), /Texte libre \$x\^2\$/);
  assert.match(render('', true), /editor-free-content/);
});

test('emploi du temps : abréviations compactes sans niveau dupliqué ni confusion de filière', () => {
  const label = (name: string) => scheduleClassLabel(classIdentityFor(name), 'fr', true);
  assert.equal(label('2ème Bac Sciences Physiques 3'), '2B·PC·3');
  assert.equal(label('Tronc Commun Scientifique 2'), 'TC·S·2');
  assert.equal(label('1er Bac Sciences Expérimentales 1'), '1B·SEXP·1');
  assert.equal(label('2ème Bac Sciences Économiques 1'), '2B·SECO·1');
});

const dateCalendar: HolidayCalendar = {
  version: 1, pays: 'MA', fuseau: 'Africa/Casablanca',
  anneeScolaire: { libelle: '2026-2027', debut: '2026-09-07', fin: '2027-07-03' },
  joursFeries: [], vacances: [],
};
const dateClass: ClassInfo = { id: 'sunday-test', name: '1AC 1', subject: 'Mathématiques', cycle: 'college', teacherName: '', createdAt: '2026-09-07', color: 'blue' };

test('dimanche : avertissement autonome, traduit, sans doublon horaire ; samedi ouvré', () => {
  for (const locale of ['fr', 'ar', 'en'] as const) {
    for (const slots of [[], [{ weekday: 1 }], [{ weekday: 0 }]]) {
      const warnings = validateSessionDate('2026-09-13', dateClass, { schedules: [{ classId: dateClass.id, slots }] }, locale, dateCalendar);
      assert.deepEqual(warnings.map(warning => warning.type), ['weekly-rest']);
      assert.ok(!warnings[0].message.includes('dateWarning.'));
      assert.deepEqual(toDisplayWarnings(warnings, '2026-09-13', '2026-09-21'), warnings);
    }
  }
  assert.equal(validateSessionDate('2026-09-12', dateClass, {}, 'fr', dateCalendar).length, 0);
  assert.equal(validateSessionDate('2026-09-14', dateClass, {}, 'fr', dateCalendar).length, 0);
  assert.equal(validateSessionDate('2026-02-31', dateClass, {}, 'fr', dateCalendar)[0].type, 'invalid');
  assert.equal(isWeeklyRestDay('2026-02-31'), false);
  assert.equal(isWeeklyRestDay(''), false);
});

test('dimanche : les alertes férié/absence restent distinctes, aucun jour déplacé', () => {
  const date = '2026-09-13';
  const config = { absences: [{ debut: date, fin: date, motif: 'Absence' }] };
  const cal = { ...dateCalendar, joursFeries: [{ date, nom: 'Férié test', type: 'national' as const }] };
  const before = JSON.stringify({ config, cal });
  const warnings = validateSessionDate(date, dateClass, config, 'fr', cal);
  assert.deepEqual(warnings.map(warning => warning.type), ['weekly-rest', 'holiday', 'absence']);
  assert.equal(JSON.stringify({ config, cal }), before);
});

test('dimanche : aucun retard fictif avec un ancien horaire dimanche, samedi conservé', () => {
  const slots = [{ weekday: 0 }, { weekday: 6 }];
  assert.equal(countExpectedSessions('2026-09-12', '2026-09-13', slots, dateCalendar), 1);
  assert.equal(countSchoolDaysBetween('2026-09-12', '2026-09-13', [0, 6], dateCalendar), 1);
});

test('dimanche : la même alerte alimente le cahier et les notifications, sans retard fictif', context => {
  context.mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-09-14T12:00:00Z') });
  const storage = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => storage.get(key) ?? null } });
  try {
    const date = '2026-09-13';
    const config = { schedules: [{ classId: dateClass.id, slots: [{ weekday: 0 }] }], notificationSettings: { enabled: true } } as unknown as AppConfig;
    storage.set(`classData_v1_${dateClass.id}`, JSON.stringify([{ type: 'chapter', title: 'Test', date }]));
    const warnings = validateSessionDate(date, dateClass, config);
    const id = dateActionId(dateClass.id, date, warnings);
    const signal = collectClassSignals(dateClass, config).find(item => item.id === id);
    assert.ok(signal);
    assert.match(signal.detail, /dimanche/);
    assert.equal(signal.date, date);
    assert.equal(signal.dismissible, true);
    storage.set('appConfig_v1', JSON.stringify({ notificationDismissals: { [dateClass.id]: [id] } }));
    assert.equal(collectClassSignals(dateClass, config).find(item => item.id === id)?.ignored, true);
    storage.delete(`classData_v1_${dateClass.id}`);
    assert.equal(collectClassSignals(dateClass, config).some(item => item.kind === 'missed-session'), false);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('barre de sélection : vide masquée, compteur accessible et mutations verrouillées pendant le calcul', () => {
  const noop = () => {};
  const props = { count: 2, hasDate: true, canAdd: true, canAssignDate: true, canEdit: true,
    onAdd: noop, onAssignDate: noop, onAssignToday: noop, onClearDate: noop, onEdit: noop, onDelete: noop, onClear: noop };
  const render = (overrides = {}) => renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', children:
    React.createElement(SelectionBar, { ...props, ...overrides }),
  }));
  assert.equal(render({ count: 0 }), '');
  const html = render({ isPending: true });
  assert.match(html, /role="toolbar"/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /aria-label="2 éléments sélectionnés"/);
  assert.equal((html.match(/<button\b/g) ?? []).length, 5);
  assert.equal((html.match(/disabled=""/g) ?? []).length, 4);
  assert.ok(!html.includes('overflow-x-auto'));
});

const fixture: LessonsData = [
  { type: 'chapter', title: 'Premier', items: [{ type: 'exercice', title: 'Autre' }] },
  { type: 'chapter', title: 'Deuxième', sections: [
    { name: 'A', items: [{ type: 'exercice', title: 'Ignoré' }] },
    { name: 'B', subsections: [{ name: 'Sous-section', items: [
      { type: 'exercice', title: 'Ignoré aussi' },
      { type: 'exercice', title: 'Cible', page: 42 },
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
  const settings = config.notificationSettings!;
  const disabled = capture({ ...config, notificationSettings: { ...settings, enabled: false } });
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
      contentDirection: 'ltr', onCellUpdate: noop, onOpenAddContentModal: noop,
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

test('séance fusionnée : les séparateurs de contenu et remarque partagent les mêmes rangées', () => {
  const data: LessonsData = [{ type: 'chapter', title: 'Cours', items: [
    { type: 'exercice', title: 'Première ligne', description: 'Description longue\nsur deux lignes', date: '2026-09-14', remark: 'Remarque A' },
    { type: 'exercice', title: 'Deuxième ligne', date: '2026-09-14', remark: 'Remarque B' },
  ] }];
  const rows = buildLessonRows(data);
  const noop = () => {};
  const html = renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', children:
    React.createElement(MainTable, { lessonsData: data, visibleRows: rows, onClearSearch: noop,
      contentDirection: 'ltr', onCellUpdate: noop, onOpenAddContentModal: noop,
      selectedKeys: new Set<string>(), onToggleSelect: noop, onOpenContentEditor: noop, newlyAddedIds: [],
      showDescriptions: true,
    }),
  }));
  const occurrences = (token: string) => html.split(token).length - 1;
  assert.equal(occurrences('data-session-group="true"'), 1);
  assert.equal(occurrences('data-session-cell="date"'), 1);
  assert.equal(occurrences('data-session-cell="content"'), 2);
  assert.equal(occurrences('data-session-cell="remark"'), 2);
  // Un trait sous chaque cellule de la première rangée, jamais dans la date fusionnée.
  assert.equal(occurrences('data-session-row-divider="true"'), 2);
  assert.match(html, /grid-row:1 \/ span 2/);
  assert.equal(html.includes('border-y'), false);
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

test('recherche : ancêtres et champs numériques gardent leur identité', () => {
  const rows = buildLessonRows(fixture);
  const result = filterLessonRows(rows, '42');
  assert.deepEqual(result.map(row => row.elementType), ['chapter', 'section', 'subsection', 'item']);
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

test('chargement MathJax : seuls les cahiers contenant réellement une formule attendent le moteur', () => {
  assert.equal(hasMathContent([{ type: 'chapter', title: 'Fonctions numériques' }]), false);
  assert.equal(hasMathContent([{ type: 'chapter', title: 'Fonctions', sections: [{ name: 'Limites', items: [
    { type: 'définition', title: 'Limite de $f(x)$', description: '' },
  ] }] }]), true);
  assert.equal(hasMathContent({ lessonsData: [{ type: 'exemple', description: String.raw`\[x^2+1\]` }] }), true);
});

test('math et listes : formule et texte restent ensemble dans la puce', () => {
  const source = '- Calculer $x^2$ puis **conclure**.\n1. Vérifier \\(a*b*c\\).';
  const html = renderToStaticMarkup(React.createElement('div', null, ...renderDescriptionWithBold(source)));
  assert.match(html, /flex-1">Calculer \$x\^2\$ puis <strong[^>]*>conclure<\/strong>\.<\/span>/);
  assert.ok(html.includes('\\(a*b*c\\)'));
  assert.ok(!html.includes('<em>'));
});

test('ordre chronologique : la date d un contenu ne recule pas devant la seance precedente', () => {
  const lessons: LessonsData = [{
    type: 'chapter',
    title: 'Suites',
    items: [
      { type: 'cours', title: 'Séance 1', date: '2026-02-12' },
      { type: 'cours', title: 'Séance 2', date: '2026-02-13' },
      { type: 'cours', title: 'Séance 3', date: '2026-02-12' },
    ],
  }];
  const order = buildContentDateOrder(lessons);
  const rows = buildLessonRows(lessons).filter(row => row.elementType === 'item');
  const third = order.get(rows[2].key);
  assert.equal(third?.previous, '2026-02-13');
  const warnings = dateOrderWarnings('2026-02-12', third, 'fr');
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].type, 'out-of-order');
  assert.ok(!warnings[0].message.includes('dateWarning.'));
  assert.match(warnings[0].message, /13 février 2026/);
  assert.equal(dateOrderWarnings('2026-02-13', third, 'fr').length, 0);
  assert.equal(dateOrderWarnings('2026-02-14', order.get(rows[1].key), 'fr').length, 1);
  assert.equal(dateOrderWarnings('2026-02-12', order.get(rows[0].key), 'fr').length, 0);
});

test('ordre chronologique : un contenu sans date ne rompt pas la chaine, un devoir en est exclu', () => {
  const lessons: LessonsData = [{
    type: 'chapter',
    title: 'Suites',
    items: [
      { type: 'cours', title: 'Séance 1', date: '2026-02-12' },
      { type: 'cours', title: 'Séance 2' },
      { type: 'devoir_maison', title: 'DM', date: '2026-02-20' },
      { type: 'cours', title: 'Séance 3', date: '2026-02-13' },
    ],
  }];
  const order = buildContentDateOrder(lessons);
  const rows = buildLessonRows(lessons).filter(row => row.elementType === 'item');
  assert.equal(order.has(rows[1].key), false);
  assert.equal(order.get(rows[2].key)?.previous, '2026-02-12');
  assert.equal(dateOrderWarnings('2026-02-13', order.get(rows[2].key), 'ar').length, 0);
  assert.equal(dateOrderWarnings('2026-02-10', order.get(rows[2].key), 'en').length, 1);
  assert.equal(dateOrderWarnings('2026-02-25', { following: '2026-02-20' }, 'en').length, 1);
  assert.equal(dateOrderWarnings('2026-02-11', undefined, 'fr').length, 0);
});

test('emploi du temps : le nom de classe est abrégé en niveau · filière · groupe', () => {
  assert.equal(abbreviateClassName('2Bacpc3', 'fr'), '2B·PC·3');
  assert.equal(abbreviateClassName('2ème Bac Sciences Physiques 3', 'fr'), '2B·PC·3');
  assert.equal(abbreviateClassName('2BSMA-A', 'fr'), '2B·SM-A');
  assert.equal(abbreviateClassName('2ème Bac Sciences Mathématiques A', 'fr'), '2B·SM-A');
  assert.equal(abbreviateClassName('1AC 1', 'fr'), '1AC·1');
  assert.equal(abbreviateClassName('3AC 2', 'fr'), '3AC·2');
  assert.equal(abbreviateClassName('Tronc Commun Scientifique', 'fr'), 'TC·S');
  assert.equal(abbreviateClassName('1ère Bac Sciences Expérimentales', 'fr'), '1B·SE');
  assert.equal(abbreviateClassName('2ème Bac Sciences Économiques 1', 'fr'), '2B·SE·1');
  assert.equal(abbreviateClassName('MPSI', 'fr'), 'MPSI');
  // Un nom libre n'est jamais perdu : il reste lisible tel quel.
  assert.equal(abbreviateClassName('Ma classe', 'fr'), 'Ma classe');
  assert.equal(abbreviateClassName('قسم الثالثة إعدادي 2', 'ar'), '3إ2');
});

test('emploi du temps : libellé riche sur une ligne (palier + filière + groupe)', () => {
  const label = (name: string, locale: 'fr' | 'ar') => scheduleClassLabel(classIdentityFor(name, locale), locale);
  assert.equal(label('2ème Bac Sciences Physiques 3', 'fr'), '2ème Bac PC 3');
  assert.equal(label('2ème Bac Sciences Mathématiques A 1', 'fr'), '2ème Bac SM-A 1');
  assert.equal(label('1AC 2', 'fr'), '1er Collège 2');
  // Le palier porte déjà « Tronc commun » : pas de redondance « TC-S ».
  assert.equal(label('Tronc Commun Scientifique', 'fr'), 'Tronc commun S');
  // Arabe : ordinal chiffré (« 2 باك ») et initiales à points de l'intitulé officiel
  // (article « ال » et conjonction « و » ignorés : علوم الحياة والأرض → ع.ح.ا).
  assert.equal(label('قسم الثانية باك علوم فيزيائية 3', 'ar'), '2 باك ع.ف 3');
  assert.equal(label('قسم الثانية باك علوم الحياة والأرض 1', 'ar'), '2 باك ع.ح.ا 1');
  assert.equal(label('قسم الثالثة إعدادي 2', 'ar'), '3 إع 2');
  // Nom libre : repli sur l'abréviation compacte, jamais vide.
  assert.equal(label('Ma classe', 'fr'), 'Ma classe');
});

test('libellés de matière : masqués tant que l enseignant n en a qu une', () => {
  const maths = { subject: 'Mathématiques' };
  // Une seule matière : la ligne répéterait la même chose dans toute la grille.
  assert.equal(teachesSeveralSubjects([maths, maths]), false);
  assert.equal(teachesSeveralSubjects([maths]), false);
  assert.equal(teachesSeveralSubjects([]), false);
  assert.equal(teachesSeveralSubjects([], 'Amina'), false);
  // La casse, les accents et les espaces ne créent pas une fausse deuxième matière.
  assert.equal(teachesSeveralSubjects([maths, { subject: ' mathematiques ' }]), false);
  // Dès deux matières réellement portées par les cahiers, les libellés reviennent.
  assert.equal(teachesSeveralSubjects([maths, { subject: 'Physique-Chimie' }]), true);
  assert.equal(teachesSeveralSubjects([maths, { subject: 'SVT' }]), true);
});

test('collectTeacherSubjects : périmètre de l enseignant, déduplication, tri', () => {
  const classes = [
    { subject: 'Physique-Chimie', teacherName: 'Amina Berrada' },
    { subject: 'Mathématiques', teacherName: 'Amina  BERRADA' },
    { subject: 'Mathématiques', teacherName: 'Amina Berrada' },
    { subject: 'SVT', teacherName: 'Youssef Alami' },
  ];
  // Même enseignant (espaces multiples et casse neutralisés) : deux matières.
  assert.deepEqual(collectTeacherSubjects(classes, 'Amina Berrada'), ['Mathématiques', 'Physique-Chimie']);
  assert.deepEqual(collectTeacherSubjects(classes, 'Youssef Alami'), ['SVT']);
  assert.equal(teachesSeveralSubjects(classes, 'Amina Berrada'), true);
  assert.equal(teachesSeveralSubjects(classes, 'Youssef Alami'), false);
  // Nom inconnu : repli sur toutes les classes, comme sur un appareil partagé.
  assert.deepEqual(collectTeacherSubjects(classes, 'Inconnu'), ['Mathématiques', 'Physique-Chimie', 'SVT']);
  // Sans nom, le périmètre reste l'ensemble des classes.
  assert.equal(collectTeacherSubjects(classes).length, 3);
  // Doublons (casse/accents) dédupliqués — la première graphie rencontrée est
  // retenue — et tri alphabétique stable.
  assert.deepEqual(collectTeacherSubjects([{ subject: 'svt' }, { subject: 'SVT' }, { subject: ' mathématiques ' }]), ['mathématiques', 'svt']);
});

test('codes matières courts : tout le vocabulaire a un sigle lisible', () => {
  for (const subject of SUBJECTS) assert.ok(SUBJECT_ABBREV_MAP[subject], subject);
  assert.equal(SUBJECT_ABBREV_MAP['Physique-Chimie'], 'PC');
  assert.ok(SUBJECT_ABBREV_MAP['Sciences de la Vie et de la Terre'].length <= 4);
  assert.ok(SUBJECT_ABBREV_MAP['Mathématiques'].length <= 6);
});

test('formateurs Intl : une seule instance partagee par locale et options', () => {
  // Le rendu d'un tableau de seances appelait Intl une fois par ligne ET par
  // rendu ; l'instance est desormais partagee (cout paye une seule fois).
  assert.equal(dateTimeFormat('fr', { day: 'numeric' }), dateTimeFormat('fr', { day: 'numeric' }));
  assert.notEqual(dateTimeFormat('fr'), dateTimeFormat('ar'));
  assert.equal(numberFormat('ar', { minimumIntegerDigits: 2 }).format(4), '04');
  assert.equal(
    dateTimeFormat('fr', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
      .format(new Date('2026-02-13T00:00:00Z')),
    '13/02/2026',
  );
});

test('retrait hierarchique : un cran par niveau, renforce en paysage tactile', () => {
  // Le runner s'execute depuis la racine du depot.
  const css = readFileSync('index.css', 'utf8');
  const renderer = readFileSync('features/editor/ContentRenderer.tsx', 'utf8');
  for (const level of ['1', '2', '3']) {
    assert.match(css, new RegExp('\\.editor-indent-' + level + ' \\{ margin-inline-start: var\\(--editor-indent-' + level + '\\)'));
  }
  assert.match(css, /editor-indent-rail \{ border-inline-start: 1px solid var\(--editor-indent-rail\)/);
  // Le portrait reste sobre, le paysage tactile creuse davantage.
  assert.match(css, /--editor-indent-3: 14px/);
  const landscape = css.slice(css.indexOf('(pointer: coarse) and (orientation: landscape)'));
  assert.match(landscape, /--editor-indent-1: 22px/);
  assert.match(landscape, /--editor-indent-3: 62px/);
  assert.match(landscape, /--editor-lesson-indent: 16px/);
  // Chaque niveau du plan porte son propre cran.
  assert.match(renderer, /editor-type-section editor-indent-1 editor-indent-rail/);
  assert.match(renderer, /editor-type-subsection editor-indent-2 editor-indent-rail/);
  assert.match(renderer, /editor-type-subsubsection editor-indent-3 editor-indent-rail/);
  // Les lignes de contenu s'alignent sur le même plan, sans filet.
  assert.match(renderer, /const lessonIndentClass = indices\.subsubsectionIndex !== undefined/);
  assert.match(renderer, /\$\{lessonIndentClass\}/);
  // Le papier partage exactement le meme plan, en millimetres.
  const print = readFileSync('features/editor/print.css', 'utf8');
  assert.match(print, /--editor-indent-1: 4mm/);
  assert.match(print, /--editor-indent-3: 12mm/);
  assert.match(print, /--editor-indent-rail: #D8CFBE/);
  assert.match(renderer, /print-lesson-item \$\{lessonIndentClass\}/);
  assert.match(renderer, /\$\{lessonIndentClass\}/);
});

test('numerotation des contenus : un compteur par type, remis a zero par chapitre', () => {
  const notebook: LessonsData = [
    {
      type: 'chapter', title: 'Chapitre 1', items: [
        { type: 'définition', title: 'Suite', description: '' },
        { type: 'définition', title: 'Limite', description: '' },
        { type: 'exemple', title: 'Calcul', description: '' },
        { type: 'devoir_maison', title: 'Devoir maison 1', description: '' },
        { type: 'définition', title: 'Continuité', description: '' },
      ],
    },
    {
      type: 'chapter', title: 'Chapitre 2', items: [
        { type: 'définition', title: 'Dérivée', description: '' },
        { type: 'définition', title: 'Primitive', description: '', number: '7' },
        { type: 'définition', title: 'Intégrale', description: '' },
      ],
    },
  ] as unknown as LessonsData;
  const numbers = buildContentNumbers(notebook);
  const values = [...numbers.values()];
  // Deux définitions du chapitre 1, puis l'exemple, puis la troisième définition ;
  // le compteur repart à 1 dans le chapitre 2 et le numéro saisi (7) avance le suivant.
  assert.deepEqual(values, ['1', '2', '1', '3', '1', '7', '8']);
  assert.equal(values.length, numbers.size);
  // L'évaluation ne consomme aucun numéro de contenu.
  assert.ok(!values.includes('Devoir'));
});

test('numerotation des contenus : desactivee, la carte reste vide', () => {
  const notebook = [{ type: 'chapter', title: 'C', items: [{ type: 'définition', title: 'D', description: '' }] }] as unknown as LessonsData;
  assert.equal(buildContentNumbers(notebook, false).size, 0);
  assert.equal(buildContentNumbers(notebook, true).size, 1);
});

test('pastilles de type : une forme commune, une famille de couleur par nature', () => {
  const shape = contentBadgeClass('théorème');
  assert.match(shape, /ring-1 ring-inset ring-current\/15/);
  assert.match(shape, /rounded-md/);
  // Théorème : famille rouge rosé ; deux types différents ne partagent pas
  // la même pastille, mais partagent exactement la même forme.
  assert.equal(contentBadgeClass('théorème').includes('#fce8e6'), true);
  assert.equal(contentBadgeClass('exemple').includes('#e6f4ea'), true);
  assert.equal(shape.replace(/bg-\[[^\]]+\]|text-\[[^\]]+\]|dark:[^ ]+/g, ''), contentBadgeClass('exemple').replace(/bg-\[[^\]]+\]|text-\[[^\]]+\]|dark:[^ ]+/g, ''));
  // Type inconnu : repli neutre, jamais de pastille vide.
  assert.equal(contentBadgeClass('inconnu'), contentBadgeClass());
  assert.equal(contentBadgeClass(undefined).includes('bg-muted'), true);
});

test('numerotation : la pastille porte le numero calcule, la saisie reste maitresse', () => {
  const notebook = [
    {
      type: 'chapter', title: 'Chapitre 1', sections: [
        { name: 'Section A', items: [
          { type: 'définition', title: 'Premiere definition', description: '' },
          { type: 'définition', title: 'Deuxieme definition', description: '' },
          { type: 'proposition', title: 'Une proposition', description: '' },
          { type: 'activité', title: 'Activite decouverte', description: '' },
          { type: 'exercice', title: 'Exercice', description: '', number: '7' },
          { type: 'devoir_maison', title: 'Devoir maison 1', description: '' },
        ] },
      ],
    },
  ] as unknown as LessonsData;
  const numbers = buildContentNumbers(notebook);
  const rows = buildLessonRows(notebook).filter(row => row.elementType === 'item');
  const renderFor = (index: number) => renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', children:
    React.createElement(ContentRenderer as never, {
      data: rows[index].data,
      indices: rows[index].indices,
      elementType: 'item',
      contentNumber: numbers.get(indicesKey(rows[index].indices)),
    } as never),
  }));
  // La pastille rend le sigle ET le numero, sur la meme ligne.
  assert.match(renderFor(0), /editor-kind-badge[\s\S]*?>DÉF<[\s\S]*?>1</);
  assert.match(renderFor(1), />2</);
  // Un compteur par type : la proposition repart a 1.
  assert.match(renderFor(2), /PROP[\s\S]*?>1</);
  // Activite et exercice sont numerotes comme le reste du manuel.
  assert.match(renderFor(3), /ACT[\s\S]*?>1</);
  // Un numero saisi a la main s'affiche meme sans entree dans la carte.
  assert.equal(numbers.get(indicesKey(rows[4].indices)), '7');
  assert.match(renderFor(4), /editor-kind-badge[\s\S]*?>7</);
});

test('numerotation : une evaluation garde son numero dans son titre, sans pastille', () => {
  const devoir = { type: 'devoir_maison', title: 'Devoir maison 1', description: '' };
  const rows = buildLessonRows([{ type: 'chapter', title: 'C', items: [devoir] }] as unknown as LessonsData);
  const numbers = buildContentNumbers([{ type: 'chapter', title: 'C', items: [devoir] }] as unknown as LessonsData);
  assert.equal(numbers.size, 0);
  const html = renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', children:
    React.createElement(ContentRenderer as never, { data: rows[1].data, indices: rows[1].indices, elementType: 'devoir_maison' } as never),
  }));
  assert.ok(!html.includes('editor-kind-badge'));
});

test('identite de classe : palier et filiere deduits du nom, sans jamais rien perdre', () => {
  const physics = classIdentityFor('2ème Bac Sciences Physiques 3', 'fr');
  assert.equal(physics.tierLabel, '2ème Bac');
  assert.equal(physics.stream, 'Sciences Physiques');
  assert.equal(physics.streamFullName, 'Sciences Physiques');
  assert.equal(physics.group, '3');

  assert.equal(classIdentityFor('Tronc Commun Scientifique', 'fr').tierLabel, 'Tronc commun');
  assert.equal(classIdentityFor('Tronc Commun Scientifique', 'fr').stream, 'Scientifique');
  assert.equal(classIdentityFor('1er Bac Sciences Expérimentales', 'fr').stream, 'Sciences Expérimentales');
  assert.equal(classIdentityFor('2ème Bac Sciences Mathématiques A', 'fr').stream, 'Sciences Mathématiques A');
  assert.equal(classIdentityFor('2ème Bac Sciences de la Vie et de la Terre Groupe 2', 'fr').stream, 'Sciences de la Vie et de la Terre');
  assert.equal(classIdentityFor('2ème Bac Sciences de la Vie et de la Terre Groupe 2', 'fr').group, '2');
  assert.equal(classIdentityFor('1er Bac Lettres et Sciences Humaines', 'fr').stream, 'Lettres et Sciences Humaines');

  // Collège et prépa : aucun badge, l'intitulé d'origine reste affiché.
  assert.equal(classIdentityFor('1AC', 'fr').tierLabel, null);
  assert.equal(classIdentityFor('1AC', 'fr').stream, null);
  assert.equal(classIdentityFor('1re année MPSI', 'fr').tierLabel, null);
  // Le groupe reste extrait, même quand il n'y a pas de badge.
  assert.equal(classIdentityFor('3AC 2', 'fr').group, '2');

  // Noms compactes : même décomposition que l'emploi du temps.
  assert.equal(classIdentityFor('2Bacpc3', 'fr').stream, 'Sciences Physiques');
  assert.equal(classIdentityFor('2Bacpc3', 'fr').group, '3');
  assert.equal(classIdentityFor('2BSMA-A', 'fr').stream, 'Sciences Mathématiques A');

  // Localisation : le badge suit la langue de l'interface, meme quand le nom
  // enregistre est l'intitule officiel francais.
  assert.equal(classIdentityFor('2ème Bac Sciences Physiques', 'ar').tierLabel, 'الثانية بكالوريا');
  assert.equal(classIdentityFor('2ème Bac Sciences Physiques', 'ar').stream, 'علوم فيزيائية');
  assert.equal(classIdentityFor('Tronc Commun Scientifique', 'ar').stream, 'العلمي');
  assert.equal(classIdentityFor('2ème Bac Sciences Physiques', 'en').tierLabel, '2nd Bac');
  assert.equal(classIdentityFor('قسم الثالثة إعدادي 2', 'ar').tierLabel, 'الثالثة إعدادي');

  // Tout niveau du lycée porte un badge et une filière ; le collège et la
  // prépa gardent leur affichage habituel, sans badge inventé.
  for (const level of CLASS_LEVELS_BY_CYCLE.lycee) {
    const identity = classIdentityFor(level, 'fr');
    assert.ok(identity.tierLabel, level);
    assert.ok(identity.stream, level);
  }
  for (const level of [...CLASS_LEVELS_BY_CYCLE.college, ...CLASS_LEVELS_BY_CYCLE.prepa]) {
    assert.equal(classIdentityFor(level, 'fr').tierLabel, null, level);
  }

  // Nom libre : aucun badge invente, et le nom reste intact.
  const free = classIdentityFor('Ma classe', 'fr');
  assert.equal(free.tierLabel, null);
  assert.equal(free.full, 'Ma classe');
});

test('carte de classe : palier et filiere dans le titre, numero de groupe a part', () => {
  const html = renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', children:
    React.createElement(ClassCard as never, {
      classInfo: { id: 'c1', name: '2ème Bac Sciences Physiques 3', subject: 'Physique-Chimie' },
      onSelect: () => {},
      onConfigure: () => {},
    } as never),
  }));
  // La carte n'affiche plus de pastille de palier : le titre porte le niveau,
  // la filière ET le tout reste aligné quelle que soit la longueur du libellé.
  assert.ok(!html.includes('data-level-badge'));
  assert.ok(html.includes('2ème Bac'));
  assert.ok(html.includes('Sciences Physiques'));
  assert.ok(html.includes('keep-group-watermark'));
  // Le nom officiel reste annonce : aucune information n'est perdue a l'ecran.
  assert.ok(html.includes('2ème Bac Sciences Physiques 3'));
});

test('carte de classe : college et prepa gardent leur nom, avec le groupe separe une fois', () => {
  const render = (name: string) => renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', children:
    React.createElement(ClassCard as never, {
      classInfo: { id: 'c2', name },
      onSelect: () => {},
      onConfigure: () => {},
    } as never),
  }));
  for (const name of ['1AC 1', '3AC', '1re année MPSI']) {
    const html = render(name);
    assert.ok(!html.includes('data-level-badge'), name);
    assert.equal(html.includes('keep-group-watermark'), name === '1AC 1', name);
  }
});

test('noms de cartes : niveau, filiere et groupe apparaissent chacun une seule fois', () => {
  const cases = [
    ['1er Bac 3', 'fr', { tier: null, title: '1er Bac', group: '3', fullName: '1er Bac 3' }],
    ['Tronc Commun Scientifique 2', 'ar', { tier: 'الجذع المشترك', title: 'العلمي', group: '2', fullName: 'الجذع المشترك العلمي 2' }],
    ['Tronc Commun Scientifique 2', 'en', { tier: 'Common Core', title: 'Science', group: '2', fullName: 'Common Core Science 2' }],
    ['2ème Bac Sciences Physiques Sciences Physiques 3', 'fr', { tier: '2ème Bac', title: 'Sciences Physiques', group: '3', fullName: '2ème Bac Sciences Physiques 3' }],
    ['1AC1', 'fr', { tier: null, title: '1ère Année Collégiale', group: '1', fullName: '1ère Année Collégiale 1' }],
    ['Ma classe', 'fr', { tier: null, title: 'Ma classe', group: null, fullName: 'Ma classe' }],
  ] as const;
  for (const [name, locale, expected] of cases) {
    assert.deepEqual(classCardLabelFor(classIdentityFor(name, locale), locale), expected, name);
  }
  assert.equal(classCardLabelFor(classIdentityFor('قسم الجذع المشترك العلمي ٢', 'ar'), 'ar').fullName, 'الجذع المشترك العلمي ٢');
  assert.equal(classIdentityFor('TCS2', 'fr').stream, 'Scientifique');
  assert.equal(classIdentityFor('2ème Bac Sciences Mathématiques A 2').stream, 'Sciences Mathématiques A');
  assert.equal(classIdentityFor('2ème Bac Sciences Physiques Sciences Physiques BIOF 3').stream, 'Sciences Physiques BIOF');
  assert.equal(classIdentityFor('2ème Bac Sciences Physiques Option 12 bilingue').stream, 'Sciences Physiques Option 12 bilingue');
  assert.equal(classIdentityFor('2ème Bac Sciences Physiques groupe A').stream, 'Sciences Physiques');
});

test('titres accessibles : un seul nom par titre, sans perdre le groupe', () => {
  for (const name of ['1er Bac 3', '2ème Bac Sciences Physiques Sciences Physiques 3', '1AC1']) {
    const html = renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', children:
      React.createElement(ClassCard as never, { classInfo: { id: 'unique-title', name }, onSelect: () => {}, onConfigure: () => {} } as never),
    }));
    const heading = html.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/)?.[1] ?? '';
    assert.equal((heading.match(/class="sr-only"/g) ?? []).length, 1, name);
    assert.ok(!heading.includes('Sciences Physiques Sciences Physiques'), name);
    const label = classCardLabelFor(classIdentityFor(name, 'fr'), 'fr');
    assert.ok(html.includes(`aria-label="Ouvrir ${label.fullName}"`), name);
    assert.ok(!label.title.endsWith(` ${label.group}`), name);
  }
});
