import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClassCard } from '../src/features/dashboard/ClassCard';
import { ClassListItem } from '../src/features/dashboard/ClassListItem';
import { DashboardActions } from '../src/features/dashboard/DashboardActions';
import { CLASS_DISPLAY_MODES, isClassDisplayMode, nextClassDisplayMode } from '../src/features/dashboard/classDisplayMode';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { detectSessionAlerts } from '../src/domain/notifications/sessionAlertEngine';
import { prioritizeActiveClasses } from '../src/domain/classes/classOrder';
import { buildUnifiedClassPaletteMap } from '../src/features/dashboard/departmentPalette';
import type { HolidayCalendar } from '../src/domain/calendar/calendar';
import type { AppConfig, ClassInfo, TimetableEntry } from '../src/types';

/* Circuit complet jusqu'a l'ecran : emploi du temps -> moteur de seance -> ordre du tableau de bord -> carte. */

const makeClass = (id: string, name: string): ClassInfo => ({
  id, name, level: '1AC', cycle: 'college', subject: 'Mathematiques', teacherName: '', color: '', createdAt: '2026-09-01',
});
const classes = [makeClass('a', '1AC 1'), makeClass('b', '2AC 2'), makeClass('c', '3AC 3')];
const palettes = buildUnifiedClassPaletteMap(classes);
const calendar: HolidayCalendar = {
  version: 1, pays: 'Maroc', fuseau: 'Africa/Casablanca',
  anneeScolaire: { libelle: '2026-2027', debut: '2026-09-07', fin: '2027-06-30' }, joursFeries: [], vacances: [],
};
const timetable: TimetableEntry[] = [
  { day: 1, slot: 0, classId: 'a' }, { day: 1, slot: 1, classId: 'a' },
  { day: 1, slot: 3, classId: 'b' }, { day: 1, slot: 4, classId: 'c' },
];
const config: AppConfig = {
  establishmentName: '', defaultTeacherName: '', printShowDescriptions: true, timetable,
  notificationSettings: { enabled: true, pushEnabled: false, sessionVibration: false, sessionEndReminderEnabled: true, missingDateReminderEnabled: true, quietDuringVacations: true, gapThreshold: 2, inactivityThresholdDays: 5 },
};
const activeIds = (clock: string) =>
  [...new Set(detectSessionAlerts(config, classes, calendar, new Date(`2026-09-14T${clock}+01:00`), () => false).current.map(block => block.classId))].sort();
const renderCards = (active: ReadonlySet<string>) => {
  const noop = () => {};
  const ordered = prioritizeActiveClasses(classes, active);
  return ordered.map(classInfo => ({
    id: classInfo.id,
    html: renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', children:
      React.createElement(ClassCard, { classInfo, onSelect: noop, onConfigure: noop, isActiveSession: active.has(classInfo.id), palette: palettes.get(classInfo.id) }) })),
  }));
};

test('séance en cours : la carte de la classe active, et elle seule, porte le repère « en cours »', () => {
  const cases: Array<[string, string[]]> = [
    ['07:54:59', []],
    ['07:55:00', ['a']],
    ['08:00:00', ['a']],
    ['08:55:00', ['a']],
    ['08:59:59', ['a']],
    ['09:00:00', ['a']],
    ['09:54:59', ['a']],
    ['09:55:00', []],
    ['10:00:00', []],
    ['11:30:00', ['b']],
    ['12:30:00', []],
    ['14:30:00', ['c']],
    ['14:55:00', []],
  ];
  for (const [clock, expected] of cases) {
    const ids = activeIds(clock);
    assert.deepEqual(ids, expected, `état à ${clock}`);
    const cards = renderCards(new Set(ids));
    for (const card of cards) {
      const isActive = expected.includes(card.id);
      assert.equal(card.html.includes('data-session-active="true"'), isActive, `carte ${card.id} à ${clock}`);
      assert.equal(card.html.includes('class-card--active'), isActive, `style actif ${card.id} à ${clock}`);
      assert.doesNotMatch(card.html, /class-card__live|class-card__footer/, `aucun badge « en cours » ${card.id} à ${clock}`);
    }
    // La classe active passe en tête sans modifier l'ordre enregistré des autres.
    if (expected.length === 1) assert.equal(cards[0].id, expected[0]);
  }
  const activeHtml = renderCards(new Set(['a']))[0].html;
  assert.doesNotMatch(activeHtml, /class-card__footer|class-card__live/, 'le badge de séance est supprimé');
  assert.match(activeHtml, /data-session-active="true"/, 'la carte active reste identifiable');

});

test('l’horloge du planning se recale à la minute et à chaque reprise de l’application', () => {
  const dashboard = readFileSync('src/features/dashboard/Dashboard.tsx', 'utf8');
  assert.match(dashboard, /setTimeout\(refreshClock,\s*60000\s*-\s*Date\.now\(\)\s*%\s*60000\s*\+\s*20\)/, 'le statut se recalcule à la prochaine minute');
  for (const event of ['visibilitychange', 'focus', 'pageshow', 'native-resume']) {
    assert.match(dashboard, new RegExp(`addEventListener\\('${event}', refreshClock\\)`), `${event} relance l’horloge`);
    assert.match(dashboard, new RegExp(`removeEventListener\\('${event}', refreshClock\\)`), `${event} est nettoyé au démontage`);
  }
});

test('le groupe fait partie de la même phrase que le nom dans le titre de la carte', () => {
  const [first] = renderCards(new Set());
  const identity = first.html.slice(
    first.html.indexOf('class-card__identity'),
    first.html.indexOf('</article>'),
  );
  assert.ok(identity.length > 0, 'la ligne d’identité est montée');
  const heading = identity.match(/<h3\b[^>]*>[\s\S]*?<\/h3>/)?.[0] ?? '';
  assert.match(heading, /class-card__stream[\s\S]*\u00a0<span[^>]*class-card__group/, 'le groupe suit le dernier mot, dans le même titre, avec une espace insécable');
  assert.match(identity, /data-variant="engraved"/, 'variante gravée de la carte');
  assert.match(identity, /class-card__group[\s\S]*aria-hidden="true"/, 'décoratif : le nom accessible porte déjà le groupe');
  assert.match(identity, /sr-only/, 'le groupe reste annoncé une seule fois');
  // Le chiffre a quitté le corps de la carte : plus de chiffre géant entre l'en-tête et le titre.
  const body = first.html.slice(first.html.indexOf('class-card__body'), first.html.indexOf('class-card__identity'));
  assert.doesNotMatch(body, /class-card__group/, 'plus aucun filigrane détaché du titre');
});

test('la palette de chaque classe traverse le tableau de bord jusqu’au fond, au texte et au mode sombre', () => {
  const cards = renderCards(new Set());
  for (const card of cards) {
    const palette = palettes.get(card.id);
    assert.ok(palette, `palette de la classe ${card.id}`);
    assert.ok(card.html.includes(`--class-palette-bg:${palette.bg}`), `fond de ${card.id}`);
    assert.ok(card.html.includes(`--class-palette-border:${palette.border}`), `bordure de ${card.id}`);
    assert.ok(card.html.includes(`--class-palette-title:${palette.title}`), `titre de ${card.id}`);
    assert.ok(card.html.includes(`--class-palette-secondary:${palette.secondary}`), `texte secondaire de ${card.id}`);
  }
  const styles = ['src/features/dashboard/classCardsBase.css', 'src/features/dashboard/classCards.css'].map(path => readFileSync(path, 'utf8')).join('\n');
  assert.doesNotMatch(styles, /background-image:\s*linear-gradient\(/, 'plus aucune couche de fond sur les cartes');
  assert.match(styles, /background:\s*var\(--card-bg/, 'une seule surface pastel, sans dégradé');
  assert.match(styles, /\.dark \.class-card\s*\{[\s\S]*?--card-bg:\s*color-mix/, 'les couleurs restent désaturées en mode sombre');
  assert.doesNotMatch(styles, /Surface unique, encre unique/, 'aucune règle finale ne neutralise les palettes');
});

test('les cartes de classe ne montrent plus le jour, l’heure ou la durée du prochain cours', () => {
  const scheduleStatus = {
    state: 'upcoming' as const,
    label: 'Prochaine séance : Lundi à 10h00',
    shortLabel: 'Lundi à 10h00',
    dayLabel: 'Lundi',
    startTimeLabel: '10h00',
    sessionHours: 2,
  };
  const render = (children: React.ReactNode) =>
    renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', children }));
  const card = render(React.createElement(ClassCard, {
    classInfo: makeClass('scheduled-card', '1AC 1'),
    onSelect: () => {},
    onConfigure: () => {},
    scheduleStatus,
  }));
  const listItem = render(React.createElement(ClassListItem, {
    classInfo: makeClass('scheduled-row', '1AC 1'),
    onSelect: () => {},
    onConfigure: () => {},
  }));
  for (const html of [card, listItem]) {
    assert.doesNotMatch(html, /class-card__schedule-capsule|class-card__schedule-day|class-card__schedule-time|class-card__schedule-multihour/,
      'aucun badge d’horaire ne subsiste en mode carte ou liste');
    assert.doesNotMatch(html, /Lundi|10h00|2h/, 'le jour, l’heure et la durée ne sont plus affichés sur la classe');
  }
});

test('la teinte personnalisée reste branchée avec la palette de la carte', () => {
  const classInfo = { ...makeClass('custom', '1AC 4'), color: 'class-hue:34' };
  const palette = buildUnifiedClassPaletteMap([classInfo]).get(classInfo.id);
  const html = renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr', children:
    React.createElement(ClassCard, { classInfo, palette, onSelect: () => {}, onConfigure: () => {} }) }));
  assert.match(html, /--class-hue:/, 'l’attribut de teinte reste présent sur la carte');
  assert.ok(html.includes(`--class-palette-bg:${palette?.bg}`), 'la palette calculée reste présente en parallèle');
});

test('menu de classe : emploi du temps retiré, liste compacte sans vide', () => {
  const menu = readFileSync('src/features/dashboard/ClassActionsMenu.tsx', 'utf8');
  const styles = readFileSync('src/features/dashboard/classActionsSheet.css', 'utf8');
  assert.doesNotMatch(menu, /onOpenSchedule|CalendarDays|settings\.item\.schedule/,
    'le raccourci emploi du temps ne figure plus dans le menu ⋮');
  assert.match(menu, /className="class-quick-sheet__actions"/,
    'les actions sont une liste, plus une grille de grandes tuiles');
  assert.equal((menu.match(/className="class-quick-sheet__action"/g) ?? []).length, 3,
    'évaluations, modification et suppression partagent la même ligne');
  assert.match(menu, /className="class-quick-sheet__icon" data-tone="blue" aria-hidden="true"><CalendarCheck \/><\/span>/,
    'l’icône des évaluations reste dans sa boîte neutre');
  assert.match(styles, /\.class-quick-sheet__icon > svg \{[\s\S]*?width: 1\.15rem;[\s\S]*?height: 1\.15rem;/,
    'les icônes de ligne restent compactes');
  assert.match(styles, /\.class-quick-sheet__action \{[\s\S]*?min-height: 3\.25rem;/,
    'les lignes sont compactes et tactiles');
  assert.match(menu, /className="class-quick-sheet__title"[\s\S]*?className="class-quick-sheet__class" dir="auto">\{name\}/,
    'le titre et le nom de classe partagent la même ligne');
  assert.match(styles, /\.class-quick-sheet__title \{[\s\S]*?display: inline-flex;[\s\S]*?align-items: baseline;/,
    'le nom de classe est aligné sur le titre');
  assert.match(styles, /\.class-quick-sheet__class \{[\s\S]*?color: hsl\(var\(--muted-foreground\)\);[\s\S]*?font-size: \.78rem;/,
    'le nom de classe est gris et plus petit');
  assert.doesNotMatch(styles, /data-danger='true'[\s\S]{0,220}border-block-start/,
    'la suppression n’est plus séparée par un filet');
});

test('la fiche reste décorative et un nom libre conserve son identité sans icône de cahier dans les trois langues', () => {
  for (const locale of ['fr', 'ar', 'en'] as const) {
    const html = renderToStaticMarkup(React.createElement(LocaleProvider, { locale, children:
      React.createElement(ClassCard, { classInfo: makeClass('free', 'Atelier de soutien'), onSelect: () => {}, onConfigure: () => {} }) }));
    assert.match(html, /class="class-card__sheet" aria-hidden="true"/, 'le papier décoratif ne double pas le nom accessible');
    assert.match(html, /<h3[^>]*title="Atelier de soutien"/, 'le titre libre reste complet');
    assert.doesNotMatch(html, /class-card__group|class-card__cover|class-card__notebook|lucide-book-open|active-session-glass|<animate\b/, 'pas de cahier, de groupe inventé ni de boucle décorative');
    assert.equal((html.match(/<button\b/g) ?? []).length, 2, 'ouvrir et actions sont deux cibles distinctes');
  }
});

test('la disposition mémorisée n’accepte que les valeurs connues', () => {
  for (const accepted of ['list', 'single', 'double', 'triple']) assert.ok(isClassDisplayMode(accepted), accepted);
  for (const rejected of ['quadruple', '', undefined, null, 3, {}]) {
    assert.equal(isClassDisplayMode(rejected), false, `valeur rejetée : ${String(rejected)}`);
  }
});

test('les actions sont visibles, compactes et accessibles dans les trois langues', () => {
  for (const locale of ['fr', 'ar', 'en'] as const) {
    const html = renderToStaticMarkup(React.createElement(LocaleProvider, {
      locale,
      children: React.createElement(DashboardActions, { mode: 'double', onModeChange: () => {} }),
    }));
    assert.equal((html.match(/<button/g) ?? []).length, 1, `${locale} : disposition seule, aide déplacée vers la navigation`);
    assert.doesNotMatch(html, /aria-haspopup="menu"/, `${locale} : plus de menu caché`);
    assert.match(html, /data-mode="double"/, `${locale} : disposition courante`);
    assert.match(html, /role="status" aria-live="polite"/, `${locale} : disposition active annoncée`);
  }
  const css = readFileSync('src/features/dashboard/dashboardActions.css', 'utf8');
  assert.match(css, /\.dashboard-actions-bar__mode \{[\s\S]*?width: 44px;[\s\S]*?height: 44px;/, 'cible tactile de 44 px');
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgb\(|rgba\(/i, 'aucune teinte codée en dur : tout vient du thème');
  assert.match(css, /prefers-reduced-motion: reduce\)/, 'mouvement réduit respecté');
});

test('la création et les dispositions ne dépendent plus du menu', () => {
  const visited: string[] = [];
  let mode = CLASS_DISPLAY_MODES[0] as (typeof CLASS_DISPLAY_MODES)[number];
  for (let i = 0; i < CLASS_DISPLAY_MODES.length; i++) { visited.push(mode); mode = nextClassDisplayMode(mode); }
  assert.deepEqual(visited, [...CLASS_DISPLAY_MODES], 'chaque disposition est atteignable par le bouton');
  assert.equal(mode, CLASS_DISPLAY_MODES[0], 'le cycle revient au premier choix');
  const actions = readFileSync('src/features/dashboard/DashboardActions.tsx', 'utf8');
  assert.match(actions, /nextClassDisplayMode\(mode\)/, 'bouton unique qui parcourt les dispositions');
  assert.doesNotMatch(actions, /dashboard-actions-bar__create/, 'bouton + classe supprimé de l’en-tête');
  assert.doesNotMatch(actions, /DropdownMenu/, 'aucun menu supérieur');
});

test('la grille garde un budget d’animation quand les classes se multiplient', () => {
  const source = readFileSync('src/features/dashboard/Dashboard.tsx', 'utf8');
  assert.match(source, /const MAX_ANIMATED_CLASS_CARDS = 12/, 'un plafond explicite protège les téléphones d’entrée de gamme');
  assert.match(source, /filteredClasses\.length <= MAX_ANIMATED_CLASS_CARDS/, 'la décision suit le nombre réel de cartes');
  assert.match(source, /layout=\{animateClassLayout \? 'position' : false\}/, 'au-delà du budget, la liste reste statique');
});

test('le compagnon est chargé après le premier rendu, hors du bundle d’entrée', () => {
  const dashboard = readFileSync('src/features/dashboard/Dashboard.tsx', 'utf8');
  assert.match(dashboard, /lazy\(\(\)\s*=>\s*import\('@\/features\/assistant\/ClassAssistant'\)/, 'le moteur du compagnon est découpé');
  assert.match(dashboard, /useDeferredReady\(/, 'le tableau de bord attend un temps mort');
  assert.doesNotMatch(dashboard, /^import \{ ClassAssistant \}/m, 'aucun import statique dans le bundle d’entrée');
  // Le cahier ne monte plus un second compagnon : ses circuits existants suffisent.
  const editor = readFileSync('src/features/editor/Editor.tsx', 'utf8');
  assert.doesNotMatch(editor, /ClassAssistant/, 'pas de compagnon supplémentaire dans l’éditeur');
});

test('le tableau de bord place les actions au-dessus de « Mes classes : »', () => {
  const source = readFileSync('src/features/dashboard/Dashboard.tsx', 'utf8');
  assert.match(source, /<DashboardActions[\s\S]*?<h1/, 'actions avant le titre');
  assert.doesNotMatch(source, /DashboardActionsMenu/, 'menu supprimé');
  assert.match(source, /\{locale === 'fr' \? '\\u00A0:' : ':'\}/, 'deux points, avec espace insécable en français');
  assert.match(source, /<span aria-hidden="true">\{locale === 'fr'/, 'les deux points sont décoratifs pour les lecteurs d’écran');
  // La disposition reste persistée : un seul écrivain, la valeur validée.
  assert.match(source, /dashboard_class_display_v1/, 'la disposition survit au rechargement');
  assert.match(source, /isClassDisplayMode\(classDisplayMode\)/, 'une valeur inconnue retombe sur la disposition par défaut');
});
