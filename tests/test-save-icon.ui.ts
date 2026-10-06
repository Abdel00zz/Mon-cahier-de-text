import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Save, Check, Loader2 } from '../src/components/ui/icons';

/*
 * Contrôle d'enregistrement : l'icône doit appartenir à la MÊME famille que le
 * reste du jeu maison — silhouette pleine très douce (`icon-wash`, 22 % de
 * l'encre) doublée de son contour, plus les détails tracés à l'encre. C'est la
 * recette de `Cloud`, `Book`, `Trash2`, `FileText`…
 *
 * Elle a remplacé une flèche de téléchargement tracée d'un seul trait, qui se
 * confondait avec `Download` et sortait de la famille.
 */

const html = renderToStaticMarkup(React.createElement(Save));

/** Silhouette de la disquette : corps à coin supérieur droit coupé. */
const SAVE_BODY = 'M5 2.5h9.05q.9 0 1.5.68l5.35 5.35q.6.6.6 1.42v9.05a2.5 2.5 0 0 1-2.5 2.5h-14a2.5 2.5 0 0 1-2.5-2.5v-14a2.5 2.5 0 0 1 2.5-2.5Z';

test('l’icône d’enregistrement suit la recette maison (lavis + contour)', () => {
  assert.ok(html.includes('app-icon'), 'l’icône est bien construite par la fabrique maison');
  assert.ok(html.includes('viewBox="0 0 24 24"'), 'grille de 24 px partagée par tout le jeu');
  assert.ok(html.includes('stroke-linecap="round"'), 'extrémités arrondies, comme le reste du jeu');
  const escape = (path: string) => path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Le lavis : silhouette pleine, sans contour propre…
  assert.match(html, new RegExp(`class="icon-wash"[^>]*stroke="none"[^>]*d="${escape(SAVE_BODY)}"|d="${escape(SAVE_BODY)}"[^>]*class="icon-wash"[^>]*stroke="none"`), 'lavis plein, sans contour');
  // …et le MÊME tracé, une seconde fois, en contour.
  assert.equal(html.split(SAVE_BODY).length - 1, 2, 'le corps est posé deux fois : lavis puis contour');
  assert.match(html, new RegExp(`d="${escape(SAVE_BODY)}"[^>]*fill="none"[^>]*stroke="currentColor"`), 'le contour est tracé à l’encre courante');
});

test('l’icône reste une disquette, pas une flèche de téléchargement', () => {
  // Étiquette du haut et volet du bas : les deux détails qui identifient l'objet.
  assert.ok(html.includes('M7.75 2.5v6h8.5v-6'), 'étiquette présente');
  assert.ok(html.includes('M7.75 21.5v-6h8.5v6'), 'volet présent');
  // Garde-fou : l'ancienne géométrie (flèche vers un bac) ne doit pas revenir.
  assert.doesNotMatch(html, /M12 3v10/, 'plus de flèche de téléchargement');
  assert.doesNotMatch(html, /M3\.5 14v4\.5/, 'plus de bac de réception');
});

test('les trois états du contrôle restent trois symboles distincts', () => {
  const check = renderToStaticMarkup(React.createElement(Check));
  const loader = renderToStaticMarkup(React.createElement(Loader2));
  assert.notEqual(html, check, 'enregistrer et enregistré ne partagent pas le même dessin');
  assert.notEqual(html, loader, 'enregistrer et en cours ne partagent pas le même dessin');
  // Le contrôle tourne : la coche et l'arc restent des tracés simples, deux
  // formes que le jeu emploie déjà partout (onboarding, réussites, chargements).
  assert.ok(check.includes('M19.5 6L9 18l-4.5-4.5'), 'la coche est inchangée');
  assert.ok(loader.includes('M20.5 12A8.5 8.5 0 1 1 12 3.5'), 'l’arc de chargement est inchangé');
});
