import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeClassMetadata, updateClassMetadata } from '../src/domain/classes/classMetadata';
import { assertValidClasses } from '../api/_lib/validate';
import type { ClassInfo } from '../src/types';

const base: ClassInfo = { id: 'a', name: '1AC 1', group: '1', teacherName: 'Prof', subject: 'Mathématiques', color: '', createdAt: '2026-10-01T08:00:00Z' };
test('un groupe modifié se transmet sans modifier le cahier ; un ancien appareil ne le rétablit pas', () => {
    const updated = updateClassMetadata(base, { name: '1AC 2', group: '2' }, Date.parse('2026-10-17T10:00:00Z'));
    const stored = assertValidClasses([updated])[0];
    assert.equal(stored.metadataUpdatedAt, updated.metadataUpdatedAt);
    assert.equal(mergeClassMetadata(base, stored).group, '2');
    assert.equal(mergeClassMetadata(stored, base).group, '2');
    const openingOldCard = updateClassMetadata(base, { lastOpenedAt: '2026-10-18T10:00:00Z' });
    assert.equal(openingOldCard.metadataUpdatedAt, undefined);
    assert.equal(mergeClassMetadata(stored, openingOldCard).group, '2');
});
test('éditions successives professeur et administration : la dernière version gagne, les anciennes copies restent sans effet', () => {
    const teacher = updateClassMetadata(base, { group: '2' }, 1000);
    const admin = updateClassMetadata(teacher, { group: '3' }, 2000);
    assert.equal(mergeClassMetadata(admin, teacher, admin).group, '3');
    const correction = updateClassMetadata(admin, { group: '4' }, 3000);
    assert.equal(mergeClassMetadata(admin, correction, admin).group, '4');
    assert.equal(mergeClassMetadata(correction, admin, admin).group, '4');
    assert.equal(updateClassMetadata(correction, { group: '4' }, 4000).metadataUpdatedAt, correction.metadataUpdatedAt);
    assert.ok(Date.parse(updateClassMetadata(correction, { group: '5' }, 1).metadataUpdatedAt!) > 3000);
});
test('deux éditions à la même milliseconde convergent vers la version acceptée par le serveur', () => {
    const server = updateClassMetadata(base, { group: '2' }, 1000);
    const secondDevice = updateClassMetadata(base, { group: '3' }, 1000);
    const uploaded = mergeClassMetadata(server, secondDevice);
    assert.equal(uploaded.group, '2');
    const downloaded = mergeClassMetadata(secondDevice, uploaded, undefined, 'incoming');
    assert.equal(downloaded.group, '2');
    assert.equal(mergeClassMetadata(uploaded, downloaded).group, '2');
});

test('un ancien override administratif conserve ses champs et une version invalide est refusée', () => {
    assert.equal(mergeClassMetadata(base, { ...base, name: 'Old device' }, { ...base, name: 'Direction' }).name, 'Direction');
    assert.throws(() => assertValidClasses([{ ...base, metadataUpdatedAt: 'not-a-date' }]));
});

test('explicit notebook setup survives validation, cloud merging and admin identity edits without guessing legacy sources', () => {
    const personal = updateClassMetadata(base, { notebookContentOrigin: 'personal' }, 1000);
    const predefined = updateClassMetadata(personal, { notebookContentOrigin: 'predefined' }, 2000);
    const stored = assertValidClasses([predefined])[0];
    assert.equal(stored.notebookContentOrigin, 'predefined');
    assert.equal(mergeClassMetadata(stored, personal).notebookContentOrigin, 'predefined');
    assert.equal(mergeClassMetadata(stored, stored, { ...stored, name: 'Renamed', metadataUpdatedAt: new Date(3000).toISOString() }).notebookContentOrigin, 'predefined');
    assert.equal(assertValidClasses([base])[0].notebookContentOrigin, undefined);
    assert.throws(() => assertValidClasses([{ ...base, notebookContentOrigin: 'guessed' }]));
});
