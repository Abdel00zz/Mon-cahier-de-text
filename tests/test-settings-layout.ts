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
  assert.ok(!loaders.includes('role="progressbar"'), 'aucune barre : seul le spinner est visible');
  assert.match(loaders, /className="sr-only"[\s\S]{0,200}boot\.progress\.ariaLabel/, 'la progression reste annoncée aux lecteurs d’écran');
});

test('les paramètres comptent six rubriques et gardent les anciens liens directs', () => {
  const modal = read('src/features/settings/ConfigModal.tsx');
  for (const id of ['emploi', 'absences', 'profil', 'apparence', 'notifications', 'compte']) {
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

test('paramètres : grandes cartes colorées sur téléphone et tablette, menu latéral dès 1024 px', () => {
  const modal = read('src/features/settings/ConfigModal.tsx');
  assert.ok(!modal.includes('FluidTabRail'), 'plus aucun onglet sur petit écran');
  assert.match(modal, /className=\{cn\('settings-home lg:hidden', sectionOpen && 'hidden'\)\}/, 'la grille de cartes est réservée aux écrans sous 1024 px');
  assert.match(modal, /settings-nav hidden lg:flex/, 'le menu latéral apparaît dès 1024 px');
  assert.equal((modal.match(/data-tone=/g) ?? []).length, 2, 'cartes de rubriques et carte du guide portent une couleur');
  for (const tone of ['blue', 'violet', 'pink', 'amber', 'green', 'teal']) assert.match(modal, new RegExp(`'${tone}'`));
  assert.match(modal, /requestExit\('guide'\)/, 'le guide reste une carte-lien, jamais une rubrique');
  assert.match(modal, /className="hub-back"[\s\S]{0,200}ChevronLeft/, 'le retour est un bouton dans l’en-tête de la fenêtre');
  assert.ok(!modal.includes('settings-backbar'), 'plus de ligne « Paramètres » répétée dans le contenu');
  assert.match(modal, /Object\.hasOwn\(TAB_ALIASES, requested\)/, 'les liens directs ne lisent que les identifiants connus');
  assert.match(modal, /key !== 'Escape'[\s\S]{0,400}setSectionOpen\(false\)/, 'Échap / retour Android revient à la grille avant de fermer');
  assert.match(modal, /listbox[\s\S]{0,80}menu/, 'un menu ouvert garde sa propre touche Échap');
  const css = read('src/styles/index.css');
  for (const tone of ['blue', 'violet', 'pink', 'amber', 'green', 'teal', 'rose']) {
    // Une seule règle sert les deux familles de cartes (`:is(.hub-card, .evaluation-tone)`) :
    // la teinte est écrite une fois, jamais recopiée pour chaque famille.
    const owner = '(?:\\.hub-card|:is\\(\\.hub-card, \\.evaluation-tone\\))';
    assert.match(css, new RegExp(`${owner}\\[data-tone='${tone}'\\]`));
    assert.match(css, new RegExp(`\\.dark ${owner}\\[data-tone='${tone}'\\]`), `teinte ${tone} adaptée au mode sombre`);
  }
  assert.match(css, /@media \(min-width: 1024px\)[\s\S]{0,300}\.settings-home \{ display: none; \}/, 'cartes masquées sur grand écran');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]{0,200}\.hub-card/, 'mouvement réduit respecté');
  assert.match(css, /\.hub-card \{[\s\S]{0,400}min-height: 7\.5rem/, 'cartes compactes mais assez grandes pour le pouce');
});

test('absences justifiées : rubrique dédiée, injection automatique dans les cahiers concernés', () => {
  const modal = read('src/features/settings/ConfigModal.tsx');
  assert.match(
    modal,
    /id: 'absences', titleKey: 'settings\.item\.absences', hintKey: 'settings\.card\.absences', icon: FileSignature, tone: 'rose'/,
    'la rubrique vit dans le menu principal, avec son icône',
  );
  const notifications = read('src/features/settings/components/NotificationsTab.tsx');
  assert.ok(!notifications.includes('AbsencesSection'), 'la section a quitté l’onglet Notifications');

  const tab = read('src/features/settings/components/AbsencesTab.tsx');
  assert.match(tab, /classSessionsDuring\(config\.timetable, config\.timetableClock, period, classIds\)/, 'seules les classes qui ont une séance, avec LEURS dates de séance');
  assert.match(tab, /notebookSessionDates\(stored\.lessonsData\)\.filter\(date => window\.has\(date\)\)/, 'et les séances que le cahier porte DÉJÀ : l’emploi du temps peut être vide ou pas encore synchronisé');
  assert.match(tab, /injectAbsenceLine\(lessons, \{/, 'ligne libre datée « certificat de maladie », à chaque date de séance');
  assert.match(tab, /saveNotebook\(classId, lessons/, 'une seule écriture par classe (file de synchronisation)');
  assert.match(tab, /t\('notifications\.absenceCertificate'\)/, 'intitulé traduit, jamais en dur');
  // La date vit dans la cellule « date » : le texte du contenu ne la répète pas.
  assert.match(tab, /description: motifByDate\.get\(date\) \|\| ''/, 'le motif pour seul texte, la date pour seul repère');
  assert.ok(!/formatDateDDMMYYYY\(period\.debut\)/.test(tab), 'plus de plage de dates écrite dans le contenu');
  assert.ok(!tab.includes('markClassDirty('), 'la synchronisation passe par saveNotebook, pas par un marquage direct');
});

test('pastilles de type : une seule boîte, de la modale de séance aux réglages', () => {
  const keys = read('src/constants/type-keys.ts');
  assert.match(keys, /`content-badge inline-flex/, 'la forme partagée est nommée, jamais recopiée');
  const css = read('src/styles/index.css');
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
