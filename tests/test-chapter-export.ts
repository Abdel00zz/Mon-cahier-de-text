import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { listExportableChapters, selectExportableChapters } from '../src/domain/notebook/chapterExport';

const read = (path: string) => readFileSync(path, 'utf8');

/*
 * EXPORT PAR CHAPITRE — le modal « Données » de l'éditeur.
 *
 * Deux périmètres doivent cohabiter : tout le cahier (le geste d'un clic, comme
 * avant) et les blocs cochés (archiver une leçon, la donner à un collègue).
 * Ces tests verrouillent le découpage, l'aperçu de poids et le câblage.
 */

/** Un cahier réaliste : un chapitre structuré, une évaluation, une ligne libre. */
const lessons = [
  {
    type: 'chapter', title: 'Chapitre 1 : Nombres décimaux',
    sections: [
      {
        name: 'Suites d’opérations',
        items: [
          { type: 'activité', title: 'Calculer', description: '' },
          { type: 'rule', title: 'Priorité', description: '' },
        ],
      },
      { name: 'Parenthèses', items: [{ type: 'exemple', title: 'Calculer B', description: 'B=1' }] },
    ],
  },
  { type: 'evaluation_diagnostic', title: 'Évaluation diagnostique 1', sections: [] },
  { type: 'free', title: 'Note de rentrée', description: 'Rappel du matériel' },
  { type: 'free', description: 'Ligne libre sans titre' },
];

test('la liste décrit chaque bloc de premier niveau, dans l’ordre du cahier', () => {
  const chapters = listExportableChapters(lessons);
  assert.equal(chapters.length, 4, 'quatre blocs de premier niveau');
  assert.deepEqual(chapters.map(chapter => chapter.index), [0, 1, 2, 3], 'la position EST l’identité');
  assert.equal(chapters[0].type, 'chapter');
  assert.equal(chapters[0].title, 'Chapitre 1 : Nombres décimaux');
  // Le chapitre n'est pas un contenu : seuls ses éléments comptent.
  assert.equal(chapters[0].items, 3);
  assert.equal(chapters[1].items, 1, 'une évaluation est un contenu à elle seule');
  assert.equal(chapters[2].items, 1, 'une ligne libre aussi');
  assert.equal(chapters[3].title, '', 'un bloc sans titre reste sans titre : l’affichage décide du libellé');
  // Le poids est mesuré sur le bloc seul, donc jamais nul.
  assert.ok(chapters.every(chapter => chapter.bytes > 0), 'chaque bloc pèse quelque chose');
  assert.ok(chapters[0].bytes > chapters[2].bytes, 'le chapitre structuré pèse plus qu’une ligne');
});

test('entrée illisible : liste vide plutôt qu’un plantage', () => {
  assert.deepEqual(listExportableChapters(null), []);
  assert.deepEqual(listExportableChapters({ lessonsData: [] }), []);
  assert.deepEqual(listExportableChapters('chapitre'), []);
});

test('la sélection rend les blocs D’ORIGINE, dans l’ordre du cahier', () => {
  const selected = selectExportableChapters(lessons, [3, 1]) as unknown as typeof lessons;
  assert.deepEqual(selected.map(node => node.type), ['evaluation_diagnostic', 'free'], 'l’ordre du cahier, pas l’ordre des clics');
  assert.equal(selected[0], lessons[1], 'le bloc exporté est le bloc lui-même, jamais une copie réécrite');
  // Rien de coché est un cas normal : « rien à exporter ».
  assert.deepEqual(selectExportableChapters(lessons, []), []);
  // Une position inconnue (cahier modifié entre-temps) ne fabrique rien.
  assert.deepEqual(selectExportableChapters(lessons, [99]), []);
  assert.deepEqual(selectExportableChapters(null, [0]), []);
});

test('le modal propose les deux périmètres et n’oublie aucun garde-fou', () => {
  const modal = read('src/features/editor/modals/DataTransferModal.tsx');
  assert.match(modal, /type ExportScope = 'all' \| 'chapters'/, 'deux périmètres : tout, ou les blocs cochés');
  assert.match(modal, /onExport: \(chapters: number\[\] \| null\) => void/, 'null = tout le cahier');
  assert.match(modal, /role="radiogroup" aria-label=\{t\('transfer\.exportScopeAria'\)\}/, 'un vrai groupe de radios');
  assert.match(modal, /role="radio"[\s\S]{0,200}aria-checked=\{scope === 'chapters'\}/, 'l’état est annoncé aux lecteurs d’écran');
  assert.match(modal, /onClick=\{\(\) => onExport\(exportChapters\)\}/, 'le pied exporte le périmètre choisi');
  assert.match(modal, /scope === 'all' \? t\('transfer\.export'\) : t\('transfer\.exportSelected'\)/, 'le libellé dit ce qui part');
  assert.match(modal, /const exportDisabled = scope === 'chapters' && picked\.length === 0;/, 'rien de coché : rien à exporter');
  assert.match(modal, /setPicked\(allPicked \? \[\] : chapters\.map\(chapter => chapter\.index\)\)/, 'tout cocher / tout décocher');
  // Aucun bloc n'est coché par défaut ? Si : tout est coché, décocher est plus court.
  assert.match(modal, /setPicked\(chapters\.map\(chapter => chapter\.index\)\)/, 'tout est coché à l’ouverture');
  // L'aperçu de poids est annoncé, et il est approximatif (le dit).
  assert.match(modal, /t\('transfer\.exportSize', \{\s*size: formatSize\(/, 'le poids du fichier est annoncé avant de le produire');
  assert.match(modal, /max-h-60 overflow-y-auto/, 'la liste des chapitres ne pousse pas le pied hors de l’écran');
  // L'import reste intact : les deux modes historiques.
  assert.match(modal, /t\('transfer\.replace'\)/, 'mode remplacer conservé');
  assert.match(modal, /t\('transfer\.append'\)/, 'mode ajouter conservé');
});

test('l’éditeur filtre les blocs, garde la taille et nomme le fichier', () => {
  const editor = read('src/features/editor/Editor.tsx');
  assert.match(editor, /const handleExportData = useCallback\(\(chapters: number\[\] \| null\) => \{/, 'la signature dit le périmètre');
  assert.match(editor, /chapters === null \? lessonsData : selectExportableChapters\(lessonsData, chapters\)/, 'tout, ou seulement les blocs cochés');
  assert.match(editor, /new TextEncoder\(\)\.encode\(jsonString\)\.byteLength > MAX_JSON_FILE_BYTES/, 'la garde de taille est EXACTE');
  assert.match(editor, /t\('editorNotice\.exportTooLarge'\)/, 'et elle le dit au professeur');
  assert.match(editor, /t\('editorNotice\.exportEmpty'\)/, 'aucun bloc coché : message dédié');
  assert.match(editor, /`cahier-de-textes-\$\{classInfo\.name\}\$\{scopeSuffix\}-/, 'le nom du fichier porte le périmètre');
  // La liste des blocs n'est calculée que quand la fenêtre est ouverte : elle
  // pèse chaque bloc, ce serait du travail perdu à chaque frappe.
  assert.match(editor, /activeModal === 'dataTransfer' \? listExportableChapters\(lessonsData\) : \[\]/, 'calcul à l’ouverture seulement');
  assert.match(read('src/features/editor/EditorModals.tsx'), /chapters=\{exportChapters\}/, 'la liste descend jusqu’au modal');
});
