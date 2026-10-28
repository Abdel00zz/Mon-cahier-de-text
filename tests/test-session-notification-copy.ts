import assert from 'node:assert/strict';
import test from 'node:test';
import { sessionNotificationCopy } from '../src/domain/notifications/sessionNotificationCopy';
import { buildNativeReminderPlan } from '../src/domain/notifications/nativeReminderPlan';
import type { AppConfig, ClassInfo } from '../src/types';

const classes = [{ id: 'a', name: '2ème Bac Sciences Physiques 3' },
  { id: 'b', name: '1AC 2' }, { id: 'c', name: 'Mon groupe 7' }, { id: 'd', name: 'Mon groupe 8' }] as ClassInfo[];

test('FR/AR/EN copy integrates class groups and remains within phone text limits', () => {
  for (const locale of ['fr', 'ar', 'en'] as const) for (const kind of ['end', 'missing'] as const) {
    const copy = sessionNotificationCopy(kind, ['a'], classes, locale, 5);
    assert.ok(copy.body.includes('3'), 'the group remains visible');
    assert.ok(copy.body.includes('\u2068') && copy.body.includes('\u2069'), 'mixed scripts are isolated');
    assert.ok(Array.from(copy.body).length <= 180);
    assert.ok(Array.from(copy.title).length <= 72);
    assert.doesNotMatch(copy.body, /\{[^}]+\}/);
    if (kind === 'end') assert.ok(copy.body.includes('5'));
  }
});

test('long names retain the group, distinct classes and singular/plural summaries', () => {
  const long = classes.map(item => ({ ...item, name: `${'Atelier personnalisé '.repeat(12)}groupe ${item.id === 'a' ? 39 : 42}` }));
  const copy = sessionNotificationCopy('end', ['a', 'b'], long, 'fr');
  assert.ok(copy.body.includes('39\u2069'));
  assert.ok(copy.body.includes('42\u2069'));
  assert.equal((copy.body.match(/\u2068/g) ?? []).length, (copy.body.match(/\u2069/g) ?? []).length);
  assert.ok(Array.from(copy.body).length <= 180);
  assert.match(sessionNotificationCopy('end', ['a', 'a', 'b', 'c'], classes, 'fr').body, /une autre classe/);
  assert.match(sessionNotificationCopy('end', ['a', 'b', 'c', 'd'], classes, 'fr').body, /2 autres classes/);
  assert.match(sessionNotificationCopy('missing', ['unknown'], classes, 'fr').body, /votre classe/);
});

test('Android scheduled notifications use exactly the same wording as foreground reminders', () => {
  for (const locale of ['fr', 'ar', 'en'] as const) {
    const config = { applicationLocale: locale, timetable: [{ day: 1, slot: 4, classId: 'a' }, { day: 1, slot: 5, classId: 'a' }],
      notificationSettings: { enabled: true, sessionReminderMinutes: 5 } } as AppConfig;
    const reminder = buildNativeReminderPlan(config, classes, new Date('2026-09-14T13:00:00+01:00'))[0];
    assert.ok(reminder);
    const copy = sessionNotificationCopy('end', ['a'], classes, locale, 5);
    assert.equal(reminder.title, copy.title);
    assert.equal(reminder.body, copy.body);
    assert.equal(reminder.at.toISOString(), '2026-09-14T14:50:00.000Z');
  }
});
