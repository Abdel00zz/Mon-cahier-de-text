import { readIndexCss } from './readIndexCss';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { readMessageSource } from './readMessages';

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
  assert.match(editor, /allToday: allSelectedToday/);
  assert.match(editor, /onAdd: handleSelectionAdd/, 'actions à référence stable');
});

test('les écrans de chargement n’affichent plus de textes de détail sous le spinner', () => {
  const loaders = read('src/components/ui/PageSkeleton.tsx');
  assert.ok(!loaders.includes('LoadingMessage'));
  assert.ok(!loaders.includes('boot.workspace.detail') && !loaders.includes('boot.latex.detail'));
  assert.ok(!loaders.includes('role="progressbar"'), 'aucune barre : seul le spinner est visible');
  assert.match(loaders, /className="sr-only"[\s\S]{0,200}boot\.progress\.ariaLabel/, 'la progression reste annoncée aux lecteurs d’écran');
});

test('les paramètres comptent six rubriques et gardent les anciens liens directs', () => {
  const modal = read('src/features/settings/ConfigModal.tsx') + read('src/features/settings/settingsSections.ts');
  for (const id of ['emploi', 'absences', 'profil', 'apparence', 'notifications', 'compte']) {
    assert.match(modal, new RegExp(`id: '${id}'`));
  }
  assert.match(modal, /donnees: 'compte'/);
  assert.match(modal, /archives: 'compte'/);
  assert.ok(!/id: 'assistance'/.test(modal), 'l’aide est un lien, plus un onglet');
  assert.match(modal, /footer=\{profile\.hasChanges \? footer : undefined\}/);
  const messages = readMessageSource();
  assert.match(messages, /'settings\.item\.appearance':\s*'Apparence et langue'/, 'rubrique Apparence et langue en français');
  assert.match(messages, /'settings\.item\.appearance':\s*'Appearance & language'/, 'rubrique Appearance & language en anglais');
  assert.match(messages, /'settings\.item\.appearance':\s*'المظهر واللغة'/, 'rubrique المظهر واللغة en arabe');
});

test('déplacement : réordonnancement direct par glisser-déposer sur le tableau', () => {
  const table = read('src/features/editor/MainTable.tsx');
  assert.match(table, /useEditorRowReorder/, 'moteur de réordonnancement direct');
  const engine = read('src/features/editor/hooks/useSelectionEngine.ts');
  assert.match(engine, /planContentDrop/, 'déplacement de contenu par dépôt');
});

test('paramètres mobiles : six rubriques visibles dans une page, bureau en fenêtre', () => {
  const page = read('src/features/settings/SettingsOverview.tsx');
  const app = read('src/app/App.tsx');
  const modal = read('src/features/settings/ConfigModal.tsx');
  assert.match(page, /<WorkspacePage/);
  assert.match(page, /PAGE_SECTIONS.map/);
  assert.match(page, /const PAGE_ORDER = \['emploi',/, 'la page commence par Emploi du temps');
  assert.match(page, /COLLAPSIBLE_CATEGORIES = new Set<SettingsCategory>\(\['emploi', 'apparence', 'absences', 'notifications'\]\)/);
  assert.match(page, /data-settings-section=/);
  assert.doesNotMatch(page, /<Modal|role="tabpanel"|sectionOpen/);
  assert.match(app, /asPage=\{useWorkspacePages\}/);
  assert.match(page, /useSettingsProfile\(props.config, props.onChange, true\)/, 'le profil se sauvegarde automatiquement sur la page');
  assert.match(modal, /settings-nav hidden lg:flex/, 'le menu du bureau est conservé');
  const css = readIndexCss();
  for (const tone of ['blue', 'violet', 'pink', 'amber', 'green', 'teal', 'rose']) {
    assert.ok(css.includes(`[data-tone='${tone}']`), 'les teintes partagées restent disponibles');
  }
});

test('absences justifiées : rubrique dédiée, injection automatique dans les cahiers concernés', () => {
  const modal = read('src/features/settings/settingsSections.ts');
  assert.match(
    modal,
    /id: 'absences', titleKey: 'settings\.item\.absences', hintKey: 'settings\.card\.absences', icon: FileSignature, tone: 'rose'/,
    'la rubrique vit dans le menu principal, avec son icône',
  );
  const notifications = read('src/features/settings/components/NotificationsTab.tsx');
  assert.ok(!notifications.includes('AbsencesSection'), 'la section a quitté l’onglet Notifications');

  const tab = read('src/features/settings/components/AbsencesTab.tsx');
  assert.match(tab, /onConfigChange\(\{ absences:/, 'les absences restent dans la configuration synchronisée');
  assert.ok(!tab.includes('saveNotebook('), 'aucune écriture dans le plan pédagogique');
  assert.ok(!tab.includes('injectAbsenceLine('), 'aucune ligne ajoutée aux chapitres');
  assert.match(tab, /absenceSeparated/, 'le statut explique la séparation');
});

test('pastilles de type : une seule boîte, de la modale de séance aux réglages', () => {
  const keys = read('src/constants/type-keys.ts');
  assert.match(keys, /`content-badge inline-flex/, 'la forme partagée est nommée, jamais recopiée');
  const css = readIndexCss();
  assert.match(
    css,
    /\.content-badge\s*\{[^}]*min-width: 30px;[^}]*padding: 2px 5px;[^}]*font-family: var\(--font-document\);[^}]*font-size: 10px;[^}]*line-height: 1;[^}]*font-variant-numeric: tabular-nums;/,
    'la géométrie est écrite une fois : sigle académique, corps 10 px, rembourrage 5 px, largeur minimale 30 px, chiffres alignés',
  );
  // Le contrôle des réglages aligne ses deux états sur la même boîte : sans cela,
  // la pastille rétrécirait au moment d'être sélectionnée.
  const control = read('src/features/settings/components/DescriptionVisibilityControl.tsx');
  assert.match(control, /min-w-\[30px\] font-document rounded-lg px-1\.5 py-\[2px\] text-\[10px\] font-bold leading-none tracking-\[0\.02em\] tabular-nums/);
  assert.ok(!control.includes('px-2.5 py-1 text-[10px]'), 'plus de rembourrage concurrent');
  const fields = read('src/features/editor/modals/ContentFields.tsx');
  assert.match(fields, /contentBadgeClass\(type\)/, 'la modale de séance consomme la forme partagée');
});
