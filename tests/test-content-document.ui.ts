import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderDescriptionWithBold } from '../src/components/typography/textFormat';
import { StudentNamesEditor } from '../src/features/evaluations/components/StudentNamesEditor';
import { LocaleProvider } from '../src/i18n/LocaleProvider';

/*
 * Document pédagogique : le rendu passe par le moteur des descriptions, donc
 * l'aperçu EST ce que le carnet compose — mêmes listes, mêmes formules KaTeX.
 * Et comme le moteur produit des nœuds React (jamais du HTML interprété), une
 * balise inconnue reste du texte : c'est la garantie qu'on ne peut pas injecter
 * de code depuis un document collé.
 */

const render = (source: string) => renderToStaticMarkup(
  React.createElement(React.Fragment, null, ...renderDescriptionWithBold(source)),
);

test('les balises acceptées composent vraiment (gras, liste, formule)', () => {
  const bold = render('<b>Théorème</b>');
  assert.match(bold, /<strong>Théorème<\/strong>/, 'le gras HTML devient du gras composé');

  const list = render('<li>Question 1</li><li>Question 2</li>');
  assert.ok(list.includes('editor-list'), 'la liste passe par la grille du moteur');
  assert.equal((list.match(/editor-item-marker/g) ?? []).length, 2, 'deux items marqués');

  const math = render('Soit $\\frac{a}{b}$ avec $b\\ne0$.');
  assert.ok(math.includes('class="katex"'), 'la formule est composée par KaTeX');
  assert.doesNotMatch(math, /\$\\frac/, 'aucun TeX brut à l’écran');
});

test('un document ne peut pas exécuter de code', () => {
  const html = render('<script>alert(1)</script>\n<img src=x onerror=alert(1)>');
  assert.doesNotMatch(html, /<script/i, 'aucune balise script dans la sortie');
  assert.doesNotMatch(html, /<img/i, 'aucune balise image fabriquée depuis le texte');
  assert.doesNotMatch(html, /style="/i, 'aucun attribut de style recopié');
  assert.match(html, /&lt;script&gt;/, 'le texte reste visible, échappé par React');
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/, 'la balise inconnue est affichée telle quelle, en texte');
});

test('la modale de document est un éditeur à deux onglets, borné', () => {
  const source = readFileSync('src/features/evaluations/components/ContentDocumentModal.tsx', 'utf8');
  assert.match(source, /renderDescriptionWithBold/, 'l’aperçu utilise le moteur du carnet');
  assert.match(source, /MAX_CONTENT_DOCUMENT_CHARS/, 'la borne de taille vient du module partagé');
  assert.match(source, /'source' \| 'preview'/, 'deux onglets');
  assert.match(source, /disabled=\{isTooLong\}/, 'impossible d’enregistrer au-delà de la borne');
  assert.match(source, /SUPPORTED_HTML_TAGS/, 'l’aide liste les balises réellement acceptées');
  // L'aperçu n'est composé que lorsque son onglet est visible.
  assert.match(source, /tab === 'preview' && source\.trim\(\)/, 'aucune composition KaTeX pendant la frappe');
});

test('un seul éditeur d’élèves pour les absents et les cahiers contrôlés', () => {
  const html = renderToStaticMarkup(React.createElement(LocaleProvider, {
    locale: 'fr',
    children: React.createElement(StudentNamesEditor, {
      initialNames: ['Amine R.', 'Salma B.'],
      onCancel: () => undefined,
      onSave: () => undefined,
      variant: 'checked',
    }),
  }));
  assert.ok(html.includes('2 élèves contrôlés'), 'le compteur parle des élèves contrôlés');
  assert.ok(html.includes('Amine R.'), 'les noms sont listés');
  assert.doesNotMatch(html, /absent/i, 'aucune trace du vocabulaire des absences');

  const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
  assert.match(view, /<StudentNamesEditor[\s\S]*?variant="absent"/, 'les absents réutilisent le même composant');
  assert.match(view, /variant="checked"/, 'les cahiers contrôlés aussi');
  assert.doesNotMatch(view, /const AbsencesEditor/, 'plus de second mécanisme');
});

test('documents et élèves sont branchés au devoir comme à l’activité', () => {
  const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
  // Le devoir : une carte `assessmentDocuments`, comme les absences.
  assert.match(view, /assessmentDocuments/, 'les documents de devoirs sont rangés par classe et par devoir');
  // L'activité : le document et les élèves vivent DANS l'événement.
  assert.match(view, /document: source\.trim\(\)/, 'document d’activité enregistré');
  assert.match(view, /students: names\.length > 0/, 'élèves consignés enregistrés');
  assert.match(view, /setDocumentFor\(\{ kind: 'assessment', link \}\)/, 'bouton « Contenu » sur un devoir');
  assert.match(view, /onOpenDocument=\{\(event\) => setDocumentFor\(\{ kind: 'event', event \}\)\}/, 'bouton « Contenu » sur une activité');
  assert.match(view, /onOpenStudents=\{\(event\) => setStudentsFor\(event\)\}/, 'bouton « Élèves » sur une activité');
  assert.match(view, /<ContentDocumentModal/, 'la modale de document est montée');
});
