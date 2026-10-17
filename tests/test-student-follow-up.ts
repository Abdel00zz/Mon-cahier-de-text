import assert from 'node:assert/strict';
import test from 'node:test';
import { homeworkDeadlines, studentGrade, summarizeContinuousStudents } from '../src/domain/evaluations/studentFollowUp';
import type { AppConfig, ClassInfo } from '../src/types';
import { useEvaluationActions } from '../src/features/evaluations/hooks/useEvaluationActions';
import { resolveClassAssessments, getUpcomingAssessments, type UpcomingAssessment } from '../src/domain/evaluations/assessments';
import { buildFollowUpDeadlines, deadlineState, selectFollowUpDeadlines } from '../src/domain/evaluations/followUpDeadlines';
import type { HolidayCalendar } from '../src/domain/calendar/calendar';
import type { PlannedAssessment } from '../src/domain/evaluations/assessments';

const classInfo = { id: 'a', name: '1AC 1', subject: 'Mathématiques', cycle: 'college', teacherName: '' } as ClassInfo;
const base: AppConfig = { establishmentName: '', defaultTeacherName: '', printShowDescriptions: true, schoolYearStart: '2026-09-01', classRosters: { a: { names: ['Amine', 'Salma', 'Lina'], version: 1, updatedAt: '2026-10-14T08:00:00Z' } } };
const planned = (id: string, dateISO: string, type = 'oral') => ({ id, dateISO, type }) as PlannedAssessment;

test('les graphies proches ne fusionnent ni les élèves ni leurs notes', () => {
    const names = ['أحمد', 'احمد', 'André', 'Andre'];
    const config: AppConfig = { ...base,
        classRosters: { a: { names, version: 1, updatedAt: '2026-10-14' } },
        assessmentParticipants: { a: { oral: { names, updatedAt: '2026-10-14',
            oralGrades: { 'أحمد': '4', 'احمد': '16', 'André': '8', 'Andre': '20' } } } },
    };
    const stats = summarizeContinuousStudents(config, 'a', [planned('oral', '2026-10-14')], '2026-10-14');
    assert.equal(stats.total, 4);
    assert.equal(stats.graded, 4);
    assert.equal(stats.average, 12);
    assert.deepEqual(stats.support.map(pupil => pupil.name), ['أحمد', 'André']);
});

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


const calendar: HolidayCalendar = { version: 1, pays: 'MA', fuseau: 'Africa/Casablanca',
    anneeScolaire: { libelle: '2026-2027', debut: '2026-09-01', fin: '2027-07-01' }, joursFeries: [], vacances: [] };
const planning = { version: 1, plans: [] };

test('transmission réelle : les écritures de la feuille alimentent Classes et Échéances après modification et suppression', () => {
    let config: AppConfig = { ...base };
    const actions = () => useEvaluationActions('a', config, patch => { config = { ...config, ...patch }; });
    const resolved = () => resolveClassAssessments(classInfo, planning, config, calendar, '2026-10-15');
    const stats = () => summarizeContinuousStudents(config, 'a', resolved(), '2026-10-15');
    actions().saveAssessment({ id: 'written', type: 'controle', semestre: 1, num: 1, dateISO: '2026-10-12' });
    actions().saveOral('written', ['Amine', 'Salma'], { Amine: 'mastered', Salma: 'needs_support' }, { Amine: '16', Salma: '8' });
    assert.equal(stats().average, 12);
    assert.equal(stats().observed, 2);
    assert.deepEqual(stats().pending, ['Lina']);
    actions().saveOral('written', ['Amine', 'Salma'], { Amine: 'mastered', Salma: 'developing' }, { Amine: '18', Salma: '12' });
    assert.equal(stats().average, 15, 'aucune copie figée dans le suivi');
    actions().setAssessmentDate('written', '2026-10-20');
    assert.equal(stats().average, null, 'une évaluation future ne compte pas comme passée');
    const upcoming = getUpcomingAssessments([classInfo], planning, config, calendar, '2026-10-15');
    assert.equal(upcoming[0].dateISO, '2026-10-20');
    assert.equal(buildFollowUpDeadlines([classInfo], { homework: [], assessments: upcoming, activities: [], official: [] })[0].classIds[0], 'a');
    assert.equal(summarizeContinuousStudents(config, 'b', resolved(), '2026-10-21').observed, 0, 'isolement par identité de classe');
    actions().deleteAssessment('written');
    assert.equal(resolved().length, 0);
    assert.equal(stats().observed, 0);
});

test('frise : ordre chronologique, activités, événement commun unique, dates invalides et classes supprimées', () => {
    const assessment = { ...planned('same', '2026-10-20', 'controle'), classId: 'a', className: 'A', inDays: 5 } as UpcomingAssessment;
    const rows = buildFollowUpDeadlines([classInfo, { id: 'b' } as ClassInfo], {
        homework: [], assessments: [assessment, assessment, { ...assessment, classId: 'b' }, { ...assessment, id: 'invalid', dateISO: '2026-02-30' }, { ...assessment, classId: 'deleted' }],
        activities: [{ classId: 'a', event: { id: 'activity', type: 'soutien', title: 'Soutien', date: '2026-10-18', status: 'planned', createdAt: '' } }],
        official: [{ classIds: ['a', 'b', 'deleted'], event: { id: 'exam', category: 'exam', title: 'Examen', start: '2026-10-19', levels: [], dateKind: 'fixed', studentAction: '', sourcePage: 1 } }],
    });
    assert.deepEqual(rows.map(row => row.kind), ['activity', 'official', 'assessment', 'assessment']);
    assert.deepEqual(rows[1].classIds, ['a', 'b']);
    assert.equal(new Set(rows.map(row => row.id)).size, 4);
});

test('Classes : notes anciennes lues par clé historique, activités autorisées et exclusion de l’année précédente', () => {
    const config: AppConfig = { ...base, evaluationPolicy: { version: 1, updatedAt: null, kinds: { soutien: { continuous: true } } },
        assessmentParticipants: { a: { legacy: { names: ['Amine'], updatedAt: '2026-10-10', oralGrades: { Amine: '14' } } } },
        pedagogicalEvents: { a: [
            { id: 'support', type: 'soutien', title: 'Soutien', date: '2026-10-12', status: 'done', createdAt: '', students: { names: ['Salma'], updatedAt: '2026-10-12', oralGrades: { Salma: '10' } } },
            { id: 'old', type: 'soutien', title: 'Ancien soutien', date: '2025-10-12', status: 'done', createdAt: '', students: { names: ['Lina'], updatedAt: '2025-10-12', oralGrades: { Lina: '20' } } },
        ] } };
    const summary = summarizeContinuousStudents(config, 'a', [{ ...planned('2026-2027:legacy', '2026-10-10'), legacyId: 'legacy' }], '2026-10-15');
    assert.equal(summary.average, 12);
    assert.equal(summary.observed, 2);
    assert.deepEqual(summary.pending, ['Lina']);
});


test('échéances : une date passée ne termine rien ; filtres par classe et remise, périodes en cours et bornes invalides', () => {
    const config: AppConfig = { ...base, manualAssessments: { a: [
        { id: 'complete', type: 'maison', num: 1, semestre: 1, dateISO: '2026-10-01', dueDateISO: '2026-10-10' },
        { id: 'pending', type: 'maison', num: 2, semestre: 1, dateISO: '2026-10-01', dueDateISO: '2026-10-11' },
    ] }, assessmentParticipants: { a: { complete: { names: ['Amine', 'Salma', 'Lina'], updatedAt: '', homeworkOutcomes: { Amine: 'given', Salma: 'given', Lina: 'given' } } } } };
    const rows = buildFollowUpDeadlines([classInfo], {
        homework: homeworkDeadlines(config, [classInfo], '2026-10-15'), assessments: [], official: [], activities: [
            { classId: 'a', event: { id: 'ongoing', type: 'soutien', title: 'Soutien', date: '2026-10-14', endDate: '2026-10-17', status: 'planned', createdAt: '' } },
            { classId: 'a', event: { id: 'invalid', type: 'soutien', title: 'Soutien', date: '2026-10-16', endDate: '2026-02-30', status: 'planned', createdAt: '' } },
        ],
    });
    assert.deepEqual(rows.map(item => deadlineState(item, '2026-10-15')), ['complete', 'past', 'ongoing', 'upcoming']);
    assert.equal(rows[3].endDate, undefined);
    assert.equal(selectFollowUpDeadlines(rows, '2026-10-15', '', 'pending').length, 3);
    assert.equal(selectFollowUpDeadlines(rows, '2026-10-15', 'a', 'complete').length, 1);
    assert.equal(selectFollowUpDeadlines(rows, '2026-10-15', 'b', 'all').length, 0);
    assert.equal(selectFollowUpDeadlines(rows, '2026-10-15', 'a', 'all').length, 4);
});
