import type { AppConfig, ClassRoster } from '../../types.js';
import { MAX_STUDENTS, normalizeStudentNames, studentIdentityKey } from './studentRoster.js';
import { dequal } from 'dequal';

const key = studentIdentityKey;
const equal = (a: readonly string[], b: readonly string[]) => dequal(a, b);

function pendingBase(edit: NonNullable<ClassRoster['edit']>): string[] {
    const added = new Set((edit.addedNames ?? []).map(key));
    return [...edit.baseNames.filter(name => !added.has(key(name))), ...(edit.removedNames ?? [])];
}

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
    // A previous request can still add a pupil that this newer edit has just removed.
    // Keep that intent until acknowledgement, even when the pupil was absent from the original base.
    const kept = new Set(names.map(key));
    const before = new Set(base.map(key));
    const after = new Set(draft.map(key));
    const removedNames = normalizeStudentNames([...(current?.edit?.removedNames ?? []),
        ...base.filter(name => !after.has(key(name)))].filter(name => !kept.has(key(name))));
    const addedNames = normalizeStudentNames([...(current?.edit?.addedNames ?? []),
        ...draft.filter(name => !before.has(key(name)))].filter(name => kept.has(key(name))));
    return { names, version: current?.version ?? 0, updatedAt: now,
        edit: { id, baseNames: current?.edit?.baseNames ?? current?.names ?? [],
            ...(addedNames.length ? { addedNames } : {}),
            ...(removedNames.length ? { removedNames } : {}) },
        appliedEdits: current?.appliedEdits };
}

/** Server-side: rosters sync independently of the general settings timestamp. */
export function acceptRosterEdits(remote: Record<string, ClassRoster> = {}, incoming: Record<string, ClassRoster> = {}, now: string): Record<string, ClassRoster> {
    const result: Record<string, ClassRoster> = Object.assign(Object.create(null), remote);
    for (const [classId, draft] of Object.entries(incoming)) {
        if (!draft.edit) continue;
        const current = Object.hasOwn(remote, classId) ? remote[classId] : undefined;
        if (current?.appliedEdits?.includes(draft.edit.id)) continue;
        const names = mergeRosterNames(pendingBase(draft.edit), draft.names, current?.names ?? []);
        result[classId] = { names, version: (current?.version ?? 0) + 1, updatedAt: now,
            appliedEdits: [...(current?.appliedEdits ?? []), draft.edit.id].slice(-100) };
    }
    return { ...result };
}

/** Pull/ack: retain edits made offline or while the request was in flight. */
export function reconcileClassRosters(local: Record<string, ClassRoster> = {}, remote: Record<string, ClassRoster> = {}): Record<string, ClassRoster> {
    const result: Record<string, ClassRoster> = Object.assign(Object.create(null), remote);
    for (const [classId, draft] of Object.entries(local)) {
        if (!draft.edit) continue;
        const current = Object.hasOwn(remote, classId) ? remote[classId] : undefined;
        if (current?.appliedEdits?.includes(draft.edit.id)) continue;
        result[classId] = { ...draft, names: mergeRosterNames(pendingBase(draft.edit), draft.names, current?.names ?? []),
            edit: { ...draft.edit, baseNames: current?.names ?? [] } };
    }
    return { ...result };
}

/** Offer historical names for explicit migration, without interpreting absences as a class list. */
export function historicalStudentNames(config: Partial<AppConfig>, classId: string): string[] {
    const records = [...Object.values(config.assessmentParticipants?.[classId] ?? {}),
        ...Object.values(config.assessmentAbsences?.[classId] ?? {}),
        ...(config.pedagogicalEvents?.[classId] ?? []).flatMap(event => event.students ? [event.students] : [])];
    return [...new Set(records.flatMap(record => record.names))].slice(0, MAX_STUDENTS);
}

export function classRosterPatch(config: Partial<AppConfig>, classId: string, base: string[], names: string[]): Partial<AppConfig> {
    return { classRosters: { ...config.classRosters, [classId]: editClassRoster(config.classRosters?.[classId], base, names,
        crypto.randomUUID(), new Date().toISOString()) } };
}
