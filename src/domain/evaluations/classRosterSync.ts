import type { AppConfig, ClassRoster } from '../../types.js';
import { normalizeStudentNames } from './studentRoster.js';

const key = (name: string) => name.toLowerCase();
const equal = (a: readonly string[], b: readonly string[]) => JSON.stringify(a) === JSON.stringify(b);

/** Apply only this editor's changes; concurrent additions and removals remain intact. */
export function mergeRosterNames(base: readonly string[], draft: readonly string[], current: readonly string[]): string[] {
    const before = new Set(base.map(key));
    const after = new Set(draft.map(key));
    const removed = new Set(base.filter(name => !after.has(key(name))).map(key));
    return normalizeStudentNames([
        ...current.filter(name => !removed.has(key(name))),
        ...draft.filter(name => !before.has(key(name))),
    ]);
}

export function editClassRoster(current: ClassRoster | undefined, base: readonly string[], draft: readonly string[], id: string, now: string): ClassRoster {
    const names = mergeRosterNames(base, normalizeStudentNames(draft), current?.names ?? []);
    if (current && equal(names, current.names)) return current;
    return { names, version: current?.version ?? 0, updatedAt: now,
        edit: { id, baseNames: current?.edit?.baseNames ?? current?.names ?? [] },
        appliedEdits: current?.appliedEdits };
}

/** Server-side: rosters sync independently of the general settings timestamp. */
export function acceptRosterEdits(remote: Record<string, ClassRoster> = {}, incoming: Record<string, ClassRoster> = {}, now: string): Record<string, ClassRoster> {
    const result = { ...remote };
    for (const [classId, draft] of Object.entries(incoming)) {
        if (!draft.edit) continue;
        const current = remote[classId];
        if (current?.appliedEdits?.includes(draft.edit.id)) continue;
        const names = mergeRosterNames(draft.edit.baseNames, draft.names, current?.names ?? []);
        result[classId] = { names, version: (current?.version ?? 0) + 1, updatedAt: now,
            appliedEdits: [...(current?.appliedEdits ?? []), draft.edit.id].slice(-100) };
    }
    return result;
}

/** Pull/ack: retain edits made offline or while the request was in flight. */
export function reconcileClassRosters(local: Record<string, ClassRoster> = {}, remote: Record<string, ClassRoster> = {}): Record<string, ClassRoster> {
    const result = { ...remote };
    for (const [classId, draft] of Object.entries(local)) {
        if (!draft.edit) continue;
        const current = remote[classId];
        if (current?.appliedEdits?.includes(draft.edit.id)) continue;
        result[classId] = { ...draft, names: mergeRosterNames(draft.edit.baseNames, draft.names, current?.names ?? []),
            edit: { ...draft.edit, baseNames: current?.names ?? [] } };
    }
    return result;
}

/** Offer historical names for explicit migration, without interpreting absences as a class list. */
export function historicalStudentNames(config: Partial<AppConfig>, classId: string): string[] {
    const records = [...Object.values(config.assessmentParticipants?.[classId] ?? {}),
        ...Object.values(config.assessmentAbsences?.[classId] ?? {}),
        ...(config.pedagogicalEvents?.[classId] ?? []).flatMap(event => event.students ? [event.students] : [])];
    return [...new Set(records.flatMap(record => record.names))].slice(0, 200);
}

export function classRosterPatch(config: Partial<AppConfig>, classId: string, base: string[], names: string[]): Partial<AppConfig> {
    return { classRosters: { ...config.classRosters, [classId]: editClassRoster(config.classRosters?.[classId], base, names,
        crypto.randomUUID(), new Date().toISOString()) } };
}
