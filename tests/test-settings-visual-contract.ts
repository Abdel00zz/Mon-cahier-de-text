import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

// Contrat visuel : l’état sélectionné/focus ne doit plus s’appuyer sur une
// barre latérale épaisse (illisible en RTL, où elle tombe à droite), mais sur
// une pastille teintée. Les séances de l’emploi du temps suivent la même
// logique : carte arrondie posée dans la cellule, sans bloc plein bord à bord.
test('les onglets de Paramètres marquent l’état par une pastille, sans barre latérale', () => {
  const css = read('src/features/settings/settingsModal.css');
  assert.doesNotMatch(css, /border-inline-start:\s*2px solid transparent/, 'la barre latérale est retirée');
  assert.doesNotMatch(css, /border-inline-start-color:\s*var\(--codex-enamel\)/, 'plus de bord coloré sur le côté');
  assert.match(css, /\.settings-nav__link \{[\s\S]*?border-radius: 10px/, 'l’onglet devient une pastille arrondie');
  assert.match(css, /\.settings-nav__link\[aria-current='page'\] \{[\s\S]*?box-shadow: inset 0 0 0 1px/,
    'la sélection reste visible grâce au fond et au liseré interne');
  assert.match(css, /\.settings-nav__link:focus-visible \{[\s\S]*?outline-offset: -2px/,
    'le focus reste à l’intérieur de la pastille, jamais en saillie');
});

test('les cellules d’emploi du temps deviennent des cartes arrondies et légères', () => {
  const css = read('src/features/settings/components/schedule.css');
  assert.doesNotMatch(css, /\.schedule-cell--assigned::before/, 'plus de barre verticale dans la cellule');
  assert.match(css, /\.schedule-cell__content \{[\s\S]*?border-radius: 12px/, 'la cellule porte une surface arrondie');
  assert.match(css, /\.schedule-cell--assigned \.schedule-cell__content \{[\s\S]*?background: var\(--session-fill\)/,
    'la séance se lit sur une surface teintée');
  assert.match(css, /inset 0 0 0 1px color-mix\(in srgb, var\(--card-border\)/, 'un liseré fin reprend la couleur de la classe');
  assert.match(css, /\.schedule-cell__label \{[\s\S]*?font-weight: 650/, 'le nom de classe gagne en lisibilité');
});
