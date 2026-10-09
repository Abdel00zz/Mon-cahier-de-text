import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClassCard } from '../src/features/dashboard/ClassCard';
import { ClassDisplayToggle } from '../src/features/dashboard/ClassDisplayToggle';
import { isClassDisplayMode, nextClassDisplayMode, type ClassDisplayMode } from '../src/features/dashboard/classDisplayMode';
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

test('le numéro de groupe accompagne le nom du titre, dans la carte', () => {
  const [first] = renderCards(new Set());
  const identity = first.html.slice(
    first.html.indexOf('class-card__identity'),
    first.html.indexOf('class-card__footer'),
  );
  assert.ok(identity.length > 0, 'la ligne d’identité est montée');
  assert.match(identity, /class-card__title[\s\S]*class-card__group/, 'le numéro SUIT le nom, il ne le précède pas');
  assert.match(identity, /data-variant="engraved"/, 'variante gravée de la carte');
  assert.match(identity, /class-card__group[\s\S]*aria-hidden="true"/, 'décoratif : le nom accessible porte déjà le groupe');
  assert.match(identity, /sr-only/, 'le groupe reste annoncé une seule fois');
  // Le chiffre a quitté le corps de la carte : plus de chiffre géant entre l'en-tête et le titre.
  const body = first.html.slice(first.html.indexOf('class-card__body'), first.html.indexOf('class-card__identity'));
  assert.doesNotMatch(body, /class-card__group/, 'plus aucun filigrane détaché du titre');
});

test('la carte garde son aplat pastel et se soulève doucement', () => {
  const cards = readFileSync('src/features/dashboard/classCards.css', 'utf8');
  assert.match(cards, /--class-glass: color-mix\(in srgb, var\(--class-surface\) 94%, transparent\)/, 'surface de verre (94 %)');
  assert.doesNotMatch(cards, /backdrop-filter: blur/, 'pas de flou coûteux sous les aplats');
  assert.match(cards, /\.class-card::before \{[\s\S]*radial-gradient/, 'halo radial du ton');
  assert.match(cards, /\.class-card::before \{[\s\S]*z-index: 0/, 'le halo passe sous le contenu');
  assert.match(cards, /\.class-card:hover \{[\s\S]*transform: translateY\(-6px\)/, 'soulèvement au survol');
  assert.match(cards, /\.class-card:hover::before \{ opacity: 0; \}/, 'le survol préserve l’aplat pastel');
  assert.match(cards, /@container \(max-width: 360px\)/, 'la densité dépend de la largeur de carte, même sur tablette');
});

test('la disposition avance d’un seul geste, sans menu', () => {
  // Un appui = un cran. Le cycle est fermé : on revient au point de départ.
  const cycle: ClassDisplayMode[] = ['double', 'single', 'list'];
  assert.deepEqual(cycle.map(nextClassDisplayMode), ['single', 'list', 'double']);
  assert.equal(nextClassDisplayMode(nextClassDisplayMode(nextClassDisplayMode('double'))), 'double', 'cycle fermé');
  assert.ok(isClassDisplayMode('single'), 'une valeur connue est acceptée');
  for (const rejected of ['triple', '', undefined, null, 3, {}]) {
    assert.equal(isClassDisplayMode(rejected), false, `valeur rejetée : ${String(rejected)}`);
  }
});

test('un seul bouton, un seul mécanisme, trois états montés d’avance', () => {
  const html = renderToStaticMarkup(React.createElement(LocaleProvider, {
    locale: 'fr',
    children: React.createElement(ClassDisplayToggle, { mode: 'double', onChange: () => {} }),
  }));
  assert.ok(html.includes('data-slot="class-display-toggle"'), 'le bouton existe');
  assert.ok(html.includes('data-mode="double"'), 'son état courant est exposé');
  assert.equal((html.match(/<button/g) ?? []).length, 1, 'un seul bouton, aucun déclencheur secondaire');
  assert.doesNotMatch(html, /role="menu"|menuitemradio|aria-haspopup/, 'plus aucun menu de disposition');
  assert.equal((html.match(/<svg/g) ?? []).length, 3, 'les trois pictogrammes sont montés (métamorphose, pas remontage)');
  assert.equal((html.match(/class-display-toggle__labels/g) ?? []).length, 1, 'une seule boîte de libellés');
  assert.match(html, /aria-label="Disposition : 2 par ligne — passer à 1 par ligne"/, 'le geste est annoncé avant d’être fait');
  assert.match(html, /aria-live="polite"/, 'le nouvel état est annoncé après le clic');
});

test('le tableau de bord ne propose plus deux chemins pour changer d’affichage', () => {
  const source = readFileSync('src/features/dashboard/Dashboard.tsx', 'utf8');
  assert.match(source, /<ClassDisplayToggle/, 'le bouton unique est branché');
  assert.doesNotMatch(source, /menuitemradio|aria-haspopup="menu"|isDisplayMenuOpen|displayMenuRef/, 'plus de menu ni d’état de menu');
  assert.doesNotMatch(source, /ChevronDown/, 'plus de chevron de menu');
  // La disposition reste persistée : un seul écrivain, la valeur validée.
  assert.match(source, /dashboard_class_display_v1/, 'la disposition survit au rechargement');
  assert.match(source, /isClassDisplayMode\(classDisplayMode\)/, 'une valeur inconnue retombe sur deux colonnes');
});

test('taille du nom de classe sur les cartes augmentée de 15% sans toucher au niveau', () => {
  const cardsCss = readFileSync('src/features/dashboard/classCards.css', 'utf8');
  assert.match(cardsCss, /\.class-card__stream\s*\{[\s\S]*?font-size:\s*1\.15em/, 'le nom de la filière est agrandi de 15% (1.15em)');
  assert.match(cardsCss, /\.class-card__tier\s*\{[\s\S]*?font-size:\s*\.78em/, 'le nom du niveau garde sa taille d’origine (.78em)');
});

