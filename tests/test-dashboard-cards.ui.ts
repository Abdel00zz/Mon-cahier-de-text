import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClassCard } from '../src/features/dashboard/ClassCard';
import { DashboardActions } from '../src/features/dashboard/DashboardActions';
import { CLASS_DISPLAY_MODES, isClassDisplayMode, nextClassDisplayMode } from '../src/features/dashboard/classDisplayMode';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { translateLocaleMessage } from '../src/i18n/messages';
import { detectSessionAlerts } from '../src/domain/notifications/sessionAlertEngine';
import { prioritizeActiveClasses } from '../src/domain/classes/classOrder';
import type { HolidayCalendar } from '../src/domain/calendar/calendar';
import type { AppConfig, ClassInfo, TimetableEntry } from '../src/types';

/* Circuit complet jusqu'a l'ecran : emploi du temps -> moteur de seance -> ordre du tableau de bord -> carte. */

const makeClass = (id: string, name: string): ClassInfo => ({
  id, name, level: '1AC', cycle: 'college', subject: 'Mathematiques', teacherName: '', color: '', createdAt: '2026-09-01',
});
const classes = [makeClass('a', '1AC 1'), makeClass('b', '2AC 2'), makeClass('c', '3AC 3')];
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
      React.createElement(ClassCard, { classInfo, onSelect: noop, onConfigure: noop, isActiveSession: active.has(classInfo.id) }) })),
  }));
};

test('séance en cours : la carte de la classe active, et elle seule, porte le repère « en cours »', () => {
  const nowLabel = translateLocaleMessage('fr', 'dashboard.welcome.nowTitle');
  const cases: Array<[string, string[]]> = [
    ['07:59:00', []],
    ['08:00:00', ['a']],
    ['09:59:59', ['a']],
    ['10:00:00', []],
    ['11:30:00', ['b']],
    ['12:30:00', []],
    ['14:30:00', ['c']],
    ['15:00:00', []],
  ];
  for (const [clock, expected] of cases) {
    const ids = activeIds(clock);
    assert.deepEqual(ids, expected, `état à ${clock}`);
    const cards = renderCards(new Set(ids));
    for (const card of cards) {
      const isActive = expected.includes(card.id);
      assert.equal(card.html.includes('data-session-active="true"'), isActive, `carte ${card.id} à ${clock}`);
      assert.equal(card.html.includes('class-card--active'), isActive, `style actif ${card.id} à ${clock}`);
      assert.equal(card.html.includes(nowLabel), isActive, `libellé « en cours » ${card.id} à ${clock}`);
    }
    // La classe active passe en tête sans modifier l'ordre enregistré des autres.
    if (expected.length === 1) assert.equal(cards[0].id, expected[0]);
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

