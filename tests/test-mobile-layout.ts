import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');

test('les fenêtres Paramètres et Aide se serrent autour de leur contenu', () => {
  const settings = read('src/features/settings/settingsModal.css');
  assert.match(settings, /height:\s*fit-content/, 'la fenêtre Paramètres ne remplit plus l’écran');
  assert.match(settings, /max-height:\s*min\(82dvh/, 'la limite téléphone laisse voir la page derrière');

  const guide = read('src/features/guide/guide.css');
  assert.match(guide, /width:\s*min\(94vw, 30rem\)/, 'l’aide garde une largeur de dialogue sur téléphone');
  assert.match(guide, /max-height:\s*min\(76dvh, 34rem\)/, 'l’aide se limite à sa liste, pas à l’écran');
  assert.match(guide, /border-radius:\s*28px/, 'les quatre coins restent arrondis : ce n’est plus une feuille');
});

test('le hub Paramètres se resserre sans perdre ses cibles tactiles', () => {
  const hub = read('src/styles/settings-hub.css');
  assert.match(hub, /@media \(max-width: 639px\)[\s\S]*?\.settings-modal-frame \.hub-card[\s\S]*?min-height:\s*4\.5rem/);
  assert.match(hub, /\.settings-modal-frame \.hub-card__icon \{ width: 2\.35rem; height: 2\.35rem/, 'pastilles compactes');
  assert.match(hub, /\.settings-modal-frame \.hub-card \{[\s\S]*?border-radius: var\(--ui-radius-surface, 1\.25rem\)/, 'même rayon qu’au bureau');
  const modal = read('src/features/settings/ConfigModal.tsx');
  assert.match(modal, /hub-card__title line-clamp-2/, 'les titres restent sur deux lignes');
  assert.match(modal, /hub-card__hint line-clamp-2/, 'les descriptions restent sur deux lignes');
});

test('les cartes Paramètres partagent une seule surface neutre', () => {
  const hub = read('src/styles/settings-hub.css');
  assert.match(hub, /\.hub-card \{[\s\S]{0,900}background: hsl\(var\(--card\)\)/, 'surface unique pour toutes les cartes');
  assert.match(hub, /\.hub-card \{[\s\S]{0,900}border: 1px solid hsl\(var\(--border\)\)/, 'filet d’un pixel');
  assert.match(hub, /\.hub-card\[data-tone\] \{[\s\S]*?background: hsl\(var\(--card\)\)/, 'aucune carte ne porte un aplat coloré');
  assert.match(hub, /\.hub-card__icon \{[\s\S]*?color: var\(--tone\)/, 'la couleur de rubrique reste dans l’icône');
  assert.match(hub, /\.hub-card \{[\s\S]{0,900}text-align: start/, 'alignement naturel, pas de centrage systématique');
});

test('la grille d’emploi du temps et le dock s’adaptent aux téléphones 360–430 px', () => {
  const schedule = read('src/features/settings/components/schedule.css');
  assert.match(schedule, /@media \(max-width: 480px\)[\s\S]*?\.schedule-grid \{ min-width: 26rem; \}/,
    'la grille garde des colonnes lisibles et défile horizontalement');
  assert.match(schedule, /\.schedule-grid\[data-period='all'\] \{ min-width: 44rem; \}/);
  const navigation = read('src/components/navigation/navigation.css');
  assert.match(navigation, /width:\s*min\(22rem, calc\(100vw - 24px\)\)/, 'le dock suit la largeur du téléphone');
});

test('le robot et le bouton + collent au haut de l’écran sur téléphone', () => {
  const dashboard = read('src/features/dashboard/Dashboard.tsx');
  assert.match(dashboard, /antialiased pt-0 sm:pt-6/, 'aucune marge morte au-dessus de l’en-tête sur téléphone');
  assert.match(dashboard, /px-5 pt-2 sm:pt-11/, 'la marge haute du téléphone reste compacte, celle du bureau inchangée');
  assert.doesNotMatch(dashboard, /pt-7 sm:pt-11/, 'l’ancienne marge de 28 px est retirée');
  // Les anciens décalages RTL (barre remontée de 10 px, titre abaissé de 6 px)
  // désalignaient les icônes et le titre : l’alignement vient du flexbox.
  const actions = read('src/features/dashboard/dashboardActions.css');
  assert.doesNotMatch(actions, /margin-block-start: -10px/, 'plus de remontée artificielle de la barre d’actions');
  const canvas = read('src/features/dashboard/dashboardCanvas.css');
  assert.doesNotMatch(canvas, /inset-block-start: \.375rem/, 'plus d’abaissement artificiel du titre');
});
