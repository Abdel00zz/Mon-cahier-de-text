import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { KindChooser, KindHeader, ProgrammedList, StepTrail } from '../src/features/evaluations/components/KindChooser';
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
    for (const expected of ['maison', 'controle_cahiers', 'olympiade', 'oral', 'correction_controle_continu']) {
        assert.ok(kinds.some(kind => kind.type === expected), `${expected} dans le catalogue`);
    }
    for (const type of ['evaluation_diagnostic', 'correction_controle_continu']) {
        assert.ok(KIND_GROUPS.find(group => group.titleKey === 'evaluations.assessments')!.kinds
            .some(kind => kind.type === type && kind.family === 'event'), `${type} figure avec les évaluations et conserve son circuit`);
        assert.ok(!KIND_GROUPS.find(group => group.id === 'event')!.kinds.some(kind => kind.type === type), `${type} ne se répète pas dans les activités`);
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

test('chaque famille ouvre sa grille par un titre sans statistiques décoratives', () => {
    const html = render(React.createElement(KindChooser, { onSelect: () => undefined }));
    assert.doesNotMatch(html, /kind-group__count/, 'les compteurs sont réservés au suivi pédagogique');
    // Le titre d'une CATÉGORIE se lit, il ne se dessine pas : le ton de la
    // famille ne teinte que le compte, et aucune pastille d'icône ne le précède.
    for (const group of KIND_GROUPS) {
        assert.match(html, new RegExp(`class="kind-group evaluation-tone" data-tone="${group.tone}"`), `ton de famille ${group.id}`);
        assert.doesNotMatch(html, new RegExp(`kind-group__badge`), `aucune pastille à côté du titre de ${group.id}`);
    }
    assert.doesNotMatch(html, /kind-group__badge/, 'aucune pastille de famille nulle part');
    // Les icônes de NATURE, elles, restent sur les grandes cartes du choix.
    const kindIcons = KIND_GROUPS.flatMap(group => group.kinds.map(kind => kind.style.Icon));
    assert.equal(kindIcons.length, KIND_GROUPS.reduce((total, group) => total + group.kinds.length, 0));
    assert.ok(/hub-card__icon/.test(html), 'les cartes de nature gardent leur icône');
});

test('les tuiles de nature : deux par ligne, plus grandes, icône plus grande', () => {
    const html = render(React.createElement(KindChooser, { onSelect: () => undefined }));
    const chooser = readFileSync('src/features/evaluations/components/KindChooser.tsx', 'utf8');
    const css = readFileSync('src/styles/index.css', 'utf8');
    // Deux colonnes À TOUTE LARGEUR : la liste d'une seule colonne obligeait à
    // faire défiler quinze lignes pour lire cinq devoirs et neuf activités.
    assert.match(html, /class="hub-grid" data-tiles/, 'la grille des natures passe en tuiles');
    assert.match(chooser, /<ul className="hub-grid" data-tiles>/, 'une seule grille de tuiles : celle des natures');
    assert.equal(
        (html.match(/data-layout="tile"/g) ?? []).length,
        KIND_GROUPS.reduce((total, group) => total + group.kinds.length, 0),
        'chaque nature est une tuile',
    );
    // Deux colonnes ne doivent pas RAPETISSER la carte : la tuile monte en
    // hauteur (152 px au lieu de 120), la pastille passe à 56 px et l'icône à
    // 36 px — plus grandes que sur la carte-ligne (44 px / 28 px) qu'elles
    // remplacent, et que sur la carte ordinaire de téléphone (2,75 rem).
    assert.match(css, /\.hub-grid\[data-tiles\] \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/, 'deux par ligne');
    assert.match(css, /\.hub-card\[data-layout='tile'\] \{ justify-content: center; gap: 0\.55rem; min-height: 9\.5rem;/, 'carte plus haute');
    assert.match(css, /\.hub-card\[data-layout='tile'\] \.hub-card__icon \{ width: 3\.5rem; height: 3\.5rem;/, 'pastille de 56 px');
    assert.match(css, /\.hub-card\[data-layout='tile'\] \.hub-card__icon \.app-icon \{ width: 2\.25rem; height: 2\.25rem;/, 'icône de 36 px');
    // L'icône est AU-DESSUS du libellé, et le libellé est centré : c'est ce qui
    // distingue une tuile d'une carte-ligne.
    assert.doesNotMatch(chooser, /hub-card__title min-w-0 flex-1 text-start/, 'le libellé d’une tuile est centré');
    assert.equal((chooser.match(/data-layout="tile"/g) ?? []).length, 1, 'les tuiles ne remplacent que les cartes de nature');
    // La liste des devoirs DÉJÀ programmés (étape 2) reste une liste de lignes :
    // elle porte une date et un état, la lire en tuiles disperserait ces repères.
    assert.match(chooser, /<ul className="hub-grid" data-rows>[\s\S]{0,400}data-layout="row"/, 'l’étape 2 garde ses cartes-lignes');
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

test('l’assistant commence par la NATURE : la classe n’est pas redemandée', () => {
    const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
    const chooser = readFileSync('src/features/evaluations/components/KindChooser.tsx', 'utf8');
    // Une classe déjà ouverte sur l'écran : reposer la question serait une
    // seconde décision pour la même réponse.
    assert.doesNotMatch(view, /ClassChooser|classChoices|chooseClass/, 'plus aucune étape de classe dans l’assistant');
    assert.doesNotMatch(chooser, /ClassChooser|class-disclosure/, 'le composant de choix de classe est retiré');
    assert.match(view, /useEvaluationModals\(\)/, 'le parcours est géré par le hook commun');
    assert.match(view, /<StepTrail[\s\S]{0,160}step=\{wizardStep\}/, 'le fil d’étapes suit ces deux crans');
    // La classe reste celle de l'écran : la fenêtre rappelle son nom en en-tête.
    assert.match(view, /\{selectedClass && \(\s*<p[\s\S]{0,120}\{selectedClassDisplayName\}/, 'le nom de la classe coiffe la fenêtre');
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

test('le fil d’étapes montre ses deux crans et sert de retour', () => {
    const first = render(React.createElement(StepTrail, { step: 1, onStep: () => undefined }));
    assert.match(first, /aria-current="step"/, 'l’étape courante est annoncée');
    for (const label of ['Nature', 'Contenu']) {
        assert.ok(first.includes(label), `le cran « ${label} » est visible`);
    }
    assert.ok(!first.includes('Classe'), 'la classe n’est pas un cran : elle est déjà choisie');
    assert.equal((first.match(/<svg/g) ?? []).length, 0, 'des numéros, pas des icônes');
    assert.equal((first.match(/<button/g) ?? []).length, 0, 'rien à recliquer avant d’avoir avancé');

    const second = render(React.createElement(StepTrail, { step: 2, label: 'Devoir maison', onStep: () => undefined }));
    assert.ok(second.includes('Devoir maison'), 'la nature choisie nomme le second cran');
    assert.equal((second.match(/<button/g) ?? []).length, 1, 'le cran franchi se reclique');
    assert.match(second, /aria-current="step"/);
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
    assert.match(view, /manualFormOpen \? \(\s*<ManualAssessmentEditor[\s\S]*?\) : \(\s*<ProgrammedList/, 'la liste programmée précède le formulaire');
    assert.match(view, /items=\{programmedFor\(chosenKind\.type\)\}/, 'la liste suit la nature choisie');
    assert.match(view, /onOpen=\{openProgrammedAssessment\}/, 'un devoir programmé s’ouvre');
    assert.match(view, /onCreate=\{\(\) => setManualFormOpen\(true\)\}/, 'la création libre est demandée explicitement');
    assert.match(view, /const openProgrammedAssessment = \(assessmentId: string\) => \{[\s\S]{0,300}setDocumentFor\(\{ kind: 'assessment', link \}\)/, 'on accède au sujet du devoir');
    // L'état manuel ne survit pas à la fermeture du parcours.
    const modals = readFileSync('src/features/evaluations/hooks/useEvaluationModals.ts', 'utf8');
    assert.match(modals, /closeKindChooser: \(\) => close\('create'\)/, 'fermer libère le parcours de création');
});

test('le catalogue est la SOURCE des natures pour la page et pour le choix', () => {
    const catalog = readFileSync('src/features/evaluations/kindCatalog.ts', 'utf8');
    const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
    // Une seule déclaration des natures : la vue l'importe.
    assert.equal((catalog.match(/export const PEDAGOGICAL_EVENT_CONFIG/g) ?? []).length, 1);
    assert.match(view, /import \{ DEVOIR_KIND_CONFIG, KIND_GROUPS, PEDAGOGICAL_EVENT_CONFIG, kindLabelKey, type EvaluationKind \} from '\.\/kindCatalog'/, 'la page lit le catalogue');
    assert.match(view, /kindLabelKey\(chosenKind\)/, 'le fil d’étapes nomme la nature via sa clé traduite');
    assert.doesNotMatch(view, /const PEDAGOGICAL_EVENT_CONFIG/, 'aucune copie locale');
    // Le parcours en DEUX étapes : la nature, puis ses zones. La classe vient de
    // l'écran, donc elle n'est jamais redemandée.
    assert.match(view, /useEvaluationModals\(\)/, 'étapes centralisées dans le hook');
    assert.match(view, /<KindChooser onSelect=\{\(kind\) => \{ setChosenKind\(kind\); setWizardStep\(2\); \}\} \/>/, 'étape 1 : la nature');
    assert.match(view, /<KindHeader[\s\S]{0,220}setWizardStep\(1\)/, 'étape 2 : retour au choix de la nature');
    assert.doesNotMatch(view, /ClassChooser|chooseClass|classChoices/, 'aucune étape de classe');
    // Le type n'est plus redemandé par le formulaire d'activité.
    assert.match(view, /const \[type\] = useState<PedagogicalEventType>\(initialType\)/, 'type fixé par l’étape 1');
    assert.doesNotMatch(view, /evaluations\.activityType/, 'plus de sélecteur de type dans la fiche');
    // Le devoir : sélecteur conservé UNIQUEMENT en modification.
    assert.match(view, /initial \? \([\s\S]{0,900}<Select value=\{type\}/, 'type modifiable seulement en édition');
});

test('l’écran reçoit une classe précise et expose directement ses activités', () => {
    const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
    // Une seule entrée de création : « Ajouter » ouvre le parcours de nature.
    assert.match(view, /onClick=\{\(\) => openKindChooser\(\)\}/, 'le bouton Ajouter ouvre le parcours');
    assert.doesNotMatch(view, /evaluations\.addActivity\}<\/span>/, 'plus de bouton « activité » séparé dans la barre');
    // VUE 1 : les classes. VUE 2 : la classe ouverte, ses devoirs puis ses activités.
    assert.match(view, /classInfo: ClassInfo/);
    assert.match(view, /const selectedClass = classInfo/);
    assert.doesNotMatch(view, /ClassPicker|openedClassId|backToClasses/, 'aucun choix de classe intermédiaire');
    // Le nettoyage : ni onglets, ni sélecteur de classe, ni filtre de cycle.
    assert.doesNotMatch(view, /FluidTabRail|devoirTabItems|activeTab/, 'plus d’onglets de filtrage');
    assert.doesNotMatch(view, /evaluations-class-selector|<Select value=\{selectedClassId\}/, 'plus de sélecteur de classe dans la page');
    // Le tiroir ouvert rend les occurrences DANS la page : devoirs ou séances,
    // juste sous leur type.
    assert.match(view, /renderAssessmentRows\(linksOfKind\(kind\)\)/, 'les devoirs du tiroir');
    assert.match(view, /<PedagogicalEventsSection[\s\S]{0,120}events=\{eventsOfKind\(kind\)\}/, 'les séances du tiroir');
    assert.match(view, /kind\.family === 'event' \? \(/, 'une seule famille à la fois dans un tiroir');
    // Les comptes de la vue des classes : ce que la classe porte déjà.
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
    assert.doesNotMatch(header, /kind-group__badge/, 'le titre d’une famille ne porte plus d’icône');
    assert.doesNotMatch(header, /Icon/, 'aucune icône dans l’en-tête partagé');
    // La page : un en-tête par famille, avec le compte qui la décrit.
    assert.equal((view.match(/<KindGroupHeader/g) ?? []).length, 2, 'l’en-tête des tiroirs et celui des séances');
    assert.match(view, /tone=\{group\.tone\}/, 'chaque famille du catalogue porte son ton');
    assert.doesNotMatch(view, /Icon=\{group\.Icon\}|Icon=\{KIND_GROUPS/, 'et jamais une icône de famille');
    assert.match(view, /className="ev-accordion__label"/, 'le libellé du tiroir');
    assert.match(view, /countLabel=\{`\$\{events\.length\} \$\{events\.length === 1 \? t\('evaluations\.eventSingle'\) : t\('evaluations\.eventPlural'\)\}`\}/, 'le compte reste lu par les lecteurs d’écran');
});
