import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { produce } from 'immer';
import type { AppConfig, ClassInfo, LessonsData } from '../types';
import { buildLessonRows, filterLessonRows, indicesKey, resolveAddAfterTarget } from '../utils/lessonRows';
import { buildContentDateOrder, dateOrderWarnings } from '../utils/dateOrder';
import { abbreviateClassName, scheduleClassLabel } from '../utils/classAbbreviation';
import { teachesSeveralSubjects, collectTeacherSubjects, subjectKey } from '../utils/subjectScope';
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
import { detectTextDirection, textDirectionAttribute } from '../utils/textDirection';
import { titleDirection } from '../utils/contentDirection';
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
import { MultiDateCard } from '../features/editor/TableRow';
import { ContentFields } from '../features/editor/modals/ContentFields';
import { createContentDraft, contentDraftChanged } from '../utils/contentDraft';

test('dates arabes : chaque conjonction reste attachée à sa date avec une direction explicite', () => {
  for (const count of [1, 2, 3, 5, 24]) {
    const dates = Array.from({ length: count }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);
    for (const locale of ['ar', 'fr'] as const) {
      const html = renderToStaticMarkup(React.createElement(LocaleProvider, { locale, children:
        React.createElement(MultiDateCard, { dates: [...dates, dates[0], 'invalid'] }),
      }));
      assert.match(html, new RegExp(`^<div dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`));
      assert.equal((html.match(/data-date-token/g) ?? []).length, count);
      assert.equal((html.match(/<bdi dir="ltr"/g) ?? []).length, count);
      const conjunction = locale === 'ar' ? 'و' : 'et';
      assert.equal((html.match(new RegExp(`>${conjunction}</span><bdi`, 'g')) ?? []).length, count - 1);
      assert.equal((html.match(/shrink-0 items-baseline gap-0.5 whitespace-nowrap/g) ?? []).length, count);
    }
  }
});

test('formulaire commun : une ligne libre expose titre et contenu facultatifs en arabe et français', () => {
  for (const locale of ['ar', 'fr'] as const) {
    const html = renderToStaticMarkup(React.createElement(LocaleProvider, { locale, children:
      React.createElement(ContentFields, { value: { type: 'free', title: '', description: '' }, onChange: () => {}, contentDirection: locale === 'ar' ? 'rtl' : 'ltr' }),
    }));
    assert.equal((html.match(/<input /g) ?? []).length, 1);
    assert.equal((html.match(/<textarea/g) ?? []).length, 1);
    assert.doesNotMatch(html, /required=""|role="combobox"/);
    assert.match(html, /<label for="[^"]+-title"/);
    assert.match(html, /<label for="[^"]+-description"/);
  }
});

test('édition commune : le patch préserve dates, remarques et contenu imbriqué ; réinitialisation exacte', () => {
  const free = { type: 'free', title: 'Titre', description: '$x^2$', date: '2026-09-21', remark: 'Conserver', _tempId: 'stable' };
  const draft = createContentDraft(free);
  assert.deepEqual(Object.keys(draft), ['type', 'title', 'description']);
  assert.equal(contentDraftChanged(draft, draft), false);
  const modified = { ...draft, title: 'عنوان', description: '$x+1$' };
  assert.equal(contentDraftChanged(modified, draft), true);
  const saved = { ...free, ...modified };
  assert.equal(saved.date, free.date);
  assert.equal(saved.remark, free.remark);
  assert.equal(saved._tempId, free._tempId);
  assert.equal(createContentDraft(saved).title, 'عنوان');
  const blank = { ...draft, title: '', description: '' };
  assert.equal(contentDraftChanged(blank, draft), true);
  const section = { name: 'Section', items: [free] };
  const nameDraft = createContentDraft(section, true, 'name');
  assert.deepEqual(nameDraft, { name: 'Section' });
  assert.equal(contentDraftChanged({ name: 'Nouveau titre' }, nameDraft), true);
  assert.equal(contentDraftChanged(createContentDraft(section, true, 'name'), nameDraft), false);
  assert.deepEqual({ ...section, ...nameDraft }.items, [free]);
});

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
    const data: LessonsData = [{ type: 'free', title: 'عنوان $x^2$', description, date: '2026-09-21' }, { type: 'free', title: '', description: '' }];
    const before = JSON.stringify(data);
    const payload = assertValidLessonsPayload(JSON.parse(JSON.stringify([{ classId: 'test', lessonsData: data, contentDirection: 'rtl' }])), new Set(['test']));
    assert.deepEqual(payload[0].lessonsData, data);
    const imported = prepareImportedLessons(payload[0].lessonsData).lessonsData.filter(item => item.type === 'free');
    assert.equal(imported.length, 2);
    assert.equal(imported[0].description, description);
    assert.equal(imported[0].title, 'عنوان $x^2$');
    assert.equal(imported[1].title, '');
    assert.equal(filterLessonsByDates(data, ['2026-09-21'])[0].description, description);
    assert.equal(filterLessonsByDates(data, ['2026-09-21'])[0].title, 'عنوان $x^2$');
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

test('direction : c’est la langue du texte qui décide, bloc par bloc', () => {
  const tagWithClass = (html: string, className: string): string => {
    const match = html.match(new RegExp(`<[a-z]+[^>]*\\b${className}\\b[^>]*>`));
    assert.ok(match, `Balise ${className} absente du rendu`);
    return match[0];
  };
  const render = (data: Record<string, unknown>, elementType: 'item' | 'chapter' | 'section' = 'item') => renderToStaticMarkup(
    React.createElement(LocaleProvider, { locale: 'fr', children:
      React.createElement(ContentRenderer, { data, indices: { chapterIndex: 0 }, elementType, showDescriptions: true }),
    }),
  );

  // Arabe dès la première lettre : le titre et la description passent en RTL,
  // même dans un cahier latin.
  const arabic = render({ type: 'exercice', title: 'الاشتقاق والتقابل', description: 'نشتق الدالة على مجال' });
  assert.ok(tagWithClass(arabic, 'editor-type-item-title').includes('dir="rtl"'));
  assert.ok(tagWithClass(arabic, 'editor-type-description').includes('dir="rtl"'));

  // Latin : LTR, explicitement (le bloc ne dépend plus du parent).
  const latin = render({ type: 'exercice', title: 'Dérivation', description: 'Étudier la fonction' });
  assert.ok(tagWithClass(latin, 'editor-type-item-title').includes('dir="ltr"'));

  // Titre latin + description arabe : les deux blocs divergent.
  const mixed = render({ type: 'exercice', title: 'Dérivation', description: 'نشتق الدالة' });
  assert.ok(tagWithClass(mixed, 'editor-type-item-title').includes('dir="ltr"'));
  assert.ok(tagWithClass(mixed, 'editor-type-description').includes('dir="rtl"'));

  // Formule en tête : les lettres latines du LaTeX ne doivent pas imposer LTR.
  const mathFirst = render({ type: 'définition', title: '$f(x)=x^2$ الدالة المربعة' });
  assert.ok(tagWithClass(mathFirst, 'editor-type-item-title').includes('dir="rtl"'));

  // Chiffres et ponctuation seuls : aucune décision, la direction reste héritée.
  const numeric = render({ type: 'exercice', title: '12 + 3,5 = ?' });
  assert.equal(tagWithClass(numeric, 'editor-type-item-title').includes('dir='), false);

  // Titres de structure et ligne libre suivent la même règle.
  assert.ok(render({ type: 'chapter', title: 'الوحدة الأولى' }, 'chapter').includes('dir="rtl"'));
  assert.match(render({ type: 'section', name: 'الدوال العددية' }, 'section'), /dir="rtl"/);
  assert.ok(render({ type: 'free', title: '', description: 'ملاحظة الأستاذ' }).includes('dir="rtl"'));
});

test('direction : formules, chiffres arabes et texte vide ne tranchent jamais', () => {
  // Rien de décisif : l'appelant conserve la direction du cahier.
  for (const nothing of [undefined, null, '', '   ', '12 + 3,5 = ?', '١٢٣، ؟', '... (42) —', '$\\frac{1}{2}$', '$$\\lim_{x\\to a} f(x)$$', '\\(a+b\\)']) {
    assert.equal(detectTextDirection(nothing), null, `Aucune direction attendue pour ${JSON.stringify(nothing)}`);
  }
  // La première lettre décide, les chiffres qui la précèdent sont neutres.
  assert.equal(detectTextDirection('132 ملاحظة'), 'rtl');
  assert.equal(detectTextDirection('ملاحظة'), 'rtl');
  assert.equal(detectTextDirection('  Remarque'), 'ltr');
  assert.equal(detectTextDirection('12 exercices'), 'ltr');
  // Une formule en tête ne bascule pas la phrase en LTR.
  assert.equal(detectTextDirection('$x^2$ ملاحظة'), 'rtl');
  assert.equal(detectTextDirection('$$\\lim f$$ ملاحظة'), 'rtl');
  assert.equal(detectTextDirection('\\(a+b\\) ملاحظة'), 'rtl');
  assert.equal(detectTextDirection('مثال $x^2$'), 'rtl');
  // Multiligne : seule la première ligne porte du texte.
  assert.equal(detectTextDirection('\n\n الاشتقاق'), 'rtl');
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
      contentDirection: 'ltr', onOpenAddContentModal: noop,
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

test('fusion : dates distinctes oui, doublon de la même séance non', () => {
  const entry = { type: 'evaluation_diagnostic' as const, title: 'Évaluation diagnostique 1' };
  // Même contenu sur des séances distinctes (même dans le désordre) : une seule
  // rangée, une seule cellule qui réunit les deux dates.
  for (const dates of [['2026-09-16', '2026-09-14'], ['2026-09-14', '2026-09-16']]) {
    const rows = groupLessonRows(buildLessonRows(dates.map(date => ({ ...entry, date }))));
    assert.equal(rows.renderRows.length, 1);
    assert.equal(rows.flatData[0].dateMerge?.mergeType, 'content');
  }
  // Même contenu le même jour : la séance reste unique, mais les deux lignes
  // restent affichées — un doublon ne disparaît jamais de l'écran.
  const sameDay = groupLessonRows(buildLessonRows(['2026-09-14', '2026-09-14'].map(date => ({ ...entry, date }))));
  assert.equal(sameDay.renderRows.length, 1);
  assert.equal(sameDay.flatData[0].dateMerge?.mergeType, 'date');
  assert.equal(sameDay.flatData[0].dateMerge?.count, 2);
  // Sans date, il n'y a aucune séance à réunir : deux rangées distinctes.
  const undated = groupLessonRows(buildLessonRows([{ ...entry, date: '' }, { ...entry, date: '' }]));
  assert.equal(undated.renderRows.length, 2);
  assert.ok(undated.renderRows.every(row => row.kind === 'single'));
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

test('ajouter après : deux ou trois contenus fusionnés restent intacts avant le nouvel élément', () => {
  for (const count of [2, 3]) {
    const data: LessonsData = [{ type: 'chapter', title: 'Chapitre', sections: [{ name: 'Section', items: [
      ...Array.from({ length: count }, (_, i) => ({ type: 'exercice', title: 'Limites', description: '$x^2$', date: `2026-09-${14 + i}` })),
      { type: 'exercice', title: 'Suite', description: '' },
    ] }] }];
    const rows = buildLessonRows(data);
    const group = groupLessonRows(rows).renderRows.find(row => row.kind === 'session');
    assert.ok(group?.kind === 'session');
    assert.equal(group.items.length, count);
    const selection = new Set([...group.items].reverse().map(row => row.key));
    const anchor = resolveAddAfterTarget(rows, selection);
    assert.deepEqual(anchor, { chapterIndex: 0, sectionIndex: 0, itemIndex: count - 1 });
    const withExercise = produce(data, draft => addItem(draft,
      { chapterIndex: anchor!.chapterIndex, sectionIndex: anchor!.sectionIndex },
      { type: 'exercice', title: 'Nouvel exercice', description: '$x+1$' }, anchor!.itemIndex));
    assert.equal(withExercise[0].sections![0].items![count].title, 'Nouvel exercice');
    assert.equal(withExercise[0].sections![0].items![count + 1].title, 'Suite');
    const next = produce(data, draft => insertFreeContent(draft, anchor!, { description: 'Nouveau contenu' }, 'new'));
    const items = next[0].sections![0].items!;
    assert.deepEqual(items.slice(0, count), data[0].sections![0].items!.slice(0, count));
    const inserted = items[count];
    assert.ok('description' in inserted);
    assert.equal(inserted.description, 'Nouveau contenu');
    assert.equal(items[count + 1].title, 'Suite');
    const nextGroup = groupLessonRows(buildLessonRows(next)).renderRows.find(row => row.kind === 'session');
    assert.ok(nextGroup?.kind === 'session');
    assert.equal(nextGroup.items.length, count);
    assert.deepEqual(JSON.parse(JSON.stringify(next)), next);
    assert.equal(data[0].sections![0].items!.length, count + 1);
  }
});

test('ajouter après : ordre source numérique, recherche, sélection périmée et parents différents', () => {
  const data: LessonsData = [{ type: 'chapter', title: 'Chapitre', items:
    Array.from({ length: 12 }, (_, i) => ({ type: 'exercice', title: i === 10 ? 'Cible' : `Exercice ${i}`, description: '' })),
    sections: [{ name: 'Section', items: [{ type: 'exercice', title: 'Autre cible', description: '' }] }],
  }];
  const rows = buildLessonRows(data);
  const tenth = { chapterIndex: 0, itemIndex: 10 };
  const second = { chapterIndex: 0, itemIndex: 2 };
  const selection = new Set([indicesKey(tenth), indicesKey(second)]);
  assert.deepEqual(resolveAddAfterTarget(rows, selection), tenth);
  const filtered = filterLessonRows(rows, 'cible');
  assert.ok(!filtered.some(row => row.key === indicesKey(second)));
  // L'ancre utilise la projection complète même pendant une recherche.
  assert.deepEqual(resolveAddAfterTarget(rows, selection), tenth);
  const nested = { chapterIndex: 0, sectionIndex: 0, itemIndex: 0 };
  assert.deepEqual(resolveAddAfterTarget(rows, new Set([indicesKey(nested), ...selection])), nested);
  assert.deepEqual(resolveAddAfterTarget(rows, new Set([indicesKey(second)])), second);
  assert.equal(resolveAddAfterTarget(rows, new Set()), null);
  assert.equal(resolveAddAfterTarget(rows, new Set([...selection, '99||||'])), null);
});

test('ajouter après : séance à date commune et groupe fusionné au premier niveau', () => {
  for (const dates of [['2026-09-14', '2026-09-14'], ['2026-09-14', '2026-09-15']]) {
    const data: LessonsData = dates.map(date => ({ type: 'free', title: '', description: 'Contenu partagé', date }));
    const rows = buildLessonRows(data);
    assert.equal(groupLessonRows(rows).renderRows.length, 1);
    const anchor = resolveAddAfterTarget(rows, new Set([...rows].reverse().map(row => row.key)));
    const next = produce(data, draft => insertFreeContent(draft, anchor!, {}, 'after'));
    assert.deepEqual(next.slice(0, 2), data);
    assert.equal(next[2]._tempId, 'after');
  }
});

test('fusion : des lignes libres de textes différents restent toutes visibles', () => {
  // Régression : l'identité d'une ligne libre était calculée sur son titre
  // (toujours vide ici), donc toutes les lignes libres consécutives fusionnaient
  // en une seule et seules la première restait affichée dans le tableau.
  const different: LessonsData = [
    { type: 'free', title: '', description: 'Rappel : devoir à rendre', date: '2026-09-15' },
    { type: 'free', title: '', description: 'Révision générale', date: '2026-09-15' },
    { type: 'free', title: '', description: 'Séance annulée', date: '2026-09-15' },
  ];
  const distinct = groupLessonRows(buildLessonRows(different));
  assert.equal(distinct.renderRows.length, 1);
  assert.equal(distinct.flatData[0].dateMerge?.mergeType, 'date');
  assert.equal(distinct.flatData[0].dateMerge?.count, 3);

  // Le même rappel répété sur deux séances distinctes : une seule ligne, deux dates.
  const repeated: LessonsData = [
    { type: 'free', title: '', description: 'Rappel : devoir à rendre', date: '2026-09-15' },
    { type: 'free', title: '', description: 'Rappel : devoir à rendre', date: '2026-09-18' },
  ];
  const repeatedRows = groupLessonRows(buildLessonRows(repeated));
  assert.equal(repeatedRows.renderRows.length, 1);
  assert.equal(repeatedRows.flatData[0].dateMerge?.mergeType, 'content');

  // Deux lignes libres vides n'ont aucun texte à comparer : elles restent distinctes.
  const empty: LessonsData = [
    { type: 'free', title: '', description: '', date: '2026-09-15' },
    { type: 'free', title: '', description: '', date: '2026-09-15' },
  ];
  const emptyRows = groupLessonRows(buildLessonRows(empty));
  assert.equal(emptyRows.flatData[0].dateMerge?.count, 2);
  assert.equal(emptyRows.flatData[0].dateMerge?.mergeType, 'date');
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
      contentDirection: 'ltr', onOpenAddContentModal: noop,
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
  assert.match(html, /editor-item-body[^"]*">Calculer \$x\^2\$ puis <strong[^>]*>conclure<\/strong>\.<\/span>/);
  assert.ok(html.includes('\\(a*b*c\\)'));
  assert.ok(!html.includes('<em>'));
});

test('environnements : les listes LaTeX ne partent plus vers MathJax', () => {
  const source = String.raw`Consigne :
\begin{enumerate}
\item Identifier $n$ et $p$ puis reconnaître $X\sim\mathcal B(n,p)$.
\item Calculer les probabilités binomiales demandées.
\end{enumerate}`;

  // Une liste n'est pas une formule : MathJax répondait « Unknown environment ».
  assert.equal(hasMathSyntax(String.raw`\begin{enumerate}\item texte\end{enumerate}`), false);
  // Les formules à l'intérieur restent détectées (sinon plus rien ne serait typographié).
  assert.equal(hasMathSyntax(source), true);
  const parts = splitMathText(source);
  assert.equal(parts.filter(part => part.math).length, 3);
  assert.ok(parts.some(part => !part.math && part.text.includes('\\begin{enumerate}')));
  assert.ok(parts.some(part => !part.math && part.text.includes('Identifier')));

  // Et la liste est mise en page : chapeau, numéros, formules, aucun reste de LaTeX.
  const html = renderToStaticMarkup(React.createElement('div', null, ...renderDescriptionWithBold(source)));
  assert.match(html, /Consigne :/);
  assert.match(html, /1\./);
  assert.match(html, /2\./);
  assert.ok(html.includes(String.raw`X\sim\mathcal B(n,p)`));
  assert.ok(!html.includes('\\item'));
  assert.ok(!html.includes('\\begin{enumerate}'));

  // itemize → puces, description → terme en gras.
  const bullet = renderToStaticMarkup(React.createElement('div', null, ...renderDescriptionWithBold(String.raw`\begin{itemize}\item Un\item Deux\end{itemize}`)));
  assert.match(bullet, /•/);
  assert.ok(!bullet.includes('\\begin{itemize}'));
  const described = renderToStaticMarkup(React.createElement('div', null, ...renderDescriptionWithBold(String.raw`\begin{description}\item[Définition] Une fonction continue.\end{description}`)));
  assert.match(described, /<strong[^>]*>Définition<\/strong>/);

  // Un environnement mathématique garde son statut.
  assert.equal(hasMathSyntax(String.raw`\begin{aligned}x&=1\\y&=2\end{aligned}`), true);
  assert.equal(hasMathSyntax(String.raw`\begin{cases}x=1\\y=2\end{cases}`), true);
});

test('mise en page : les commandes LaTeX de document ne partent plus à MathJax', () => {
  const render = (text: string) => renderToStaticMarkup(React.createElement('div', null, ...renderDescriptionWithBold(text)));

  // Emphases : les marqueurs natifs du moteur.
  assert.match(render(String.raw`\textbf{Gras}`), /<strong[^>]*>Gras<\/strong>/);
  assert.match(render(String.raw`\textit{Italique}`), /<em[^>]*>Italique<\/em>/);
  assert.match(render(String.raw`\emph{Aussi}`), /<em[^>]*>Aussi<\/em>/);
  assert.match(render(String.raw`\underline{Souligné}`), /<u[^>]*>Souligné<\/u>/);
  assert.match(render(String.raw`\textbf{\emph{Les deux}}`), /<strong[^>]*>.*<em[^>]*>Les deux<\/em>/);

  // Liste sans environnement : « \item » orphelin reste une puce.
  assert.match(render(String.raw`\item Un\item Deux`), /•/);

  // Fins de ligne, paragraphes, espacements : plus aucun antislash imprimé.
  for (const source of [String.raw`a\\b`, String.raw`a\newline b`, String.raw`a\par b`, String.raw`a\bigskip b`, String.raw`a\vspace{2mm}b`]) {
    assert.ok(!render(source).includes('\\'), `Antislash résiduel pour ${source}`);
  }
  assert.equal(render(String.raw`\noindent Texte`).replace(/<[^>]+>/g, '').trim(), 'Texte');
  const centered = render(String.raw`\begin{center}Centré\end{center}`);
  assert.ok(centered.includes('Centré') && !centered.includes('\\begin'));

  // Échappements et symboles usuels d'un texte français.
  assert.ok(render(String.raw`50\% des élèves`).includes('50% des élèves'));
  assert.ok(render(String.raw`A \& B`).includes('A &amp; B')); // React échappe &
  assert.ok(render(String.raw`Suite\ldots{} fin`).includes('…'));

  // Dans une formule, RIEN n'est traduit : MathJax s'en charge lui-même.
  assert.ok(render(String.raw`$\textbf{v}$`).includes(String.raw`\textbf`));
  assert.ok(render(String.raw`$a\\b$`).includes(String.raw`a\\b`));
  assert.ok(render(String.raw`$\itshape{ABC}$`).includes(String.raw`\itshape`));

  // Macros de confort : déclarées côté MathJax (les tailles et emphases
  // \itshape, \itsize, \itesize n'existent pas dans MathJax — sonde du 23/09).
  const mathConfig = readFileSync('config/mathJax.ts', 'utf8');
  for (const macro of ['sout', 'itshape', 'itsize', 'itesize', 'ang', 'unit', 'abs', 'norme', 'vect']) {
    assert.match(mathConfig, new RegExp(`\\b${macro}:`), `Macro ${macro} absente`);
  }

  // Formules plus larges que leur colonne : c'est MathJax qui les coupe aux
  // endroits que TeX autorise (displayOverflow), plus aucune zone ne défile.
  assert.match(mathConfig, /displayOverflow:\s*'linebreak'/);
  const css = readFileSync('index.css', 'utf8');
  assert.ok(
    !/\.math-text mjx-container\[display="true"\][^}]*overflow-x/.test(css),
    'Aucun défilement horizontal sur les formules display'
  );
});

test('listes : items multi-lignes, imbrication et grandes formules', () => {
  const render = (text: string) => renderToStaticMarkup(React.createElement('div', null, ...renderDescriptionWithBold(text)));
  const contentSpans = (html: string) => html.match(/<span class="editor-item-body[^"]*">([\s\S]*?)<\/span>/g) ?? [];
  const firstSpan = (html: string): string => contentSpans(html)[0] ?? '';

  // 1. Un item s'étale sur plusieurs lignes SANS sortir de sa colonne de
  //    contenu : la suite reste alignée sous le texte, pas sous le numéro.
  const continued = render(String.raw`\begin{enumerate}\item Première ligne \\ Deuxième ligne.\item Second.\end{enumerate}`);
  const firstItem = firstSpan(continued);
  assert.ok(firstItem.includes('Première ligne'), 'Le début de l\'item manque');
  assert.ok(firstItem.includes('Deuxième ligne.'), 'La continuation est sortie de l\'item');
  // La zone de description ne défile JAMAIS : les formules trop larges sont
  // coupées par MathJax (displayOverflow: 'linebreak', vérifié plus bas).
  assert.ok(!continued.includes('overflow-x-auto'), 'Aucune barre de défilement dans la description');

  // 2. Une formule display au milieu d'un item garde SA ligne, dans l'item.
  const display = render(String.raw`\begin{enumerate}\item Soit :` + '\n' + String.raw`$$\int_0^1 x^2\,dx=\frac{1}{3}$$` + '\n' + String.raw`Puis conclure.\item Second.\end{enumerate}`);
  const displayItem = firstSpan(display);
  assert.match(displayItem, /Soit :[\s\S]*?\$\$[\s\S]*?\$\$[\s\S]*?Puis conclure\./);
  assert.ok(displayItem.includes('$$\\int_0^1'), 'La formule display doit rester dans l\'item');

  // 3. Imbrication : la sous-liste reste DANS son item parent (avant, le texte
  //    du premier sous-item était collé au parent et la liste était aplatie).
  const nested = render(String.raw`\begin{itemize}\item Point A\begin{enumerate}\item Détail 1\item Détail 2\end{enumerate}\item Point B\end{itemize}`);
  assert.ok(!nested.includes('Point A1.'), 'Le sous-item ne doit plus être collé au parent');
  assert.ok(nested.includes('Point A'), 'Le parent manque');
  assert.ok(nested.includes('Détail 1') && nested.includes('Détail 2'), 'Les sous-items manquent');
  assert.ok(nested.includes('Point B'), 'Le second item parent manque');
  assert.equal(contentSpans(nested).length, 4, 'Deux items parents + deux sous-items');
  // Le niveau imbriqué est LETTRÉ : des sous-questions se lisent a., b., c.
  assert.match(nested, /a\.[\s\S]*?Détail 1/);
  assert.match(nested, /b\.[\s\S]*?Détail 2/);

  // 4. Aucune ligne vide n'est nécessaire entre deux \item.
  const tight = render(String.raw`\begin{enumerate}\item Un\item Deux\item Trois\end{enumerate}`);
  assert.match(tight, /1\.[\s\S]*?Un[\s\S]*?2\.[\s\S]*?Deux[\s\S]*?3\.[\s\S]*?Trois/);

  // 5. Les puces tapées à la main absorbent aussi leurs suites (Markdown/LaTeX).
  const plain = render('- point un\nSuite du point\n- point deux');
  const plainItems = contentSpans(plain);
  assert.equal(plainItems.length, 2);
  assert.ok(plainItems[0].includes('Suite du point'), 'La continuation manuelle doit rester dans la puce');

  // 6. Tolérance : une fermeture orpheline ne coupe plus la lecture du texte.
  const orphan = render(String.raw`Avant\end{quote}Après`);
  assert.ok(orphan.includes('Après'), 'La fermeture orpheline ne doit rien faire disparaître');

  // 7. Liste imbriquée sans « \item » porteur (LaTeX invalide) : l'item
  //    manquant est créé, le contenu n'est jamais perdu.
  const headless = render(String.raw`\begin{itemize}\begin{enumerate}\item Orphelin\end{enumerate}\end{itemize}`);
  assert.ok(headless.includes('Orphelin'), 'Le contenu d\'une liste sans porteur doit être conservé');
  assert.equal(contentSpans(headless).length, 2, 'Item porteur créé + sous-item');

  // 8. Alignement : UNE grille par liste — la colonne des marqueurs se règle
  //    sur le plus large d'entre eux, donc tous les textes démarrent sur la
  //    même verticale (« 10. » ne décale pas son texte par rapport à « 1. »).
  const listGrids = (html: string) => html.match(/class="editor-list[^"]*"/g) ?? [];
  assert.equal(listGrids(continued).length, 1, 'Une seule grille pour toute la liste');
  assert.match(continued, /class="editor-item-marker"/);
  const nestedGrids = listGrids(nested);
  assert.equal(nestedGrids.length, 2, 'La sous-liste a sa propre grille');
  const described = render(String.raw`\begin{description}\item[Co] A\item[Beaucoup plus longue] B\end{description}`);
  assert.equal(listGrids(described).length, 1, 'Les libellés partagent la même grille');
  assert.match(described, /<strong[^>]*>Beaucoup plus longue<\/strong>/);
  // Les items tapés à la main sont groupés de la même façon.
  assert.equal(listGrids(plain).length, 1, 'Puces manuelles : une seule grille');

  // 9. Une formule display n'ajoute pas de ligne vide dans l'item : le numéro
  //    reste collé à la première ligne au lieu de flotter au-dessus.
  assert.ok(!firstSpan(display).includes('\n'), 'Aucune ligne vide autour de la formule display');

  // 10. Sous-questions : un niveau imbriqué est LETTRÉ (a., b.), le suivant
  //     numéroté en chiffres romains (i., ii.) — puce au premier niveau.
  const subQuestions = render(String.raw`\begin{itemize}\item Question\begin{itemize}\item Sous-question\item Autre sous-question\end{itemize}\end{itemize}`);
  assert.match(subQuestions, /a\.[\s\S]*?Sous-question/, 'Le niveau 2 doit être lettré');
  assert.match(subQuestions, /b\.[\s\S]*?Autre sous-question/);
  assert.equal((subQuestions.match(/>•<\/span>/g) ?? []).length, 1, 'Une seule puce : au premier niveau');
  const thirdLevel = render(String.raw`\begin{enumerate}\item A\begin{enumerate}\item B\begin{enumerate}\item C\item D\end{enumerate}\end{enumerate}\end{enumerate}`);
  assert.match(thirdLevel, /a\.[\s\S]*?i\.[\s\S]*?C/, 'Niveau 3 : chiffres romains');
  assert.match(thirdLevel, /ii\.[\s\S]*?D/);
  const manyItems = render(String.raw`\begin{enumerate}\item Racine\begin{enumerate}` + Array.from({ length: 28 }, (_, index) => '\\item Suite ' + (index + 1)).join('') + String.raw`\end{enumerate}\end{enumerate}`);
  assert.match(manyItems, /aa\.[\s\S]*?Suite 27/, 'Au-delà de z : aa, comme LaTeX');

  // 11. Une formule EN LIGNE ne supprime pas le retour à la ligne du texte :
  //     seule une formule display occupe sa propre ligne.
  const inlineKeepsBreak = render('Voir $x$ ici\nPuis la suite.');
  assert.ok(inlineKeepsBreak.includes('Voir $x$ ici\nPuis la suite.'), 'Le saut de ligne du texte doit rester');
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
  // Aucun filet vertical : le plan ne tient qu'aux crans de marge.
  assert.doesNotMatch(css, /editor-indent-rail/);
  // Le portrait reste sobre, le paysage tactile creuse davantage.
  assert.match(css, /--editor-indent-3: 14px/);
  const landscape = css.slice(css.indexOf('(pointer: coarse) and (orientation: landscape)'));
  assert.match(landscape, /--editor-indent-1: 22px/);
  assert.match(landscape, /--editor-indent-3: 62px/);
  assert.match(landscape, /--editor-lesson-indent: 16px/);
  // Chaque niveau du plan porte son propre cran, rien d'autre.
  assert.match(renderer, /editor-type-section editor-indent-1 font-semibold/);
  assert.match(renderer, /editor-type-subsection editor-indent-2 font-semibold/);
  assert.match(renderer, /editor-type-subsubsection editor-indent-3 italic/);
  assert.doesNotMatch(renderer, /editor-indent-rail/);
  // La description redevient un bloc adouci, sans barre verticale.
  assert.doesNotMatch(renderer, /border-s-\[2px\]/);
  // Les lignes de contenu s'alignent sur le même plan, sans filet.
  assert.match(renderer, /const lessonIndentClass = indices\.subsubsectionIndex !== undefined/);
  assert.match(renderer, /\$\{lessonIndentClass\}/);
  // Le papier partage exactement le meme plan, en millimetres.
  const print = readFileSync('features/editor/print.css', 'utf8');
  assert.match(print, /--editor-indent-1: 4mm/);
  assert.match(print, /--editor-indent-3: 12mm/);
  // Sur le papier non plus : ni rail, ni barre de description.
  assert.doesNotMatch(print, /border-inline-start/);
  assert.match(renderer, /print-lesson-item \$\{lessonIndentClass\}/);
  assert.match(renderer, /\$\{lessonIndentClass\}/);
  // Vérification sur le balisage réellement produit, pas seulement la source.
  const description = renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', children:
    React.createElement(ContentRenderer, { data: { type: 'exercice', title: 'Titre', description: 'Une description.' }, indices: { chapterIndex: 0 }, elementType: 'item', showDescriptions: true }),
  }));
  assert.ok(description.includes('editor-type-description'));
  assert.ok(!description.includes('border-s-'), 'La description ne doit plus porter de barre verticale');
  assert.ok(!description.includes('editor-indent-rail'));
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

test('robustesse : un JSON importé abîmé ne casse aucun rendu', () => {
  // Cas mesuré : une leçon importée sans titre faisait
  // `item.title || config.name` → `undefined` → `splitMathText(undefined)` →
  // « Cannot read properties of undefined (reading 'matchAll') ».
  const render = (value: unknown) => renderToStaticMarkup(React.createElement('div', null, ...renderDescriptionWithBold(value)));
  const abimes: unknown[] = [undefined, null, 42, 0, true, false, {}, [], ['texte'], () => 'x'];

  for (const value of abimes) {
    const etiquette = String(value);
    assert.doesNotThrow(() => renderDescriptionWithBold(value), `description abîmée : ${etiquette}`);
    assert.doesNotThrow(() => splitMathText(value), `découpage abîmé : ${etiquette}`);
    assert.doesNotThrow(() => render(value), `rendu abîmé : ${etiquette}`);
    assert.ok(!render(value).includes('[object Object]'), `objet affiché : ${etiquette}`);
    assert.equal(hasMathSyntax(value), false, `formule fantôme : ${etiquette}`);
    assert.equal(detectTextDirection(value), null, `direction fantôme : ${etiquette}`);
    assert.equal(textDirectionAttribute(value), undefined, `attribut fantôme : ${etiquette}`);
    assert.equal(titleDirection(value, 'ltr'), 'ltr', `langue fantôme : ${etiquette}`);
  }

  // Un nombre reste affichable (page, numéro, année saisis en JSON).
  assert.ok(render(2026).includes('2026'));
  // Les vraies valeurs sont toujours détectées.
  assert.equal(detectTextDirection('الدوال العددية'), 'rtl');
  assert.equal(detectTextDirection('Fonctions numériques'), 'ltr');
  assert.equal(textDirectionAttribute('Continuité en un point'), 'ltr');
  assert.equal(titleDirection('١. الدرس : الدوال', 'ltr'), 'rtl');

  // Import : ni exception, ni objet dans les données, ni entrée fantôme.
  const importe = prepareImportedLessons([
    { type: 'chapter', items: 'pas un tableau', sections: [{ name: 42, title: {}, items: [null, 7, { title: undefined }] }] },
    { name: 'Chapitre sans titre', description: { objet: true } },
    'texte brut',
    null,
    17,
  ]);
  assert.ok(Array.isArray(importe.lessonsData));
  assert.ok(importe.lessonsData.length > 0, 'Le chapitre valide doit survivre');
  assert.ok(importe.lessonsData.every(chapitre => chapitre && typeof chapitre === 'object'));
  assert.ok(!JSON.stringify(importe.lessonsData).includes('"undefined"'));
  assert.ok(!JSON.stringify(importe.lessonsData).includes('[object Object]'));
  for (const chapitre of importe.lessonsData) {
    assert.doesNotThrow(() => render(chapitre.title));
  }

  // Le plantage exact signalé : un chapitre importé SANS titre ni nom. L'écran
  // faisait `item.title || config.name` → `undefined` → `splitMathText(undefined)`
  // → « Cannot read properties of undefined (reading 'matchAll') ».
  const bloc = (data: Record<string, unknown>, elementType: 'item' | 'chapter' | 'section', isPrint = false) => renderToStaticMarkup(
    React.createElement(LocaleProvider, { locale: 'fr', children:
      React.createElement(ContentRenderer, { data, indices: { chapterIndex: 0 }, elementType, isPrint, showDescriptions: true }),
    }),
  );
  for (const elementType of ['chapter', 'section', 'item'] as const) {
    const abime = { type: elementType, title: {}, name: [], description: 42, page: {}, number: {}, date: {}, remark: [] };
    assert.doesNotThrow(() => bloc({ type: elementType }, elementType), `bloc ${elementType} sans titre`);
    assert.doesNotThrow(() => bloc(abime, elementType), `bloc ${elementType} abîmé`);
    assert.ok(!bloc(abime, elementType).includes('[object Object]'), `objet affiché (${elementType})`);
    assert.doesNotThrow(() => bloc(abime, elementType, true), `impression ${elementType} abîmée`);
  }
  assert.doesNotThrow(() => bloc({ type: {} }, 'chapter'), 'type non textuel');

  // Noms de classe, de filière et de matière : mêmes valeurs abîmées (ils
  // arrivent du même JSON importé), aucun plantage et aucun objet affiché.
  for (const value of abimes) {
    const etiquette = String(value);
    assert.doesNotThrow(() => subjectKey(value), `clé de matière : ${etiquette}`);
    assert.doesNotThrow(() => abbreviateClassName(value as never, 'fr'), `abréviation : ${etiquette}`);
    assert.doesNotThrow(() => classCardLabelFor(classIdentityFor(value as never, 'fr'), 'fr'), `libellé : ${etiquette}`);
    assert.doesNotThrow(() => teachesSeveralSubjects([{ subject: value, teacherName: value }] as never), `matières : ${etiquette}`);
    assert.doesNotThrow(() => collectTeacherSubjects([{ subject: value, teacherName: value }] as never, value as never), `périmètre : ${etiquette}`);
    assert.ok(!abbreviateClassName(value as never, 'fr').includes('[object Object]'), `objet affiché : ${etiquette}`);
  }
});
