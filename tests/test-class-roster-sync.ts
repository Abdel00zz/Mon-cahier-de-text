import assert from 'node:assert/strict';
import test from 'node:test';
import { acceptRosterEdits, editClassRoster, reconcileClassRosters, mergeRosterNames } from '../src/domain/evaluations/classRosterSync';
import { assertValidSyncSettings } from '../api/_lib/validate';
import type { ClassRoster } from '../src/types';

const now = '2026-10-16T09:00:00Z';
const base: ClassRoster = { names: ['أحمد', 'سلمى'], version: 1, updatedAt: now };

test('teacher adds multiple names once; server acknowledges and pull clears pending work', () => {
    const draft = editClassRoster(base, base.names, [...base.names, 'يوسف', 'مريم'], 'edit-1', now);
    const accepted = acceptRosterEdits({ a: base }, { a: draft }, now);
    assert.deepEqual(accepted.a.names, [...base.names, 'يوسف', 'مريم']);
    assert.equal(accepted.a.version, 2);
    assert.equal(reconcileClassRosters({ a: draft }, accepted).a.edit, undefined);
    assert.deepEqual(acceptRosterEdits(accepted, { a: draft }, now), accepted);
});

test('concurrent admin rename/removal and teacher additions survive in either sync order', () => {
    const draft = editClassRoster(base, base.names, [...base.names, 'يوسف'], 'edit-2', now);
    const admin = { ...base, names: ['أحمد العلوي', 'مريم'], version: 2 };
    const accepted = acceptRosterEdits({ a: admin }, { a: draft }, now);
    assert.deepEqual(accepted.a.names, ['أحمد العلوي', 'مريم', 'يوسف']);
    const pulled = reconcileClassRosters({ a: draft }, { a: admin });
    assert.deepEqual(pulled.a.names, accepted.a.names);
    assert.deepEqual(acceptRosterEdits({ a: admin }, pulled, now).a.names, accepted.a.names);
    const removedAgain = { ...accepted.a, names: ['مريم'] };
    assert.deepEqual(acceptRosterEdits({ a: removedAgain }, { a: draft }, now).a.names, ['مريم'], 'a retry cannot undo a later administrative edit');
});

test('a second offline edit and edits during an in-flight request are preserved', () => {
    const first = editClassRoster(base, base.names, [...base.names, 'يوسف'], 'first', now);
    const second = editClassRoster(first, first.names, ['سلمى', 'يوسف', 'مريم'], 'second', now);
    const firstAck = acceptRosterEdits({ a: base }, { a: first }, now);
    const pending = reconcileClassRosters({ a: second }, firstAck);
    assert.equal(pending.a.edit?.id, 'second');
    assert.deepEqual(pending.a.names, ['سلمى', 'يوسف', 'مريم']);
    assert.deepEqual(acceptRosterEdits(firstAck, pending, now).a.names, pending.a.names);
});

test('legacy clients and unrelated classes cannot replace a published roster', () => {
    assert.deepEqual(acceptRosterEdits({ a: base }, { a: { ...base, names: [] } }, now), { a: base });
    const draft = editClassRoster(undefined, [], ['New'], 'new', now);
    assert.deepEqual(acceptRosterEdits({ a: base }, { b: draft }, now).a, base);
    assert.throws(() => assertValidSyncSettings({ classRosters: { other: draft } }, new Set(['a'])));
    assert.throws(() => assertValidSyncSettings({ classRosters: { a: { ...draft, edit: { id: 'new', baseNames: [123] } } } }, new Set(['a'])));
    assert.throws(() => assertValidSyncSettings({ classRosters: { a: { ...draft, version: -1 } } }, new Set(['a'])));
    assert.throws(() => assertValidSyncSettings({ classRosters: { a: { ...draft, edit: { ...draft.edit, removedNames: [123] } } } }, new Set(['a'])));
    const validated = assertValidSyncSettings({ classRosters: { a: { ...draft, appliedEdits: ['fake'] } } }, new Set(['a']))!;
    assert.equal((validated.classRosters as Record<string, ClassRoster>).a.appliedEdits, undefined);
});

test('removing an unacknowledged addition survives its late acknowledgement', () => {
    const first = editClassRoster(base, base.names, [...base.names, 'يوسف'], 'first-add', now);
    const undo = editClassRoster(first, first.names, base.names, 'undo-add', now);
    const firstAck = acceptRosterEdits({ a: base }, { a: first }, now);
    const pending = reconcileClassRosters({ a: undo }, firstAck);
    assert.deepEqual(pending.a.names, base.names);
    assert.deepEqual(acceptRosterEdits(firstAck, pending, now).a.names, base.names);
    assert.deepEqual(acceptRosterEdits({ a: base }, { a: undo }, now).a.names, base.names, 'also works if the first request never arrived');
    const restored = editClassRoster(undo, undo.names, [...base.names, 'يوسف'], 'restore-add', now);
    assert.deepEqual(acceptRosterEdits({ a: base }, { a: restored }, now).a.names, first.names);
});

test('restoring an unacknowledged removal survives its late acknowledgement', () => {
    const first = editClassRoster(base, base.names, ['سلمى'], 'first-remove', now);
    const undo = editClassRoster(first, first.names, base.names, 'undo-remove', now);
    const firstAck = acceptRosterEdits({ a: base }, { a: first }, now);
    const pending = reconcileClassRosters({ a: undo }, firstAck);
    assert.deepEqual(new Set(pending.a.names), new Set(base.names));
    assert.deepEqual(acceptRosterEdits(firstAck, pending, now).a.names, pending.a.names);
});

test('editing a stale form preserves new admin students and keeps name spaces', () => {
    assert.deepEqual(mergeRosterNames(['Jean Dupont'], ['Jean Dupont', 'سلمى الفاسي'], ['Jean Dupont', 'أحمد العلوي']),
        ['Jean Dupont', 'أحمد العلوي', 'سلمى الفاسي']);
    assert.deepEqual(mergeRosterNames(base.names, [], [...base.names, 'Admin new']), ['Admin new']);
});
