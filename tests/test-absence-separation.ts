import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { migrateLessonsData } from '../src/domain/notebook/dataUtils';

test('legacy certificates leave every hierarchy level without changing course content', () => {
    const certificate = { type: 'free', title: 'Certificat', date: '2026-10-07', _tempId: 'free-absence-class-2026-10-07' };
    const manual = { type: 'free', title: 'Certificat', date: '2026-10-07', _tempId: 'manual' };
    const input = [certificate, { type: 'chapter', title: 'Cours', items: [certificate, manual],
        sections: [{ title: 'Section', subsections: [{ title: 'Sous-section', subsubsections: [
            { title: 'Détail', items: [certificate, { type: 'exercice', title: 'Exercice' }] },
        ] }] }] }];
    const original = structuredClone(input);
    const result = migrateLessonsData(input);
    assert.equal(result.length, 1);
    assert.deepEqual((result[0] as any).items, [manual]);
    assert.deepEqual((result[0] as any).sections[0].subsections[0].subsubsections[0].items,
        [{ type: 'exercice', title: 'Exercice' }]);
    assert.deepEqual(input, original, 'migration never mutates the source backup');
    assert.deepEqual(migrateLessonsData(result), result, 'migration is idempotent');
});

test('absence settings update the separate configuration without writing notebooks', () => {
    const source = readFileSync(new URL('../src/features/settings/components/AbsencesTab.tsx', import.meta.url), 'utf8');
    assert.ok(source.includes('onConfigChange({ absences:'));
    assert.ok(!source.includes('saveNotebook'));
    assert.ok(!source.includes('injectAbsenceLine'));
    assert.ok(!source.includes('readStoredNotebook'));
});
