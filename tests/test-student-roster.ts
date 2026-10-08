import assert from 'node:assert/strict';
import test from 'node:test';
import { namesWithRoster, parseStudentNames, retainOralOutcomes, rostersForClasses, studentSearchKey } from '../src/domain/evaluations/studentRoster';
import { assertValidSyncSettings } from '../api/_lib/validate';
import { extractSyncableSettings, mergeSyncableSettings } from '../src/infrastructure/sync/syncSettings';
import type { AppConfig, ClassRoster, OralStudentsRecord } from '../src/types';
import { summarizeClassStudentReviews } from '../src/domain/evaluations/pedagogicalReview';

const roster: ClassRoster = { names: ['أحمد العلوي', 'سلمى الفاسي'], version: 1, updatedAt: '2026-10-08T08:00:00Z' };

test('planning uses the latest observation per class, preserves pending pupils and never totals repeated sessions', () => {
  const config = { classRosters: { x: roster }, pedagogicalEvents: { x: [
    { id: 'old', type: 'controle_cahiers', date: '2026-09-30', students: { names: roster.names, updatedAt: '2026-09-30T08:00:00Z', notebookConditions: { 'أحمد العلوي': 'missing', 'سلمى الفاسي': 'needs_work' } } },
    { id: 'latest', type: 'controle_cahiers', date: '2026-10-08', students: { names: ['أحمد العلوي'], updatedAt: roster.updatedAt, notebookConditions: { 'أحمد العلوي': 'good', Deleted: 'missing' } } },
  ] }, assessmentParticipants: { x: {
    old: { names: roster.names, updatedAt: '2026-09-30T08:00:00Z', oralOutcomes: { 'أحمد العلوي': 'mastered', 'سلمى الفاسي': 'mastered' } },
    recent: { names: roster.names, updatedAt: roster.updatedAt, oralOutcomes: { 'سلمى الفاسي': 'needs_support' } },
  } }, assessmentDates: { x: { recent: '2026-10-07' } } } as unknown as AppConfig;
  const review = summarizeClassStudentReviews(config, 'x');
  assert.equal(review.notebook?.reviewed, 1);
  assert.equal(review.notebook?.pending, 1);
  assert.deepEqual(review.notebook?.priorityNames, []);
  assert.equal(review.oral?.date, '2026-10-07');
  assert.deepEqual(review.oral?.priorityNames, ['سلمى الفاسي']);
  assert.equal(review.oral?.pending, 1);
  assert.deepEqual(summarizeClassStudentReviews(config, 'other'), { notebook: null, oral: null });
});

test('class rosters accept Arabic and Latin separators, retain full names and enforce payload bounds', () => {
  assert.deepEqual(parseStudentNames(' أحمد   العلوي\nسلمى الفاسي، أحمد العلوي;Jean Dupont؛ JEAN DUPONT'), ['أحمد العلوي', 'سلمى الفاسي', 'Jean Dupont']);
  assert.throws(() => parseStudentNames('x'.repeat(121)));
  assert.throws(() => parseStudentNames(Array.from({ length: 201 }, (_, index) => `Student ${index}`).join('\n')));
  assert.equal(studentSearchKey('أَحْمَد العـلوي'), studentSearchKey('احمد العلوي'));
  assert.equal(studentSearchKey('Éléonore'), studentSearchKey('eleonore'));
});

test('a roster fills a session, preserves recorded names and is isolated to its class', () => {
  assert.deepEqual(namesWithRoster(['أحمد العلوي', 'Ancien élève'], roster), ['أحمد العلوي', 'Ancien élève', 'سلمى الفاسي']);
  assert.deepEqual(rostersForClasses({ x: roster, other: { ...roster, names: ['Other account'] } }, ['x']), { x: roster });
  const full = Array.from({ length: 200 }, (_, index) => `Recorded ${index}`);
  assert.deepEqual(namesWithRoster(full, roster), full, 'a changed roster cannot crash or remove a full historic session');
  assert.deepEqual(retainOralOutcomes(['أحمد العلوي', 'constructor'], { 'أحمد العلوي': 'mastered', 'Deleted': 'needs_support' }), { 'أحمد العلوي': 'mastered' });
});

test('teacher settings transport observations but never write administrative rosters', () => {
  const oral: OralStudentsRecord = { names: roster.names, oralOutcomes: { 'أحمد العلوي': 'mastered' }, updatedAt: roster.updatedAt };
  const settings = { classRosters: { x: roster }, assessmentParticipants: { x: { oral } } };
  assert.deepEqual(extractSyncableSettings(settings), { assessmentParticipants: settings.assessmentParticipants });
  assert.deepEqual(assertValidSyncSettings(settings, new Set(['x'])), { assessmentParticipants: settings.assessmentParticipants });
  assert.deepEqual(mergeSyncableSettings({}, { ...settings, establishmentName: '', defaultTeacherName: '' }).assessmentParticipants, settings.assessmentParticipants);
  assert.throws(() => assertValidSyncSettings({ assessmentParticipants: { other: { oral } } }, new Set(['x'])));
  assert.throws(() => assertValidSyncSettings({ assessmentParticipants: { x: { oral: { ...oral, oralOutcomes: { Unknown: 'mastered' } } } } }, new Set(['x'])));
  assert.throws(() => assertValidSyncSettings({ assessmentParticipants: { x: { oral: { ...oral, oralOutcomes: { 'أحمد العلوي': 'good' } } } } }, new Set(['x'])));
});
