import assert from 'node:assert/strict';
import test from 'node:test';
import type { AppConfig, LessonsData, PedagogicalEvent } from '../src/types';
import type { PlannedAssessment } from '../src/domain/evaluations/assessments';
import {
  removeAssessmentFromNotebook,
  removeEventFromNotebook,
} from '../src/domain/evaluations/notebookSyncBridge';
import {
  detectEventsFromRemarks,
  syncNotebookToEvaluations,
} from '../src/domain/evaluations/notebookReconciliation';
import { findNotebookAssessments, linkAssessments } from '../src/domain/evaluations/assessmentSync';
import { buildSessionActivityRemarks } from '../src/domain/evaluations/sessionActivityRemarks';
import { activityDocumentPreviews } from '../src/domain/evaluations/activityDocumentPreviews';
import { evaluationSlots, newEvaluationWarnings } from '../src/domain/evaluations/evaluationConflicts';
import { buildLessonRows } from '../src/domain/notebook/lessonRows';
import {
  mergeAnnotationIntoRemark,
  stripVirtualRemarkCopies,
} from '../src/domain/evaluations/sessionRemarkChanges';
import { translateLocaleMessage } from '../src/i18n/messages';

const baseConfig = (): AppConfig => ({
  establishmentName: 'Lycée Test',
  defaultTeacherName: 'Prof',
  printShowDescriptions: true,
});

const translateFr = (key: string, values?: Record<string, string | number>) =>
  translateLocaleMessage('fr', key, values);

// ── C1 : Suppression d'une activité de remarque depuis la feuille ────────────
test('C1 : supprimer une activité issue de la remarque retire sa ligne et empêche toute résurrection', () => {
  const lessons: LessonsData = [{
    type: 'chapter',
    title: 'Chapitre 1',
    items: [{
      type: 'cours',
      title: 'Séance 1',
      date: '2026-10-15',
      remark: 'Contrôle des cahiers des élèves\nNote personnelle du professeur',
      _tempId: 'row-c1',
    }],
  }];

  const synced = syncNotebookToEvaluations('c1', baseConfig(), lessons);
  const events = synced.patch.pedagogicalEvents?.c1 ?? [];
  assert.equal(events.length, 1);
  const target = events[0];
  assert.equal(target.id, 'remark-controle_cahiers-row-c1');

  const removed = removeEventFromNotebook(lessons, target.id, target.type, target.title);
  assert.equal(removed.updated, true, 'la ligne d’activité doit être retirée de la remarque');
  assert.equal(
    removed.lessons[0].items?.[0].remark,
    'Note personnelle du professeur',
    'le texte libre du professeur doit rester intact',
  );

  // Simulation du deleteEvent + réconciliation effectiveConfig de DevoirsView
  const configAfterDelete: AppConfig = { ...baseConfig(), pedagogicalEvents: { c1: [] } };
  const afterResync = syncNotebookToEvaluations('c1', configAfterDelete, removed.lessons);
  assert.deepEqual(
    afterResync.patch.pedagogicalEvents?.c1 ?? [],
    [],
    'l’activité supprimée ne doit jamais ressusciter à la réconciliation suivante',
  );
});

// ── C2 : Contrôle oral créé au tableau (bloc + suppression + pas de doublon) ─
test('C2 : un contrôle oral créé au tableau se supprime depuis la feuille et ne duplique pas son annotation', () => {
  const lessons: LessonsData = [{
    type: 'oral',
    title: 'Contrôle oral 1',
    date: '2026-10-15',
    _tempId: 'uuid-oral-1',
  }];

  const synced = syncNotebookToEvaluations('c1', baseConfig(), lessons);
  const configAfterSync: AppConfig = { ...baseConfig(), ...synced.patch };
  const oralAssessment = configAfterSync.manualAssessments?.c1?.find(a => a.type === 'oral');
  assert.ok(oralAssessment, 'l’oral créé au tableau rejoint manualAssessments');

  // Pas d'annotation redondante sur la date déjà portée par un bloc oral
  const remarks = buildSessionActivityRemarks(configAfterSync, 'c1', translateFr, ', ', lessons);
  assert.equal(
    remarks.has('2026-10-15'),
    false,
    'un bloc oral au tableau ne doit pas répéter « Contrôle oral » dans sa propre cellule remarque',
  );

  // Suppression depuis la feuille : le bloc oral quitte le cahier et ne ressuscite pas
  const removed = removeAssessmentFromNotebook(lessons, oralAssessment.id, 'oral', oralAssessment.num, '0||||');
  assert.equal(removed.updated, true, 'le bloc oral doit être retiré du cahier');
  assert.equal(removed.lessons.length, 0);

  const configAfterDelete: AppConfig = {
    ...baseConfig(),
    manualAssessments: { c1: [] },
    assessmentDates: { c1: {} },
    removedAssessments: { c1: [oralAssessment.id] },
  };
  const afterResync = syncNotebookToEvaluations('c1', configAfterDelete, removed.lessons);
  assert.equal(afterResync.patch.manualAssessments?.c1?.length ?? 0, 0);
});

// ── C3 : Colle créée au tableau (pas de duplication dans linkAssessments) ────
test('C3 : une colle créée au tableau se relie à son entrée manuelle sans créer de doublon synthétique', () => {
  const lessons: LessonsData = [{
    type: 'colle',
    title: 'Colle 1',
    date: '2026-10-15',
    _tempId: 'uuid-colle-1',
  }];
  const entries = findNotebookAssessments(lessons);
  assert.equal(entries.length, 1);

  const plannedColle: PlannedAssessment = {
    id: '2026-2027:s1-colle1',
    schoolYear: '2026-2027',
    semestre: 1,
    type: 'colle',
    num: 1,
    label: 'Colle 1',
    dateISO: '2026-10-15',
    semaine: 5,
    predictionStatus: 'manual',
    confidence: 'high',
    predictionReason: 'teacher',
  };

  const links = linkAssessments([plannedColle], entries, '2026-10-15');
  assert.equal(links.length, 1);
  assert.ok(links[0].entry, 'la colle du tableau doit être reliée à sa ligne planifiée');
  assert.equal(links[0].status, 'done');
});

// ── C4 : Identités unifiées event- / notebook- ───────────────────────────────
test('C4a : removeEventFromNotebook supprime par identité notebook-<_tempId> même avec deux titres identiques', () => {
  const lessons: LessonsData = [
    { type: 'olympiade', title: 'Olympiade', date: '2026-11-10', _tempId: 'uuid-oly-1' },
    { type: 'olympiade', title: 'Olympiade', date: '2026-12-10', _tempId: 'uuid-oly-2' },
  ];

  const removed = removeEventFromNotebook(lessons, 'notebook-uuid-oly-2', 'olympiade', 'Olympiade');
  assert.equal(removed.updated, true, 'doit cibler exactement uuid-oly-2');
  assert.equal(removed.lessons.length, 1);
  assert.equal(removed.lessons[0]._tempId, 'uuid-oly-1');
});

test('C4b : activityDocumentPreviews relie un document à son événement notebook-<_tempId> même non daté et homonyme', () => {
  const lessons: LessonsData = [
    { type: 'olympiade', title: 'Olympiade', _tempId: 'uuid-oly-1' },
    { type: 'olympiade', title: 'Olympiade', _tempId: 'uuid-oly-2' },
  ];
  const doc = { source: 'Sujet olympiade 2', updatedAt: '2026-11-01T00:00:00Z' };
  const events: PedagogicalEvent[] = [
    { id: 'notebook-uuid-oly-1', type: 'olympiade', title: 'Olympiade', date: '', status: 'planned', createdAt: '2026-11-01' },
    { id: 'notebook-uuid-oly-2', type: 'olympiade', title: 'Olympiade', date: '', status: 'planned', createdAt: '2026-11-01', document: doc },
  ];
  const config: AppConfig = { ...baseConfig(), pedagogicalEvents: { c1: events } };

  const previews = activityDocumentPreviews(config, 'c1', lessons, [], translateFr);
  assert.equal(previews.rows.get('1||||')?.document, doc, 'le document doit pointer exactement sur la 2e olympiade');
  assert.equal(previews.rows.has('0||||'), false);
});

test('C4c : renommer un diagnostic créé au tableau ne déclenche pas un faux auto-conflit', () => {
  const before: LessonsData = [
    { type: 'evaluation_diagnostic', title: 'Évaluation diagnostique', date: '2026-09-15', _tempId: 'uuid-diag-1' },
  ];
  const synced = syncNotebookToEvaluations('c1', baseConfig(), before);
  const events = synced.patch.pedagogicalEvents?.c1 ?? [];
  assert.equal(events[0].id, 'notebook-uuid-diag-1');

  const renamed: LessonsData = [
    { ...before[0], title: 'Évaluation diagnostique — Algèbre' },
  ];
  const warnings = newEvaluationWarnings(
    evaluationSlots(before, [], events),
    evaluationSlots(renamed, [], events),
    'fr',
  );
  assert.deepEqual(warnings, [], 'renommer son propre diagnostic ne doit jamais créer de conflit avec son miroir');
});

test('m11 : evaluationSlots détecte les chevauchements sur examen_blanc, olympiade et concours créés au tableau', () => {
  const before: LessonsData = [
    { type: 'examen_blanc', title: 'Examen blanc 1', date: '2026-05-10', _tempId: 'uuid-eb-1' },
    { type: 'examen_blanc', title: 'Examen blanc 2', date: '2026-05-20', _tempId: 'uuid-eb-2' },
  ];
  const after: LessonsData = [
    before[0],
    { ...before[1], date: '2026-05-10' },
  ];
  const warnings = newEvaluationWarnings(
    evaluationSlots(before, [], []),
    evaluationSlots(after, [], []),
    'fr',
  );
  assert.equal(warnings.length, 1, 'un examen blanc déplacé sur un autre doit être signalé');
});

// ── M5a : Suppression d'un devoir maison nettoie aussi la mention d'attribution dans item.remark
test('M5a : supprimer un devoir maison retire aussi la mention d’attribution écrite dans la remarque du cours', () => {
  const lessons: LessonsData = [{
    type: 'chapter',
    title: 'Chapitre 1',
    items: [{
      type: 'cours',
      title: 'Séance 1',
      date: '2026-10-15',
      remark: 'Devoir à la maison 1 assigné aux élèves\nExercices 1 à 4',
      _tempId: 'row-dm1',
    }],
  }];

  const removed = removeAssessmentFromNotebook(lessons, '2026-2027:s1-maison1', 'maison', 1);
  assert.equal(removed.updated, true, 'la mention d’attribution du devoir maison doit être nettoyée');
  assert.equal(removed.lessons[0].items?.[0].remark, 'Exercices 1 à 4', 'la note personnelle du professeur survit');
});

// ── M6 : Moteur unique de détection des activités dans les remarques ─────────
test('M6 : detectEventsFromRemarks évite les faux positifs en milieu de phrase et reconnaît les synonymes du catalogue', () => {
  const falsePositives = [
    'Support de cours distribué aux élèves',
    'Prévoir une séance de soutien la semaine prochaine',
    'Rappel : contrôle des cahiers demain',
    'Élève absent au rattrapage',
  ];
  for (const text of falsePositives) {
    const lessons: LessonsData = [{
      type: 'chapter',
      title: 'Ch',
      items: [{ type: 'cours', title: 'L', date: '2026-10-15', remark: text, _tempId: 'r-fp' }],
    }];
    const rows = buildLessonRows(lessons);
    const events = detectEventsFromRemarks(rows[1], 'c1');
    assert.deepEqual(events, [], `ne doit pas détecter une activité dans « ${text} »`);
  }

  const synonymLessons: LessonsData = [{
    type: 'chapter',
    title: 'Ch',
    items: [{ type: 'cours', title: 'L', date: '2026-10-15', remark: 'Cahiers vérifiés', _tempId: 'r-syn' }],
  }];
  const synRows = buildLessonRows(synonymLessons);
  const synEvents = detectEventsFromRemarks(synRows[1], 'c1');
  assert.equal(synEvents.length, 1, 'le synonyme officiel « Cahiers vérifiés » doit être détecté');
  assert.equal(synEvents[0].type, 'controle_cahiers');
});

// ── M7 : Numérotation S2 repartant à 1 ───────────────────────────────────────
test('M7 : un Contrôle continu 1 au Semestre 2 se synchronise sans entrer en collision avec le Semestre 1', () => {
  const s1Config: AppConfig = {
    ...baseConfig(),
    manualAssessments: {
      c1: [{
        id: '2026-2027:s1-controle1',
        schoolYear: '2026-2027',
        type: 'controle',
        num: 1,
        dateISO: '2026-10-15',
        semestre: 1,
      }],
    },
    assessmentDates: {
      c1: { '2026-2027:s1-controle1': '2026-10-15' },
    },
  };
  const lessons: LessonsData = [
    { type: 'controle_continu', title: 'Contrôle continu 1', date: '2026-10-15', _tempId: 'uuid-s1' },
    { type: 'controle_continu', title: 'Contrôle continu 1', date: '2027-03-15', _tempId: 'uuid-s2' },
  ];

  const synced = syncNotebookToEvaluations('c1', s1Config, lessons);
  const manual = synced.patch.manualAssessments?.c1 ?? [];
  assert.equal(manual.length, 2, 'les deux semestres doivent coexister dans manualAssessments');
  assert.ok(manual.some(m => m.id === '2026-2027:s1-controle1' && m.dateISO === '2026-10-15'));
  assert.ok(manual.some(m => m.id === '2026-2027:s2-controle1' && m.dateISO === '2027-03-15' && m.semestre === 2));
});

// ── M5c : Helpers purs de fusion et nettoyage d'annotations virtuelles ───────
test('M5c : mergeAnnotationIntoRemark évite les doublons et stripVirtualRemarkCopies préserve les activités nées en remarque', () => {
  // Déjà présente dans la remarque : seule la ligne de compteurs est ajoutée à l'édition
  const merged = mergeAnnotationIntoRemark(
    'Contrôle des cahiers des élèves\nNote libre',
    'Contrôle des cahiers des élèves\nBon: 12, Moyen: 3',
  );
  assert.equal(merged.split('Contrôle des cahiers des élèves').length - 1, 1);
  assert.ok(merged.includes('Bon: 12, Moyen: 3'));
  assert.ok(merged.includes('Note libre'));

  // À la sauvegarde : les annotations virtuelles (assessment:dm1) et compteurs (Bon: 12)
  // sont retirés avant écriture dans lessonsData, mais le déclencheur remark- reste !
  const cleaned = stripVirtualRemarkCopies(
    'Devoir à la maison 1 assigné aux élèves\nBon: 12, Moyen: 3\nContrôle des cahiers des élèves\nNote libre',
    [
      { id: 'assessment:2026-2027:s1-maison1', text: 'Devoir à la maison 1 assigné aux élèves', originalText: 'Devoir à la maison 1 assigné aux élèves', hidden: false },
      { id: 'event:remark-controle_cahiers-r1', text: 'Contrôle des cahiers des élèves\nBon: 12, Moyen: 3', originalText: 'Contrôle des cahiers des élèves\nBon: 12, Moyen: 3', hidden: false },
    ],
  );
  assert.equal(cleaned, 'Contrôle des cahiers des élèves\nNote libre');
});

