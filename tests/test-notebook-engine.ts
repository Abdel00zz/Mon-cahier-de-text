import assert from 'node:assert/strict';
import test from 'node:test';
import { walkNotebook } from '../src/domain/notebook/notebookTraversal';
import {
  NOTEBOOK_CONTAINERS,
  NOTEBOOK_TEXT_FIELDS,
  elementTypeFor,
  isStructural,
  textFieldLimit,
} from '../src/domain/notebook/notebookSchema';
import { IMPORT_LIMITS } from '../src/domain/notebook/importLimits';
import { countOccurrencesOfType } from '../src/domain/notebook/dataUtils';
import { summarizeImportedLessons } from '../src/domain/notebook/importPipeline';
import { assertNotebookStructure } from '../src/domain/notebook/notebookValidation';

/*
 * MOTEUR DE PARCOURS — contrat d'infrastructure.
 *
 * Le parcours de l'arbre était recopié dans cinq modules ; il est désormais
 * unique. Ces tests verrouillent ses invariants : ordre de visite, chemins,
 * statistiques, élagage, budgets, et la politique de validation. Sans eux, une
 * retouche du moteur pourrait passer inaperçue jusqu'à un contenu cassé.
 */

const notebook = () => [
  {
    type: 'chapter',
    title: 'Chapitre',
    sections: [
      { name: 'Section', items: [{ type: 'definition', title: 'Déf', date: '2026-09-14' }] },
    ],
  },
  { type: 'free', title: 'Note' },
];

test('le parcours visite en préordre et rend les statistiques exactes', () => {
  const paths: string[] = [];
  const types: string[] = [];
  const stats = walkNotebook(notebook(), {
    onNode: context => { paths.push(context.path); types.push(context.elementType); },
  });
  assert.deepEqual(paths, [
    'lessons[0]',
    'lessons[0] › sections[0]',
    'lessons[0] › sections[0] › items[0]',
    'lessons[1]',
  ], 'préordre, chemin technique complet');
  assert.deepEqual(types, ['chapter', 'section', 'item', 'free'], 'le type se lit dans le conteneur');
  assert.deepEqual(stats, { nodes: 4, depth: 2, topLevel: 2, contents: 2, containers: 2 });
});

test('chaque conteneur d’un nœud est annoncé, et un conteneur malformé n’est jamais parcouru', () => {
  const seen: Array<{ key: string; isArray: boolean }> = [];
  walkNotebook([{ type: 'chapter', sections: { bad: true }, items: [{ type: 'definition' }] }], {
    onContainer: (_context, key, _value, isArray) => { seen.push({ key, isArray }); },
  });
  assert.deepEqual(seen, [
    { key: 'sections', isArray: false },
    { key: 'items', isArray: true },
  ], 'un conteneur non-tableau est signalé, pas traversé');
});

test('un enfant non-objet est signalé et n’interrompt pas ses frères', () => {
  let invalid: { parent: string | null; index: number; container: string | null } | null = null;
  const stats = walkNotebook([{ type: 'chapter', items: [null, { type: 'definition', title: 'D' }] }], {
    onInvalidNode: (parent, _value, index, container) => {
      invalid = { parent: parent?.path ?? null, index, container };
    },
  });
  assert.deepEqual(invalid, { parent: 'lessons[0]', index: 0, container: 'items' });
  assert.equal(stats.nodes, 2, 'le frère valide est bien visité');
});

test('l’élagage saute tout le sous-arbre', () => {
  const stats = walkNotebook(notebook(), { onNode: context => context.elementType === 'chapter' ? false : undefined });
  assert.equal(stats.nodes, 2, 'seuls les deux blocs de premier niveau sont visités');
  assert.equal(stats.contents, 1, 'le contenu imbriqué n’est pas compté');
});

test('les budgets arrêtent la marche et nomment la raison', () => {
  const reasons: string[] = [];
  const nodes = walkNotebook(notebook(), { maxDepth: 1, onBudgetExceeded: reason => { reasons.push(reason); } });
  assert.deepEqual(reasons, ['depth']);
  assert.equal(nodes.nodes, 3, 'le nœud fautif est compté, ses enfants ne sont pas visités');

  const shallow: string[] = [];
  walkNotebook(notebook(), { maxNodes: 2, onBudgetExceeded: reason => { shallow.push(reason); } });
  assert.deepEqual(shallow, ['nodes']);
});

test('le schéma est la source unique des champs, conteneurs et budgets', () => {
  assert.deepEqual([...NOTEBOOK_CONTAINERS], ['sections', 'subsections', 'subsubsections', 'items']);
  assert.ok(NOTEBOOK_TEXT_FIELDS.includes('description') && NOTEBOOK_TEXT_FIELDS.includes('remark'));
  assert.equal(textFieldLimit('description'), IMPORT_LIMITS.text, 'texte long : budget large');
  assert.equal(textFieldLimit('title'), IMPORT_LIMITS.label, 'étiquette : budget court');
  assert.equal(elementTypeFor(null, { type: 'devoir_maison' }), 'devoir_maison');
  assert.equal(elementTypeFor('items', { type: 'chapter' }), 'chapter');
  assert.equal(elementTypeFor('subsubsections', {}), 'subsubsection');
  assert.ok(isStructural('section', undefined) && !isStructural('item', 'definition'));
});

test('le moteur est stable d’un appel à l’autre (aucun état partagé)', () => {
  const first = walkNotebook(notebook());
  const second = walkNotebook(notebook());
  assert.deepEqual(first, second);
});

test('countOccurrencesOfType compte blocs et items, jamais les sections', () => {
  const lessons = [
    { type: 'chapter', title: 'C', items: [{ type: 'exercice', title: 'E1' }] },
    { type: 'devoir_maison', title: 'DM', sections: [{ name: 'S', items: [{ type: 'exercice', title: 'E2' }] }] },
  ];
  assert.equal(countOccurrencesOfType(lessons as never, 'exercice'), 2);
  assert.equal(countOccurrencesOfType(lessons as never, 'devoir_maison'), 1);
  assert.equal(countOccurrencesOfType(lessons as never, 'section'), 0, 'une section n’a pas de type');
  assert.equal(countOccurrencesOfType(lessons as never, 'chapter'), 1);
});

test('summarizeImportedLessons exclut la structure et déduplique les séances', () => {
  const lessons = [
    {
      type: 'chapter', title: 'C',
      sections: [{
        name: 'S',
        items: [
          { type: 'definition', title: 'A', date: '2026-09-14' },
          { type: 'exercice', title: 'B', date: '2026-09-14' },
        ],
      }],
    },
    { type: 'free', title: 'Note' },
  ];
  const stats = summarizeImportedLessons(lessons as never);
  assert.equal(stats.totalItems, 3, 'deux items + une ligne libre');
  assert.equal(stats.plannedCount, 2, 'deux contenus datés');
  assert.equal(stats.sessionsCount, 1, 'une seule journée distincte');
  assert.equal(stats.lastDate, '2026-09-14');
  assert.equal(stats.completionRate, 67);
});

test('la validation de synchro garde sa politique : elle jette, sans normaliser', () => {
  assert.throws(() => assertNotebookStructure({}), /invalides/);
  assert.throws(() => assertNotebookStructure([null]), /Élément de cours invalide/);
  assert.throws(() => assertNotebookStructure([{ type: 'chapter', items: { bad: true } }]), /Conteneur « items » invalide/);
  assert.throws(() => assertNotebookStructure([{ type: 'chapter', title: 'a'.repeat(IMPORT_LIMITS.label + 1) }]), /trop long/);
  assert.doesNotThrow(() => assertNotebookStructure([{ type: 'chapter', title: '  espaces préservés  ' }]));
});
