import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { produce } from 'immer';
import type { AppConfig, ClassInfo, LessonsData } from '../types';
import { buildLessonRows, filterLessonRows } from '../utils/lessonRows';
import { buildContentDateOrder, dateOrderWarnings } from '../utils/dateOrder';
import { abbreviateClassName } from '../utils/classAbbreviation';
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

test('séance fusionnée : les séparateurs de contenu et remarque partagent les mêmes rangées', () => {
  const data: LessonsData = [{ type: 'chapter', title: 'Cours', items: [
    { type: 'exercice', title: 'Première ligne', description: 'Description longue\nsur deux lignes', date: '2026-09-14', remark: 'Remarque A' },
    { type: 'exercice', title: 'Deuxième ligne', date: '2026-09-14', remark: 'Remarque B' },
  ] }];
  const rows = buildLessonRows(data);
  const noop = () => {};
  const html = renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', children:
    React.createElement(MainTable, { lessonsData: data, visibleRows: rows, onClearSearch: noop,
      contentDirection: 'ltr', onCellUpdate: noop, onDeleteSeparator: noop, onOpenAddContentModal: noop,
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

test('codes matières courts : tout le vocabulaire a un sigle lisible', () => {
  for (const subject of SUBJECTS) assert.ok(SUBJECT_ABBREV_MAP[subject], subject);
  assert.equal(SUBJECT_ABBREV_MAP['Physique-Chimie'], 'PC');
  assert.ok(SUBJECT_ABBREV_MAP['Sciences de la Vie et de la Terre'].length <= 4);
  assert.ok(SUBJECT_ABBREV_MAP['Mathématiques'].length <= 6);
});
