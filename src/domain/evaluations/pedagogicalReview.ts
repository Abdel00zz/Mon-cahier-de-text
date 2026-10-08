import type { AppConfig } from '../../types';
import { namesWithRoster } from './studentRoster';
import { retainNotebookConditions } from './notebookConditions';
import { retainOralOutcomes } from './studentRoster';

/** One latest observation per activity: pupils are never added across sessions. */
export function summarizeClassStudentReviews(config: AppConfig, classId: string) {
    const roster = config.classRosters?.[classId];
    const notebook = [...(config.pedagogicalEvents?.[classId] ?? [])]
        .filter(event => event.type === 'controle_cahiers' && event.students)
        .sort((left, right) => right.date.localeCompare(left.date) || right.students!.updatedAt.localeCompare(left.students!.updatedAt))[0];
    const oral = Object.entries(config.assessmentParticipants?.[classId] ?? {})
        .sort((left, right) => right[1].updatedAt.localeCompare(left[1].updatedAt))[0];
    const describe = <T extends string>(names: string[], values: Record<string, T>, priorities: readonly T[], date: string) => {
        const reviewed = Object.keys(values).length;
        return {
            total: names.length, reviewed, pending: names.length - reviewed, date,
            counts: Object.fromEntries([...new Set(Object.values(values))].map(value => [value, Object.values(values).filter(item => item === value).length])),
            priorityNames: names.filter(name => Object.hasOwn(values, name) && priorities.includes(values[name])),
        };
    };
    const notebookNames = notebook ? namesWithRoster(notebook.students!.names, roster) : [];
    const oralNames = oral ? namesWithRoster(oral[1].names, roster) : [];
    return {
        notebook: notebook ? describe(notebookNames, retainNotebookConditions(notebookNames, notebook.students!.notebookConditions), ['needs_work', 'missing'], notebook.date) : null,
        oral: oral ? describe(oralNames, retainOralOutcomes(oralNames, oral[1].oralOutcomes), ['developing', 'needs_support'],
            config.assessmentDates?.[classId]?.[oral[0]] ?? config.manualAssessments?.[classId]?.find(item => item.id === oral[0])?.dateISO ?? oral[1].updatedAt.slice(0, 10)) : null,
    };
}
