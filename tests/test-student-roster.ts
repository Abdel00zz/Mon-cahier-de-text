import assert from 'node:assert/strict';
import test from 'node:test';
import { namesWithRoster, parseStudentNames, retainOralOutcomes, rostersForClasses, studentSearchKey } from '../src/domain/evaluations/studentRoster';
import { assertValidSyncSettings } from '../api/_lib/validate';
import { extractSyncableSettings, mergeSyncableSettings } from '../src/infrastructure/sync/syncSettings';
import type { ClassRoster, OralStudentsRecord } from '../src/types';

const roster: ClassRoster = { names: ['أحمد العلوي', 'سلمى الفاسي'], version: 1, updatedAt: '2026-10-08T08:00:00Z' };

test('class rosters accept Arabic and Latin separators, retain full names and enforce payload bounds', () => {
  assert.deepEqual(parseStudentNames(' أحمد   العلوي\nسلمى الفاسي، أحمد العلوي;Jean Dupont؛ JEAN DUPONT'), ['أحمد العلوي', 'سلمى الفاسي', 'Jean Dupont']);
  assert.throws(() => parseStudentNames('x'.repeat(121)));
  assert.throws(() => parseStudentNames(Array.from({ length: 201 }, (_, index) => `Student ${index}`).join('\n')));
  assert.equal(studentSearchKey('أَحْمَد العـلوي'), studentSearchKey('احمد العلوي'));
  assert.equal(studentSearchKey('Éléonore'), studentSearchKey('eleonore'));
  assert.deepEqual(parseStudentNames('أحمد؛احمد؛André;Andre'), ['أحمد', 'احمد', 'André', 'Andre'], 'la recherche tolérante ne doit pas servir à fusionner des identités');
});

test('a roster fills a session, preserves recorded names and is isolated to its class', () => {
  assert.deepEqual(namesWithRoster(['أحمد العلوي', 'Ancien élève'], roster), ['أحمد العلوي', 'Ancien élève', 'سلمى الفاسي']);
  assert.deepEqual(rostersForClasses({ x: roster, other: { ...roster, names: ['Other account'] } }, ['x']), { x: roster });
  const full = Array.from({ length: 200 }, (_, index) => `Recorded ${index}`);
  assert.deepEqual(namesWithRoster(full, roster), full, 'a changed roster cannot crash or remove a full historic session');
  assert.deepEqual(retainOralOutcomes(['أحمد العلوي', 'constructor'], { 'أحمد العلوي': 'mastered', 'Deleted': 'needs_support' }), { 'أحمد العلوي': 'mastered' });
});

test('teacher settings transport validated shared rosters and observations', () => {
  const oral: OralStudentsRecord = { names: roster.names, oralOutcomes: { 'أحمد العلوي': 'mastered' }, updatedAt: roster.updatedAt };
  const settings = { classRosters: { x: roster }, assessmentParticipants: { x: { oral } } };
  assert.deepEqual(extractSyncableSettings(settings), settings);
  assert.deepEqual(assertValidSyncSettings(settings, new Set(['x'])), settings);
  assert.deepEqual(mergeSyncableSettings({}, { ...settings, establishmentName: '', defaultTeacherName: '' }).assessmentParticipants, settings.assessmentParticipants);
  assert.throws(() => assertValidSyncSettings({ assessmentParticipants: { other: { oral } } }, new Set(['x'])));
  assert.throws(() => assertValidSyncSettings({ assessmentParticipants: { x: { oral: { ...oral, oralOutcomes: { Unknown: 'mastered' } } } } }, new Set(['x'])));
  assert.throws(() => assertValidSyncSettings({ assessmentParticipants: { x: { oral: { ...oral, oralOutcomes: { 'أحمد العلوي': 'good' } } } } }, new Set(['x'])));
});
