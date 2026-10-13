import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { DocumentPrintButton } from '../src/components/documents/DocumentPrintButton';
import { LocaleProvider } from '../src/i18n/LocaleProvider';

const render = (source?: string) => renderToStaticMarkup(React.createElement(LocaleProvider, { locale: 'fr',
  children: React.createElement(DocumentPrintButton, { source }) }));
test('A5 print action is icon-only, accessible and unavailable for empty documents', () => {
  const html = render('Texte **pédagogique** $x^2$');
  assert.match(html, /aria-label="Imprimer au format A5"/);
  assert.match(html, /<svg/); assert.doesNotMatch(html, />Imprimer/);
  assert.doesNotMatch(html, /disabled=""/);
  assert.match(render('   '), /disabled=""/);
});

test('document previews share A5 native/web output and prepare the same text/math renderer', () => {
  const read = (path: string) => readFileSync(path, 'utf8');
  for (const path of ['src/components/documents/DocumentPreview.tsx', 'src/admin/components/AdminDocumentPreview.tsx', 'src/features/evaluations/components/ContentDocumentModal.tsx']) {
    assert.match(read(path), /<DocumentPrintButton source=/);
  }
  const action = read('src/components/documents/DocumentPrintButton.tsx');
  assert.match(action, /await preparePrintContent\(paper.current\)/);
  assert.match(action, /renderDescriptionWithBold\(snapshot\)/);
  assert.match(action, /@page \{ margin: 7mm 0; \}/);
  assert.doesNotMatch(action, /size: A5/, 'le papier choisi décide : la feuille s’y adapte');
  const printCss = read('src/components/documents/documentPrint.css');
  assert.match(printCss, /padding-inline: clamp\(4mm, calc\(4mm \+ \(100vw - 148mm\) \* 0\.13\), 16mm\) !important/, 'côtés : 4 mm sur A5, ≈ 12 mm sur A4');
  assert.doesNotMatch(printCss, /var\(--mm\)|var\(--pt\)/, 'le texte ne change pas de taille avec le papier');
  assert.match(read('android/app/src/main/java/ma/cahier/textes/NativePrintPlugin.java'), /ISO_A5/);
  assert.match(read('src/components/documents/documentPrint.css'), /body\[data-document-print\] > :not\(\.pedagogical-print-root\)/);
});
