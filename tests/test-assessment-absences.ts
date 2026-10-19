import assert from 'node:assert/strict';
import test from 'node:test';
import { assessmentAbsencesByDate } from '../src/domain/evaluations/assessmentAbsences';
import type { AppConfig, LessonsData } from '../src/types';

const record = (names: string[]) => ({ names, updatedAt: '2026-10-01T00:00:00Z' });
test('absence lookup never matches an ordinal against the year or another assessment type', () => {
  const config: Partial<AppConfig> = { assessmentAbsences: { c: { '2026-2027:s1-controle1': record(['Amine']) } } };
  const lessons: LessonsData = [{ type: 'controle_continu', title: 'Contrôle 2', date: '2026-10-02' },
    { type: 'oral', title: 'Oral 1', date: '2026-10-03' }];
  assert.equal(assessmentAbsencesByDate(config, 'c', lessons).size, 0);
  lessons.push({ type: 'controle_continu', title: 'Titre personnel', date: '2026-10-04', _tempId: 'dev-block-2026-2027:s1-controle1' });
  assert.deepEqual([...assessmentAbsencesByDate(config, 'c', lessons)], [['2026-10-04', ['Amine']]]);
});

test('same-day absences accumulate, aliases do not duplicate and other classes stay separate', () => {
  const config: Partial<AppConfig> = {
    assessmentAbsences: { c: { 's1-controle1': record(['Old']), '2026-2027:s1-controle1': record(['Amine']),
      second: record(['Salma', 'Amine']) }, other: { second: record(['Other class']) } },
    assessmentDates: { c: { '2026-2027:s1-controle1': '2026-10-05', second: '2026-10-05' } },
  };
  assert.deepEqual([...assessmentAbsencesByDate(config, 'c', [])], [['2026-10-05', ['Amine', 'Salma']]]);
  config.removedAssessments = { c: ['2026-2027:s1-controle1'] };
  assert.deepEqual([...assessmentAbsencesByDate(config, 'c', [])], [['2026-10-05', ['Salma', 'Amine']]]);
});

test('cleared dates and empty canonical records do not revive stale absences', () => {
  const config: Partial<AppConfig> = { assessmentAbsences: { c: { 's1-controle1': record(['Old']), '2026-2027:s1-controle1': record([]) } },
    assessmentDates: { c: { '2026-2027:s1-controle1': '2026-10-05' } } };
  assert.equal(assessmentAbsencesByDate(config, 'c', []).size, 0);
  config.assessmentAbsences!.c['2026-2027:s1-controle1'] = record(['Amine']);
  config.assessmentDates!.c['2026-2027:s1-controle1'] = '';
  const lessons: LessonsData = [{ type: 'controle_continu', title: 'Test', date: '2026-10-05', _tempId: 'dev-block-2026-2027:s1-controle1' }];
  assert.equal(assessmentAbsencesByDate(config, 'c', lessons).size, 0);
});
