import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderDescriptionWithBold } from '../src/components/typography/textFormat';

/*
 * Feuille de devoir : le professeur écrit une page d'énoncé comme il la
 * composerait dans un traitement de texte — un titre, des exercices en barres
 * teintées, un barème au bord de la ligne.
 *
 *   # Devoir surveillé 3      → titre centré
 *   ## Exercice 1             → barre teintée selon le NUMÉRO
 *   ### Partie A              → sous-titre
 *   ... [[2pts]]              → barème aligné au bord de lecture
 *
 * Ces tests verrouillent le balisage produit (classes et teintes), pas la
 * feuille de style : le rendu visuel vit dans `index.css`, sous
 * `.devoir-document`.
 */

const render = (source: string) => renderToStaticMarkup(
  React.createElement('div', { className: 'devoir-document' }, ...renderDescriptionWithBold(source)),
);

test('un titre de document est centré, une barre par exercice', () => {
  const html = render('# Devoir surveillé 3\n\n## Exercice 1\n\nUne urne contient 10 boules.\n\n## Exercice 2\n\nOn considère les points A et B.');
  assert.match(html, /<span class="doc-title">Devoir surveillé 3<\/span>/);
  assert.match(html, /<span class="doc-heading" data-tone="1">Exercice 1<\/span>/);
  assert.match(html, /<span class="doc-heading" data-tone="2">Exercice 2<\/span>/);
  // Le titre n'est pas un paragraphe : aucun saut de ligne parasite autour.
  assert.equal(/doc-title">[^<]*\n/.test(html), false);
});

test('la teinte suit le NUMÉRO de l’exercice, dans toutes les écritures', () => {
  // 1 → bleu, 2 → vert, 3 → ambre, 4 → violet, puis le cycle reprend : le même
  // exercice garde donc sa couleur dans l'énoncé comme dans son corrigé.
  for (const [number, tone] of [[1, 1], [2, 2], [3, 3], [4, 4], [5, 1], [8, 4]] as const) {
    const html = render(`## Exercice ${number}\n\nQuestion.`);
    assert.match(html, new RegExp(`class="doc-heading" data-tone="${tone}">Exercice ${number}`));
  }
  // Chiffres arabo-indiens : le numéro reste un numéro.
  assert.match(render('## التمرين ٣\n\nنص.'), /data-tone="3">التمرين ٣/);
  // Sans numéro, la première teinte — jamais une barre sans couleur.
  assert.match(render('## Corrigé\n\nTexte.'), /data-tone="1">Corrigé/);
  // Les trois niveaux de titre se distinguent.
  assert.match(render('### Partie A\n\nTexte.'), /class="doc-subheading">Partie A<\/span>/);
});

test('le barème se pose au bord de la ligne, dans la liste comme dans le texte', () => {
  const html = render('1. Montrer que $p(A)=\\frac{1}{3}$. [[2pts]]\n\n2. Calculer la variance. [[1pt]]');
  assert.equal((html.match(/class="doc-bareme"/g) ?? []).length, 2);
  assert.match(html, /class="doc-bareme">2pts<\/span>/);
  assert.match(html, /class="doc-bareme">1pt<\/span>/);
  // Le marqueur lui-même ne doit jamais s'afficher tel quel.
  assert.equal(html.includes('[['), false);
  // Alias LaTeX : la même chose, écrite autrement.
  const alias = render('Montrer que $p(A)=\\frac{1}{3}$. \\bareme{2pts}');
  assert.match(alias, /class="doc-bareme">2pts<\/span>/);
  assert.equal(alias.includes('bareme{'), false);
});

test('les titres et le barème ne cassent pas la structure existante', () => {
  // Une puce d'énoncé qui s'étale sur deux lignes (dont une formule display)
  // reste un seul item, barème compris.
  const html = render('1. Soit $X$ la variable aléatoire.\n$$E(X)=\\sum_k k\\,p_k$$\nOn demande la loi de $X$. [[4pts]]\n\nSuite du texte.');
  assert.match(html, /class="editor-item-marker"/);
  assert.match(html, /class="doc-bareme">4pts<\/span>/);
  assert.equal((html.match(/class="editor-item-marker"/g) ?? []).length, 1);
  // Un titre n'est jamais absorbé par l'item précédent.
  const withHeading = render('1. Question.\n\n## Exercice 2\n\nAutre énoncé.');
  assert.match(withHeading, /doc-heading" data-tone="2"/);
  // Le texte courant garde ses fins de paragraphe.
  assert.match(render('Première ligne.\nDeuxième ligne.'), /Première ligne\.\nDeuxième ligne\./);
});

test('la feuille de style porte la mise en page, hors @layer', () => {
  const css = readFileSync('src/styles/index.css', 'utf8');
  const start = css.indexOf('.devoir-document {');
  assert.ok(start > 0, 'la feuille de devoir a ses règles');
  const rule = css.slice(start, css.indexOf('}', start));
  // L'échelle du document vit en jetons : une seule règle à toucher.
  assert.match(rule, /--doc-fs: 14px/);
  assert.match(rule, /--doc-lh: 1\.72/);
  assert.match(rule, /font-size: var\(--doc-fs\)/);
  assert.match(rule, /font-family: var\(--font-document\)/);
  for (const selector of ['.doc-title', '.doc-heading', '.doc-subheading', '.doc-bareme', '.doc-line']) {
    assert.ok(css.includes(`.devoir-document ${selector}`), `${selector} est composé`);
  }
  // Les quatre teintes de barre existent, et l'impression garde ses couleurs.
  for (const tone of [1, 2, 3, 4]) assert.ok(css.includes(`.doc-heading[data-tone='${tone}']`), `teinte ${tone}`);
  assert.match(css, /print-color-adjust: exact/);
  // Le barème aligne ses chiffres d'une question à l'autre.
  assert.match(css, /font-variant-numeric: tabular-nums/);
  // La mise en page d'un devoir ne fuit pas dans le carnet : tout est préfixé.
  assert.equal(/^\.doc-heading\s*\{/m.test(css), false);
});

test('le texte de la feuille est composé par une fonte de document', () => {
  const css = readFileSync('src/styles/index.css', 'utf8');
  // La fonte demandée d'abord, son relais ensuite, la fonte arabe en dernier
  // recours — c'est la plage de caractères qui départage les écritures.
  assert.match(css, /--font-document: 'Latin Modern Sans', 'Source Sans 3', var\(--font-latin-body\), var\(--font-arabic-body\), sans-serif/);
  const fonts = readFileSync('src/styles/fonts.css', 'utf8');
  // Latin Modern Sans : embarquée (aucune requête réseau), trois graisses.
  for (const file of ['lmsans10-regular.otf', 'lmsans10-bold.otf', 'lmsans10-oblique.otf']) {
    assert.ok(fonts.includes(`/fonts/${file}`), `${file} est déclarée`);
  }
  assert.equal((fonts.match(/font-family: 'Latin Modern Sans'/g) ?? []).length, 3);
  // Source Sans 3 : un fichier VARIABLE, pas cinq graisses statiques.
  assert.match(fonts, /source-sans-3-latin-wght-normal\.woff2/);
  assert.match(fonts, /font-family: 'Source Sans 3'[^}]*font-weight: 200 900/);
  // Les deux sont limitées au latin : l'arabe du document ne peut pas tomber
  // dessus (leçon des fontes arabes composant du latin illisible).
  for (const family of ['Latin Modern Sans', 'Source Sans 3']) {
    const blocks = fonts.split(`font-family: '${family}'`).slice(1);
    blocks.forEach((_, index) => {
      const block = fonts.split(`font-family: '${family}'`)[index + 1].split('}')[0];
      assert.match(block, /unicode-range: U\+0000-00FF/, `${family} est limitée au latin`);
    });
  }
  // Les fichiers sont bien présents et sont de vraies fontes OpenType.
  const fonds = ['lmsans10-regular.otf', 'lmsans10-bold.otf', 'lmsans10-oblique.otf'].map(file => readFileSync(`public/fonts/${file}`));
  for (const buffer of fonds) assert.equal(buffer.subarray(0, 4).toString('latin1'), 'OTTO');
});

test('l’aide de la feuille cite les trois marqueurs', () => {
  const modal = readFileSync('src/features/evaluations/components/ContentDocumentModal.tsx', 'utf8');
  assert.match(modal, /\['# Devoir surveillé 3', 'evaluations\.doc\.syntaxTitle'\]/);
  assert.match(modal, /\['## Exercice 1', 'evaluations\.doc\.syntaxExercise'\]/);
  assert.match(modal, /\['\[\[2pts\]\]', 'evaluations\.doc\.syntaxBareme'\]/);
  // L'aperçu est une page : colonne de lecture bornée.
  assert.match(modal, /devoir-document mx-auto max-w-\[44rem\]/);
});
