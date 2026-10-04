import assert from 'node:assert/strict';
import test from 'node:test';
import { BOOTSTRAP_STEPS, bootstrapProgress, IDLE_BOOTSTRAP } from '../src/domain/sync/bootstrapProgress';

test('progression : l’emploi du temps précède les classes et le pourcentage ne recule jamais', () => {
  assert.deepEqual(BOOTSTRAP_STEPS, ['timetable', 'classes']);
  const idle = bootstrapProgress(IDLE_BOOTSTRAP);
  assert.equal(idle.step, 'timetable');
  assert.equal(idle.index, 0);
  assert.equal(idle.percent, 0);
  assert.equal(idle.complete, false);
  const half = bootstrapProgress({ timetable: true, classes: false });
  assert.equal(half.step, 'classes');
  assert.equal(half.index, 1);
  assert.ok(half.percent > idle.percent && half.percent < 100);
  assert.equal(half.complete, false);
  const done = bootstrapProgress({ timetable: true, classes: true });
  assert.equal(done.percent, 100);
  assert.equal(done.complete, true);
  assert.ok(done.percent >= half.percent);
});

test('progression : des classes sans emploi du temps ne terminent pas le chargement', () => {
  const classesOnly = bootstrapProgress({ timetable: false, classes: true });
  assert.equal(classesOnly.step, 'timetable');
  assert.equal(classesOnly.complete, false);
  assert.equal(classesOnly.percent, 45);
});
