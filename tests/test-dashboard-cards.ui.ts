import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClassCard } from '../src/features/dashboard/ClassCard';
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

