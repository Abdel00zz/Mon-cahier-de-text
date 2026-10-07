import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '../src/i18n/LocaleProvider';
import { KindChooser, KindHeader } from '../src/features/evaluations/components/KindChooser';
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

test('l’étape 2 rappelle la nature choisie et permet d’y revenir', () => {
    const kind = KIND_GROUPS[0].kinds[0];
    const html = render(React.createElement(KindHeader, { kind, onBack: () => undefined }));
    assert.match(html, new RegExp(`data-tone="${kind.style.tone}"`), 'même teinte que la carte choisie');
    assert.match(html, /Changer le type/, 'le retour au choix est explicite');
    assert.match(html, /min-h-11/, 'cible tactile de 44 px');
});

test('le catalogue est la SOURCE des natures pour la page et pour le choix', () => {
    const catalog = readFileSync('src/features/evaluations/kindCatalog.ts', 'utf8');
    const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
    // Une seule déclaration des natures : la vue l'importe.
    assert.equal((catalog.match(/export const PEDAGOGICAL_EVENT_CONFIG/g) ?? []).length, 1);
    assert.match(view, /import \{ PEDAGOGICAL_EVENT_CONFIG, type EvaluationKind \} from '\.\/kindCatalog'/, 'la page lit le catalogue');
    assert.doesNotMatch(view, /const PEDAGOGICAL_EVENT_CONFIG/, 'aucune copie locale');
    // Le parcours en deux étapes : choix puis champs, avec retour.
    assert.match(view, /<KindChooser onSelect=\{setChosenKind\} \/>/, 'étape 1 : les cartes');
    assert.match(view, /<KindHeader kind=\{chosenKind\} onBack=\{\(\) => setChosenKind\(null\)\} \/>/, 'étape 2 : retour au choix');
    // Le type n'est plus redemandé par le formulaire d'activité.
    assert.match(view, /const \[type\] = useState<PedagogicalEventType>\(initialType\)/, 'type fixé par l’étape 1');
    assert.doesNotMatch(view, /evaluations\.activityType/, 'plus de sélecteur de type dans la fiche');
    // Le devoir : sélecteur conservé UNIQUEMENT en modification.
    assert.match(view, /initial \? \([\s\S]{0,900}<option value="controle">/, 'type modifiable seulement en édition');
});

test('la page principale montre les deux familles, même vides', () => {
    const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
    // Une seule entrée de création : « Ajouter » ouvre le choix de la nature.
    assert.match(view, /onClick=\{openKindChooser\}/, 'le bouton Ajouter ouvre le choix');
    assert.doesNotMatch(view, /evaluations\.addActivity\}<\/span>/, 'plus de bouton « activité » séparé dans la barre');
    // Les activités restent affichées sur l'onglet « tout », avec ou sans contenu.
    assert.match(view, /: <ActivitiesEmptyState onCreate=\{openKindChooser\} compact=\{activeTab === 'all'\} \/>/, 'invitation compacte sur l’onglet tout');
    assert.match(view, /const ActivitiesEmptyState: React.FC<\{ onCreate: \(\) => void; compact\?: boolean \}>/, 'variante compacte de l’état vide');
});
