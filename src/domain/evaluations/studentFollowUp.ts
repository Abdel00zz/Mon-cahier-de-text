import type { AppConfig, ClassInfo, OralStudentsRecord } from '../../types';
import type { PlannedAssessment } from './assessments';
import { daysBetweenISO } from './assessments';
import { schoolYearLabelFromDate } from '../calendar/calendar';
import { resolveKindPolicy } from './evaluationPolicy';
import { countHomeworkOutcomes } from './homeworkSubmissions';
import { namesWithRoster, retainOralOutcomes, studentIdentityKey } from './studentRoster';

/** A free-form grade is counted only when it unambiguously represents a mark out of twenty. */
export function studentGrade(value: string | undefined): number | null {
    if (!value?.trim()) return null;
    const normalized = value.trim().replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 1632))
        .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 1776)).replace(/[،٫,]/g, '.');
    const match = normalized.match(/^(\d{1,2}(?:\.\d{1,2})?)\s*(?:\/\s*20)?$/);
    if (!match) return null;
    const number = Number(match[1]);
    return number >= 0 && number <= 20 ? number : null;
}

/** Latest known observation per pupil, restricted to this year's continuous assessment. */
export function summarizeContinuousStudents(config: AppConfig, classId: string, assessments: readonly PlannedAssessment[], today: string) {
    const records: { record: OralStudentsRecord; date: string }[] = [];
    const year = schoolYearLabelFromDate(config.schoolYearStart || today);
    for (const assessment of assessments) {
        if (!resolveKindPolicy(config.evaluationPolicy, assessment.type).continuous || !assessment.dateISO || assessment.dateISO > today
            || (assessment.schoolYear && assessment.schoolYear !== year)) continue;
        const record = config.assessmentParticipants?.[classId]?.[assessment.id]
            ?? (assessment.legacyId ? config.assessmentParticipants?.[classId]?.[assessment.legacyId] : undefined);
        if (record && (record.oralOutcomes || record.oralGrades)) records.push({ record, date: assessment.dateISO });
    }
    for (const event of config.pedagogicalEvents?.[classId] ?? []) {
        if (!event.students || !resolveKindPolicy(config.evaluationPolicy, event.type).continuous || event.date > today
            || schoolYearLabelFromDate(event.date) !== year || !(event.students.oralOutcomes || event.students.oralGrades)) continue;
        records.push({ record: event.students, date: event.date });
    }
    records.sort((a, b) => a.date.localeCompare(b.date) || a.record.updatedAt.localeCompare(b.record.updatedAt));
    const pupils = new Map<string, { name: string; grade: number | null; previousGrade?: number; outcome?: string }>();
    for (const name of config.classRosters?.[classId]?.names ?? []) pupils.set(studentIdentityKey(name), { name, grade: null });
    for (const { record } of records) {
        const outcomes = retainOralOutcomes(record.names, record.oralOutcomes);
        for (const name of record.names) {
            const key = studentIdentityKey(name);
            const current = pupils.get(key) ?? { name, grade: null };
            const grade = studentGrade(Object.hasOwn(record.oralGrades ?? {}, name) ? record.oralGrades![name] : undefined);
            pupils.set(key, { ...current, grade: grade ?? current.grade,
                previousGrade: grade !== null && current.grade !== null ? current.grade : current.previousGrade,
                outcome: Object.hasOwn(outcomes, name) ? outcomes[name] : current.outcome });
        }
    }
    const values = [...pupils.values()];
    const grades = values.flatMap(value => value.grade === null ? [] : [value.grade]);
    const bins = [0, 0, 0, 0];
    for (const grade of grades) bins[grade < 5 ? 0 : grade < 10 ? 1 : grade < 15 ? 2 : 3]++;
    return {
        total: values.length,
        observed: values.filter(value => value.outcome || value.grade !== null).length,
        graded: grades.length,
        average: grades.length ? grades.reduce((sum, value) => sum + value, 0) / grades.length : null,
        bins,
        outcomes: ['mastered', 'developing', 'needs_support'].map(state => ({ state, count: values.filter(value => value.outcome === state).length })),
        sessions: records.length,
        pending: values.filter(value => !value.outcome && value.grade === null).map(value => value.name),
        support: values.filter(value => value.outcome === 'needs_support' || (value.grade !== null && value.grade < 10)),
        progressing: values.filter(value => value.grade !== null && value.previousGrade !== undefined && value.grade > value.previousGrade).map(value => value.name),
        declining: values.filter(value => value.grade !== null && value.previousGrade !== undefined && value.grade < value.previousGrade).map(value => value.name),
    };
}

/** Due dates use the same saved homework records as the evaluation editor. */
export function homeworkDeadlines(config: AppConfig, classes: readonly ClassInfo[], today: string) {
    const year = schoolYearLabelFromDate(config.schoolYearStart || today);
    return classes.flatMap(classInfo => {
        const removed = new Set(config.removedAssessments?.[classInfo.id] ?? []);
        const seen = new Set<string>();
        return (config.manualAssessments?.[classInfo.id] ?? []).flatMap(item => {
            const key = item.id.replace(/^\d{4}-\d{4}:/, '');
            if (item.type !== 'maison' || !item.dueDateISO || !/^\d{4}-\d{2}-\d{2}$/.test(item.dueDateISO)
                || (item.schoolYear ?? schoolYearLabelFromDate(item.dateISO)) !== year
                || removed.has(item.id) || removed.has(key) || removed.has(`${year}:${key}`) || seen.has(key)) return [];
            seen.add(key);
            const records = config.assessmentParticipants?.[classInfo.id];
            const record = records?.[`${year}:${key}`] ?? records?.[item.id] ?? records?.[key];
            const names = namesWithRoster(record?.names ?? [], config.classRosters?.[classInfo.id]);
            const summary = countHomeworkOutcomes(names, record?.homeworkOutcomes);
            return [{ classInfo, assessmentId: item.id, num: item.num, dueDate: item.dueDateISO,
                inDays: daysBetweenISO(today, item.dueDateISO), total: names.length, ...summary,
                missingNames: names.filter(name => Object.hasOwn(record?.homeworkOutcomes ?? {}, name) && record!.homeworkOutcomes![name] === 'missing'),
                pendingNames: names.filter(name => !Object.hasOwn(record?.homeworkOutcomes ?? {}, name)),
            }];
        });
    }).sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.classInfo.name.localeCompare(b.classInfo.name));
}
