import assert from 'node:assert/strict';
import test from 'node:test';
import type { ContentDocument, LessonsData } from '../src/types';
import { buildLessonRows, indicesKey } from '../src/domain/notebook/lessonRows';import type { PlannedAssessment } from '../src/domain/evaluations/assessments';
import {
    findNotebookAssessments,
    linkAssessments,
    notebookDocumentPreviews,
} from '../src/domain/evaluations/assessmentSync';

/*
 * Sujet rédigé → ligne du cahier.
 *
 * Le cahier écrit « Devoir maison 1 », les évaluations rangent le sujet sous
 * l'identifiant du devoir PLANIFIÉ. Ces tests verrouillent la jointure : la
 * pastille « Document » ne peut apparaître que sur la ligne qui porte vraiment
 * un sujet, c'est-à-dire celle que `linkAssessments` désigne déjà pour les
 * écarts de date. Aucun document vide, aucune ligne muette, aucune seconde
 * table de correspondance.
 */

const document = (source: string, updatedAt = '2026-10-01T09:30:00.000Z'): ContentDocument => ({ source, updatedAt });

const planned = (overrides: Partial<PlannedAssessment> & Pick<PlannedAssessment, 'id' | 'type' | 'num'>): PlannedAssessment => ({
    schoolYear: '2026-2027',
    semestre: 1,
    label: `Devoir ${overrides.num}`,
    dateISO: '2026-10-05',
    semaine: 1,
    predictionStatus: 'derived',
    confidence: 'high',
    predictionReason: 'test',
    ...overrides,
});

/** Un devoir de premier niveau + un contrôle continu imbriqué dans une section. */
const lessons = (): LessonsData => ([
    { type: 'devoir_maison', title: 'Devoir maison 1', date: '2026-10-05' },
    {
        type: 'chapter',
        title: 'Chapitre 1',
        sections: [{ name: 'Activités', items: [{ type: 'controle_continu', title: 'Contrôle continu 1', date: '2026-10-12' }] }],
    },
]) as unknown as LessonsData;

const links = (documents: Record<string, ContentDocument> | undefined) => {
    const assessments = [
        planned({ id: '2026-2027:s1-maison1', type: 'maison', num: 1, label: 'Devoir maison 1', dateISO: '2026-10-05' }),
        planned({ id: '2026-2027:s1-controle1', type: 'controle', num: 1, label: 'Contrôle continu 1', dateISO: '2026-10-12' }),
    ];
    return notebookDocumentPreviews(linkAssessments(assessments, findNotebookAssessments(lessons()), '2026-10-20'), documents);
};

test('un sujet est rangé sous la LIGNE du cahier qui le porte', () => {
    const previews = links({
        '2026-2027:s1-maison1': document('Sujet du devoir maison 1'),
        '2026-2027:s1-controle1': document('Sujet du contrôle continu 1'),
    });

    const maison = previews.get(indicesKey({ chapterIndex: 0 }));
    assert.equal(maison?.document.source, 'Sujet du devoir maison 1');
    assert.equal(maison?.title, 'Devoir maison 1', 'le titre du cahier est celui affiché');
    assert.equal(maison?.assessmentId, '2026-2027:s1-maison1');

    // Le contrôle continu imbriqué : la clé est EXACTEMENT celle de la rangée
    // que la table compose (`indicesKey`), donc la pastille tombe sur la bonne.
    const controleKey = indicesKey({ chapterIndex: 1, sectionIndex: 0, itemIndex: 0 });
    assert.equal(previews.get(controleKey)?.document.source, 'Sujet du contrôle continu 1');
    assert.equal(previews.size, 2);
});

test('un titre vide prend le libellé du planning, le titre du cahier prime', () => {
    const entries = findNotebookAssessments([{ type: 'devoir_maison', title: '', date: '2026-10-05' }] as unknown as LessonsData);
    assert.equal(entries[0]?.title, '');
    const previews = notebookDocumentPreviews(
        [{ planned: planned({ id: 'x', type: 'maison', num: 1, label: 'Devoir maison 1' }), entry: entries[0], status: 'done' }],
        { x: document('Sujet') },
    );
    assert.equal(previews.get(indicesKey({ chapterIndex: 0 }))?.title, 'Devoir maison 1');
});

test('aucun document vide ne produit de pastille', () => {
    assert.equal(links({ '2026-2027:s1-maison1': document('   \n ') }).size, 0, 'source blanche = pas de sujet');
    assert.equal(links({}).size, 0, 'classe sans document');
    assert.equal(links(undefined).size, 0, 'réglages sans documents');
});

test('un devoir planifié sans document, ou un document orphelin, ne montrent rien', () => {
    assert.equal(links({ '2026-2027:s1-controle1': document('Sujet') }).size, 1, 'seul le contrôle a un sujet');
    assert.equal(links({ '2026-2027:s9-maison9': document('Sujet') }).size, 0, 'document d’un devoir qui n’est pas dans le cahier');
});

test('un document enregistré sous l’ancienne clé reste lisible, le millésime prime', () => {
    const legacy = planned({ id: '2026-2027:s1-maison1', legacyId: 's1-maison1', type: 'maison', num: 1 });
    const entries = findNotebookAssessments(lessons());
    const entry = entries.find(candidate => candidate.type === 'maison');
    assert.ok(entry);

    const fromLegacy = notebookDocumentPreviews(
        [{ planned: legacy, entry, status: 'done' }],
        { 's1-maison1': document('Ancien sujet') },
    );
    assert.equal(fromLegacy.get(entry.key)?.document.source, 'Ancien sujet', 'l’ancien réglage est migré à la lecture');

    const both = notebookDocumentPreviews(
        [{ planned: legacy, entry, status: 'done' }],
        { 's1-maison1': document('Ancien sujet'), '2026-2027:s1-maison1': document('Sujet à jour') },
    );
    assert.equal(both.get(entry.key)?.document.source, 'Sujet à jour');
});

test('chaque clé de sujet est une rangée réelle du cahier', () => {
    const rowKeys = new Set(buildLessonRows(lessons()).map(row => row.key));
    const previews = links({
        '2026-2027:s1-maison1': document('Sujet du devoir maison 1'),
        '2026-2027:s1-controle1': document('Sujet du contrôle continu 1'),
    });

    assert.ok(previews.size > 0);
    for (const key of previews.keys()) {
        assert.ok(rowKeys.has(key), `la clé ${key} doit être une rangée du cahier`);
    }
});
