import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { ContentRenderer } from '../src/features/editor/ContentRenderer';
import { activityDocumentPreviews } from '../src/domain/evaluations/activityDocumentPreviews';
import { findNotebookAssessments, linkAssessments, notebookDocumentPreviews, type NotebookDocumentPreview } from '../src/domain/evaluations/assessmentSync';
import { homeworkCorrectionDocumentId } from '../src/domain/evaluations/homeworkIds';
import type { AppConfig, LessonsData } from '../src/types';
import type { PlannedAssessment } from '../src/domain/evaluations/assessments';

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

test('un devoir rédigé affiche le highlight de document sans pastille séparée', () => {
    const withDocument = row({ preview });
    assert.match(withDocument, /data-document-highlight="true"/, 'le highlight moderne est là');
    assert.match(withDocument, /editor-document-highlight/, 'il porte son style dédié');
    assert.doesNotMatch(withDocument, /data-document-chip="true"/, 'aucun bouton séparé de document');
    assert.match(withDocument, /aria-label="Ouvrir le document — Devoir maison 1"/, 'le libellé accessible nomme le devoir');

    assert.doesNotMatch(row({ preview: undefined }), /data-document-highlight/, 'aucun document = aucun highlight');
    assert.doesNotMatch(row(), /data-document-highlight/, 'la table sans lecteur de sujet reste intacte');
});

test('le highlight ne part jamais à l’impression', () => {
    assert.doesNotMatch(row({ preview, isPrint: true }), /data-document-highlight/, 'le cahier imprimé se passe du lien/highlight');
});

test('la table passe la lecture du sujet jusqu’aux rangées mémoïsées', () => {
    // Piège connu : une prop ajoutée sans mise à jour du comparateur fige le
    // rendu. Les deux comparateurs doivent donc connaître la pastille.
    const table = readFileSync('src/features/editor/MainTable.tsx', 'utf8')
      + readFileSync('src/features/editor/SessionGroupRow.tsx', 'utf8');
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

test('la fenêtre affiche une phrase et le document sans contexte ajouté', () => {
    const source = readFileSync('src/components/documents/DocumentPreview.tsx', 'utf8');
    // La barre de la fenêtre porte la phrase de cadrage, et rien d’autre :
    // ni nom du devoir, ni classe, ni date — ces données appartiennent au document.
    assert.match(source, /title=\{t\('documentPreview\.heading'\)\}/, 'la barre porte la phrase');
    assert.match(source, /footer=\{[\s\S]*?<DocumentPrintButton[\s\S]*?<Button[^>]*onClick=\{onClose\}/, 'le pied de page porte l’impression et la fermeture sur la même ligne');
    assert.doesNotMatch(source, /FileText className="h-5 w-5"/, 'plus de grand cartouche d’en-tête');
    for (const path of ['src/components/documents/DocumentPreview.tsx', 'src/features/evaluations/components/ContentDocumentModal.tsx', 'src/admin/components/AdminDocumentPreview.tsx']) {
        const documentModal = readFileSync(path, 'utf8');
        assert.doesNotMatch(documentModal, /document-preview-meta|(?<!=)\{title\}|\{subtitle\}|\{updatedLabel\}/, 'aucun contexte ajouté autour de la source (l’en-tête passe par DocumentSheetHeader)');
    }

    // Le libellé remplace l’ancienne phrase d’introduction : trois langues, aucune clé morte.
    const messages = readFileSync('src/i18n/messages.ts', 'utf8');
    const headings = messages.match(/'documentPreview\.heading': '/g) ?? [];
    assert.equal(headings.length, 3, 'FR, EN et AR portent la phrase');
    assert.match(messages, /'documentPreview\.heading': 'Votre document pédagogique'/);
    assert.equal(messages.includes("'documentPreview.lede'"), false, 'aucune clé abandonnée derrière elle');
});

test('détection du sujet et corrigé de devoir maison et contrôle continu dans la table', () => {
    const plannedHomework: PlannedAssessment = {
        id: '2026-2027:s1-maison1',
        dateISO: '2026-10-05',
        type: 'maison',
        num: 1,
        schoolYear: '2026-2027',
        semestre: 1,
        label: 'Devoir maison 1',
        semaine: 5,
        confidence: 'high',
        predictionStatus: 'manual',
        predictionReason: 'test',
    };
    const plannedControle: PlannedAssessment = {
        id: '2026-2027:s1-controle1',
        dateISO: '2026-10-15',
        type: 'controle',
        num: 1,
        schoolYear: '2026-2027',
        semestre: 1,
        label: 'Contrôle continu 1',
        semaine: 6,
        confidence: 'high',
        predictionStatus: 'manual',
        predictionReason: 'test',
    };

    const lessons: LessonsData = [
        { type: 'devoir_maison', title: 'Devoir maison 1', date: '2026-10-05' },
        { type: 'correction_devoir_maison', title: 'Correction du devoir maison 1', date: '2026-10-19' },
        { type: 'controle_continu', title: 'Contrôle continu 1', date: '2026-10-15' },
    ];

    const config: AppConfig = {
        establishmentName: '',
        defaultTeacherName: '',
        printShowDescriptions: true,
        assessmentDocuments: {
            c1: {
                '2026-2027:s1-maison1': { source: 'Sujet du devoir maison 1', updatedAt: '2026-10-05T08:00:00Z' },
                [homeworkCorrectionDocumentId('2026-2027:s1-maison1')]: { source: 'Corrigé du devoir maison 1', updatedAt: '2026-10-19T08:00:00Z' },
                '2026-2027:s1-controle1': { source: 'Sujet du contrôle continu 1', updatedAt: '2026-10-15T08:00:00Z' },
            },
        },
    };

    const entries = findNotebookAssessments(lessons);
    const links = linkAssessments([plannedHomework, plannedControle], entries, '2026-10-20');
    const previews = activityDocumentPreviews(config, 'c1', lessons, links, key => key);
    notebookDocumentPreviews(links, config.assessmentDocuments?.c1).forEach((p, k) => previews.rows.set(k, p));

    // 1. La ligne du devoir maison porte le sujet
    const homeworkPreview = previews.rows.get('0||||');
    assert.ok(homeworkPreview, 'le devoir maison porte un preview');
    assert.equal(homeworkPreview?.document.source, 'Sujet du devoir maison 1');

    // 2. La ligne de la correction porte le corrigé
    const correctionPreview = previews.rows.get('1||||');
    assert.ok(correctionPreview, 'la correction porte un preview');
    assert.equal(correctionPreview?.document.source, 'Corrigé du devoir maison 1');

    // 3. La ligne du contrôle continu porte son sujet
    const controlePreview = previews.rows.get('2||||');
    assert.ok(controlePreview, 'le contrôle continu porte un preview');
    assert.equal(controlePreview?.document.source, 'Sujet du contrôle continu 1');

    // Vérification du rendu HTML : le surlignage moderne est activé sur chaque ligne
    for (const [index, expectedTitle] of [[0, 'Devoir maison 1'], [1, 'Correction du devoir maison 1'], [2, 'Contrôle continu 1']] as const) {
        const html = renderToStaticMarkup(
            React.createElement(LocaleProvider, {
                locale: 'fr',
                children: React.createElement(ContentRenderer, {
                    data: lessons[index],
                    indices: { chapterIndex: index },
                    elementType: lessons[index].type as never,
                    getDocumentPreview: () => previews.rows.get(`${index}||||`),
                    onOpenDocumentPreview: () => undefined,
                }),
            }),
        );
        assert.match(html, /data-document-highlight="true"/, `${expectedTitle} affiche le surlignage moderne`);
        assert.match(html, /editor-document-highlight/, `${expectedTitle} porte la classe de surlignage`);
    }
});

test('détection d’un devoir ou contrôle avec énoncé directement saisi en description', () => {
    const inlineLesson: LessonsData = [
        { type: 'controle_continu', title: 'Contrôle continu 2', description: 'Soit $f(x)=x^2+1$, calculer $f\'(x)$' },
    ];
    const previewFromDescription: NotebookDocumentPreview = {
        document: { source: inlineLesson[0].description!, updatedAt: '' },
        title: 'Contrôle continu 2',
        assessmentId: '0||||',
    };

    const html = renderToStaticMarkup(
        React.createElement(LocaleProvider, {
            locale: 'fr',
            children: React.createElement(ContentRenderer, {
                data: inlineLesson[0],
                indices: { chapterIndex: 0 },
                elementType: 'controle_continu',
                getDocumentPreview: () => previewFromDescription,
                onOpenDocumentPreview: () => undefined,
            }),
        }),
    );
    assert.match(html, /data-document-highlight="true"/, 'la description en ligne déclenche le surlignage');
    assert.match(html, /editor-document-highlight/, 'la classe de surlignage manuscrit est appliquée');
});

