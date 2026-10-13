import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderDescriptionWithBold } from '../src/components/typography/textFormat';
import { expandHtmlTags } from '../src/lib/text/htmlTags';
import { findHighlightClose, findHighlightOpen, stripHighlights, toggleHighlight } from '../src/lib/text/highlightMarkers';

const html = (source: string) => renderToStaticMarkup(React.createElement(React.Fragment, null, ...renderDescriptionWithBold(source)));
const marks = (value: string) => value.split('<mark class="doc-hl').length - 1;
const text = (value: string) => value.replace(/<annotation[\s\S]*?<\/annotation>/g, '').replace(/<[^>]+>/g, '');

test('== ne délimite que du texte collé : « x == y », « a === b » et les suites de = restent tels quels', () => {
  for (const source of ['x == y et z == w', 'a === b', 'si a === b alors c === d', '=====', 'x ==== y', '== espace ==']) {
    const output = html(source);
    assert.equal(marks(output), 0, `${source} : aucun surlignage`);
    assert.equal(text(output), source, `${source} : ni signe perdu ni signe dupliqué`);
  }
  assert.equal(text(html('===texte===')), '===texte===', 'trois signes ne sont pas un délimiteur');
});

test('==texte== surligne, avec un = isolé dedans, plusieurs fois par ligne', () => {
  assert.equal(marks(html('==texte==')), 1);
  assert.equal(text(html('==a=b== fin')), 'a=b fin');
  assert.equal(marks(html('==un== et ==deux==')), 2);
  assert.equal(text(html('x == y puis ==mot==')), 'x == y puis mot');
});

test('une formule, même haute, se surligne comme un mot ; la formule affichée aussi', () => {
  const inline = html('Montrer que ==$\\dfrac{\\sum_{k=1}^{n} k^2}{n+1}$== est entier');
  assert.equal(marks(inline), 1);
  assert.match(inline, /<mark class="doc-hl"><span class="math-text">/, 'la formule est DANS le surlignage');
  const display = html('==$$\\int_0^1 \\frac{x}{1+x^2}\\,dx$$==');
  assert.equal(marks(display), 1);
  assert.match(display, /katex-display/);
  assert.equal(marks(html('<mark>$\\frac{1}{2}$</mark>')), 1);
});

test('la feuille peint le surlignage en aplat opaque, formule comprise, et le garde à l’impression', () => {
  const css = readFileSync('src/styles/index.css', 'utf8');
  const rule = css.match(/mark\.doc-hl \{[^}]*\}/)?.[0] ?? '';
  assert.match(rule, /background: var\(--hl\)/);
  assert.match(rule, /box-decoration-break: clone/, 'se replie sur plusieurs lignes');
  assert.match(rule, /print-color-adjust: exact/);
  assert.match(css, /mark\.doc-hl \.katex \{[^}]*background: var\(--hl\)/, 'une formule haute est couverte sur toute sa hauteur');
  assert.match(css, /mark\.doc-hl \.katex-display > \.katex \{[^}]*width: fit-content/, 'formule affichée : bloc ajusté');
  assert.match(css, /\.dark mark\.doc-hl \{ --hl:/);
  assert.match(readFileSync('src/components/documents/documentPrint.css', 'utf8'), /\.pedagogical-print-root mark\.doc-hl \{ --hl: #fde68a; \}/, 'toujours la teinte claire sur papier');
});

test('<mark> avec espaces de bord se traduit en == qui touche le texte', () => {
  assert.equal(expandHtmlTags('<mark>surligné</mark>'), '==surligné==');
  assert.equal(expandHtmlTags('a <mark> mot </mark> b'), 'a  ==mot==  b');
  assert.equal(expandHtmlTags('<mark> </mark>'), ' ');
});

test('définition : ouvrant et fermant valables', () => {
  assert.equal(findHighlightOpen('a == b ==c'), 7, 'seul « ==c » est un ouvrant');
  assert.equal(findHighlightOpen('===a'), -1);
  assert.equal(findHighlightClose('a==b==', 3), 4);
  assert.equal(findHighlightClose('a ==', 0), -1, 'un fermant ne suit pas une espace');
  assert.equal(stripHighlights('un ==deux== trois ==quatre=='), 'un deux trois quatre');
  assert.equal(stripHighlights('x == y'), 'x == y');
});

test('la barre d’outils bascule le surlignage sans jamais empiler de ==', () => {
  const wrap = toggleHighlight('Le théorème est vrai', 3, 11);
  assert.equal(wrap.value, 'Le ==théorème== est vrai');
  assert.equal(wrap.value.slice(wrap.start, wrap.end), 'théorème');
  // Re-cliquer sur le texte déjà surligné : on retire, on n'ajoute pas.
  const off = toggleHighlight(wrap.value, wrap.start, wrap.end);
  assert.equal(off.value, 'Le théorème est vrai');
  // Sélection qui embrasse les marqueurs.
  assert.equal(toggleHighlight('Le ==théorème== est', 3, 15).value, 'Le théorème est');
  // Espaces de bord laissés dehors ; surlignages internes aplatis ; texte à bord « = » → balise.
  assert.equal(toggleHighlight('un deux trois', 2, 8).value, 'un ==deux== trois');
  assert.equal(toggleHighlight('a ==b== c d', 0, 11).value, '==a b c d==');
  assert.equal(toggleHighlight('si x=', 3, 5).value, 'si <mark>x=</mark>');
  assert.equal(toggleHighlight('si <mark>x=</mark>', 9, 11).value, 'si x=');
  assert.equal(toggleHighlight('abc', 1, 1).value, 'abc', 'sans sélection, rien');
});
