import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppConfig } from '../src/types';
import { removeDeletedClassReferences } from '../src/infrastructure/sync/pullHelpers';

test('la suppression distante retire uniquement les références de la classe concernée', () => {
  const config: Partial<AppConfig> = {
    timetable: [{ day: 1, slot: 0, classId: 'a' }, { day: 1, slot: 1, classId: 'b' }],
    schedules: [{ classId: 'a', slots: [{ weekday: 1, sessions: 1 }] }, { classId: 'b', slots: [{ weekday: 1, sessions: 1 }] }],
    dashboardClassOrder: ['b', 'a'],
    assessmentDates: { a: {}, b: {} },
  };
  const original = structuredClone(config);
  const result = removeDeletedClassReferences(config, new Set(['a']));
  assert.equal(result.changed, true);
  assert.deepEqual(result.config.timetable?.map(entry => entry.classId), ['b']);
  assert.deepEqual(result.config.schedules?.map(entry => entry.classId), ['b']);
  assert.deepEqual(result.config.dashboardClassOrder, ['b']);
  assert.deepEqual(Object.keys(result.config.assessmentDates ?? {}), ['b']);
  assert.deepEqual(config, original);
  assert.equal(removeDeletedClassReferences(config, new Set()).config, config);
  assert.equal(removeDeletedClassReferences(config, new Set(['missing'])).changed, false);
});
