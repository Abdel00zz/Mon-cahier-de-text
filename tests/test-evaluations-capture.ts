import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import {
  removeAssessmentFromNotebook,
  syncAssessmentDateToNotebook,
  syncEventToNotebook,
} from '../src/domain/evaluations/notebookSyncBridge';
import { nextAssessmentNumber } from '../src/domain/evaluations/assessments';
import { syncNotebookToEvaluations } from '../src/domain/evaluations/notebookReconciliation';
import type { AppConfig, LessonsData } from '../src/types';

/*
 * LE CONTRAT DE CAPTURE — deux portes, un seul enregistrement.
 *
 * FAMILLE A — les faits de séance (contrôle des cahiers, remédiation,
 * soutien, rattrapage, devoir à la maison assigné aux élèves) s'énoncent dans
 * la REMARQUE de leur séance ; la feuille « Contrôle continu et activités »
 * les reçoit.
 * FAMILLE B — les épreuves (diagnostic, devoir surveillé, écrit court, écrit
 * global, oral, et leurs corrections) se créent depuis « Ajouter un contenu »
 * du tableau, INDÉPENDANTES du chapitre, et la feuille les reçoit à son tour.
 * Ce fichier verrouille ce contrat et son document de référence
 * (docs/architecture/workflow-evaluations.md), à mettre à jour dans le même
 * lot.
 */

test('les épreuves écrites matérialisent un bloc daté, chacune avec son type', () => {
  const cases = [
    { type: 'controle' as const, block: 'controle_continu', title: 'Contrôle continu 1' },
    { type: 'controle_court' as const, block: 'controle_court', title: 'Devoir écrit court 1' },
    { type: 'controle_global' as const, block: 'controle_global', title: 'Devoir écrit global 1' },
  ];
  for (const item of cases) {
    const { lessons, updated } = syncAssessmentDateToNotebook([], {
      id: `${item.type}-1`, type: item.type, num: 1, dateISO: '2026-10-12', label: item.title,
    });
    assert.equal(updated, true, `${item.type} matérialise`);
    assert.equal(lessons.length, 1);
    const block = lessons[0] as { type: string; title?: string; date?: string; _tempId?: string };
    assert.equal(block.type, item.block, `${item.type} → bloc ${item.block}`);
    assert.equal(block.title, item.title);
    assert.equal(block.date, '2026-10-12');
    assert.equal(block._tempId, `dev-block-${item.type}-1`, 'identité stable portée par le bloc');
  }
});

test('une épreuve déjà présente est actualisée sur place, jamais dupliquée', () => {
  const lessons: LessonsData = [
    { type: 'chapter', title: 'Chapitre 1', date: '2026-10-01' },
    { type: 'controle_court', title: 'Devoir écrit court 1', date: '2026-10-12' },
  ];
  const { lessons: next, updated } = syncAssessmentDateToNotebook(lessons, {
    id: 'cc-1', type: 'controle_court', num: 1, dateISO: '2026-10-19',
  });
  assert.equal(updated, true);
  assert.equal(next.length, 2, 'aucun bloc ajouté');
  const block = next[1] as { date?: string; _tempId?: string };
  assert.equal(block.date, '2026-10-19', 'la date suit la modale');
  assert.equal(block._tempId, 'dev-block-cc-1', 'le bloc adopté porte l’identité');
});

test('la seconde synchronisation identique n’écrit rien (idempotence)', () => {
  const first = syncAssessmentDateToNotebook([], {
    id: 'cg-1', type: 'controle_global', num: 2, dateISO: '2026-11-03', label: 'Devoir écrit global 2',
  });
  const second = syncAssessmentDateToNotebook(first.lessons, {
    id: 'cg-1', type: 'controle_global', num: 2, dateISO: '2026-11-03', label: 'Devoir écrit global 2',
  });
  assert.equal(second.updated, false);
  assert.equal(second.lessons, first.lessons, 'aucune nouvelle référence : rien n’a été réécrit');
});

test('l’oral et le devoir maison ne créent ni ne retirent jamais de bloc', () => {
  const lessons: LessonsData = [{ type: 'controle_continu', title: 'Contrôle continu 1', date: '2026-10-01' }];
  assert.equal(syncAssessmentDateToNotebook(lessons, { id: 'oral-1', type: 'oral', num: 1, dateISO: '2026-10-02' }).lessons, lessons);
  assert.equal(syncAssessmentDateToNotebook(lessons, { id: 'maison-1', type: 'maison', num: 1, dateISO: '2026-10-03' }).lessons, lessons);
  assert.equal(removeAssessmentFromNotebook(lessons, 'oral-1', 'oral', 1).lessons, lessons);
});

test('supprimer une épreuve retire son bloc par identité', () => {
  const materialized = syncAssessmentDateToNotebook([], {
    id: 'cc-9', type: 'controle_court', num: 9, dateISO: '2026-12-01', label: 'Devoir écrit court 9',
  }).lessons;
  const removed = removeAssessmentFromNotebook(materialized, 'cc-9', 'controle_court');
  assert.equal(removed.updated, true);
  assert.equal(removed.lessons.length, 0, 'le bloc part avec son évaluation');
});

test('les épreuves et concours matérialisent leur bloc daté, eux aussi', () => {
  const cases = [
    { type: 'examen_blanc' as const, title: 'Examen blanc' },
    { type: 'olympiade' as const, title: 'Olympiade' },
    { type: 'concours' as const, title: 'Concours' },
  ];
  for (const item of cases) {
    const { lessons, updated } = syncEventToNotebook([], {
      id: `${item.type}-1`, type: item.type, title: '', date: '2026-03-02',
      status: 'planned', createdAt: '2026-02-01T00:00:00.000Z',
    });
    assert.equal(updated, true, `${item.type} matérialise`);
    const block = lessons[0] as { type?: string; title?: string; date?: string; _tempId?: string };
    assert.equal(block.type, item.type, `${item.type} → son propre type de bloc`);
    assert.equal(block.title, item.title, 'titre par défaut (fr)');
    assert.equal(block._tempId, `event-${item.type}-1`, 'identité stable portée par le bloc');
  }
  const second = syncEventToNotebook(
    syncEventToNotebook([], { id: 'eb-9', type: 'examen_blanc', title: 'Examen blanc', date: '2026-03-02', status: 'planned', createdAt: '2026-02-01T00:00:00.000Z' }).lessons,
    { id: 'eb-9', type: 'examen_blanc', title: 'Examen blanc', date: '2026-03-02', status: 'planned', createdAt: '2026-02-01T00:00:00.000Z' },
  );
  assert.equal(second.updated, false, 'idempotence : la seconde synchronisation n’écrit rien');
});

test('le numéro suivant d’un devoir manuel se calcule sur le PLUS GRAND, jamais sur le compte', () => {
  // Un trou dans la série (DM1 et DM3 existants) ferait proposer 3 par un
  // simple comptage : doublon immédiat avec le devoir déjà présent.
  const rows = [
    { id: 'a', type: 'controle', num: 1 },
    { id: 'b', type: 'controle', num: 3 },
    { id: 'c', type: 'maison', num: 1 },
  ];
  assert.equal(nextAssessmentNumber(rows, 'controle'), 4, 'un trou dans la série ne crée pas de doublon');
  assert.equal(nextAssessmentNumber(rows, 'maison'), 2, 'chaque famille a son propre compteur');
  assert.equal(nextAssessmentNumber(rows, 'oral'), 1, 'le premier de sa famille');
  assert.equal(nextAssessmentNumber(rows, 'controle', 'b'), 2,
    'à l’édition, le devoir lui-même ne compte pas dans le calcul');
});

test('deux portes, un seul enregistrement : les épreuves se créent au tableau, la feuille les reçoit', () => {
  const addModal = readFileSync('src/features/editor/modals/ContentModal.tsx', 'utf8');
  const family = ['evaluation_diagnostic', 'controle_continu', 'controle_court', 'controle_global', 'oral', 'correction_devoir_maison', 'correction_controle_continu'];
  for (const type of family) {
    assert.ok(addModal.includes(`handleSelectType('${type}')`),
      `« Ajouter un contenu » offre ${type} : la famille des épreuves a sa porte`);
  }
  // Position : posé DIRECTEMENT APRÈS l'élément cliqué, jamais renvoyé en fin
  // de cahier ni à la fin du chapitre.
  const editor = readFileSync('src/features/editor/Editor.tsx', 'utf8');
  assert.match(editor, /insertAssessmentBlock\(draft, anchor, newItem\)/,
    'le tableau pose le bloc après l’élément cliqué');
  const placement = readFileSync('src/domain/notebook/dataUtils.ts', 'utf8');
  assert.match(placement, /ancre = ligne de contenu → juste après elle/,
    'la règle de placement est écrite noir sur blanc');
  assert.match(placement, /located\.parent\.splice\(located\.targetIndex \+ 1, 0, block/,
    'l’insertion suit la liste exacte de l’ancre');
  // Le devoir à la maison a DEUX portes (la pastille de la remarque, la carte
  // « Devoir maison ») et UNE écriture : il rejoint la feuille d'évaluations, jamais
  // le cahier sous forme de bloc caché.
  assert.ok(addModal.includes("handleSelectType('devoir_maison')"), 'la carte Devoir maison est proposée');
  assert.match(editor, /if \(type === 'devoir_maison'\) \{[\s\S]{0,1600}assignHomeworkPatch\(config, classInfo\.id, date, num\)[\s\S]{0,600}return;/,
    'la carte écrit le devoir dans la feuille, sans toucher au cahier');
  const remark = readFileSync('src/domain/evaluations/sessionRemarkChanges.ts', 'utf8');
  assert.match(remark, /assignHomeworkPatch\(config, classId, date, patch\.homeworkGiven, result\)/, 'la pastille passe par la même écriture');
  assert.ok(!existsSync('src/features/editor/modals/EditItemModal.tsx'),
    'une seule modale d’ajout : pas de porte parallèle');
  const editorModals = readFileSync('src/features/editor/EditorModals.tsx', 'utf8');
  assert.ok(editorModals.includes('mode="edit"'),
    'l’édition d’une ligne existante reste ouverte (ContentModal mode="edit")');
});

test('un bloc de correction du devoir maison date le SECOND temps, sans créer de devoir', () => {
  const lessons: LessonsData = [
    { type: 'chapter', title: 'Chapitre 1', date: '2026-09-10' },
    { type: 'correction_devoir_maison', title: 'Correction du devoir maison 1', date: '2026-10-05' },
  ];
  const config = { manualAssessments: { c1: [{ id: '2026-2027:s1-maison1', schoolYear: '2026-2027', type: 'maison', num: 1, dateISO: '2026-09-20', semestre: 1 }] } } as unknown as AppConfig;
  const { patch } = syncNotebookToEvaluations('c1', config, lessons);
  const manual = patch.manualAssessments?.c1 ?? [];
  assert.equal(manual.length, 1, 'la correction ne crée pas un devoir de plus');
  assert.equal(manual[0].correctionDateISO, '2026-10-05', 'la correction date le devoir donné');
  assert.equal(manual[0].dateISO, '2026-09-20', 'l’attribution ne bouge pas');
  // Devoir du planning officiel daté par le professeur : il rejoint la feuille avec sa correction.
  const official = syncNotebookToEvaluations('c1', { manualAssessments: { c1: [] }, assessmentDates: { c1: { '2026-2027:s1-maison2': '2026-09-28' } } } as unknown as AppConfig,
    [{ type: 'correction_devoir_maison', title: 'Correction du devoir maison 2', date: '2026-10-05' }]);
  assert.deepEqual(official.patch.manualAssessments?.c1, [{ id: '2026-2027:s1-maison2', schoolYear: '2026-2027', type: 'maison', num: 2,
    dateISO: '2026-09-28', semestre: 1, correctionDateISO: '2026-10-05' }], 'le devoir officiel donné reçoit sa correction');
  // Devoir jamais saisi : la séance de correction le transmet, attribution à compléter.
  const orphan = syncNotebookToEvaluations('c1', { manualAssessments: { c1: [] } } as unknown as AppConfig,
    [{ type: 'correction_devoir_maison', title: 'Correction du devoir maison 3', date: '2026-10-05' }]);
  assert.deepEqual(orphan.patch.manualAssessments?.c1, [{ id: '2026-2027:s1-maison3', schoolYear: '2026-2027', type: 'maison', num: 3,
    dateISO: '', semestre: 1, correctionDateISO: '2026-10-05' }], 'la correction transmet le devoir à la feuille');
  // Supprimé de la feuille : la correction ne le fait pas renaître.
  const removed = syncNotebookToEvaluations('c1', { manualAssessments: { c1: [] }, removedAssessments: { c1: ['2026-2027:s1-maison3'] } } as unknown as AppConfig,
    [{ type: 'correction_devoir_maison', title: 'Correction du devoir maison 3', date: '2026-10-05' }]);
  assert.equal(removed.patch.manualAssessments, undefined, 'un devoir supprimé reste supprimé');
});

test('une évaluation posée au cahier rejoint la feuille avant même d’être datée', () => {
  const lessons: LessonsData = [
    { type: 'evaluation_diagnostic', title: 'Évaluation diagnostique 1', _tempId: 'diag-1' },
    { type: 'examen_blanc', title: 'Examen blanc 1', _tempId: 'blanc-1' },
    // Ligne ancienne sans identité stable : elle attend sa date pour être reliée.
    { type: 'olympiade', title: 'Olympiade' },
  ];
  const { patch } = syncNotebookToEvaluations('c1', {} as AppConfig, lessons, { previousLessons: [] });
  const events = patch.pedagogicalEvents?.c1 ?? [];
  assert.deepEqual(events.map(event => [event.id, event.type, event.date]), [
    ['notebook-diag-1', 'evaluation_diagnostic', ''],
    ['notebook-blanc-1', 'examen_blanc', ''],
  ], 'les évaluations du cahier sont transmises, « + Définir une date »');
});

test('le contrat de workflow est documenté et référencé — document vivant', () => {
  const doc = readFileSync('docs/architecture/workflow-evaluations.md', 'utf8');
  assert.match(doc, /une seule porte par famille/i, 'la porte de création de chaque famille est écrite noir sur blanc');
  assert.match(doc, /Invariants verrouillés/, 'les invariants sont listés pour les mises à jour');
  assert.match(doc, /tests\/test-evaluations-capture\.ts/, 'la règle de mise à jour pointe ce fichier de tests');
  const bridge = readFileSync('src/domain/evaluations/notebookSyncBridge.ts', 'utf8');
  assert.match(bridge, /workflow-evaluations\.md/, 'le code pointe le contrat');
  const architecture = readFileSync('docs/architecture/architecture.md', 'utf8');
  assert.match(architecture, /workflow-evaluations\.md/, 'l’architecture référence le contrat');
});
