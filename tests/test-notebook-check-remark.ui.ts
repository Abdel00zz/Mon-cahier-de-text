import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LessonsData } from '../src/types';
import { buildLessonRows } from '../src/domain/notebook/lessonRows';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { MainTable } from '../src/features/editor/MainTable';
import { buildNotebookCheckRemarks, notebookCheckRemarkText } from '../src/domain/evaluations/notebookCheckRemarks';
import { translateLocaleMessage } from '../src/i18n/messages';

/*
 * Contrôle des cahiers : la trace de l'activité se lit dans la cellule
 * « remarque » de la séance du même jour, sans ajouter aucun contenu au cahier.
 * Ce fichier vérifie le rendu réel (pas une maquette) puis le contrat des
 * boutons de l'activité.
 */

const noop = () => {};
const ANNOTATION = 'Contrôle des cahiers : Amin, Salma';

/** Séance partageant une seule cellule de remarque (deux contenus sans note). */
const mergedData: LessonsData = [{ type: 'chapter', title: 'Chapitre', items: [
    { type: 'exercice', title: 'Ex 1', date: '2026-09-14' },
    { type: 'exercice', title: 'Ex 2', date: '2026-09-14' },
]}];

/** Séance gardant une cellule de remarque par contenu (notes différentes). */
const splitData: LessonsData = [{ type: 'chapter', title: 'Chapitre', items: [
    { type: 'exercice', title: 'Ex 1', date: '2026-09-14', remark: 'Absents : Ali' },
    { type: 'exercice', title: 'Ex 2', date: '2026-09-14', remark: 'Devoir rendu' },
]}];

const renderTable = (
    data: LessonsData,
    getSessionAnnotation?: (date?: string) => string | undefined,
) => renderToStaticMarkup(
    React.createElement(LocaleProvider, { locale: 'fr', children:
        React.createElement(MainTable, {
            lessonsData: data,
            visibleRows: buildLessonRows(data),
            onClearSearch: noop,
            contentDirection: 'ltr',
            onOpenAddContentModal: noop,
            selectedKeys: new Set<string>(),
            onToggleSelect: noop,
            onOpenContentEditor: noop,
            newlyAddedIds: [],
            getSessionAnnotation,
        }),
    }),
);

const occurrences = (html: string, needle: string) => html.split(needle).length - 1;

test('la remarque de la séance affiche le tracé du contrôle des cahiers', () => {
    const html = renderTable(mergedData, date => (date === '2026-09-14' ? ANNOTATION : undefined));
    assert.match(html, /data-session-annotation="true"/);
    assert.match(html, /Contrôle des cahiers : Amin, Salma/);
    // La règle en amont fournit bien le texte attendu, dans la langue demandée.
    const marks = buildNotebookCheckRemarks([
        { id: 'c1', type: 'controle_cahiers', title: 'مراقبة الدفاتر', date: '2026-09-14', status: 'planned', createdAt: '2026-09-01T00:00:00.000Z' },
    ]);
    assert.equal(
        notebookCheckRemarkText(marks.get('2026-09-14')!, (key, values) => translateLocaleMessage('fr', key, values), ', '),
        'مراقبة الدفاتر',
    );
});

test('l’annotation n’est écrite qu’une fois par séance', () => {
    const merged = renderTable(mergedData, () => ANNOTATION);
    assert.equal(occurrences(merged, 'data-session-annotation="true"'), 1);
    // Séance éclatée en une cellule de remarque par contenu : la première ligne
    // datée porte la trace, la seconde ne la répète pas.
    const split = renderTable(splitData, () => ANNOTATION);
    assert.equal(occurrences(split, 'data-session-annotation="true"'), 1);
    assert.equal(split.includes('Absents : Ali'), true);
    assert.equal(split.includes('Devoir rendu'), true);
});

test('sans contrôle des cahiers, la cellule de remarque reste nue', () => {
    const html = renderTable(mergedData, () => undefined);
    assert.equal(html.includes('data-session-annotation'), false);
    const bare = renderTable(mergedData);
    assert.equal(bare.includes('data-session-annotation'), false);
    // La cellule existe toujours : on n'a pas supprimé la colonne, seulement
    // écarté une annotation qui n'a rien à dire.
    assert.match(html, /data-remark-cell="true"/);
});

test('l’annotation suit la direction de son texte et porte son contenu en infobulle', () => {
    const html = renderTable(mergedData, () => 'مراقبة الدفاتر: أمين، سلمى');
    assert.match(html, /data-session-annotation="true"[^>]*dir="rtl"/);
    assert.match(html, /title="مراقبة الدفاتر: أمين، سلمى"/);
});

test('l’éditeur et l’impression passent la même règle aux cellules', () => {
    const editor = readFileSync('src/features/editor/Editor.tsx', 'utf8');
    const print = readFileSync('src/features/editor/PrintView.tsx', 'utf8');
    assert.match(editor, /buildSessionActivityRemarks\(config, classInfo\.id, t, separator\)/);
    assert.match(editor, /getSessionAnnotation=\{getSessionAnnotation\}/);
    assert.match(print, /buildSessionActivityRemarks\(config, classInfo\.id,/);
});

test('le contrôle des cahiers ne propose pas de bouton Contenu', () => {
    const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
    // Le garde-fou entoure le bouton « Contenu » et lui seul : la liste des
    // élèves reste accessible, c'est elle qui alimente la remarque de séance.
    assert.match(view, /event\.type !== REMARK_EVENT_TYPE && \(\s*<button\s+type="button"\s+onClick=\{\(\) => onOpenDocument\(event\)\}/);
    assert.match(view, /import \{ REMARK_EVENT_TYPE \} from '@\/domain\/evaluations\/notebookCheckRemarks'/);
    assert.equal(occurrences(view, 'REMARK_EVENT_TYPE') >= 2, true);
});
