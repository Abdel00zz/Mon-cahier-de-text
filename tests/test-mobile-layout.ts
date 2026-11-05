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
  assert.match(hub, /@media \(max-width: 1023px\) \{[\s\S]*?\.settings-modal-frame \.settings-home \.hub-grid \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/,
    'les paramètres téléphone et tablette gardent deux cartes par ligne');
  assert.match(hub, /\.settings-home \.hub-grid > li:last-child > \.hub-card \{\s*grid-column: 1 \/ -1;/,
    'la carte du guide occupe toute la dernière ligne');
  assert.match(hub, /\.settings-modal-frame \.hub-card \{[\s\S]*?min-height: 8\.5rem;[\s\S]*?flex-direction: column;/,
    'les cartes reprennent la composition verticale de la référence');
  assert.match(hub, /\.settings-modal-frame \.hub-card__icon \{ width: 2\.75rem; height: 2\.75rem; align-self: flex-start/,
    'l’icône reste alignée en haut du côté de lecture');
  const modal = read('src/features/settings/ConfigModal.tsx');
  assert.match(modal, /hub-card__title line-clamp-2/, 'les titres restent sur deux lignes');
  assert.match(modal, /hub-card__hint line-clamp-2/, 'les descriptions restent sur deux lignes');
});

test('les choix d’apparence restent disposés par deux à toutes les largeurs', () => {
  const appearance = read('src/features/settings/components/AppearanceTab.tsx');
  assert.equal((appearance.match(/className="grid grid-cols-2/g) ?? []).length, 3,
    'thème, taille du texte et langue gardent deux options par ligne');
  assert.match(appearance, /role="group" aria-label=\{t\('language\.settings\.title'\)\} className="grid grid-cols-2/,
    'les langues forment aussi une grille à deux colonnes');
  assert.doesNotMatch(appearance, /sm:grid-cols-(3|4)|last:col-span-2/,
    'aucun breakpoint ne fait passer à trois ou quatre colonnes');
});

test('les cartes Paramètres partagent une seule surface neutre', () => {
  const hub = read('src/styles/settings-hub.css');
  assert.match(hub, /\.hub-card \{[\s\S]{0,900}background: hsl\(var\(--card\)\)/, 'surface unique pour toutes les cartes');
  assert.match(hub, /\.hub-card \{[\s\S]{0,900}border: 1px solid hsl\(var\(--border\)\)/, 'filet d’un pixel');
  assert.match(hub, /\.hub-card\[data-tone\] \{[\s\S]*?background: hsl\(var\(--card\)\)/, 'aucune carte ne porte un aplat coloré');
  assert.match(hub, /\.hub-card__icon \{[\s\S]*?color: var\(--tone\)/, 'la couleur de rubrique reste dans l’icône');
  assert.match(hub, /\.hub-card \{[\s\S]{0,900}text-align: start/, 'alignement naturel, pas de centrage systématique');
});

test('les choix en modale reprennent les tuiles et boîtes d’icônes de la référence', () => {
  const content = read('src/features/editor/modals/ContentModal.tsx');
  const contentStyles = read('src/features/editor/modals/paperFormModal.css');
  const evaluationStyles = read('src/features/evaluations/evaluationsResponsive.css');
  assert.equal((content.match(/className="grid grid-cols-2 gap-2\.5"/g) ?? []).length, 4,
    'les choix du contenu restent sur deux colonnes quelle que soit la largeur');
  assert.match(content, /className=\{`content-category[\s\S]*?data-layout="tile"/,
    'les choix de contenu sont balisés comme des tuiles');
  assert.match(contentStyles, /\.paper-form-modal \.content-category \{[\s\S]*?min-height: 9\.5rem;[\s\S]*?flex-direction: column;/,
    'les cartes à icône passent à la composition verticale');
  assert.match(contentStyles, /\.paper-form-modal \.content-category__icon \{[\s\S]*?width: 3\.5rem;[\s\S]*?height: 3\.5rem;[\s\S]*?border-radius: 16px;/,
    'les icônes utilisent une boîte neutre arrondie');
  assert.doesNotMatch(evaluationStyles, /\.evaluation-modal \.hub-card\[data-layout='tile'\]\s*\{/,
    'les modales d’évaluation ne rétrécissent plus les tuiles de référence');
});

test('la grille d’emploi du temps et le dock s’adaptent aux téléphones 360–430 px', () => {
  const schedule = read('src/features/settings/components/schedule.css');
  assert.match(schedule, /@media \(max-width: 480px\)[\s\S]*?\.schedule-grid \{ min-width: 26rem; \}/,
    'la grille garde des colonnes lisibles et défile horizontalement');
  assert.match(schedule, /\.schedule-grid\[data-period='all'\] \{ min-width: 44rem; \}/);
  const navigation = read('src/components/navigation/navigation.css');
  assert.match(navigation, /\.mobile-tab-bar\s*\{[^}]*position:\s*fixed;[^}]*left:\s*0; right:\s*0; bottom:\s*0;[^}]*width:\s*100%;/,
    'la barre reste fixe et pleine largeur sur le téléphone');
  assert.match(navigation, /padding:\s*5px 8px calc\(5px \+ env\(safe-area-inset-bottom, 0px\)\)/,
    'les onglets respectent la zone sûre du téléphone');
  assert.match(navigation, /@media \(max-width: 1023px\) \{\s*\.modal-bottom-navigation \{ display: block !important; \}/,
    'la barre reste dans la modale sur téléphones et tablettes');
  const modalMotion = read('src/components/ui/modal-motion.css');
  assert.match(modalMotion, /@media \(min-width: 768px\) and \(max-width: 1023px\)[\s\S]*?\.modal-motion-surface\[data-mobile-presentation="dialog"\]:has\(\.mobile-tab-bar--modal\)[\s\S]*?height: auto !important/,
    'les fenêtres contenant la barre deviennent immersives sur tablette');
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
  assert.match(canvas, /@media \(max-width: 639px\)\s*\{\s*\.dashboard-top-header\[dir='rtl'\]\s*\{[^}]*flex-direction:\s*column;[^}]*align-items:\s*stretch;/,
    'sur téléphone arabe, les actions occupent la rangée du haut et le titre descend en dessous');
  assert.match(dashboard, /<DashboardActions[\s\S]*?<\/DashboardActions>\s*<h1/,
    'les commandes restent avant le titre dans l’ordre de lecture');
});
