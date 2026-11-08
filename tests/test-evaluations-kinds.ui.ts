import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { DEVOIR_KIND_CONFIG, KIND_GROUPS, PEDAGOGICAL_EVENT_CONFIG, kindLabelKey } from '../src/features/evaluations/kindCatalog';

/*
 * Catalogue des NATURES d'une évaluation.
 *
 * L'assistant de création (KindChooser, StepTrail, ProgrammedList) a été retiré :
 * les devoirs et activités naissent au tableau, la modale les CAPTE et les
 * AFFICHE. Ces tests verrouillent la source unique des natures (kindCatalog)
 * et l'absence de tout retour de l'ancien assistant dans la page.
 */

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

test('le catalogue couvre les natures citées par les professeurs, en deux familles', () => {
    const kinds = KIND_GROUPS.flatMap(group => group.kinds);
    assert.equal(kinds.length, Object.keys(DEVOIR_KIND_CONFIG).length + Object.keys(PEDAGOGICAL_EVENT_CONFIG).length);
    // Devoir maison, contrôle des cahiers, olympiade et contrôle oral : les
    // natures citées par le professeur sont bien là, à égalité de traitement.
    for (const expected of ['maison', 'controle_cahiers', 'olympiade', 'oral', 'correction_controle_continu']) {
        assert.ok(kinds.some(kind => kind.type === expected), `${expected} dans le catalogue`);
    }
    for (const type of ['evaluation_diagnostic', 'controle_cahiers', 'correction_controle_continu']) {
        assert.ok(KIND_GROUPS.find(group => group.titleKey === 'evaluations.assessments')!.kinds
            .some(kind => kind.type === type && kind.family === 'event'), `${type} figure avec les évaluations et conserve son circuit`);
        assert.ok(!KIND_GROUPS.find(group => group.id === 'event')!.kinds.some(kind => kind.type === type), `${type} ne se répète pas dans les activités`);
    }
});

test('la modale capture et affiche : plus d’assistant de création, la classe n’est jamais redemandée', () => {
    const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8') + readFileSync('src/features/evaluations/components/DevoirsModals.tsx', 'utf8');
    // Plus d'assistant : les devoirs et activités naissent au tableau, la modale
    // les CAPTE et les AFFICHE. Aucune étape de classe, aucune étape de nature.
    assert.doesNotMatch(view, /ClassChooser|classChoices|chooseClass/, 'aucune étape de classe');
    assert.doesNotMatch(view, /<StepTrail|<KindChooser|<KindHeader|<ProgrammedList/, 'plus d’assistant de nature');
    assert.match(view, /useEvaluationModals\(\)/, 'les fenêtres restent gérées par le hook commun');
    assert.match(view, /<h2 id="evaluations-class-context"[\s\S]{0,160}\{selectedClassDisplayName\}/, 'le nom de la classe reste le contexte accessible de la fenêtre');
});

test('les devoirs viennent du tableau ; plus de formulaire manuel dans la fenêtre', () => {
    const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8') + readFileSync('src/features/evaluations/components/DevoirsModals.tsx', 'utf8');
    assert.doesNotMatch(view, /manualFormOpen \? |<ProgrammedList|programmedFor\(chosenKind/, 'plus de liste programmée ni de création libre');
    assert.doesNotMatch(view, /ManualAssessmentEditor|initial=\{editingAssessment\}/, 'plus de formulaire manuel');
    const modals = readFileSync('src/features/evaluations/hooks/useEvaluationModals.ts', 'utf8');
    assert.doesNotMatch(modals, /openKindChooser|close\('create'\)/, 'aucun état de création dans le hook');
});

test('le catalogue est la SOURCE des natures pour la page', () => {
    const catalog = readFileSync('src/features/evaluations/kindCatalog.ts', 'utf8');
    const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8') + readFileSync('src/features/evaluations/components/DevoirsModals.tsx', 'utf8');
    // Une seule déclaration des natures : la vue l'importe.
    assert.equal((catalog.match(/export const PEDAGOGICAL_EVENT_CONFIG/g) ?? []).length, 1);
    assert.match(view, /import \{ DEVOIR_KIND_CONFIG, groupKinds, kindLabelKey, type EvaluationKind \} from '\.\/kindCatalog'/, 'la page lit le catalogue (familles composées par la politique)');
    assert.doesNotMatch(view, /const PEDAGOGICAL_EVENT_CONFIG/, 'aucune copie locale');
});

test('l’écran reçoit une classe précise et expose directement ses activités', () => {
    const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8') + readFileSync('src/features/evaluations/components/ActivitiesEmptyState.tsx', 'utf8');
    // Plus d'entrée de création : la modale capture et affiche, elle ne crée plus.
    assert.doesNotMatch(view, /onClick=\{\(\) => openKindChooser\(\)\}/, 'plus de bouton Ajouter');
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
    // L'état vide est PASSIF : l'action de création est facultative, jamais imposée.
    assert.match(view, /const ActivitiesEmptyState: React\.FC<\{ onCreate\?: \(\) => void; compact\?: boolean \}>/, 'état vide passif, sans action imposée');
});

test('les deux familles se lisent de la même façon dans la page et dans la fenêtre', () => {
    // Un seul en-tête de famille pour les deux endroits : pastille d'icône teintée,
    // titre, et compte. Deux copies divergeraient — c'est exactement ce qui a
    // laissé `evaluation-tone` sans couleur du côté de la fenêtre.
    const header = readFileSync('src/features/evaluations/components/KindGroupHeader.tsx', 'utf8');
    const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8') + readFileSync('src/features/evaluations/components/PedagogicalEventsSection.tsx', 'utf8');
    assert.match(header, /className=\{cn\('kind-group evaluation-tone', className\)\} data-tone=\{tone\}/, 'le ton est posé sur la ligne entière');
    assert.doesNotMatch(header, /kind-group__badge/, 'le titre d’une famille ne porte plus d’icône');
    assert.doesNotMatch(header, /Icon/, 'aucune icône dans l’en-tête partagé');
    // La page : un en-tête par famille, avec le compte qui la décrit.
    assert.equal((view.match(/<KindGroupHeader/g) ?? []).length, 2, 'l’en-tête des tiroirs et celui des séances');
    assert.match(view, /tone=\{group\.tone\}/, 'chaque famille du catalogue porte son ton');
    assert.doesNotMatch(view, /Icon=\{group\.Icon\}|Icon=\{KIND_GROUPS/, 'et jamais une icône de famille');
    assert.match(view, /className="ev-accordion__label"/, 'le libellé du tiroir');
    assert.match(view, /countLabel=\{`\$\{number\.format\(events\.length\)\} \$\{events\.length === 1 \? t\('evaluations\.eventSingle'\) : t\('evaluations\.eventPlural'\)\}`\}/, 'le compte reste lu par les lecteurs d’écran');
});
