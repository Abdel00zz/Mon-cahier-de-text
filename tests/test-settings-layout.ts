import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('la barre latérale affiche le nom en texte simple, sans boîte ni point', () => {
  const source = read('src/components/navigation/TabBar.tsx');
  assert.ok(!source.includes('animate-pulse'), 'le point qui pulse a été retiré');
  assert.ok(!/stone-\d/.test(source), 'les couleurs viennent des jetons du thème');
  assert.ok(!/\?\s*notificationsCount\s*:\s*3\b/.test(source), 'aucun faux badge « 3 »');
  assert.ok(!/bg-primary\/10[^']*border border-primary\/20[^']*uppercase/.test(source), 'plus de pastille encadrée');
});

test('la barre de sélection n’affiche ni compteur ni bouton fermer et reste légère', () => {
  const bar = read('src/features/editor/SelectionBar.tsx');
  assert.ok(!bar.includes('selection.clear'), 'plus de bouton « annuler la sélection (N) »');
  assert.ok(!bar.includes('Intl.NumberFormat'), 'le nombre n’est plus formaté ni affiché');
  assert.ok(!bar.includes('framer-motion'), 'animations en CSS : aucun ressort JS par bouton');
  assert.match(bar, /memo</, 'barre mémoïsée');
  assert.match(bar, /sr-only[^>]*>\{t\('selection\.announce'/, 'le nombre reste annoncé aux lecteurs d’écran');
  assert.match(bar, /Escape/, 'Échap désélectionne');
  assert.match(bar, /allToday/, '« Aujourd’hui » disparaît quand tout porte déjà la date du jour');
  const editor = read('src/features/editor/Editor.tsx');
  assert.match(editor, /allToday=\{allSelectedToday\}/);
  assert.match(editor, /onAdd=\{handleSelectionAdd\}/, 'actions à référence stable');
});

test('les écrans de chargement n’affichent plus de textes de détail sous le spinner', () => {
  const loaders = read('src/components/ui/PageSkeleton.tsx');
  assert.ok(!loaders.includes('LoadingMessage'));
  assert.ok(!loaders.includes('boot.workspace.detail') && !loaders.includes('boot.latex.detail'));
  assert.match(loaders, /role="progressbar"/, 'la progression réelle reste visible, sans texte');
});

test('les paramètres comptent cinq onglets et gardent les anciens liens directs', () => {
  const modal = read('src/features/settings/ConfigModal.tsx');
  for (const id of ['emploi', 'profil', 'apparence', 'notifications', 'compte']) {
    assert.match(modal, new RegExp(`id: '${id}'`));
  }
  assert.match(modal, /donnees: 'compte'/);
  assert.match(modal, /archives: 'compte'/);
  assert.ok(!/id: 'assistance'/.test(modal), 'l’aide est un lien, plus un onglet');
  assert.match(modal, /footer=\{hasProfileChanges \? footer : undefined\}/);
});

test('déplacement : le mécanisme existant (menu de la barre) est conservé, les exercices passent de paragraphe en paragraphe', () => {
  const bar = read('src/features/editor/SelectionBar.tsx');
  assert.match(bar, /id: 'move-up'/, 'monter reste dans le menu de la barre');
  assert.ok(!/icon=\{ArrowUp\}/.test(bar), 'aucun nouveau bouton dédié dans la barre');
  const editor = read('src/features/editor/Editor.tsx');
  assert.ok(!/altKey[\s\S]{0,200}ArrowUp/.test(editor), 'aucun nouveau raccourci clavier');
  assert.match(editor, /moveFocusPendingRef/, 'la ligne déplacée est recentrée');
  const engine = read('src/features/editor/hooks/useSelectionEngine.ts');
  assert.match(engine, /planContentTransfer/, 'l’exercice peut changer de paragraphe');
});
