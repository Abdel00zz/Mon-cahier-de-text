import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  extractCorrectionNumber,
  extractHomeworkAssignmentNumber,
  getChronologicalHomeworkNumber,
  isHomeworkCorrectionLine,
  removeCorrectionFromRemark,
  removeHomeworkFromRemark,
  replaceOrInsertCorrectionInRemark,
  replaceOrInsertHomeworkInRemark,
  splitRemarkContent,
} from '../src/domain/evaluations/homeworkNumbering';
import { sessionRemarkSettingsPatch } from '../src/domain/evaluations/sessionRemarkChanges';
import { buildSessionRemarkEntries } from '../src/domain/evaluations/sessionActivityRemarks';
import { homeworkMoments, pendingCorrections, withHomeworkCorrection } from '../src/domain/evaluations/homeworkCycle';
import type { AppConfig, Indices, LessonsData } from '../src/types';
import { assertValidSyncSettings } from '../api/_lib/validate';

/*
 * LE CYCLE D'UN DEVOIR MAISON — donné, puis corrigé.
 *
 * Un devoir maison vit en DEUX séances : celle où il est donné (les élèves
 * l'emportent chez eux) et une séance ultérieure où il est corrigé. Les deux
 * lignes parlent du MÊME devoir : la correction ne doit donc jamais être prise
 * pour une seconde attribution — elle ne crée pas de devoir, ne fausse pas la
 * numérotation chronologique, et date le devoir existant sans toucher à sa
 * séance d'attribution.
 */

const classId = 'c1';

// ── 1. Distinguer les deux lignes ────────────────────────────────────────────

test('une ligne de correction se reconnaît strictement, en trois langues', () => {
  assert.equal(isHomeworkCorrectionLine('Correction devoir maison 2'), true);
  assert.equal(isHomeworkCorrectionLine('Correction du devoir maison 2'), true);
  assert.equal(isHomeworkCorrectionLine('Corrigé devoir maison 2'), true);
  assert.equal(isHomeworkCorrectionLine('Correction of homework 2'), true);
  assert.equal(isHomeworkCorrectionLine('تصحيح الفرض المنزلي رقم 3'), true);
  assert.equal(isHomeworkCorrectionLine('حلّ الفرض المنزلي رقم 3'), true);
  // Attribution : jamais confondue avec une correction.
  assert.equal(isHomeworkCorrectionLine('Devoir maison 2 donné'), false);
  assert.equal(isHomeworkCorrectionLine('تم إعطاء الفرض المنزلي رقم 2'), false);
  // Au fil d'une phrase, « corrigé » reste une note libre.
  assert.equal(isHomeworkCorrectionLine('Devoir maison 2 corrigé ensemble'), false);
  // Une correction sans devoir maison n'est pas une correction de devoir.
  assert.equal(isHomeworkCorrectionLine('حل التمرين 5'), false);
  assert.equal(isHomeworkCorrectionLine('Correction de l’exercice 5'), false);
});

test('l’attribution et la correction se numérotent chacune de son côté', () => {
  const mixed = 'Correction devoir maison 2\nDevoir maison 1 donné';
  assert.equal(extractCorrectionNumber(mixed), 2);
  assert.equal(extractHomeworkAssignmentNumber(mixed), 1, 'la ligne de correction ne donne pas le numéro d’attribution');
  assert.equal(extractCorrectionNumber('Devoir maison 1 donné'), null);
  assert.equal(extractHomeworkAssignmentNumber('Correction devoir maison 2'), null);
});

test('les retouches de remarque respectent le second temps', () => {
  // Changer l’attribution ne touche pas la correction…
  assert.equal(
    replaceOrInsertHomeworkInRemark('Correction devoir maison 1\nDevoir maison 1 donné', 'Devoir maison 2 donné'),
    'Correction devoir maison 1\nDevoir maison 2 donné',
  );
  // …et retirer l’attribution ne l’emporte pas avec elle.
  assert.equal(
    removeHomeworkFromRemark('Correction devoir maison 1\nDevoir maison 1 donné'),
    'Correction devoir maison 1',
  );
  // La correction se pose APRÈS sa ligne d’attribution.
  assert.equal(
    replaceOrInsertCorrectionInRemark('Devoir maison 1 donné\nمراقبة الدفاتر', 'Correction devoir maison 1'),
    'Devoir maison 1 donné\nCorrection devoir maison 1\nمراقبة الدفاتر',
  );
  // Elle se renumérote sans se dupliquer, et se retire seule.
  assert.equal(
    replaceOrInsertCorrectionInRemark('Correction devoir maison 1\nAutre note', 'Correction devoir maison 2'),
    'Correction devoir maison 2\nAutre note',
  );
  assert.equal(removeCorrectionFromRemark('Devoir maison 1 donné\nCorrection devoir maison 1'), 'Devoir maison 1 donné');
  const split = splitRemarkContent('Correction devoir maison 1\nDevoir maison 1 donné');
  assert.equal(split.homeworkLine, 'Devoir maison 1 donné');
  assert.equal(split.homeworkNum, 1);
});

test('la séance de correction ne crée pas un rang dans la numérotation chronologique', () => {
  const lessons: LessonsData = [{
    type: 'chapter',
    title: 'Chapitre',
    items: [
      { type: 'cours', title: 'L1', date: '2026-10-05', remark: 'Devoir maison 1 donné' },
      { type: 'cours', title: 'L2', date: '2026-10-12', remark: 'Correction devoir maison 1' },
    ],
  }];
  assert.equal(getChronologicalHomeworkNumber({ lessons, targetDate: '2026-11-02' }), 2,
    'un devoir donné + sa correction = UN jalon, pas deux');
});

test('la feuille d’évaluations compte comme jalon, même sans ligne dans la remarque', () => {
  // Depuis que « Devoir maison N donné » est un badge, le cahier peut ne porter
  // AUCUNE ligne : si seul le cahier était lu, chaque nouveau devoir vaudrait 1.
  const lessons: LessonsData = [{
    type: 'chapter',
    title: 'Chapitre',
    items: [{ type: 'cours', title: 'L1', date: '2026-10-12' }],
  }];
  const options = {
    lessons,
    manualAssessments: [{ id: '2026-2027:s1-maison1', type: 'maison', num: 1, dateISO: '2026-10-05' }],
    assessmentDates: { '2026-2027:s1-maison1': '2026-10-05' },
  };
  assert.equal(getChronologicalHomeworkNumber({ ...options, targetDate: '2026-10-19' }), 2,
    'le devoir donné le 05/10 compte → la séance du 19/10 donne le n° 2');
  assert.equal(getChronologicalHomeworkNumber({ ...options, targetDate: '2026-10-05' }), 1,
    'la séance d’attribution elle-même reste le n° 1');
});

// ── 2. Du patch de séance au devoir daté ─────────────────────────────────────

const lessons: LessonsData = [{
  type: 'chapter',
  title: 'Chapitre',
  items: [
    { type: 'cours', title: 'L1', date: '2026-10-05' },
    { type: 'cours', title: 'L2', date: '2026-10-12' },
  ],
}];
const targets: Indices[] = [{ chapterIndex: 0, itemIndex: 1 }];

test('la correction date le devoir existant sans toucher à son attribution', () => {
  const config = {
    manualAssessments: { [classId]: [{ id: '2026-2027:s1-maison1', schoolYear: '2026-2027', type: 'maison' as const, num: 1, dateISO: '2026-10-05', semestre: 1 as const }] },
  } as unknown as AppConfig;
  const patch = sessionRemarkSettingsPatch(config, classId, lessons, targets,
    { date: '2026-10-12', homeworkCorrection: 1 }, new Map());
  const item = patch.manualAssessments?.[classId]?.[0];
  assert.equal(item?.correctionDateISO, '2026-10-12', 'la séance de correction date le devoir');
  assert.equal(item?.dateISO, '2026-10-05', 'la séance d’attribution reste intacte');
  assert.equal(item?.schoolYear, '2026-2027', 'l’identité annuelle ne bouge pas');
});

test('la correction d’un devoir jamais saisi le transmet à la feuille, attribution à compléter', () => {
  const patch = sessionRemarkSettingsPatch({} as AppConfig, classId, lessons, targets,
    { date: '2026-10-12', homeworkCorrection: 1 }, new Map());
  assert.deepEqual(patch.manualAssessments?.[classId], [{ id: '2026-2027:s1-maison1', schoolYear: '2026-2027', type: 'maison', num: 1,
    dateISO: '', semestre: 1, correctionDateISO: '2026-10-12' }], 'le devoir rejoint le contrôle continu');
  assert.equal(patch.assessmentDates, undefined, 'aucune date d’attribution inventée');
});

test('la correction d’un devoir du planning officiel daté par le professeur le rejoint', () => {
  const config = { assessmentDates: { [classId]: { '2026-2027:s1-maison1': '2026-10-05' } } } as unknown as AppConfig;
  const patch = sessionRemarkSettingsPatch(config, classId, lessons, targets,
    { date: '2026-10-12', homeworkCorrection: 1 }, new Map());
  const item = patch.manualAssessments?.[classId]?.[0];
  assert.equal(item?.id, '2026-2027:s1-maison1', 'même identité que le planning');
  assert.equal(item?.dateISO, '2026-10-05', 'l’attribution choisie par le professeur reste');
  assert.equal(item?.correctionDateISO, '2026-10-12', 'la séance de correction date le devoir');
});

test('donné sans déplacer la séance : la remarque crée quand même le devoir daté', () => {
  // Geste réel : le professeur annote la séance du 12/10 (« Devoir maison 1
  // donné ») sans toucher à sa date — le patch n’a donc AUCUN champ `date`.
  // Le devoir doit naître de la date de la séance ciblée, sinon la pastille
  // reste un texte orphelin et rien n’apparaît dans la feuille d’évaluations.
  const patch = sessionRemarkSettingsPatch({} as AppConfig, classId, lessons, targets,
    { homeworkGiven: 1 }, new Map());
  const item = patch.manualAssessments?.[classId]?.[0];
  assert.equal(item?.dateISO, '2026-10-12', 'le devoir naît à la date de la séance annotée');
  assert.equal(item?.type, 'maison');
  assert.equal(item?.num, 1);
  assert.equal(patch.assessmentDates?.[classId]?.['2026-2027:s1-maison1'], '2026-10-12',
    'la date suit la même identité que la réconciliation du cahier');
});

test('corrigé sans déplacer la séance : la date de correction vient de la séance', () => {
  const config = {
    manualAssessments: { [classId]: [{ id: '2026-2027:s1-maison1', schoolYear: '2026-2027', type: 'maison' as const, num: 1, dateISO: '2026-10-05', semestre: 1 as const }] },
  } as unknown as AppConfig;
  const patch = sessionRemarkSettingsPatch(config, classId, lessons, targets,
    { homeworkCorrection: 1 }, new Map());
  const item = patch.manualAssessments?.[classId]?.[0];
  assert.equal(item?.correctionDateISO, '2026-10-12', 'la séance annotée date la correction');
  assert.equal(item?.dateISO, '2026-10-05', 'la séance d’attribution reste intacte');
});

test('à numéro égal, la correction choisit le devoir encore en attente', () => {
  const config = {
    manualAssessments: { [classId]: [
      { id: '2026-2027:s1-maison1', schoolYear: '2026-2027', type: 'maison' as const, num: 1, dateISO: '2026-05-04', semestre: 1 as const, correctionDateISO: '2026-05-11' },
      { id: '2026-2027:s2-maison1', schoolYear: '2026-2027', type: 'maison' as const, num: 1, dateISO: '2026-10-05', semestre: 2 as const },
    ] },
  } as unknown as AppConfig;
  const patch = sessionRemarkSettingsPatch(config, classId, lessons, targets,
    { date: '2026-10-12', homeworkCorrection: 1 }, new Map());
  const items = patch.manualAssessments?.[classId] ?? [];
  assert.equal(items[0].correctionDateISO, '2026-05-11', 'le devoir déjà corrigé ne bouge pas');
  assert.equal(items[1].correctionDateISO, '2026-10-12', 'c’est le devoir en attente qui est daté');
});

test('déplacer la séance de correction déplace la date de correction, pas l’attribution', () => {
  const config = {
    manualAssessments: { [classId]: [{ id: '2026-2027:s1-maison1', schoolYear: '2026-2027', type: 'maison' as const, num: 1, dateISO: '2026-10-05', semestre: 1 as const, correctionDateISO: '2026-10-12' }] },
  } as unknown as AppConfig;
  const entries = new Map([[ '2026-10-12', [
    { id: 'assessment:2026-2027:s1-maison1:correction', text: 'Correction devoir maison 1', originalText: 'Correction devoir maison 1', hidden: false },
  ] ]]);
  const patch = sessionRemarkSettingsPatch(config, classId, lessons, targets,
    { date: '2026-10-19' }, entries);
  const item = patch.manualAssessments?.[classId]?.[0];
  assert.equal(item?.correctionDateISO, '2026-10-19', 'la correction suit sa séance');
  assert.equal(item?.dateISO, '2026-10-05', 'l’attribution ne suit pas la correction');
});

// ── 3. La correction s’annote dans la séance ─────────────────────────────────

test('le devoir corrigé s’annote sur SA séance de correction, et sur elle seule', () => {
  const config = {
    manualAssessments: { [classId]: [{ id: '2026-2027:s1-maison1', schoolYear: '2026-2027', type: 'maison' as const, num: 1, dateISO: '2026-10-05', semestre: 1 as const, correctionDateISO: '2026-10-12' }] },
    assessmentDates: { [classId]: { '2026-2027:s1-maison1': '2026-10-05' } },
  } as unknown as AppConfig;
  const templates: Record<string, string> = {
    'remark.devoirMaisonGiven': 'Devoir maison {num} donné',
    'remark.devoirMaisonGivenSimple': 'Devoir maison donné',
    'remark.devoirMaisonCorrection': 'Correction devoir maison {num}',
  };
  const translate = (key: string, values?: Record<string, string | number>) =>
    (templates[key] ?? key).replace('{num}', String(values?.num ?? ''));
  const entries = buildSessionRemarkEntries(config, classId, translate, '\n', lessons);
  const given = (entries.get('2026-10-05') ?? []).filter(entry => entry.id === 'assessment:2026-2027:s1-maison1');
  assert.deepEqual(given.map(entry => entry.text), ['Devoir maison 1 donné']);
  const correction = (entries.get('2026-10-12') ?? []).filter(entry => entry.id === 'assessment:2026-2027:s1-maison1:correction');
  assert.deepEqual(correction.map(entry => entry.text), ['Correction devoir maison 1']);
});

// ── 4. L’état du cycle pour l’écran de séance ────────────────────────────────

test('le cycle distingue donnés, corrigés et en attente', () => {
  const config = {
    manualAssessments: { [classId]: [
      { id: '2026-2027:s1-maison1', type: 'maison' as const, num: 1, dateISO: '2026-09-20', semestre: 1 as const },
      { id: '2026-2027:s1-maison2', type: 'maison' as const, num: 2, dateISO: '2026-10-05', semestre: 1 as const, correctionDateISO: '2026-10-12' },
      { id: '2026-2027:s1-maison4', type: 'maison' as const, num: 4, dateISO: '2026-09-28', semestre: 1 as const },
      { id: '2026-2027:s1-oral1', type: 'oral' as const, num: 1, dateISO: '2026-10-10', semestre: 1 as const },
    ] },
    assessmentDates: { [classId]: {
      '2026-2027:s1-maison1': '2026-09-21',
      '2026-2027:s1-maison3': '2026-10-15',
    } },
    removedAssessments: { [classId]: ['2026-2027:s1-maison4'] },
  } as unknown as AppConfig;
  const moments = homeworkMoments(config, classId);
  assert.deepEqual(moments.map(moment => moment.num).sort((a, b) => a - b), [1, 2, 3], 'devoirs maison seuls, dédoublonnés, supprimés exclus');
  assert.equal(moments.find(moment => moment.num === 1)?.givenDateISO, '2026-09-21', 'la date de séance prime sur la date du modèle');
  assert.equal(moments.find(moment => moment.num === 3)?.givenDateISO, '2026-10-15', 'les devoirs historiques sans entrée manuelle restent visibles');
  // L’attente : ni un devoir corrigé, ni un devoir dont l’attribution est à venir.
  assert.deepEqual(pendingCorrections(moments, '2026-10-19').map(moment => moment.num), [3, 1], 'du plus récent au plus ancien');
  assert.deepEqual(pendingCorrections(moments, '2026-10-14').map(moment => moment.num), [1], 'pas de correction avant l’attribution');
  assert.deepEqual(pendingCorrections(moments, '2026-09-21').map(moment => moment.num), [], 'pas de correction le jour même du devoir');
});

// ── 5. L’API accepte le second temps, et refuse une date invalide ────────────

test('l’API valide correctionDateISO', () => {
  const valid = new Set(['c1']);
  assert.doesNotThrow(() => assertValidSyncSettings({
    manualAssessments: { c1: [{ id: 'maison-1', type: 'maison', num: 1, dateISO: '2026-10-05', semestre: 1, correctionDateISO: '2026-10-12' }] },
  }, valid));
  assert.doesNotThrow(() => assertValidSyncSettings({
    manualAssessments: { c1: [{ id: 'maison-1', type: 'maison', num: 1, dateISO: '2026-10-05', semestre: 1 }] },
  }, valid), 'la correction reste facultative');
  assert.throws(() => assertValidSyncSettings({
    manualAssessments: { c1: [{ id: 'maison-1', type: 'maison', num: 1, dateISO: '2026-10-05', semestre: 1, correctionDateISO: '12/10/2026' }] },
  }, valid), 'une date de correction non ISO est refusée');
});

// ── 6. L’écran branche bien le cycle ─────────────────────────────────────────

test('la modale de séance relie les deux temps', () => {
  const modal = readFileSync('src/features/editor/modals/AssignDateModal.tsx', 'utf8');
  assert.match(modal, /homeworkCorrection: detectedCorrectionNum/, 'la pastille de correction produit le patch');
  assert.match(modal, /remark\.devoirMaisonCorrection/, 'la pastille affiche la ligne de correction');
  assert.match(modal, /pendingCorrections\(/, 'seuls les devoirs en attente sont offerts');
  assert.match(modal, /extractHomeworkAssignmentNumber/, 'l’attribution ignore la correction');
  const view = readFileSync('src/features/evaluations/DevoirsView.tsx', 'utf8');
  assert.match(view, /evaluations\.homework\.correctedOn/, 'la feuille d’évaluations affiche la date de correction');
  const remarks = readFileSync('src/domain/evaluations/sessionActivityRemarks.ts', 'utf8');
  assert.match(remarks, /:correction/, 'la correction s’annote par sa propre identité');
});

test('la puce de la remarque ne porte pas le numéro : la cellule du tableau s’en charge', () => {
  const modal = readFileSync('src/features/editor/modals/AssignDateModal.tsx', 'utf8');
  assert.match(modal, /title=\{t\('remark\.devoirMaisonGivenSimple'\)\}/, 'l’infobulle de la puce est sans numéro');
  assert.match(modal, /<span>\{t\('remark\.devoirMaisonGivenSimple'\)\}<\/span>/, 'et son libellé aussi');
  assert.match(modal, /title=\{t\('remark\.devoirMaisonCorrectionSimple'\)\}/, 'la puce de correction est sans numéro');
  // …mais la LIGNE écrite dans la remarque, elle, porte le numéro : c’est elle
  // que la cellule du tableau affiche.
  assert.match(modal, /const dmText = t\('remark\.devoirMaisonGiven', \{ num: activeHomeworkNum \}\);/,
    'la ligne d’attribution écrite est numérotée');
  assert.match(modal, /const dmText = t\('remark\.devoirMaisonCorrection', \{ num: correctionOfferNum \}\);/,
    'la ligne de correction écrite est numérotée');
});

// ── 7. La correction saisie au tableau date le devoir, sans le dupliquer ─────

test('la correction posée au tableau date le devoir de son numéro, jamais un devoir de plus', () => {
  const manual = [
    { id: 'a', type: 'maison' as const, num: 1, dateISO: '2026-09-20', semestre: 1 as const },
    { id: 'b', type: 'maison' as const, num: 2, dateISO: '2026-10-02', semestre: 1 as const },
  ];
  const next = withHomeworkCorrection(manual, '2026-10-05', 1);
  assert.equal(next.length, 2, 'aucun devoir créé');
  assert.equal(next[0].correctionDateISO, '2026-10-05', 'le devoir 1 est corrigé');
  assert.equal(next[1].correctionDateISO, undefined, 'le devoir 2 n’est pas touché');
  assert.equal(next[0].dateISO, '2026-09-20', 'la séance d’attribution ne bouge pas');
});

test('sans numéro déclaré, c’est le devoir en attente le plus récent qui est servi', () => {
  const manual = [
    { id: 'a', type: 'maison' as const, num: 1, dateISO: '2026-09-20', semestre: 1 as const, correctionDateISO: '2026-09-28' },
    { id: 'b', type: 'maison' as const, num: 2, dateISO: '2026-10-02', semestre: 1 as const },
  ];
  const next = withHomeworkCorrection(manual, '2026-10-05');
  assert.equal(next[1].correctionDateISO, '2026-10-05', 'un devoir déjà corrigé ne masque pas celui qui attend');
  assert.equal(next[0].correctionDateISO, '2026-09-28', 'la première correction est conservée');
});

test('la correction ne duplique rien — et ne réécrit rien', () => {
  const manual = [{ id: 'a', type: 'controle' as const, num: 1, dateISO: '2026-09-20', semestre: 1 as const }];
  assert.equal(withHomeworkCorrection(manual, '2026-10-05'), manual,
    'sans numéro ni devoir en attente, on ne devine pas le devoir corrigé');
  assert.equal(withHomeworkCorrection(manual, '2026-10-05', 1, { removed: ['2026-2027:s1-maison1'] }), manual,
    'un devoir supprimé de la feuille ne renaît pas');
  const created = withHomeworkCorrection(manual, '2026-10-05', 1);
  assert.equal(created.length, 2, 'devoir jamais saisi : transmis une seule fois');
  assert.equal(withHomeworkCorrection(created, '2026-10-05', 1), created, 'idempotent après transmission');
  // Un devoir corrigé au premier semestre est clos : le devoir 1 du second semestre est un autre devoir.
  const closed = [{ id: 's1', type: 'maison' as const, num: 1, dateISO: '2026-10-01', semestre: 1 as const, correctionDateISO: '2026-10-08', schoolYear: '2026-2027' }];
  const second = withHomeworkCorrection(closed, '2027-03-10', 1);
  assert.equal(second[0].correctionDateISO, '2026-10-08', 'la correction du premier semestre ne bouge pas');
  assert.equal(second[1]?.id, '2026-2027:s2-maison1', 'le second semestre a son propre devoir');
  const already = [{ id: 'a', type: 'maison' as const, num: 1, dateISO: '2026-09-20', semestre: 1 as const, correctionDateISO: '2026-10-05' }];
  assert.equal(withHomeworkCorrection(already, '2026-10-05', 1), already, 'idempotent : rien à réécrire');
  // Un devoir postérieur à la séance de correction n’est pas encore entre les mains des élèves.
  const future = [{ id: 'a', type: 'maison' as const, num: 1, dateISO: '2026-11-02', semestre: 1 as const }];
  assert.equal(withHomeworkCorrection(future, '2026-10-05', 1), future, 'on ne corrige pas un devoir non donné');
});
