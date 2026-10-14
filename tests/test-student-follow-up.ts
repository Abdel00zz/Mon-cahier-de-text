import assert from 'node:assert/strict';
import test from 'node:test';
import { homeworkDeadlines, studentGrade, summarizeContinuousStudents } from '../src/domain/evaluations/studentFollowUp';
import type { AppConfig, ClassInfo } from '../src/types';
import type { PlannedAssessment } from '../src/domain/evaluations/assessments';

const classInfo = { id: 'a', name: '1AC 1' } as ClassInfo;
const base: AppConfig = { establishmentName: '', defaultTeacherName: '', printShowDescriptions: true, schoolYearStart: '2026-09-01', classRosters: { a: { names: ['Amine', 'Salma', 'Lina'], version: 1, updatedAt: '2026-10-14T08:00:00Z' } } };
const planned = (id: string, dateISO: string, type = 'oral') => ({ id, dateISO, type }) as PlannedAssessment;

test('notes : zéro réel, décimales françaises et chiffres arabes ; une valeur absente ou ambiguë ne devient pas zéro', () => {
    for (const [value, expected] of [['0', 0], ['12,5/20', 12.5], ['١٥٫٥ /٢٠', 15.5], ['20', 20]] as const) assert.equal(studentGrade(value), expected);
    for (const value of [undefined, '', 'absent', '-1', '21', '12/10', '2e1', '12abc']) assert.equal(studentGrade(value), null);
});

test('statistiques : chaque élève compte une fois, la dernière observation datée prime, les absents ne sont pas des zéros', () => {
    const config: AppConfig = { ...base, assessmentParticipants: { a: {
        old: { names: ['Amine', 'Salma'], updatedAt: '2026-10-14T09:00:00Z', oralGrades: { Amine: '4', Salma: '0' }, oralOutcomes: { Amine: 'needs_support' } },
        recent: { names: ['Amine'], updatedAt: '2026-10-12T08:00:00Z', oralGrades: { Amine: '16', Deleted: '20' }, oralOutcomes: { Amine: 'mastered' } },
        future: { names: ['Lina'], updatedAt: '2026-10-13T08:00:00Z', oralGrades: { Lina: '20' } },
    } } };
    const stats = summarizeContinuousStudents(config, 'a', [planned('old', '2026-10-01'), planned('recent', '2026-10-12'), planned('future', '2026-10-20')], '2026-10-14');
    assert.equal(stats.total, 3);
    assert.equal(stats.observed, 2);
    assert.equal(stats.graded, 2);
    assert.equal(stats.average, 8);
    assert.deepEqual(stats.bins, [1, 0, 0, 1]);
    assert.equal(stats.outcomes[0].count, 1);
    assert.deepEqual(stats.pending, ['Lina']);
    assert.deepEqual(stats.support.map(pupil => pupil.name), ['Salma']);
    assert.deepEqual(stats.progressing, ['Amine']);
    assert.equal(summarizeContinuousStudents(config, 'other', [], '2026-10-14').total, 0);
});

test('échéances : source enregistrée, isolement des classes, année active, suppressions et états inconnus', () => {
    const config: AppConfig = { ...base, manualAssessments: { a: [
        { id: 'due', type: 'maison', num: 1, semestre: 1, dateISO: '2026-10-01', dueDateISO: '2026-10-14' },
        { id: 'deleted', type: 'maison', num: 2, semestre: 1, dateISO: '2026-10-01', dueDateISO: '2026-10-16' },
        { id: 'old', type: 'maison', num: 3, semestre: 1, dateISO: '2025-10-01', dueDateISO: '2025-10-16' },
    ] }, removedAssessments: { a: ['deleted'] }, assessmentParticipants: { a: { due: { names: ['Amine', 'Salma'], homeworkOutcomes: { Amine: 'given', Salma: 'missing' }, updatedAt: '2026-10-14T08:00:00Z' } } } };
    const deadlines = homeworkDeadlines(config, [classInfo], '2026-10-14');
    assert.equal(deadlines.length, 1);
    assert.equal(deadlines[0].inDays, 0);
    assert.deepEqual([deadlines[0].given, deadlines[0].missing, deadlines[0].pending], [1, 1, 1]);
    assert.deepEqual(deadlines[0].missingNames, ['Salma']);
    assert.deepEqual(deadlines[0].pendingNames, ['Lina']);
    assert.equal(homeworkDeadlines(config, [], '2026-10-14').length, 0);
    config.manualAssessments!.a[0].dueDateISO = '2026-10-17';
    assert.equal(homeworkDeadlines(config, [classInfo], '2026-10-14')[0].inDays, 3, 'la modification du devoir est immédiatement reprise');
});

test('statistiques : les activités exclues du contrôle continu par la direction ne sont pas agrégées', () => {
    const config = { ...base, evaluationPolicy: { version: 1, updatedAt: null, kinds: { oral: { continuous: false } } }, assessmentParticipants: { a: {
        oral: { names: ['Amine'], oralGrades: { Amine: '20' }, updatedAt: '2026-10-14T08:00:00Z' },
    } } } as AppConfig;
    assert.equal(summarizeContinuousStudents(config, 'a', [planned('oral', '2026-10-14')], '2026-10-14').average, null);
});
