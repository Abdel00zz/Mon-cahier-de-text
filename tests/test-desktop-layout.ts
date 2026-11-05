import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

// Deux versions, deux usages : le téléphone lit une carte par ligne, le bureau
// répartit les cartes sur la largeur disponible. Aucun bouton n'est ajouté et
// aucune couleur n'est modifiée — seule la zone et sa taille changent.
test('le tableau de bord occupe la largeur du bureau sans élargir le téléphone', () => {
  const dashboard = read('src/features/dashboard/Dashboard.tsx');
  assert.match(dashboard, /max-w-\[40rem\][\s\S]{0,80}lg:max-w-\[78rem\]/, 'même colonne sur téléphone, colonne large au bureau');
  assert.match(dashboard, /data-display=\{currentDisplay\}/, 'la disposition retenue atteint la grille');
  assert.doesNotMatch(dashboard, /max-w-\[40rem\] pl-safe/, 'plus de colonne unique imposée sur grand écran');
});

test('la grille des classes suit la disposition retenue, jamais une colonne figée', () => {
  const css = read('src/features/dashboard/dashboardCanvas.css');
  assert.match(css, /\.dashboard-classes-container \.dashboard-day-group__cards \{[\s\S]{0,200}display: grid;/, 'la liste devient une grille');
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\);/, 'une carte par ligne par défaut (téléphone)');
  assert.match(css, /@media \(min-width: 768px\) \{[\s\S]{0,320}data-display='double'[\s\S]{0,160}data-display='triple'[\s\S]{0,200}repeat\(2, minmax\(0, 1fr\)\)/,
    'deux colonnes dès la tablette');
  assert.match(css, /@media \(min-width: 1100px\) \{[\s\S]{0,200}data-display='triple'[\s\S]{0,200}repeat\(3, minmax\(0, 1fr\)\)/,
    'trois colonnes sur grand écran');
  assert.match(css, /\.dashboard-classes-container\[data-display='single'\]|grid-template-columns: minmax\(0, 1fr\);[\s\S]{0,40}\}/,
    'les dispositions single et list gardent une colonne');
});

test('la fenêtre Paramètres prend la largeur du bureau et la grille suit son conteneur', () => {
  const modal = read('src/features/settings/ConfigModal.tsx');
  assert.match(modal, /maxWidth="lg"/, 'la fenêtre n’est plus une colonne de téléphone sur grand écran');
  const hub = read('src/styles/settings-hub.css');
  assert.match(hub, /\.settings-home \{[^}]*container-type: inline-size;/, 'le hub mesure sa propre largeur');
  assert.match(hub, /@container \(min-width: 34rem\) \{[\s\S]{0,120}\.hub-grid \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\); \}/,
    'trois colonnes seulement quand la place existe');
  assert.match(hub, /@media \(min-width: 640px\) \{[\s\S]{0,1200}\.hub-grid \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/, 'deux colonnes entre les deux');
});
