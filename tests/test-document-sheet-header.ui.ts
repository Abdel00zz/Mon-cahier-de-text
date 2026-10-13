import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { headerTitleFor } from '../src/domain/evaluations/documentSheet';
import { DocumentSheetHeader } from '../src/components/documents/DocumentSheetHeader';
import { DocumentPrintButton } from '../src/components/documents/DocumentPrintButton';
import { LocaleProvider } from '../src/i18n/LocaleProvider';

const read = (path: string) => readFileSync(path, 'utf8');

test('header title: shown unless the document already opens with the same heading', () => {
  assert.equal(headerTitleFor('Devoir surveillé 2', 'Exercice 1 : calculer'), 'Devoir surveillé 2');
  assert.equal(headerTitleFor('Devoir surveillé 2', '# Devoir surveillé 2\n\nExercice 1'), undefined);
  assert.equal(headerTitleFor('Devoir surveillé n° 2', '\n\n## DEVOIR SURVEILLE 2\n'), undefined);
  assert.equal(headerTitleFor('Devoir surveillé 2', '# Devoir surveillé 3'), 'Devoir surveillé 2');
  assert.equal(headerTitleFor('اختبار المراقبة 2', '# اختبار المراقبة 2\nنص'), undefined);
  assert.equal(headerTitleFor('Devoir maison', 'Texte\n# Devoir maison'), 'Devoir maison', 'only an opening heading counts');
  assert.equal(headerTitleFor('   ', 'texte'), undefined);
  assert.equal(headerTitleFor(undefined, undefined), undefined);
});

test('header renders title and class, nothing when both are empty', () => {
  const html = renderToStaticMarkup(React.createElement(DocumentSheetHeader, { title: 'Devoir maison 1', classLabel: '2 BAC SM 3' }));
  assert.match(html, /doc-sheet-header__title[^>]*>Devoir maison 1</);
  assert.match(html, /doc-sheet-header__class[^>]*>2 BAC SM 3</);
  assert.ok(html.indexOf('Devoir maison 1') < html.indexOf('2 BAC SM 3'), 'title first, class at the opposite edge');
  assert.equal(renderToStaticMarkup(React.createElement(DocumentSheetHeader, {})), '');
  const classOnly = renderToStaticMarkup(React.createElement(DocumentSheetHeader, { classLabel: '1 BAC' }));
  assert.doesNotMatch(classOnly, /doc-sheet-header__title/);
});

test('print button is icon-only, uses the dedicated printer icon and keeps the A5 sheet symmetrical', () => {
  const html = renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr',
    children: React.createElement(DocumentPrintButton, { source: 'Texte', title: 'DS 1', classLabel: '1 BAC' }) }));
  assert.match(html, /class="doc-icon-btn/);
  assert.doesNotMatch(html, />Imprimer</);
  const button = read('src/components/documents/DocumentPrintButton.tsx');
  assert.match(button, /SheetPrinter/);
  assert.match(button, /<DocumentSheetHeader/);
  assert.match(button, /margin: 7mm 0/);
  assert.match(read('src/components/documents/documentPrint.css'), /margin: 7mm 0;/);
});

test('sheet css: no blank top/bottom margin, header on both edges, 44px print command', () => {
  const css = read('src/components/documents/documentSheet.css');
  assert.match(css, /\.devoir-document > :first-child[\s\S]*margin-top: 0 !important/);
  assert.match(css, /\.devoir-document > :last-child[\s\S]*margin-bottom: 0 !important/);
  assert.match(css, /\.doc-sheet-header \{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(0, auto\) minmax\(0, 1fr\)/);
  assert.match(css, /\.doc-icon-btn \{[^}]*width: 2\.75rem;[^}]*height: 2\.75rem/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('formulas stay left-to-right inside Arabic documents', () => {
  assert.match(read('src/styles/index.css'), /\.katex, \.katex-display \{ direction: ltr; unicode-bidi: isolate; \}/);
});

test('every document surface mounts the shared header with its class', () => {
  for (const path of ['src/components/documents/DocumentPreview.tsx', 'src/admin/components/AdminDocumentPreview.tsx', 'src/features/evaluations/components/ContentDocumentModal.tsx']) {
    const source = read(path);
    assert.match(source, /classLabel/, `${path} reçoit la classe`);
    assert.match(source, /headerTitleFor|DocumentSheetHeader|<DocumentPrintButton/, `${path} passe par l'en-tête partagé`);
  }
  assert.match(read('src/features/editor/Editor.tsx'), /classLabel=\{formatLocalizedClassDisplayName\(/);
});

test('le titre d’en-tête est centré, en texte dégradé sans fond ni soulignement, et reste lisible à l’impression', () => {
  const css = read('src/components/documents/documentSheet.css');
  const header = css.match(/\.doc-sheet-header \{[^}]*\}/)?.[0] ?? '';
  const title = css.match(/\.doc-sheet-header__title \{[^}]*\}/)?.[0] ?? '';
  assert.doesNotMatch(header, /background|border|box-shadow/, 'aucun aplat, filet ni ombre');
  assert.match(title, /grid-column: 2;[\s\S]*justify-self: center/);
  assert.match(title, /linear-gradient\(95deg, var\(--sheet-ink-from\), var\(--sheet-ink-to\)\)/);
  assert.match(title, /color: var\(--sheet-ink-from\)/, 'couleur de repli');
  assert.match(css, /html\[lang='ar'\] \.doc-sheet-header__title \{[^}]*font-style: normal[^}]*letter-spacing: normal/, 'arabe : ni italique ni crénage');
  assert.match(css, /\.dark \.doc-sheet-header \{[^}]*--sheet-ink-from/);
  assert.match(css, /\.pedagogical-print-root \.doc-sheet-header \{[^}]*--sheet-ink-from: #1f3a8a/, 'impression toujours claire');
  assert.match(css, /\.pedagogical-print-root \.doc-sheet-header \{ print-color-adjust: exact/);
  const index = read('src/styles/index.css');
  const docTitle = index.match(/\.devoir-document \.doc-title \{[^}]*\}/)?.[0] ?? '';
  assert.doesNotMatch(docTitle, /background|border-bottom/);
});

test('l’en-tête d’un devoir maison ne porte pas « assigné aux élèves », numéro conservé, dans les trois langues', () => {
  assert.equal(headerTitleFor('Devoir à la maison assigné aux élèves 1', ''), 'Devoir à la maison 1');
  assert.equal(headerTitleFor('Devoir à la maison assigné aux élèves', undefined), 'Devoir à la maison');
  assert.equal(headerTitleFor('Homework assigned to students 2', ''), 'Homework 2');
  assert.equal(headerTitleFor('الفرض المنزلي المُوكَل إلى التلاميذ 3', ''), 'الفرض المنزلي 3');
  assert.equal(headerTitleFor('Correction du devoir maison 1', ''), 'Correction du devoir maison 1', 'la correction ne change pas');
  assert.equal(headerTitleFor('Devoir surveillé 2', ''), 'Devoir surveillé 2');
});

test('un document qui s’ouvre par « Devoir à la maison 1 » n’est pas répété par l’en-tête du devoir assigné', () => {
  assert.equal(headerTitleFor('Devoir à la maison assigné aux élèves 1', '# Devoir à la maison 1\n\nExercice'), undefined);
});
