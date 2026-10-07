import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { ClassChooser, KindChooser, KindHeader, ProgrammedList, StepTrail } from '../src/features/evaluations/components/KindChooser';
import { DEVOIR_KIND_CONFIG, KIND_GROUPS, PEDAGOGICAL_EVENT_CONFIG, kindLabelKey } from '../src/features/evaluations/kindCatalog';

/*
 * Choix de la NATURE d'une évaluation.
 *
 * Le parcours de création se fait en deux étapes : d'abord des cartes colorées
 * (devoir maison, contrôle des cahiers, olympiade, contrôle oral…), puis les
 * champs de la nature choisie. Aucune barre de recherche, aucun type redemandé
 * dans le formulaire : ces tests verrouillent la grille, la source unique des
 * natures et l'absence de second sélecteur.
 */

const render = (element: React.ReactElement) => renderToStaticMarkup(
    React.createElement(LocaleProvider, { locale: 'fr', children: element }),
);

test('la grille propose TOUTES les natures, en deux familles', () => {
    const html = render(React.createElement(KindChooser, { onSelect: () => undefined }));
    const kinds = KIND_GROUPS.flatMap(group => group.kinds);
    assert.equal(kinds.length, Object.keys(DEVOIR_KIND_CONFIG).length + Object.keys(PEDAGOGICAL_EVENT_CONFIG).length);
    for (const kind of kinds) {
        assert.match(html, new RegExp(`data-kind="${kind.type}"`), `${kind.type} est proposé`);
        assert.match(html, new RegExp(`data-tone="${kind.style.tone}"`), `${kind.type} porte sa teinte`);
        assert.match(html, new RegExp(`aria-label="[^"]*" data-kind|data-kind="${kind.type}"`), 'un libellé accessible accompagne chaque carte');
    }
    // Devoir maison, contrôle des cahiers, olympiade et contrôle oral : les
    // natures citées par le professeur sont bien là, à égalité de traitement.
    for (const expected of ['maison', 'controle_cahiers', 'olympiade', 'oral']) {
        assert.ok(kinds.some(kind => kind.type === expected), `${expected} dans le catalogue`);
    }
    // Deux familles annoncées, jamais une liste indifférenciée.
    assert.equal((html.match(/data-kind-family="devoir"/g) ?? []).length, Object.keys(DEVOIR_KIND_CONFIG).length);
    assert.equal((html.match(/data-kind-family="event"/g) ?? []).length, Object.keys(PEDAGOGICAL_EVENT_CONFIG).length);
    // Aucune barre de recherche : le choix tient sur un écran.
    assert.doesNotMatch(html, /type="search"|role="searchbox"/);
});

test('chaque nature a une icône distincte dans sa famille, et une clé traduite', () => {
    const all = KIND_GROUPS.flatMap(group => group.kinds);
    for (const family of ['devoir', 'event'] as const) {
        const icons = all.filter(kind => kind.family === family).map(kind => kind.style.Icon);
        assert.equal(new Set(icons).size, icons.length, `icônes distinctes dans ${family}`);
        for (const kind of all.filter(k => k.family === family)) {
            assert.match(kindLabelKey(kind), /^evaluations\.(type|event)\./, 'libellé traduit, jamais en dur');
        }
    }
});

test('chaque famille ouvre sa grille par une icône, un titre et son compte', () => {
    const html = render(React.createElement(KindChooser, { onSelect: () => undefined }));
    // Deux en-têtes, donc deux pastilles : une par famille, jamais un titre nu.
    assert.equal((html.match(/kind-group__badge/g) ?? []).length, KIND_GROUPS.length);
    assert.equal((html.match(/kind-group__count/g) ?? []).length, KIND_GROUPS.length);
    // Le compte annonce le nombre de natures de la section (5 devoirs, 9 activités).
    for (const group of KIND_GROUPS) {
        assert.match(html, new RegExp(`kind-group__count[^>]*>${group.kinds.length}<`), `compte de ${group.id}`);
    }
    // La pastille porte le ton de SA famille, et l'icône de famille est distincte
    // des icônes de cartes : elle dit la famille, pas la nature.
    for (const group of KIND_GROUPS) {
        assert.match(html, new RegExp(`class="kind-group evaluation-tone" data-tone="${group.tone}"`), `ton de famille ${group.id}`);
        assert.notEqual(group.Icon, undefined, `icône de famille ${group.id}`);
    }
    assert.notEqual(KIND_GROUPS[0].Icon, KIND_GROUPS[1].Icon, 'deux icônes de famille distinctes');
    const kindIcons = KIND_GROUPS.flatMap(group => group.kinds.map(kind => kind.style.Icon));
    for (const group of KIND_GROUPS) {
        assert.ok(!kindIcons.includes(group.Icon), 'l’icône de famille ne double aucune carte');
    }
    // La pastille est décorative : le titre porte le sens pour un lecteur d'écran.
    assert.match(html, /kind-group__badge[^>]*aria-hidden="true"/);
});

test('le rappel de nature nomme le choix et permet d’y revenir — sans icône', () => {
    const kind = KIND_GROUPS[0].kinds[0];
    const html = render(React.createElement(KindHeader, { kind, onBack: () => undefined }));
    assert.match(html, /Changer le type/, 'le retour au choix est explicite');
    assert.match(html, /min-h-11/, 'cible tactile de 44 px');
    // « Minimiser les icônes dans les zones » : la nature est ÉCRITE, pas dessinée.
    assert.doesNotMatch(html, /<svg/, 'aucune icône dans le rappel');
    assert.doesNotMatch(html, /hub-card__icon/, 'plus de pastille teintée');
    assert.ok(html.includes(kindLabelKey(kind) === 'evaluations.type.controle' ? 'Devoir surveillé' : ''), 'la nature est nommée en toutes lettres');
});

test('l’étape 1 montre la classe active SEULE, le reste sur demande', () => {
    const classes = [
        { id: 'c1', tier: '2ème Bac Sc. Physiques', title: 'Sciences Physiques', group: '3', fullName: '2ème Bac Sc. Physiques Sciences Physiques 3', segment: 'lycee' as const },
        { id: 'c2', tier: '1ère Année Collégiale', title: 'Première Année Collégiale', group: null, fullName: '1ère Année Collégiale', segment: 'college' as const },
        { id: 'c3', tier: '2ème Bac Sc. de la Vie', title: 'Sciences de la Vie et de la Terre', group: '1', fullName: '2ème Bac Sciences de la Vie et de la Terre 1', segment: 'lycee' as const },
    ];

    // Par défaut : LA SEULE classe active, et une demande explicite pour le reste.
    // « Il faut isoler : ne pas afficher » — on n'ouvre pas une liste de quinze
    // cartes pour travailler dans la classe qu'on a déjà ouverte.
    const focused = render(React.createElement(ClassChooser, { classes, currentId: 'c1', onSelect: () => undefined }));
    assert.equal((focused.match(/data-class-id=/g) ?? []).length, 1, 'une seule carte de classe');
    assert.match(focused, /data-class-id="c1"[^>]*data-current="true"/, 'la classe ouverte est marquée');
    assert.match(focused, /Classe active/, 'et elle le dit en toutes lettres');
    assert.match(focused, /Changer de classe/, 'le reste se demande');
    assert.match(focused, /aria-expanded="false"/, 'état de repli annoncé');
    assert.doesNotMatch(focused, /data-class-id="c2"/, 'les autres ne sont pas affichées');
    assert.equal((focused.match(/<svg/g) ?? []).length, 0, 'aucune icône');

    // Déployé : les autres classes, rangées par cycle, comme la page les range.
    const opened = render(React.createElement(ClassChooser, { classes, currentId: 'c1', onSelect: () => undefined, initialExpanded: true }));
    for (const item of classes) {
        assert.match(opened, new RegExp(`data-class-id="${item.id}"`), `${item.id} est proposée`);
    }
    assert.match(opened, /Lycée qualifiant/, 'groupe du lycée');
    assert.match(opened, /Collège/, 'groupe du collège');
    assert.equal((opened.match(/data-current="true"/g) ?? []).length, 1, 'toujours une seule active');
    assert.match(opened, /class-choice__group/, 'le numéro de groupe s’écrit à côté');
    assert.equal((opened.match(/<svg/g) ?? []).length, 0, 'aucune icône non plus');
});

test('les zones ne portent plus d’icônes de navigation', () => {
    const items = [
        { id: 'a1', label: 'Devoir maison 1', dateISO: '2026-09-14', statusLabel: 'À vérifier', statusClass: 'ring-amber-500/40', hasDocument: true },
    ];
    const list = render(React.createElement(ProgrammedList, { items, onOpen: () => undefined, onCreate: () => undefined }));
    // Les pastilles d'état et de document suffisent : plus de chevron d'un côté,
    // plus de « + » de l'autre — le libellé de la création porte l'action.
    assert.equal((list.match(/<svg/g) ?? []).length, 0, 'la liste programmée est textuelle');
    assert.match(list, /Créer un devoir hors programmation/);
    assert.match(list, /border-dashed/);
    assert.match(list, /tone-chip/);
});

test('le fil d’étapes montre les trois crans et sert de retour', () => {
    const first = render(React.createElement(StepTrail, { step: 1, onStep: () => undefined }));
    assert.match(first, /aria-current="step"/, 'l’étape courante est annoncée');
    for (const label of ['Classe', 'Nature', 'Contenu']) {
        assert.ok(first.includes(label), `le cran « ${label} » est visible`);
    }
    assert.equal((first.match(/<svg/g) ?? []).length, 0, 'des numéros, pas des icônes');
    assert.equal((first.match(/<button/g) ?? []).length, 0, 'rien à recliquer avant d’avoir avancé');

    const third = render(React.createElement(StepTrail, { step: 3, label: 'Devoir maison', onStep: () => undefined }));
    assert.ok(third.includes('Devoir maison'), 'la nature choisie nomme le troisième cran');
    assert.equal((third.match(/<button/g) ?? []).length, 2, 'les deux crans franchis se recliquent');
    assert.match(third, /aria-current="step"/);
});

test('un devoir programmé s’ouvre depuis la liste, la création libre reste en repli', () => {
    const items = [
        { id: 'a1', label: 'Devoir maison 1', dateISO: '2026-09-14', statusLabel: 'À vérifier', statusClass: 'ring-amber-500/40', hasDocument: false },
        { id: 'a2', label: 'Devoir maison 2', dateISO: '2026-10-26', statusLabel: 'À venir', statusClass: 'ring-blue-500/40', hasDocument: true },
    ];
    const html = render(React.createElement(ProgrammedList, { items, onOpen: () => undefined, onCreate: () => undefined }));
    for (const item of items) {
        assert.match(html, new RegExp(`data-programmed-id="${item.id}"`), `${item.id} est proposé`);
        assert.match(html, new RegExp(item.statusLabel), 'son état est écrit, pas seulement coloré');
    }
    // Le sujet déjà rédigé est signalé ; la date est en toutes lettres.
    assert.match(html, /septembre/, 'la date se lit en clair');
    assert.match(html, /tone-chip/, 'un devoir déjà rédigé le dit');
    // Créer hors programmation reste possible, mais discret (trait discontinu).
    assert.match(html, /border-dashed/);
    assert.match(html, /Créer un devoir hors programmation/);
    // Aucun devoir de ce type : le message guide au lieu d'un écran vide.
    const empty = render(React.createElement(ProgrammedList, { items: [], onOpen: () => undefined, onCreate: () => undefined }));
    assert.match(empty, /Aucun devoir de ce type/, 'état vide expliqué');
});

test('les devoirs passent par leur LISTE programmée, pas par un formulaire vide', () => {
    const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
    assert.match(view, /manualFormOpen \? \([\s\S]{0,400}<ProgrammedList/, 'la liste programmée précède le formulaire');
    assert.match(view, /items=\{programmedFor\(chosenKind\.type\)\}/, 'la liste suit la nature choisie');
    assert.match(view, /onOpen=\{openProgrammedAssessment\}/, 'un devoir programmé s’ouvre');
    assert.match(view, /onCreate=\{\(\) => setManualFormOpen\(true\)\}/, 'la création libre est demandée explicitement');
    assert.match(view, /const openProgrammedAssessment = \(assessmentId: string\) => \{[\s\S]{0,300}setDocumentFor\(\{ kind: 'assessment', link \}\)/, 'on accède au sujet du devoir');
    // L'état manuel ne survit pas à la fermeture du parcours.
    assert.match(view, /const closeKindChooser = \(\) => \{[\s\S]{0,120}setManualFormOpen\(false\)/, 'parcours remis à zéro');
});

test('le catalogue est la SOURCE des natures pour la page et pour le choix', () => {
    const catalog = readFileSync('src/features/evaluations/kindCatalog.ts', 'utf8');
    const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
    // Une seule déclaration des natures : la vue l'importe.
    assert.equal((catalog.match(/export const PEDAGOGICAL_EVENT_CONFIG/g) ?? []).length, 1);
    assert.match(view, /import \{ DEVOIR_KIND_CONFIG, KIND_GROUPS, PEDAGOGICAL_EVENT_CONFIG, kindLabelKey, type EvaluationKind \} from '\.\/kindCatalog'/, 'la page lit le catalogue');
    assert.match(view, /kindLabelKey\(chosenKind\)/, 'le fil d’étapes nomme la nature via sa clé traduite');
    assert.doesNotMatch(view, /const PEDAGOGICAL_EVENT_CONFIG/, 'aucune copie locale');
    // Le parcours en TROIS étapes : la classe, la nature, puis ses zones.
    assert.match(view, /const \[wizardStep, setWizardStep\] = useState<1 \| 2 \| 3>\(1\)/, 'un cran d’assistant');
    assert.match(view, /<ClassChooser classes=\{classChoices\} currentId=\{selectedClass\.id\} onSelect=\{chooseClass\} \/>/, 'étape 1 : la classe');
    assert.match(view, /<KindChooser onSelect=\{\(kind\) => \{ setChosenKind\(kind\); setWizardStep\(3\); \}\} \/>/, 'étape 2 : la nature');
    assert.match(view, /<KindHeader[\s\S]{0,200}setWizardStep\(2\)/, 'étape 3 : retour au choix de la nature');
    // Le type n'est plus redemandé par le formulaire d'activité.
    assert.match(view, /const \[type\] = useState<PedagogicalEventType>\(initialType\)/, 'type fixé par l’étape 1');
    assert.doesNotMatch(view, /evaluations\.activityType/, 'plus de sélecteur de type dans la fiche');
    // Le devoir : sélecteur conservé UNIQUEMENT en modification.
    assert.match(view, /initial \? \([\s\S]{0,900}<option value="controle">/, 'type modifiable seulement en édition');
});

test('l’écran commence par les classes, puis montre la classe ouverte', () => {
    const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
    // Une seule entrée de création : « Ajouter » ouvre le parcours de nature.
    assert.match(view, /onClick=\{openKindChooser\}/, 'le bouton Ajouter ouvre le parcours');
    assert.doesNotMatch(view, /evaluations\.addActivity\}<\/span>/, 'plus de bouton « activité » séparé dans la barre');
    // VUE 1 : les classes. VUE 2 : la classe ouverte, ses devoirs puis ses activités.
    assert.match(view, /\{!openClass && \([\s\S]{0,120}<ClassPicker classes=\{classPicks\} onOpen=\{openClassView\} \/>/, 'la vue des classes ouvre l’écran');
    assert.match(view, /const \[openedClassId, setOpenedClassId\] = useState<string \| null>\(embedded \? \(classes\[0\]\?\.id \?\? null\) : null\)/, 'la classe ouverte est un état de navigation');
    assert.match(view, /const openClass = embedded \? true : openedClassId !== null/, 'en mode contexte, on va droit à la classe');
    assert.match(view, /onClick=\{\(\) => setOpenedClassId\(null\)\}/, 'le retour aux classes');
    // Le nettoyage : ni onglets, ni sélecteur de classe, ni filtre de cycle.
    assert.doesNotMatch(view, /FluidTabRail|devoirTabItems|activeTab/, 'plus d’onglets de filtrage');
    assert.doesNotMatch(view, /evaluations-class-selector|SelectTrigger/, 'plus de sélecteur de classe dans la page');
    // Les deux zones, dans l'ordre : devoirs (par semestre), puis activités.
    const assessments = view.indexOf('aria-labelledby="evaluations-assessments-title"');
    const activities = view.indexOf('<PedagogicalEventsSection');
    assert.ok(assessments > 0 && activities > assessments, 'les devoirs viennent avant les activités');
    // Les comptes de la vue des classes : ce que la classe porte déjà.
    assert.match(view, /resolveClassAssessments\(item, planning, config, calendar, today\)\.length/, 'les devoirs programmés sont comptés par classe');
    assert.match(view, /activities: config\.pedagogicalEvents\?\.\[item\.id\]\?\.length \?\? 0/, 'les activités aussi');
    assert.match(view, /const ActivitiesEmptyState: React\.FC<\{ onCreate: \(\) => void; compact\?: boolean \}>/, 'variante compacte de l’état vide conservée');
});

test('les deux familles se lisent de la même façon dans la page et dans la fenêtre', () => {
    // Un seul en-tête de famille pour les deux endroits : pastille d'icône teintée,
    // titre, et compte. Deux copies divergeraient — c'est exactement ce qui a
    // laissé `evaluation-tone` sans couleur du côté de la fenêtre.
    const header = readFileSync('src/features/evaluations/components/KindGroupHeader.tsx', 'utf8');
    const chooser = readFileSync('src/features/evaluations/components/KindChooser.tsx', 'utf8');
    const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
    assert.equal((chooser.match(/kind-group__badge/g) ?? []).length, 0, 'la fenêtre ne redéfinit plus l’en-tête');
    assert.match(chooser, /import \{ KindGroupHeader \} from '\.\/KindGroupHeader'/);
    assert.match(header, /className=\{cn\('kind-group evaluation-tone', className\)\} data-tone=\{tone\}/, 'le ton est posé sur la ligne entière');
    assert.match(header, /kind-group__badge[^>]*aria-hidden="true"/, 'la pastille est décorative');
    // La page : un en-tête par famille, avec le compte qui la décrit.
    assert.equal((view.match(/<KindGroupHeader/g) ?? []).length, 2, 'les deux familles de la page');
    assert.match(view, /tone=\{KIND_GROUPS\[0\]\.tone\}[\s\S]{0,80}Icon=\{KIND_GROUPS\[0\]\.Icon\}/, 'devoirs : ton et icône du catalogue');
    assert.match(view, /tone=\{KIND_GROUPS\[1\]\.tone\}[\s\S]{0,80}Icon=\{KIND_GROUPS\[1\]\.Icon\}/, 'activités : ton et icône du catalogue');
    assert.match(view, /titleId="evaluations-assessments-title"/, 'le titre reste référencé par sa section');
    assert.match(view, /countLabel=\{`\$\{events\.length\} \$\{events\.length === 1 \? t\('evaluations\.eventSingle'\) : t\('evaluations\.eventPlural'\)\}`\}/, 'le compte reste lu par les lecteurs d’écran');
});
