import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { adminActivities, adminAssessmentDocuments } from '../src/domain/evaluations/adminDocuments';
import { MAX_CONTENT_DOCUMENT_CHARS } from '../src/constants/contentDocument';
import type { AppConfig, ContentDocument, PedagogicalEvent } from '../src/types';

/*
 * Ce que la direction relit du travail écrit : les documents des devoirs et les
 * activités pédagogiques, rattachés à SES classes.
 *
 * Ces tests verrouillent trois promesses : rien de plus que la source (lecture
 * seule), rien de vide ni d'illimité, et jamais la liste nominative des élèves.
 */

const document = (source: string, updatedAt = '2026-10-06T10:00:00.000Z'): ContentDocument => ({ source, updatedAt });

const activity = (id: string, extra: Partial<PedagogicalEvent> = {}): PedagogicalEvent => ({
    id,
    type: 'olympiade',
    title: 'Olympiade de mathématiques',
    date: '2026-09-14',
    status: 'planned',
    createdAt: '2026-09-01T00:00:00.000Z',
    ...extra,
});

const settings = {
    assessmentDocuments: {
        c1: { '2026:s1-controle1': document('# Devoir surveillé 1'), legacy: document('Ancien sujet') },
        c2: { '2026:s1-controle1': document('Devoir d’une autre classe') },
        c3: { vide: document('   ') },
    },
    pedagogicalEvents: {
        c1: [
            activity('e1', { document: document('## Exercice 1\n[[2pts]]'), students: { names: ['Amin', 'Salma'], updatedAt: '2026-09-15T00:00:00.000Z' } }),
            activity('e2', { type: 'controle_cahiers', title: 'Contrôle des cahiers' }),
        ],
        c2: [activity('e3')],
    },
} as unknown as Partial<AppConfig>;

test('les documents sont rangés par classe, sans rien d’autre que la source', () => {
    const documents = adminAssessmentDocuments(settings, ['c1']);
    assert.deepEqual(Object.keys(documents), ['c1']);
    assert.deepEqual(Object.keys(documents.c1).sort(), ['2026:s1-controle1', 'legacy']);
    assert.equal(documents.c1['2026:s1-controle1'].source, '# Devoir surveillé 1');
    assert.equal(documents.c1['2026:s1-controle1'].updatedAt, '2026-10-06T10:00:00.000Z');
    // La direction ne reçoit QUE `source` et `updatedAt` : rien d'éditable.
    assert.deepEqual(Object.keys(documents.c1.legacy).sort(), ['source', 'updatedAt']);
    // Une classe hors périmètre n'est jamais publiée, même remplie.
    assert.equal(adminAssessmentDocuments(settings, ['c1']).c2, undefined);
    assert.deepEqual(adminAssessmentDocuments(settings, []), {});
    assert.deepEqual(adminAssessmentDocuments(undefined, ['c1']), {});
});

test('un document vide disparaît, un document trop long est borné', () => {
    const documents = adminAssessmentDocuments(settings, ['c1', 'c3']);
    // c3 ne contient qu'une source blanche : la classe disparaît de la charge.
    assert.equal(documents.c3, undefined);
    const long = adminAssessmentDocuments(
        { assessmentDocuments: { c1: { gros: document('x'.repeat(MAX_CONTENT_DOCUMENT_CHARS + 500)) } } } as unknown as Partial<AppConfig>,
        ['c1'],
    );
    assert.equal(long.c1.gros.source.length, MAX_CONTENT_DOCUMENT_CHARS);
    // La borné est bien celle du professeur, pas une seconde limite inventée.
    assert.equal(MAX_CONTENT_DOCUMENT_CHARS, 20_000);
});

test('les activités arrivent avec leur compte d’élèves, jamais leurs noms', () => {
    const activities = adminActivities(settings, ['c1', 'c2']);
    assert.deepEqual(Object.keys(activities).sort(), ['c1', 'c2']);
    const [first, second] = activities.c1;
    assert.equal(first.id, 'e1');
    assert.equal(first.students, 2);
    assert.equal(first.document?.source, '## Exercice 1\n[[2pts]]');
    // Aucun nom d'élève ne sort du cahier : la clé `names` n'existe pas.
    assert.equal(JSON.stringify(activities).includes('Amin'), false);
    assert.equal(JSON.stringify(activities).includes('names'), false);
    // Une activité sans document reste visible (l'administrateur voit l'action).
    assert.equal(second.type, 'controle_cahiers');
    assert.equal(second.document, null);
    assert.equal(second.students, 0);
    // La classe hors périmètre n'est pas publiée.
    assert.equal(adminActivities(settings, ['c1']).c2, undefined);
});

test('le serveur publie cette projection dans la fiche professeur', () => {
    const api = readFileSync('api/admin.ts', 'utf8');
    assert.match(api, /import \{ adminActivities, adminAssessmentDocuments \} from '\.\.\/src\/domain\/evaluations\/adminDocuments\.js'/);
    assert.match(api, /\.\.\.pickTeacherWork\(classesBlob\?\.settings, classesBlob\?\.classes \?\? \[\]\)/);
    // La charge est ajoutée à côté des dates et des réglages d'impression.
    assert.match(api, /assessmentDates: classesBlob\?\.settings\?\.assessmentDates \?\? \{\},[\s\S]*?\.\.\.pickTeacherWork/);
    const client = readFileSync('src/admin/api.ts', 'utf8');
    assert.match(client, /documents: Record<string, Record<string, ContentDocument>>/);
    assert.match(client, /activities: Record<string, AdminActivityDocument\[\]>/);
});

test('l’onglet Devoirs ouvre la page composée par le professeur', () => {
    const detail = readFileSync('src/admin/components/TeacherDetail.tsx', 'utf8');
    // Les documents de la charge sont transmis à l'onglet, avec l'activité.
    assert.match(detail, /documents=\{data\.documents \?\? \{\}\}/);
    assert.match(detail, /activities=\{data\.activities \?\? \{\}\}/);
    assert.match(detail, /onPreview=\{setPreview\}/);
    // Chaque carte ouvre l'aperçu, et l'identifiant historique est relu aussi.
    assert.match(detail, /onPreview\(previewTarget\(document, title, /);
    assert.match(detail, /row\.legacyId \? documents\[row\.classId\]\?\.\[row\.legacyId\]/);
    assert.match(detail, /<AdminActivities classes=\{classes\} activities=\{activities\} onPreview=\{onPreview\} \/>/);
    const preview = readFileSync('src/admin/components/AdminDocumentPreview.tsx', 'utf8');
    // Même moteur que la feuille du professeur, même feuille de style.
    assert.match(preview, /renderDescriptionWithBold\(source\)/);
    assert.match(preview, /className="devoir-document mx-auto max-w-\[44rem\]"/);
    // Lecture seule : aucun champ, aucune écriture.
    for (const forbidden of ['Textarea', 'onSave', 'contentEditable']) {
        assert.equal(preview.includes(forbidden), false, `${forbidden} n'a pas sa place dans une relecture`);
    }
});
