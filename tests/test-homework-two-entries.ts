import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { AppConfig, LessonsData, ManualAssessment } from '../src/types';
import { withHomeworkSchedule, type HomeworkIdentity } from '../src/domain/evaluations/homeworkCycle';
import { homeworkCorrectionDocumentId, homeworkDocumentOwnerId } from '../src/domain/evaluations/homeworkIds';
import { documentIndicator, documentRequirementForHomeworkCorrection } from '../src/domain/evaluations/documentRequirement';
import { clampKindPolicy, kindSupport, resolveKindPolicy } from '../src/domain/evaluations/evaluationPolicy';
import { removeHomeworkCorrectionFromNotebook } from '../src/domain/evaluations/notebookSyncBridge';
import { mergePedagogicalDocuments } from '../src/domain/evaluations/documentSync';
import { useEvaluationActions } from '../src/features/evaluations/hooks/useEvaluationActions';
import { assertValidSyncSettings } from '../api/_lib/validate';
import { extractSyncableSettings, mergeSyncableSettings } from '../src/infrastructure/sync/syncSettings';
import { encodeRecord } from '../api/_lib/firestoreStore';

const read = (path: string) => readFileSync(path, 'utf8');

/*
 * DEVOIR MAISON — deux entrées, et deux seulement :
 *   « assigné aux élèves » : document · date limite de rendu · corbeille
 *   « correction »         : document · élèves n'ayant pas rendu · corbeille
 * Une seule identité : tout vit sur le même enregistrement, rien de nouveau à synchroniser,
 * sauf le document du corrigé (`<devoir>:correction`).
 */
const homework: HomeworkIdentity = { id: '2026-2027:s1-maison2', schoolYear: '2026-2027', semestre: 1, num: 2 };
const item = (extra: Partial<ManualAssessment> = {}): ManualAssessment => ({
  id: homework.id, schoolYear: '2026-2027', type: 'maison', num: 2, semestre: 1, dateISO: '2026-10-05', ...extra,
});

// ── 1. Date limite et correction, sur l'enregistrement du devoir ─────────────
test('la date limite et la correction s’écrivent sur le même devoir, sans doublon', () => {
  const manual = [item()];
  const withDue = withHomeworkSchedule(manual, homework, '2026-10-05', { dueDateISO: '2026-10-12' });
  assert.equal(withDue.length, 1);
  assert.equal(withDue[0].dueDateISO, '2026-10-12');
  const both = withHomeworkSchedule(withDue, homework, '2026-10-05', { correctionDateISO: '2026-10-19' });
  assert.equal(both.length, 1);
  assert.deepEqual([both[0].dueDateISO, both[0].correctionDateISO, both[0].dateISO], ['2026-10-12', '2026-10-19', '2026-10-05']);
  assert.equal(withHomeworkSchedule(both, homework, '', { dueDateISO: '2026-10-12' }), both, 'rien à écrire : même référence');
});

test('une chaîne vide efface le champ, sans toucher à l’autre ni à la date « donné »', () => {
  const full = [item({ dueDateISO: '2026-10-12', correctionDateISO: '2026-10-19' })];
  const noDue = withHomeworkSchedule(full, homework, '', { dueDateISO: '' });
  assert.equal('dueDateISO' in noDue[0], false);
  assert.equal(noDue[0].correctionDateISO, '2026-10-19');
  const noCorrection = withHomeworkSchedule(noDue, homework, '', { correctionDateISO: '' });
  assert.equal('correctionDateISO' in noCorrection[0], false);
  assert.equal(noCorrection[0].dateISO, '2026-10-05');
});

test('un devoir du planning officiel devient une entrée à la première date posée — jamais « donné » par prévision', () => {
  const created = withHomeworkSchedule([], homework, '', { dueDateISO: '2026-10-12' });
  assert.deepEqual(created, [{ id: homework.id, schoolYear: '2026-2027', type: 'maison', num: 2, dateISO: '', semestre: 1, dueDateISO: '2026-10-12' }]);
  assert.deepEqual(withHomeworkSchedule([], homework, '', { dueDateISO: '' }), [], 'effacer une date inexistante ne crée rien');
  const given = withHomeworkSchedule([], homework, '2026-10-05', { correctionDateISO: '2026-10-19' });
  assert.equal(given[0].dateISO, '2026-10-05', 'la date d’attribution choisie par le professeur est conservée');
});

test('l’ancien identifiant (sans millésime) désigne le même devoir', () => {
  const legacy = [item({ id: 's1-maison2' })];
  const next = withHomeworkSchedule(legacy, { ...homework, legacyId: 's1-maison2' }, '', { dueDateISO: '2026-10-12' });
  assert.equal(next.length, 1);
  assert.equal(next[0].id, 's1-maison2');
  assert.equal(next[0].dueDateISO, '2026-10-12');
});

// ── 2. Le corrigé a sa clé, et suit son devoir ───────────────────────────────
test('le corrigé vit sous <devoir>:correction et rejoint son devoir', () => {
  assert.equal(homeworkCorrectionDocumentId(homework.id), `${homework.id}:correction`);
  assert.equal(homeworkDocumentOwnerId(`${homework.id}:correction`), homework.id);
  assert.equal(homeworkDocumentOwnerId(homework.id), homework.id);
  const doc = (source: string) => ({ source, updatedAt: '2026-10-19T08:00:00.000Z' });
  const merged = mergePedagogicalDocuments(
    { assessmentDocuments: { c: { [homework.id]: doc('sujet'), [`${homework.id}:correction`]: doc('corrigé') } }, removedAssessments: { c: [homework.id] } },
    { assessmentDocuments: { c: { [`${homework.id}:correction`]: doc('corrigé') } } },
  );
  assert.deepEqual(merged.assessmentDocuments?.c, {}, 'le devoir supprimé emporte aussi son corrigé');
  const kept = mergePedagogicalDocuments(
    { assessmentDocuments: { c: { [`${homework.id}:correction`]: doc('corrigé') } } },
    { assessmentDocuments: { c: { [`${homework.id}:correction`]: doc('ancien') } } },
  );
  assert.equal(kept.assessmentDocuments?.c[`${homework.id}:correction`].source, 'corrigé', 'le plus récent l’emporte, comme tout document');
});

test('le corrigé est facultatif et suit le contenu des devoirs maison', () => {
  assert.equal(documentRequirementForHomeworkCorrection(undefined), 'optional');
  const policy = { kinds: { maison: { document: 'off' as const } }, version: 1, updatedAt: null };
  assert.equal(documentRequirementForHomeworkCorrection(policy), 'none', 'sans contenu pour les devoirs maison : pas de bouton');
  assert.equal(documentIndicator('optional', undefined), 'idle');
  assert.equal(documentIndicator('optional', { source: 'corrigé' }), 'attached');
});

// ── 3. Un devoir maison n'a pas d'absents ────────────────────────────────────
test('la direction ne peut pas donner d’absents à un devoir maison', () => {
  assert.equal(kindSupport('maison').absences, false);
  assert.equal(resolveKindPolicy({ kinds: { maison: { absences: true } }, version: 1, updatedAt: null }, 'maison').absences, false);
  assert.equal(clampKindPolicy('maison', { ...resolveKindPolicy(undefined, 'maison'), absences: true }).absences, false);
  assert.equal(resolveKindPolicy(undefined, 'maison').students, true, 'la liste « non rendus » reste disponible');
});

// ── 4. Corbeille de la correction ────────────────────────────────────────────
const notebook = (): LessonsData => [{
  type: 'chapter', title: 'Chapitre 1',
  items: [
    { type: 'cours', title: 'Séance 1', date: '2026-10-05', remark: 'Devoir à la maison 2 assigné aux élèves\nExercices 1 à 4' },
    { type: 'cours', title: 'Séance 2', date: '2026-10-19', remark: 'Correction du devoir à la maison 2\nSuite du cours' },
    { type: 'cours', title: 'Séance 3', date: '2026-10-26', remark: 'Correction du devoir à la maison 3' },
  ],
}, { type: 'correction_devoir_maison', title: 'Correction du devoir maison 2', date: '2026-10-19' }] as unknown as LessonsData;

test('supprimer la correction retire sa ligne et son bloc du cahier, pas le devoir ni les autres corrections', () => {
  const { lessons, updated } = removeHomeworkCorrectionFromNotebook(notebook(), 2);
  assert.ok(updated);
  const json = JSON.stringify(lessons);
  assert.doesNotMatch(json, /Correction du devoir maison 2/, 'le bloc est retiré');
  assert.doesNotMatch(json, /Correction du devoir à la maison 2/, 'la ligne de remarque est retirée');
  assert.match(json, /Suite du cours/, 'le reste de la remarque est conservé');
  assert.match(json, /Devoir à la maison 2 assigné aux élèves/, 'le devoir donné est conservé');
  assert.match(json, /Correction du devoir à la maison 3/, 'la correction d’un autre devoir est conservée');
  const again = removeHomeworkCorrectionFromNotebook(lessons, 2);
  assert.equal(again.updated, false);
  assert.equal(again.lessons, lessons, 'idempotent : même référence');
});

test('la corbeille de la correction efface sa date, son corrigé et les non-rendus — le devoir et son sujet restent', () => {
  const patches: Array<Partial<AppConfig>> = [];
  const config = {
    manualAssessments: { c: [item({ dueDateISO: '2026-10-12', correctionDateISO: '2026-10-19' })] },
    assessmentDocuments: { c: {
      [homework.id]: { source: 'sujet', updatedAt: 'x' },
      [`${homework.id}:correction`]: { source: 'corrigé', updatedAt: 'x' },
    } },
    assessmentParticipants: { c: { [homework.id]: { names: ['A', 'B'], homeworkOutcomes: { A: 'given', B: 'missing' }, updatedAt: 'x' } } },
  } as unknown as AppConfig;
  useEvaluationActions('c', config, patch => patches.push(patch)).clearHomeworkCorrection(homework.id);
  const patch = patches[0];
  const kept = patch.manualAssessments?.c[0] as ManualAssessment;
  assert.equal('correctionDateISO' in kept, false);
  assert.equal(kept.dueDateISO, '2026-10-12', 'la date limite reste');
  assert.deepEqual(Object.keys(patch.assessmentDocuments?.c ?? {}), [homework.id], 'seul le corrigé est supprimé');
  assert.equal(patch.assessmentParticipants?.c[homework.id], undefined);
});

test('supprimer le devoir emporte aussi son corrigé', () => {
  const patches: Array<Partial<AppConfig>> = [];
  const config = {
    assessmentDocuments: { c: { [homework.id]: { source: 's', updatedAt: 'x' }, [`${homework.id}:correction`]: { source: 'c', updatedAt: 'x' } } },
  } as unknown as AppConfig;
  useEvaluationActions('c', config, patch => patches.push(patch)).deleteAssessment(homework.id);
  assert.deepEqual(patches[0].assessmentDocuments?.c, {});
});

test('poser la date limite passe par les actions de la feuille (un seul écrivain)', () => {
  const patches: Array<Partial<AppConfig>> = [];
  const config = { manualAssessments: { c: [item()] }, removedAssessments: { c: [homework.id] } } as unknown as AppConfig;
  useEvaluationActions('c', config, patch => patches.push(patch)).setHomeworkSchedule(homework, '2026-10-05', { dueDateISO: '2026-10-12' });
  assert.equal(patches[0].manualAssessments?.c[0].dueDateISO, '2026-10-12');
  assert.deepEqual(patches[0].removedAssessments?.c, [], 'un devoir supprimé qui retrouve une date redevient visible');
  const none: Array<Partial<AppConfig>> = [];
  useEvaluationActions('c', { manualAssessments: { c: [item({ dueDateISO: '2026-10-12' })] } } as unknown as AppConfig, patch => none.push(patch))
    .setHomeworkSchedule(homework, '', { dueDateISO: '2026-10-12' });
  assert.equal(none.length, 0, 'aucune écriture inutile');
});

// ── 5. Cloud : le serveur accepte et valide les nouveaux champs ──────────────
const valid = new Set(['c']);
const settingsWith = (manual: unknown, documents?: unknown) => ({
  manualAssessments: { c: manual }, ...(documents ? { assessmentDocuments: { c: documents } } : {}),
});
test('le serveur valide la date limite et la clé du corrigé', () => {
  const ok = [item({ dueDateISO: '2026-10-12', correctionDateISO: '2026-10-19' })];
  assert.doesNotThrow(() => assertValidSyncSettings(settingsWith(ok, { [`${homework.id}:correction`]: { source: 'x', updatedAt: '2026-10-19T08:00:00.000Z' } }), valid));
  assert.throws(() => assertValidSyncSettings(settingsWith([item({ dueDateISO: 'demain' })]), valid), /Date limite/);
  assert.throws(() => assertValidSyncSettings(settingsWith([item({ dueDateISO: 12 as unknown as string })]), valid), /Date limite/);
  const long = `${'x'.repeat(180)}:correction`;
  assert.doesNotThrow(() => assertValidSyncSettings(settingsWith([], { [long]: { source: 'x', updatedAt: '2026-10-19T08:00:00.000Z' } }), valid), 'un identifiant de 180 caractères + « :correction »');
  assert.throws(() => assertValidSyncSettings(settingsWith([], { [`${'x'.repeat(190)}:correction`]: { source: 'x', updatedAt: '2026-10-19T08:00:00.000Z' } }), valid), /Identifiant de document/);
});

// ── 6. Branchements ──────────────────────────────────────────────────────────
test('les fenêtres relient chaque bouton à SON enregistrement', () => {
  const modals = read('src/features/evaluations/components/DevoirsModals.tsx');
  assert.match(modals, /documentFor\.part === 'correction'\) return forClass\?\.\[homeworkCorrectionDocumentId\(/, 'le corrigé se lit sous sa clé');
  assert.match(modals, /actions\.saveAssessmentDocument\(homeworkCorrectionDocumentId\(documentFor\.link\.planned\.id\), source\)/, 'et s’écrit sous sa clé');
  assert.match(modals, /if \(editingDateAssessment\.field\) setHomeworkDate\(/, 'date limite et correction passent par setHomeworkDate');
  assert.match(modals, /deleteHomeworkCorrection\(deletingCorrection\)/, 'la corbeille de la correction est confirmée');
  assert.match(modals, /title=\{t\('evaluations\.homework\.notReturnedTitle'\)\}/, 'la fenêtre des élèves se dit « non rendus »');
  const view = read('src/features/evaluations/DevoirsView.tsx');
  assert.match(view, /removeHomeworkCorrectionFromNotebook\(activeLessons, link\.planned\.num\)/, 'la correction ne renaît pas du cahier');
  assert.match(view, /actions\.setHomeworkSchedule\(/);
  const admin = read('src/admin/components/TeacherDetail.tsx');
  assert.match(admin, /homeworkCorrectionDocumentId\(row\.id\)/, 'la direction relit aussi le corrigé');
});

test('le corrigé s’ouvre aussi depuis la séance de correction du cahier', () => {
  const previews = read('src/domain/evaluations/activityDocumentPreviews.ts');
  assert.match(previews, /correctionDate = \(manual\.get\(planned\.id\)/);
  assert.match(previews, /assessmentId: homeworkCorrectionDocumentId\(planned\.id\)/);
});

// ── 7. Aller-retour complet : appareil → serveur → Firestore → autre appareil ──
test('la date limite, la correction, le corrigé et les non-rendus font l’aller-retour du cloud sans perte', () => {
  const config = {
    manualAssessments: { c: [item({ dueDateISO: '2026-10-12', correctionDateISO: '2026-10-19' })] },
    assessmentDocuments: { c: {
      [homework.id]: { source: 'Sujet $x^2$', updatedAt: '2026-10-05T08:00:00.000Z' },
      [homeworkCorrectionDocumentId(homework.id)]: { source: 'Corrigé — الحل $y$', updatedAt: '2026-10-19T08:00:00.000Z' },
    } },
    assessmentParticipants: { c: { [homework.id]: { names: ['Amina', 'Omar'], homeworkOutcomes: { Amina: 'given', Omar: 'missing' }, updatedAt: '2026-10-19T09:00:00.000Z' } } },
  } as unknown as AppConfig;
  // 1. L'appareil n'envoie que les réglages synchronisables…
  const pushed = extractSyncableSettings(config);
  // 2. …le serveur les valide sans rien retirer…
  const accepted = assertValidSyncSettings(pushed, new Set(['c'])) as typeof pushed;
  assert.deepEqual(accepted.manualAssessments, config.manualAssessments);
  // 3. …Firestore les conserve octet pour octet (UTF-8, y compris l'arabe)…
  const stored = encodeRecord(accepted);
  const restored = JSON.parse(stored.json ?? stored.chunks.join('')) as typeof pushed;
  assert.deepEqual(restored, accepted);
  // 4. …et un autre appareil retrouve les mêmes deux entrées.
  const other = mergeSyncableSettings({}, restored) as AppConfig;
  assert.equal(other.manualAssessments?.c[0].dueDateISO, '2026-10-12');
  assert.equal(other.manualAssessments?.c[0].correctionDateISO, '2026-10-19');
  assert.equal(other.assessmentDocuments?.c[homeworkCorrectionDocumentId(homework.id)].source, 'Corrigé — الحل $y$');
  assert.deepEqual(other.assessmentParticipants?.c[homework.id].homeworkOutcomes, { Amina: 'given', Omar: 'missing' });
});

test('modifier le devoir dans l’éditeur ne perd ni sa date limite ni sa correction', () => {
  const patches: Array<Partial<AppConfig>> = [];
  const config = { manualAssessments: { c: [item({ dueDateISO: '2026-10-12', correctionDateISO: '2026-10-19' })] } } as unknown as AppConfig;
  const edited: ManualAssessment = { id: homework.id, schoolYear: '2026-2027', type: 'maison', num: 2, semestre: 1, dateISO: '2026-10-06' };
  useEvaluationActions('c', config, patch => patches.push(patch)).saveAssessment(edited, homework.id);
  const saved = patches[0].manualAssessments?.c[0] as ManualAssessment;
  assert.deepEqual([saved.dateISO, saved.dueDateISO, saved.correctionDateISO], ['2026-10-06', '2026-10-12', '2026-10-19']);
  const cleared = { ...edited, dueDateISO: '' };
  useEvaluationActions('c', config, patch => patches.push(patch)).saveAssessment(cleared, homework.id);
  assert.equal((patches[1].manualAssessments?.c[0] as ManualAssessment).dueDateISO, '', 'une valeur explicite de l’éditeur l’emporte');
});

// ── 8. Cahier ⇄ feuille : les phrases que l'application écrit elle-même sont reconnues ──
test('la remarque « Devoir à la maison N assigné » et sa correction sont reconnues en français, anglais et arabe', async () => {
  const { hasHomeworkMention, isHomeworkCorrectionLine, extractHomeworkNumber, extractCorrectionNumber, hasHomeworkAssignmentMention } = await import('../src/domain/evaluations/homeworkNumbering');
  const { translateLocaleMessage } = await import('../src/i18n/messages');
  for (const locale of ['fr', 'en', 'ar'] as const) {
    const given = translateLocaleMessage(locale, 'remark.devoirMaisonGiven', { num: 2 });
    const correction = translateLocaleMessage(locale, 'remark.devoirMaisonCorrection', { num: 2 });
    assert.ok(hasHomeworkMention(given), `${locale} : devoir donné reconnu`);
    assert.equal(extractHomeworkNumber(given), 2, `${locale} : numéro du devoir donné`);
    assert.ok(hasHomeworkAssignmentMention(given) && !isHomeworkCorrectionLine(given), `${locale} : le devoir donné n’est pas une correction`);
    assert.ok(isHomeworkCorrectionLine(correction), `${locale} : correction reconnue`);
    assert.equal(extractCorrectionNumber(correction), 2, `${locale} : numéro de la correction`);
    assert.ok(!hasHomeworkAssignmentMention(correction), `${locale} : une correction n’est pas une seconde attribution`);
  }
  // Les écritures libres d'avant restent reconnues.
  for (const line of ['Devoir maison 3 donné', 'devoirs maison n° 3', 'DM 3']) assert.equal(extractHomeworkNumber(line), 3, line);
  assert.ok(isHomeworkCorrectionLine('Correction devoir maison 3'));
  assert.ok(!isHomeworkCorrectionLine('nous corrigeons le devoir à la maison 3'), 'une phrase au fil du texte reste une note libre');
});