import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderDescriptionWithBold } from '../src/components/typography/textFormat';

const html = (source: string) => renderToStaticMarkup(React.createElement(React.Fragment, null, ...renderDescriptionWithBold(source)));
const count = (value: string, needle: string) => value.split(needle).length - 1;

/*
 * COLONNES — la commande des corrigés (devoir maison, devoir surveillé).
 * Par défaut : aucune colonne. Seul le contenu qui porte la commande en reçoit.
 */
test('sans la commande, aucun contenu n’est mis en colonnes', () => {
  const output = html('# Corrigé — DS 2\n\n## Exercice 1\n\n1. Calculer $f(0)$.\n2. Résoudre $f(x)=0$.');
  assert.doesNotMatch(output, /doc-columns/);
  assert.match(output, /doc-heading/);
});

test('\\begin{multicols}{2} range son contenu en deux colonnes, le reste garde son flux', () => {
  const output = html('# Corrigé\n\nIntroduction.\n\n\\begin{multicols}{2}\n## Exercice 1\n\n1. Premier calcul.\n2. Second calcul.\n\\end{multicols}\n\nConclusion.');
  assert.equal(count(output, 'class="doc-columns"'), 1);
  assert.match(output, /data-columns="2"/);
  const inside = output.slice(output.indexOf('class="doc-columns"'));
  assert.match(inside, /Premier calcul/);
  assert.match(inside, /Exercice 1/, 'un titre d’exercice reste une barre d’exercice dans la colonne');
  assert.ok(output.indexOf('Introduction.') < output.indexOf('class="doc-columns"'), 'l’introduction reste avant');
  assert.ok(output.indexOf('Conclusion.') > output.indexOf('Second calcul'), 'la conclusion reste après');
  assert.doesNotMatch(output, /multicols/, 'la commande ne s’affiche jamais');
});

test('l’alias français « colonnes », le nombre par défaut et ses bornes', () => {
  assert.match(html('\\begin{colonnes}{3}\nA\n\\end{colonnes}'), /data-columns="3"/);
  assert.match(html('\\begin{colonnes}\nA\n\\end{colonnes}'), /data-columns="2"/, 'deux colonnes par défaut');
  assert.match(html('\\begin{multicols}{9}\nA\n\\end{multicols}'), /data-columns="3"/, 'au plus trois colonnes');
  assert.match(html('\\begin{multicols}{1}\nA\n\\end{multicols}'), /data-columns="2"/, 'au moins deux colonnes');
  assert.match(html('\\begin{multicols*}{2}\nA\n\\end{multicols*}'), /data-columns="2"/, 'la forme étoilée est acceptée');
});

test('plusieurs blocs de colonnes dans un même corrigé', () => {
  const output = html('\\begin{multicols}{2}\nPartie A\n\\end{multicols}\n\nMilieu\n\n\\begin{multicols}{2}\nPartie B\n\\end{multicols}');
  assert.equal(count(output, 'class="doc-columns"'), 2);
  assert.ok(output.indexOf('Milieu') > output.indexOf('Partie A') && output.indexOf('Milieu') < output.indexOf('Partie B'));
});

test('les formules et les listes LaTeX fonctionnent dans les colonnes', () => {
  const output = html('\\begin{multicols}{2}\n\\begin{enumerate}\n\\item $x^2=4$\n\\item $\\frac{a}{b}$\n\\end{enumerate}\n\n$$\\int_0^1 f$$\n\\end{multicols}');
  assert.equal(count(output, 'class="doc-columns"'), 1);
  assert.ok(count(output, 'math-text') >= 3, 'formules composées par KaTeX');
  assert.match(output, /editor-list/, 'la liste reste une liste');
});

test('une commande orpheline ne s’affiche jamais telle quelle', () => {
  for (const source of ['\\begin{multicols}{2}\nTexte sans fin', 'Texte sans début\n\\end{multicols}', '\\begin{colonnes}{2}']) {
    const output = html(source);
    assert.doesNotMatch(output, /multicols|colonnes|\\begin|\\end/, source);
    assert.doesNotMatch(output, /doc-columns/);
  }
});

test('le contenu d’un bloc vide ou d’espaces ne crée pas de colonnes vides', () => {
  assert.doesNotMatch(html('Avant\n\\begin{multicols}{2}\n\n\\end{multicols}\nAprès'), /doc-columns/);
});

test('l’arabe se compose dans les colonnes comme ailleurs', () => {
  const output = html('\\begin{multicols}{2}\n## التمرين 1\n\n1. احسب $f(0)$.\n\\end{multicols}');
  assert.match(output, /doc-columns/);
  assert.match(output, /التمرين/);
});

test('la feuille met le conteneur en colonnes à l’écran et à l’impression A5, sans toucher au reste', () => {
  const css = readFileSync('src/components/documents/documentSheet.css', 'utf8');
  assert.match(css, /\.devoir-document \.doc-columns \{[^}]*column-count: 2;/);
  assert.match(css, /\.doc-columns\[data-columns='3'\] \{ column-count: 3;/);
  assert.match(css, /\.doc-columns > \* \{ break-inside: avoid; \}/, 'un exercice ne se coupe pas entre deux colonnes');
  assert.match(css, /@media screen and \(max-width: 560px\)[\s\S]*column-count: 1/, 'une colonne sur téléphone, à l’écran seulement');
  assert.match(css, /\.pedagogical-print-root \.devoir-document \.doc-columns \{[^}]*column-gap: 5mm/, 'impression A5');
  assert.doesNotMatch(css, /\.devoir-document \{[^}]*column-count/, 'jamais de colonnes sur la feuille entière');
});

test('un corrigé collé de LaTeX : \\textcolor autour d’une formule et \\columnbreak ne s’affichent jamais tels quels', () => {
  const output = html('\\begin{multicols}{2}\n## Exercice 1 $f(x)=\\frac{3x-1}{1-x}$\n\n**4.a** \\textcolor{red}{$\\triangle$} Cependant.\n\n\\columnbreak\n\n## Exercice 2 $f(x)=x^3$\n\\end{multicols}');
  assert.equal(count(output, 'class="doc-columns"'), 1);
  assert.doesNotMatch(output.replace(/<annotation[\s\S]*?<\/annotation>/g, ''), /\\textcolor|\\columnbreak|\\begin|\\end/);
  assert.match(output, /text-rose-600/, 'la couleur est conservée');
  assert.match(output, /Exercice 2/);
});

test('\\textcolor dans une formule reste l’affaire de KaTeX', () => {
  const output = html('Avant $\\textcolor{red}{x}$ après');
  assert.doesNotMatch(output, /\[color:/);
  assert.match(output, /math-text/);
});
