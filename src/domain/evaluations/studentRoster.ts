import type { ClassRoster, OralOutcome } from '../../types.js';

const MAX_STUDENTS = 200;
const MAX_STUDENT_NAME = 120;
const ORAL_OUTCOMES: readonly OralOutcome[] = ['mastered', 'developing', 'needs_support'];

/** Search tolerates Arabic vocalisation/tatweel, Latin accents and extra spaces. */
export const studentSearchKey = (name: string): string => name.normalize('NFKD')
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').toLowerCase().trim().replace(/\s+/g, ' ');

export function normalizeStudentNames(input: readonly string[]): string[] {
    const names: string[] = [];
    const seen = new Set<string>();
    for (const raw of input) {
        const name = raw.trim().replace(/\s+/g, ' ');
        const key = name.toLowerCase();
        if (!name || seen.has(key)) continue;
        if (name.length > MAX_STUDENT_NAME) throw new Error('Chaque nom doit contenir au maximum 120 caractères.');
        seen.add(key);
        names.push(name);
    }
    if (names.length > MAX_STUDENTS) throw new Error('La liste est limitée à 200 élèves par classe.');
    return names;
}

export const parseStudentNames = (input: string): string[] => normalizeStudentNames(input.split(/[،؛,;\r\n]+/));

/** Session data remains intact; a supplied roster fills the list without copying observations. */
export const namesWithRoster = (names: readonly string[], roster?: ClassRoster): string[] => {
    const current = normalizeStudentNames(names);
    const seen = new Set(current.map(name => name.toLowerCase()));
    const extra = normalizeStudentNames(roster?.names ?? []).filter(name => !seen.has(name.toLowerCase()));
    return [...current, ...extra].slice(0, MAX_STUDENTS);
};

export const retainOralOutcomes = (names: readonly string[], values?: Record<string, OralOutcome>): Record<string, OralOutcome> =>
    Object.fromEntries(names.filter(name => values && Object.hasOwn(values, name) && ORAL_OUTCOMES.includes(values[name]))
        .map(name => [name, values![name]]));

/** Only lists belonging to the current classes may cross the account boundary. */
export const rostersForClasses = (rosters: Record<string, ClassRoster> | undefined, classIds: readonly string[]): Record<string, ClassRoster> =>
    Object.fromEntries(classIds.filter(id => rosters && Object.hasOwn(rosters, id)).map(id => [id, rosters![id]]));
