import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { DevoirsView } from '../src/features/evaluations/DevoirsView';
import type { AppConfig, ClassInfo, PedagogicalEvent } from '../src/types';

/*
 * LE TABLEAU DES ÉVALUATIONS — les deux zones (devoirs, activités) d'une classe.
 *
 * Le professeur y vient pour surveiller une classe : il doit donc pouvoir
 * BALAYER des lignes, pas ouvrir des cartes. Ces verrous tiennent la structure
 * qui le permet : une seule surface, des colonnes tenues par des jetons
 * partagés entre l'en-tête et les lignes, un filet d'un demi-pixel entre deux
 * lignes, et des cibles tactiles qui ne rétrécissent jamais.
 */

const css = readFileSync('src/features/evaluations/evaluationsBoard.css', 'utf8');
const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8') + readFileSync('src/features/evaluations/components/PedagogicalEventsSection.tsx', 'utf8');

const classInfo = {
  id: 'c1', name: '2Bac PC 1', subject: 'Mathématiques', cycle: 'lycee',
  createdAt: '2026-09-01T00:00:00.000Z', color: 'indigo',
} as unknown as ClassInfo;

const event = (id: string, title: string, date: string, extra: Partial<PedagogicalEvent> = {}): PedagogicalEvent => ({
  id, type: 'olympiade', title, date, status: 'planned', createdAt: '2026-09-01T00:00:00.000Z', ...extra,
});

const html = renderToStaticMarkup(
  React.createElement(LocaleProvider, {
    locale: 'fr',
    children: React.createElement(DevoirsView, {
      classInfo,
      config: ({
        pedagogicalEvents: { c1: [event('e1', 'Olympiade de mathématiques', '2026-09-14'), event('e2', 'Concours national', '2026-10-02')] },
      } as unknown) as AppConfig,
      onConfigChange: () => {},
    }),
  }),
);

test('les deux zones partagent le MÊME tableau', () => {
  // Une liste de tiroirs par famille, et un tableau d'occurrences dans chacun.
  assert.equal((view.match(/className="ev-board"/g) ?? []).length, 2, 'un tableau par famille');
  assert.equal((view.match(/className="ev-board__head"/g) ?? []).length, 2, 'chacun nomme ses colonnes');
  assert.equal((view.match(/className="ev-board__rows"/g) ?? []).length, 2, 'chacun a ses lignes');
  // Les TROIS colonnes — ni la nature ni l'état n'en ont : l'une est écrite dans le libellé, l'autre se lit dans la date.
  for (const cell of ['ev-row__id', 'ev-row__date', 'ev-row__actions']) {
    assert.ok(view.includes(`"${cell}`), `colonne ${cell} déclarée`);
  }
  assert.doesNotMatch(view, /ev-row__kind/, 'plus aucune colonne d’icône de nature');
  assert.doesNotMatch(view, /ev-row__state/, 'plus aucune colonne d’état');
  assert.match(view, /className="ev-accordion__toggle"/, 'les activités s’ouvrent en tiroirs');
  assert.match(view, /aria-expanded=\{isOpen\}/, 'l’état du tiroir est annoncé');
  assert.match(view, /ChevronDown/, 'l’icône chevron anime l’ouverture et fermeture');
  assert.match(view, /t\('evaluations\.expand'\)/, 'l’accessibilité conserve le libellé Ouvrir');
  assert.match(view, /t\('evaluations\.collapse'\)/, 'et Fermer quand il est ouvert');
  assert.match(view, /className="ev-accordion__toggle-icon/, 'le conteneur d’icône remplace le texte visible');
  // Le titre d’une zone se lit : aucune icône de nature devant son libellé.
  assert.doesNotMatch(view, /ev-accordion__kind-icon|KindIcon/, 'le titre du tiroir n’a pas d’icône');
  assert.doesNotMatch(css, /\.ev-accordion__kind-icon/, 'aucun style d’icône de tiroir résiduel');
  assert.match(view, /<span className="ev-accordion__label">\s*<span className="ev-accordion__label-text">\{label\}<\/span>/, 'le libellé seul ouvre le titre');
  // Les tiroirs sont INDÉPENDANTS : deux activités ouvertes côte à côte.
  assert.match(view, /const \[openActivityKeys, setOpenActivityKeys\] = useState<string\[\] \| undefined>\(/, 'un ensemble de tiroirs ouverts');
  assert.match(view, /const openKeys = openActivityKeys \?\? \(firstActivity \? \[activityKey\(firstActivity\)\] : \[\]\)/, 'le premier tiroir s’ouvre d’emblée');
  assert.equal((html.match(/class="ev-row evaluation-tone"/g) ?? []).length, 2, 'les occurrences du tiroir ouvert sont montrées');
});

test('les colonnes sont des jetons partagés : l’en-tête et les lignes ne peuvent pas se décaler', () => {
  // Les jetons vivent sur la SURFACE, pas sur les lignes : l'en-tête est leur
  // frère. Portés par `.ev-board__rows`, il retombait sur des colonnes
  // automatiques et ses libellés ne tombaient plus au-dessus des bonnes
  // colonnes (mesuré au navigateur).
  const board = css.slice(css.indexOf('.ev-board {'), css.indexOf('/* Ligne d’en-tête'));
  assert.match(board, /--ev-actions: 21rem;/, 'les commandes ont une largeur FIXE, sinon une ligne décale les siennes');
  assert.doesNotMatch(css, /--ev-state/, 'plus de largeur d’état à dimensionner');
  assert.equal((css.match(/--ev-date:/g) ?? []).length, 1, 'largeur de date définie une fois');
  assert.doesNotMatch(css, /--ev-kind/, 'plus de colonne de nature à dimensionner');
  const head = css.slice(css.indexOf('.ev-board__head {'), css.indexOf('.ev-board__rows > .ev-row {'));
  assert.match(head, /grid-template-columns: var\(--ev-id\) var\(--ev-date\) var\(--ev-actions\)/, 'l’en-tête lit les jetons');
  assert.match(head, /grid-template-areas: 'id date actions'/, 'l’en-tête place ses libellés');
  assert.match(css, /\.ev-board__rows > \.ev-row \{[\s\S]{0,260}grid-template-columns: var\(--ev-id\)/, 'la ligne lit les MÊMES jetons');
  // Chaque cellule occupe SA zone : l'ordre est celui du tableau, pas du texte.
  for (const cell of ['id', 'date', 'actions']) {
    assert.match(css, new RegExp(`\\.ev-row__${cell} \\{ grid-area: ${cell};`), `${cell} dans sa colonne`);
  }
});

test('une surface, des filets : plus de pile de cartes', () => {
  assert.match(css, /\.ev-board \{[\s\S]{0,320}border: 1px solid[\s\S]{0,240}border-radius: 6px/, 'une seule bordure pour toute la zone');
  assert.match(css, /\.ev-board \{[\s\S]{0,320}overflow: hidden/, 'les fonds de survol épousent le rayon');
  assert.match(css, /\.ev-row \+ \.ev-row \{\s*\n\s*border-top: 1px solid/, 'un filet entre deux lignes, rien de plus');
  // Aucune ligne ne redevient une carte : ni rayon, ni ombre, ni bordure propre.
  const row = css.slice(css.indexOf('.ev-board__rows > .ev-row {'), css.indexOf('/* Filet de séparation'));
  assert.doesNotMatch(row, /border: 1px solid|border-radius|box-shadow/, 'la ligne reste une ligne');
});

test('au téléphone, deux lignes par entrée et jamais moins de 44 px au doigt', () => {
  const tablet = css.slice(css.indexOf('@media (max-width: 1023px)'), css.indexOf('/* Repli en trois lignes'));
  assert.match(tablet, /\.ev-board__head \{ display: none; \}/, 'un en-tête de colonnes n’a plus de sens en deux lignes');
  assert.match(tablet, /grid-template-areas:[\s\S]{0,120}'id id'[\s\S]{0,80}'date actions'/, 'identité seule, puis date et actions');
  assert.match(tablet, /\.ev-date-trigger, \.ev-date-empty \{ height: 2\.75rem/, 'la date atteint 44 px');
  assert.match(tablet, /\.ev-action \{ min-height: 2\.75rem/, 'les commandes aussi');
  assert.match(tablet, /\.ev-icon-btn \{ width: 2\.75rem; height: 2\.75rem; \}/, 'les icônes-commandes aussi');
  // Sous 640 px, date et commandes ne cohabitent plus : trois lignes, pas quatre.
  const phone = css.slice(css.indexOf('@media (max-width: 639px)'));
  assert.match(phone, /'id id'\s*\n\s*'date date'\s*\n\s*'actions actions'/, 'trois lignes utiles');
  // Sur grand écran, la ligne reste basse : 56 px minimum.
  assert.match(css, /\.ev-board__rows > \.ev-row \{[\s\S]{0,400}min-height: 56px/, 'lignes denses sur grand écran');
});

test('plus de colonne « État » : l’écart de date reste signalé et actionnable sous le titre', () => {
  // L'état se déduisait de la date et du cahier : ce qui demande une action — aligner la
  // date sur la séance — passe sous le titre de la ligne, avec les dates du devoir maison.
  assert.doesNotMatch(view, /STATUS_CHIP|STATUS_STYLE/, 'plus de pastille d’état par devoir');
  assert.doesNotMatch(view, /evaluations\.colState/, 'plus d’en-tête « État »');
  assert.match(view, /className="ev-row__meta"/, 'les dates et l’alignement vivent sous le titre');
  assert.match(view, /setAssessmentDate\(a\.id, targetDate\)/, 'l’alignement sur le cahier est conservé');
  assert.match(view, /evaluations\.homework\.givenOn/, 'la date de remise du devoir maison est conservée');
  assert.match(view, /evaluations\.homework\.dueOn/, 'la date limite de rendu est rappelée sous le titre du devoir maison');
  assert.match(view, /ev-row--correction/, 'la date de correction est celle de l’entrée « Correction du devoir maison »');
  assert.match(css, /\.ev-row__meta \{/, 'la ligne secondaire a son style');
  assert.match(css, /@media \(pointer: coarse\) \{ \.ev-row__align \{ min-height: 2\.75rem/, 'et atteint 44 px au doigt');
});

test('le bouton document dit vrai : vert quand un sujet est associé, rouge quand il manque', () => {
  assert.match(view, /documentIndicator\(documentRequirementForAssessment\(a\.type, policy\), assessmentDocument\)/, 'une seule règle de besoin de document, celle de la direction');
  assert.match(view, /data-filled=\{docIndicator === 'attached' \? 'ok' : 'missing'\}/, 'deux états sémantiques : vert si contenu existe, rouge sinon');
  // Pas de pictogramme : le LIBELLÉ double la couleur (« Contenu » rédigé, « + Contenu » à rédiger).
  assert.doesNotMatch(view, /FileCheck|FilePlus|FileText/, 'plus d’icône de document sur la ligne');
  assert.match(view, /docIndicator === 'attached' \? 'evaluations\.doc\.open' : 'evaluations\.action\.addContent'/, 'le libellé dit l’état, pas seulement la couleur');
  assert.match(css, /\.ev-action\[data-filled='ok'\] \{[\s\S]{0,80}#15803d/, 'vert sémantique en clair');
  assert.match(css, /\.dark \.ev-action\[data-filled='ok'\] \{[\s\S]{0,80}#76d59a/, 'et sa valeur sombre');
  assert.match(css, /\.ev-action\[data-filled='missing'\] \{[\s\S]{0,120}var\(--destructive\)/, 'rouge sémantique quand le sujet manque');
});

test('les couleurs restent sémantiques et le mouvement facultatif', () => {
  assert.match(css, /\.ev-action\[data-filled='tone'\]/, 'une commande liée à la nature prend son ton');
  assert.match(css, /\.ev-action\[data-filled='danger'\] \{[\s\S]{0,120}var\(--destructive\)/, 'les absents critiques gardent le rouge sémantique');
  assert.match(css, /\.ev-icon-btn\[data-done='true'\] \{[\s\S]{0,140}#15803d/, 'réalisé = vert sémantique en clair');
  assert.match(css, /\.dark \.ev-icon-btn\[data-done='true'\] \{ color: #76d59a/, 'et sa valeur sombre');
  assert.match(css, /\.ev-icon-btn\[data-danger='true'\] \{[\s\S]{0,140}var\(--destructive\)/, 'bouton corbeille = cadre et rouge sémantique');
  assert.match(css, /\.ev-icon-btn\[data-agenda='true'\] \{[\s\S]{0,140}var\(--primary\)/, 'bouton agenda = cadre bleu primaire');
  assert.match(view, /data-danger="true"/, 'le bouton corbeille porte l’attribut de danger');
  assert.doesNotMatch(view, /data-agenda=\{!done \? 'true' : undefined\}/, 'le bouton marquer comme fait est purgé');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,120}\.ev-board__rows > \.ev-row/, 'mouvement facultatif');
  // Le tableau se positionne en propriétés logiques : il se lit en arabe comme en français.
  assert.doesNotMatch(css, /(margin|padding|border)-(left|right)\s*:/, 'aucune propriété physique horizontale');
});
