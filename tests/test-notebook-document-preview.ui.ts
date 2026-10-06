import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { ContentRenderer } from '../src/features/editor/ContentRenderer';
import type { NotebookDocumentPreview } from '../src/domain/evaluations/assessmentSync';

/*
 * Pastille « Document » dans la table du cahier.
 *
 * Un devoir maison / contrôle continu qui a un sujet le dit sur sa propre
 * ligne : la pastille n'existe que si un document existe, elle ouvre un aperçu
 * en lecture seule, et elle ne part JAMAIS à l'impression (le cahier imprimé
 * reste la trace pédagogique, pas la table de matières des fichiers).
 */

const preview: NotebookDocumentPreview = {
    document: { source: 'Sujet du devoir', updatedAt: '2026-10-01T09:30:00.000Z' },
    title: 'Devoir maison 1',
    assessmentId: '2026-2027:s1-maison1',
};

const row = (options: { preview?: NotebookDocumentPreview; isPrint?: boolean } = {}) => renderToStaticMarkup(
    React.createElement(LocaleProvider, {
        locale: 'fr',
        children: React.createElement(ContentRenderer, {
            data: { type: 'devoir_maison', title: 'Devoir maison 1' },
            indices: { chapterIndex: 0 },
            elementType: 'devoir_maison',
            isPrint: options.isPrint,
            getDocumentPreview: () => options.preview,
            onOpenDocumentPreview: () => undefined,
        }),
    }),
);

test('un devoir rédigé affiche la pastille, un devoir sans sujet non', () => {
    const withDocument = row({ preview });
    assert.match(withDocument, /data-document-chip="true"/, 'la pastille est là');
    assert.match(withDocument, /editor-doc-chip/, 'elle porte son style dédié');
    assert.match(withDocument, />Document</, 'son libellé est traduit, court et ciblé');
    assert.match(withDocument, /aria-label="Ouvrir le document — Devoir maison 1"/, 'le libellé accessible nomme le devoir');

    assert.doesNotMatch(row({ preview: undefined }), /data-document-chip/, 'aucun document = aucune pastille');
    assert.doesNotMatch(row(), /data-document-chip/, 'la table sans lecteur de sujet reste intacte');
});

test('la pastille ne part jamais à l’impression', () => {
    assert.doesNotMatch(row({ preview, isPrint: true }), /data-document-chip/, 'le cahier imprimé se passe de la pastille');
});

test('la table passe la lecture du sujet jusqu’aux rangées mémoïsées', () => {
    // Piège connu : une prop ajoutée sans mise à jour du comparateur fige le
    // rendu. Les deux comparateurs doivent donc connaître la pastille.
    const table = readFileSync('src/features/editor/MainTable.tsx', 'utf8');
    const tableRow = readFileSync('src/features/editor/TableRow.tsx', 'utf8');
    for (const source of [table, tableRow]) {
        assert.match(source, /prev(?:ious)?\.getDocumentPreview !== next\.getDocumentPreview/, 'comparateur de table à jour');
        assert.match(source, /onOpenDocumentPreview/, 'la fonction d’ouverture circule');
    }
    assert.match(table, /getDocumentPreview=\{getDocumentPreview\}/, 'les rangées reçoivent la lecture');
    assert.match(readFileSync('src/features/editor/ContentRenderer.tsx', 'utf8'), /getDocumentPreview\(indicesKey\(indices\)\)/, 'la clé de lecture est celle de la ligne');
});

test('l’éditeur ouvre l’aperçu du sujet sans quitter le cahier', () => {
    const editor = readFileSync('src/features/editor/Editor.tsx', 'utf8');
    assert.match(editor, /useNotebookDocumentPreviews\(classInfo, config, lessonsData\)/, 'les sujets viennent du moteur partagé');
    assert.match(editor, /onOpenDocumentPreview=\{handleOpenDocumentPreview\}/, 'le cahier ouvre l’aperçu');
    assert.match(editor, /<DocumentPreview[\s\S]*?isOpen=\{openDocument !== null\}/, 'une seule fenêtre, fermée par défaut');
    assert.match(editor, /source=\{openDocument\?\.document\.source\}/, 'la source est lue telle quelle, sans recopie');

    const hook = readFileSync('src/features/editor/hooks/useNotebookDocumentPreviews.ts', 'utf8');
    assert.match(hook, /linkAssessments/, 'même moteur de correspondance que les écarts de date');
    assert.match(hook, /Object\.keys\(documents\)\.length > 0/, 'aucun calcul pour une classe sans document');
});

test('l’aperçu est une fenêtre de lecture, minimale par construction', () => {
    const source = readFileSync('src/components/documents/DocumentPreview.tsx', 'utf8');
    assert.match(source, /renderDescriptionWithBold/, 'la page est composée par le moteur du cahier');
    assert.match(source, /devoir-document/, 'même feuille que la fiche de devoir');
    assert.match(source, /isOpen && source\?\.trim\(\)/, 'rien n’est composé tant que la fenêtre est fermée');
    assert.doesNotMatch(source, /Textarea|contentEditable|onSave/, 'aucun champ, aucun enregistrement : lecture seule');
    assert.match(source, /overflow-y-auto/, 'une page longue défile dans la fenêtre, jamais la page entière');

    // La classe de la pastille vit dans la charte, pas en ligne.
    const css = readFileSync('src/styles/index.css', 'utf8');
    assert.match(css, /\.editor-doc-chip \{/, 'style dédié');
    assert.match(css, /\.editor-doc-chip:active \{[\s\S]*?brightness\(0\.92\)/, 'état pressé conforme (assombri)');
    assert.match(css, /touch-action: manipulation/, 'réactif au doigt, sans délai de double-tap');
    assert.match(css, /prefers-reduced-motion[\s\S]{0,200}\.editor-doc-chip/, 'animations désactivables');
});

test('l’en-tête de la fenêtre ne dit qu’une phrase : le nom et la classe vivent dans la feuille', () => {
    const source = readFileSync('src/components/documents/DocumentPreview.tsx', 'utf8');
    // La barre de la fenêtre porte la phrase de cadrage, et rien d’autre :
    // ni nom du devoir, ni classe, ni date — ces données appartiennent au document.
    assert.match(source, /title=\{t\('documentPreview\.heading'\)\}/, 'la barre ne porte que la phrase');
    assert.doesNotMatch(source, /FileText className="h-5 w-5"/, 'plus de grand cartouche d’en-tête');
    assert.match(source, /\{title\}<\/span>/, 'le nom du devoir ouvre le corps de l’aperçu');
    assert.match(source, /\{subtitle\}/, 'la classe suit le nom, dans la feuille');
    assert.match(source, /updatedLabel && <span/, 'la date de rédaction reste dans le corps');

    // Le libellé remplace l’ancienne phrase d’introduction : trois langues, aucune clé morte.
    const messages = readFileSync('src/i18n/messages.ts', 'utf8');
    const headings = messages.match(/'documentPreview\.heading': '/g) ?? [];
    assert.equal(headings.length, 3, 'FR, EN et AR portent la phrase');
    assert.match(messages, /'documentPreview\.heading': 'Ton document pédagogique'/);
    assert.equal(messages.includes("'documentPreview.lede'"), false, 'aucune clé abandonnée derrière elle');
});
