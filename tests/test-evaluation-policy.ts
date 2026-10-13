import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { AppConfig, EvaluationKindKey, EvaluationPolicy, LessonsData, PedagogicalEvent } from '../src/types';
import {
  EMPTY_EVALUATION_POLICY,
  EVALUATION_KIND_ORDER,
  clampKindPolicy,
  continuousKinds,
  countPolicyChanges,
  defaultKindPolicy,
  diffKindPolicies,
  documentRequirementFor,
  kindSupport,
  kindTransmits,
  normalizeEvaluationPolicy,
  resolveAllKindPolicies,
  resolveEvaluationPolicy,
  resolveKindPolicy,
  validateEvaluationKindOverrides,
} from '../src/domain/evaluations/evaluationPolicy';
import { documentRequirementForAssessment, documentRequirementForEvent } from '../src/domain/evaluations/documentRequirement';
import { syncNotebookToEvaluations } from '../src/domain/evaluations/notebookReconciliation';
import { KIND_GROUPS, groupKinds } from '../src/features/evaluations/kindCatalog';
import { useEvaluationActions } from '../src/features/evaluations/hooks/useEvaluationActions';
import { assertValidSyncSettings } from '../api/_lib/validate';

/*
 * POLITIQUE DU CONTRÔLE CONTINU — ce que la direction décide, nature par nature.
 *
 * Le verrou principal est la PARITÉ : sans politique publiée, rien ne change.
 * Ensuite : cohérence des réglages, résolution général + compte, transmission du
 * cahier, validation serveur et branchement de bout en bout.
 */

const policyWith = (kinds: EvaluationPolicy['kinds']): EvaluationPolicy => ({ kinds, version: 1, updatedAt: '2026-10-10T08:00:00.000Z' });
const read = (path: string) => readFileSync(path, 'utf8');

// ── 1. Parité : sans politique, le comportement historique ────────────────────

test('sans politique, chaque nature se comporte comme avant', () => {
  // Document : les deux tables historiques, recopiées ici à dessein.
  const documents: Record<string, 'required' | 'optional' | 'none'> = {
    controle: 'required', controle_court: 'required', controle_global: 'required', maison: 'required',
    oral: 'optional', colle: 'optional',
    evaluation_diagnostic: 'required', examen_blanc: 'required', correction_controle_continu: 'required',
    olympiade: 'optional', concours: 'optional', soutien: 'optional', remediation: 'optional', rattrapage: 'optional', autre: 'optional',
    controle_cahiers: 'none',
  };
  for (const kind of EVALUATION_KIND_ORDER) {
    assert.equal(documentRequirementFor(undefined, kind), documents[kind], `document de ${kind}`);
    assert.equal(documentRequirementFor(EMPTY_EVALUATION_POLICY, kind), documents[kind], `document de ${kind} (politique vide)`);
  }
  assert.equal(documentRequirementForAssessment('controle'), 'required');
  assert.equal(documentRequirementForEvent('controle_cahiers'), 'none');

  // Absents : seulement les trois épreuves écrites, comme l'ancien `isSupervised`.
  const absents = EVALUATION_KIND_ORDER.filter(kind => resolveKindPolicy(undefined, kind).absences);
  assert.deepEqual(absents, ['controle', 'controle_court', 'controle_global']);

  // Élèves : l'oral, la colle, le devoir maison et toutes les activités, jamais les épreuves écrites.
  assert.equal(resolveKindPolicy(undefined, 'controle').students, false);
  assert.equal(resolveKindPolicy(undefined, 'oral').students, true);
  assert.equal(resolveKindPolicy(undefined, 'maison').students, true);
  assert.equal(resolveKindPolicy(undefined, 'olympiade').students, true);

  // Retours : oral, colle, maison (remise) et contrôle des cahiers ; notes : oral et colle seulement.
  const feedback = EVALUATION_KIND_ORDER.filter(kind => resolveKindPolicy(undefined, kind).feedback);
  assert.deepEqual(feedback, ['oral', 'maison', 'colle', 'controle_cahiers']);
  const graded = EVALUATION_KIND_ORDER.filter(kind => resolveKindPolicy(undefined, kind).grades);
  assert.deepEqual(graded, ['oral', 'colle']);

  // Tout est transmis.
  assert.ok(EVALUATION_KIND_ORDER.every(kind => kindTransmits(undefined, kind)));
});

test('sans politique, les familles de la feuille sont exactement celles du catalogue', () => {
  const grouped = groupKinds(undefined);
  assert.equal(grouped.length, KIND_GROUPS.length);
  grouped.forEach((group, index) => {
    assert.deepEqual(group.kinds.map(kind => kind.type), KIND_GROUPS[index].kinds.map(kind => kind.type), `famille ${group.id}`);
  });
  assert.deepEqual(continuousKinds(undefined), ['evaluation_diagnostic', 'controle', 'controle_court', 'controle_global', 'oral', 'maison', 'colle', 'controle_cahiers', 'correction_controle_continu']);
});

test('une nature traitée comme contrôle continu change de famille, jamais de nature', () => {
  const policy = policyWith({ examen_blanc: { continuous: true }, colle: { continuous: false } });
  const grouped = groupKinds(policy);
  assert.ok(grouped[0].kinds.some(kind => kind.type === 'examen_blanc'), 'l’examen blanc rejoint le contrôle continu');
  assert.ok(grouped[1].kinds.some(kind => kind.type === 'colle'), 'la colle passe aux activités');
  const colle = grouped[1].kinds.find(kind => kind.type === 'colle');
  assert.equal(colle?.family, 'devoir', 'la colle reste un devoir : mêmes lignes, mêmes commandes');
  const total = grouped.reduce((sum, group) => sum + group.kinds.length, 0);
  assert.equal(total, EVALUATION_KIND_ORDER.length, 'aucune nature perdue ni dupliquée');
});

// ── 2. Cohérence ──────────────────────────────────────────────────────────────

test('la note suppose le retour, qui suppose la liste d’élèves', () => {
  const noStudents = resolveKindPolicy(policyWith({ oral: { students: false } }), 'oral');
  assert.equal(noStudents.feedback, false);
  assert.equal(noStudents.grades, false);
  const noFeedback = resolveKindPolicy(policyWith({ oral: { feedback: false } }), 'oral');
  assert.equal(noFeedback.students, true);
  assert.equal(noFeedback.grades, false);
  const graded = resolveKindPolicy(policyWith({ controle: { students: true, feedback: true, grades: true } }), 'controle');
  assert.deepEqual([graded.students, graded.feedback, graded.grades], [true, true, true], 'un devoir surveillé peut être noté élève par élève');
});

test('une capacité que la nature ne porte pas reste éteinte, quoi qu’on publie', () => {
  assert.equal(kindSupport('maison').grades, false);
  assert.equal(resolveKindPolicy(policyWith({ maison: { grades: true } }), 'maison').grades, false);
  assert.equal(kindSupport('olympiade').absences, false);
  assert.equal(resolveKindPolicy(policyWith({ olympiade: { absences: true } }), 'olympiade').absences, false);
  assert.equal(kindSupport('maison').feedback, 'submission');
  assert.equal(kindSupport('controle_cahiers').feedback, 'notebook');
  assert.equal(kindSupport('oral').feedback, 'levels');
  // Le contenu s'ajuste librement, y compris pour le contrôle des cahiers.
  assert.equal(documentRequirementFor(policyWith({ controle_cahiers: { document: 'optional' } }), 'controle_cahiers'), 'optional');
  assert.equal(documentRequirementFor(policyWith({ controle: { document: 'off' } }), 'controle'), 'none');
  assert.equal(clampKindPolicy('oral', { ...defaultKindPolicy('oral'), absences: true }).absences, true, 'les absents d’un oral sont possibles');
});

test('une nature inconnue (donnée d’une version plus récente) se comporte comme « autre »', () => {
  const unknown = resolveKindPolicy(undefined, 'nouveau_type' as EvaluationKindKey);
  assert.deepEqual(unknown, resolveKindPolicy(undefined, 'autre'));
});

// ── 3. Lecture indulgente, validation stricte ─────────────────────────────────

test('la lecture écarte le bruit, la validation le refuse', () => {
  const noisy = normalizeEvaluationPolicy({
    version: 3, updatedAt: '2026-10-10T08:00:00.000Z',
    kinds: { oral: { grades: false, document: 'required', hack: true }, inconnu: { students: true }, controle: 'oui' },
  });
  assert.deepEqual(noisy.kinds, { oral: { grades: false, document: 'required' } });
  assert.equal(noisy.version, 3);
  assert.deepEqual(normalizeEvaluationPolicy('n’importe quoi'), EMPTY_EVALUATION_POLICY);
  assert.deepEqual(normalizeEvaluationPolicy({ version: -4, kinds: {} }).version, 0);

  assert.equal(validateEvaluationKindOverrides({ oral: { grades: false } }).ok, true);
  for (const bad of [
    { inconnu: { students: true } },
    { oral: { grades: 'oui' } },
    { oral: { document: 'beaucoup' } },
    { oral: { champ: true } },
    { oral: 4 },
    [],
    null,
  ]) {
    assert.equal(validateEvaluationKindOverrides(bad).ok, false, JSON.stringify(bad));
  }
});

// ── 4. Politique générale + écarts du compte ──────────────────────────────────

test('le compte hérite de la politique générale et ne la modifie que champ par champ', () => {
  const general = policyWith({ oral: { grades: false }, olympiade: { continuous: true } });
  const own = { kinds: { oral: { document: 'required' as const } }, version: 2, updatedAt: '2026-10-11T08:00:00.000Z' };
  const resolved = resolveEvaluationPolicy(general, own);
  assert.deepEqual(resolved.kinds.oral, { grades: false, document: 'required' }, 'les deux niveaux se superposent');
  assert.deepEqual(resolved.kinds.olympiade, { continuous: true });
  assert.equal(resolved.version, 3);
  assert.equal(resolved.updatedAt, '2026-10-11T08:00:00.000Z');
  assert.deepEqual(resolveEvaluationPolicy(general, EMPTY_EVALUATION_POLICY).kinds, general.kinds, 'sans écart propre : la politique générale');
  assert.deepEqual(resolveEvaluationPolicy(undefined, undefined), EMPTY_EVALUATION_POLICY);
});

test('publier des écarts puis relire redonne exactement la même politique', () => {
  const base = policyWith({ oral: { grades: false } });
  const full = resolveAllKindPolicies(base);
  full.controle = { ...full.controle, students: true, feedback: true, grades: true };
  full.olympiade = { ...full.olympiade, document: 'required', continuous: true };
  const overrides = diffKindPolicies(full, base);
  assert.deepEqual(Object.keys(overrides).sort(), ['controle', 'olympiade'], 'seuls les écarts sont stockés');
  assert.deepEqual(resolveAllKindPolicies(resolveEvaluationPolicy(base, { ...EMPTY_EVALUATION_POLICY, kinds: overrides })), full);
  assert.equal(countPolicyChanges(policyWith(overrides)), 5, 'trois réglages sur le devoir surveillé, deux sur l’olympiade');
  assert.deepEqual(diffKindPolicies(resolveAllKindPolicies(EMPTY_EVALUATION_POLICY), EMPTY_EVALUATION_POLICY), {}, 'aucun écart aux défauts : document vide');
});

// ── 5. Transmission du cahier à la feuille ────────────────────────────────────

const notebook: LessonsData = [
  { type: 'chapter', title: 'Chapitre 1', items: [{ type: 'cours', title: 'Séance', date: '2026-10-15', remark: 'Soutien aux élèves', _tempId: 'row-1' }] },
  { type: 'olympiade', title: 'Olympiade 1', date: '2026-10-12', _tempId: 'ol-1' },
  { type: 'controle_continu', title: 'Devoir surveillé 1', date: '2026-10-14', _tempId: 'ds-1' },
  { type: 'correction_devoir_maison', title: 'Correction du devoir maison 2', date: '2026-10-20' },
];
const config = { pedagogicalEvents: {}, manualAssessments: {} } as unknown as AppConfig;

test('par défaut, le cahier transmet tout à la feuille', () => {
  const { patch } = syncNotebookToEvaluations('c', config, notebook, { previousLessons: [] });
  const types = (patch.pedagogicalEvents?.c ?? []).map((event: PedagogicalEvent) => event.type).sort();
  assert.deepEqual(types, ['olympiade', 'soutien']);
  assert.ok((patch.manualAssessments?.c ?? []).some(item => item.type === 'controle'), 'le devoir surveillé est transmis');
  assert.ok((patch.manualAssessments?.c ?? []).some(item => item.type === 'maison' && item.correctionDateISO === '2026-10-20'), 'la correction du devoir maison aussi');
});

test('une nature non transmise reste dans le cahier : la feuille ne la reçoit pas', () => {
  const policy = policyWith({ olympiade: { transmit: false }, controle: { transmit: false }, soutien: { transmit: false }, maison: { transmit: false } });
  const { patch } = syncNotebookToEvaluations('c', config, notebook, { previousLessons: [], policy });
  assert.equal(patch.pedagogicalEvents, undefined, 'ni olympiade, ni soutien (même annoncé dans une remarque)');
  assert.equal(patch.manualAssessments, undefined, 'ni devoir surveillé, ni correction du devoir maison');
  assert.equal(patch.assessmentDates, undefined);
});

test('désactiver la transmission ne fait rien disparaître de la feuille', () => {
  const first = syncNotebookToEvaluations('c', config, notebook, { previousLessons: [] });
  const saved = { ...config, ...first.patch } as AppConfig;
  const policy = policyWith({ olympiade: { transmit: false }, controle: { transmit: false }, soutien: { transmit: false } });
  const again = syncNotebookToEvaluations('c', saved, notebook, { previousLessons: notebook, policy });
  assert.equal(again.patch.pedagogicalEvents, undefined, 'les activités déjà transmises sont conservées (élèves, documents)');
  assert.equal(again.patch.removedAssessments, undefined, 'aucun devoir n’est marqué supprimé');
  // Et supprimer la remarque ne détruit pas une activité qu'on ne synchronise plus.
  const withoutRemark: LessonsData = [{ ...notebook[0], items: [{ type: 'cours', title: 'Séance', date: '2026-10-15', _tempId: 'row-1' }] }, ...notebook.slice(1)];
  const cleaned = syncNotebookToEvaluations('c', saved, withoutRemark, { previousLessons: notebook, policy });
  assert.equal(cleaned.patch.pedagogicalEvents, undefined);
});

// ── 6. Retours et notes sur une activité ──────────────────────────────────────

test('niveaux et notes d’une activité sont enregistrés, puis conservés quand le retour est coupé', () => {
  const event = (extra: Partial<PedagogicalEvent> = {}): PedagogicalEvent => ({ id: 'e1', type: 'olympiade', title: 'Olympiade', date: '2026-10-12', status: 'planned', createdAt: 'x', ...extra });
  let saved: PedagogicalEvent[] = [];
  const cfg = (events: PedagogicalEvent[]) => ({ pedagogicalEvents: { c: events } }) as unknown as AppConfig;
  const run = (events: PedagogicalEvent[]) => useEvaluationActions('c', cfg(events), patch => { saved = patch.pedagogicalEvents?.c ?? saved; });

  run([event()]).saveEventStudents('e1', ['Amine', 'Salma'], undefined, { oralOutcomes: { Amine: 'mastered' }, oralGrades: { Amine: '16' } });
  assert.deepEqual(saved[0].students?.oralOutcomes, { Amine: 'mastered' });
  assert.deepEqual(saved[0].students?.oralGrades, { Amine: '16' });

  // Retour désactivé : une simple liste ne détruit pas ce qui a été saisi, et retire ce qui concerne un élève ôté.
  run(saved).saveEventStudents('e1', ['Amine']);
  assert.deepEqual(saved[0].students?.oralOutcomes, { Amine: 'mastered' });
  run(saved).saveEventStudents('e1', ['Salma']);
  assert.equal(saved[0].students?.oralOutcomes, undefined, 'plus aucun niveau pour un élève retiré');
  run(saved).saveEventStudents('e1', []);
  assert.equal(saved[0].students, undefined, 'liste vidée : rien ne reste');
});

// ── 7. Validation serveur ─────────────────────────────────────────────────────

test('le serveur ne laisse jamais un enseignant écrire la politique', () => {
  const result = assertValidSyncSettings({ evaluationPolicy: { kinds: { controle: { transmit: false } }, version: 99 } }, new Set(['c']));
  assert.equal(result?.evaluationPolicy, undefined);
});

test('le serveur accepte une colle manuelle et le retour par élève d’une activité', () => {
  const valid = new Set(['c']);
  assert.doesNotThrow(() => assertValidSyncSettings({
    manualAssessments: { c: [{ id: '2026-2027:s1-colle1', schoolYear: '2026-2027', type: 'colle', num: 1, dateISO: '2026-10-12', semestre: 1 }] },
  }, valid), 'la colle était refusée : la synchronisation restait bloquée');
  const updatedAt = '2026-10-12T08:00:00.000Z';
  const event = (students: unknown) => ({ pedagogicalEvents: { c: [{ id: 'e', type: 'olympiade', title: 'Olympiade', date: '', status: 'planned', createdAt: updatedAt, students }] } });
  assert.doesNotThrow(() => assertValidSyncSettings(event({ names: ['A', 'B'], updatedAt, oralOutcomes: { A: 'mastered' }, oralGrades: { A: '15.5' } }), valid));
  for (const bad of [
    { names: ['A'], updatedAt, oralOutcomes: { A: 'excellent' } },
    { names: ['A'], updatedAt, oralOutcomes: { Inconnu: 'mastered' } },
    { names: ['A'], updatedAt, oralGrades: { A: 'x'.repeat(40) } },
    { names: ['A'], updatedAt, oralGrades: { Inconnu: '12' } },
    { names: ['A'], updatedAt, notebookConditions: { A: 'good' } },
  ]) {
    assert.throws(() => assertValidSyncSettings(event(bad), valid), JSON.stringify(bad));
  }
});

// ── 8. Branchement de bout en bout ────────────────────────────────────────────

test('la politique circule : API admin, pull, appareil — et ne repart jamais du téléphone', () => {
  const admin = read('api/admin.ts');
  assert.match(admin, /saveEvaluationPolicy: handleSaveEvaluationPolicy,/, 'publication (table des écritures de la console)');
  assert.match(admin, /action === 'evaluationPolicy'/, 'lecture');
  assert.match(admin, /validateEvaluationKindOverrides\(body\.evaluationPolicyKinds/, 'validation stricte des écarts');
  assert.match(admin, /saveVersionedDocument\(redis, key, body\.expectedEvaluationPolicyVersion, next\)/, 'écriture versionnée, 409 en cas de conflit');
  assert.match(admin, /pipeline\.del\(KEYS\.adminEvaluationPolicyForUser\(phone\)\)/, 'la suppression d’un compte efface ses écarts');
  assert.match(admin, /evaluationPolicy,\r?\n\s+user: user/, 'la fiche enseignant relit les documents avec la politique du compte');

  const sync = read('api/sync.ts');
  assert.match(sync, /res\.status\(200\)\.json\(\{ \.\.\.blob, timetableClock, evaluationPolicy \}\)/, 'livrée au pull, résolue côté serveur');

  const context = read('src/contexts/SyncContext.tsx');
  assert.equal((context.match(/normalizeEvaluationPolicy\(server\.evaluationPolicy\)/g) ?? []).length, 2, 'appliquée aussi quand l’association du cahier est refusée');

  const syncSettings = read('src/infrastructure/sync/syncSettings.ts');
  assert.doesNotMatch(syncSettings, /evaluationPolicy/, 'jamais dans les réglages renvoyés par l’appareil');
  assert.match(read('src/hooks/useConfigManager.ts'), /evaluationPolicy: normalizeEvaluationPolicy\(loadedConfig\.evaluationPolicy\)/);
  assert.match(read('api/_lib/redis.ts'), /adminEvaluationPolicy: 'admin:evaluation-policy'/);
});

test('l’administration propose la politique : général et par compte', () => {
  const app = read('src/admin/AdminApp.tsx');
  assert.match(read('src/admin/route.ts'), /name: 'evaluationPolicy'; phone\?: string/);
  assert.match(app, /<EvaluationPolicyManager phone=\{view\.phone\}/);
  assert.match(app, /onManageEvaluationPolicy=\{\(\) => go\(\{ name: 'evaluationPolicy', phone: view\.phone \}\)\}/);
  const detail = read('src/admin/components/TeacherDetail.tsx');
  assert.match(detail, /Personnaliser le contrôle continu/);
  const manager = read('src/admin/components/EvaluationPolicyManager.tsx');
  for (const label of ['Transmis à la feuille', 'Contrôle continu', 'Liste d’élèves', 'Retours par élève', 'Notes /20', 'Absents', 'Correction du devoir', 'Contenu (sujet, corrigé)']) {
    assert.ok(manager.includes(label), label);
  }
  assert.match(manager, /role="switch"/, 'interrupteurs accessibles');
  assert.match(manager, /aria-label="Aperçu de la ligne enseignant"/, 'aperçu de la ligne enseignant');
  assert.match(manager, /saveAdminEvaluationPolicy\(overrides, version, phone\)/, 'publication versionnée');
});

test('la feuille lit la politique à chaque porte', () => {
  const view = read('src/features/evaluations/DevoirsView.tsx');
  assert.match(view, /resolveKindPolicy\(policy, a\.type\)/);
  assert.match(view, /kindPolicy\.absences && a\.type !== 'maison' && \(/, 'absents (jamais sur un devoir maison)');
  assert.match(view, /kindPolicy\.students && a\.type !== 'maison'/, 'élèves');
  assert.match(view, /groupKinds\(policy\)/, 'familles');
  const events = read('src/features/evaluations/components/PedagogicalEventsSection.tsx');
  assert.match(events, /kindPolicy\.students && \(/);
  const modals = read('src/features/evaluations/components/DevoirsModals.tsx');
  assert.match(modals, /trackOral=\{Boolean\(oralPolicy\?\.feedback\)\}/);
  assert.match(modals, /trackGrades=\{Boolean\(oralPolicy\?\.grades\)\}/);
  assert.match(modals, /trackOral=\{studentsReview && !notebookCheck\}/);
  const editor = read('src/features/editor/Editor.tsx');
  assert.match(editor, /policy: latest\.config\.evaluationPolicy/, 'le cahier transmet selon la politique');
});

// ── 7. Correction du devoir maison : second temps, réglé par la direction ─────
test('sans politique, la correction du devoir maison est datée comme avant — et seul le devoir maison la porte', () => {
  assert.equal(resolveKindPolicy(undefined, 'maison').correction, true);
  for (const kind of EVALUATION_KIND_ORDER.filter(candidate => candidate !== 'maison')) {
    assert.equal(resolveKindPolicy(policyWith({ [kind]: { correction: true } }), kind).correction, false, `${kind} n’a pas de correction à dater`);
    assert.equal(kindSupport(kind).correction, false);
  }
  // Pas de devoir transmis, pas de correction : elle ne survit jamais seule.
  assert.equal(resolveKindPolicy(policyWith({ maison: { transmit: false } }), 'maison').correction, false);
  assert.equal(clampKindPolicy('maison', { ...resolveKindPolicy(undefined, 'maison'), transmit: false }).correction, false);
});

test('couper la correction du devoir maison ne coupe ni le devoir ni les autres natures', () => {
  const policy = policyWith({ maison: { correction: false } });
  const { patch } = syncNotebookToEvaluations('c', config, notebook, { previousLessons: [], policy });
  assert.ok((patch.manualAssessments?.c ?? []).some(item => item.type === 'controle'), 'le devoir surveillé est toujours transmis');
  assert.ok(!(patch.manualAssessments?.c ?? []).some(item => item.type === 'maison'), 'la correction n’est pas datée sur la feuille');
  const normal = syncNotebookToEvaluations('c', config, notebook, { previousLessons: [], policy: policyWith({ maison: { correction: true } }) });
  assert.ok((normal.patch.manualAssessments?.c ?? []).some(item => item.type === 'maison' && item.correctionDateISO === '2026-10-20'));
});

test('la correction saisie dans une remarque suit la même porte', () => {
  const source = read('src/domain/evaluations/sessionRemarkChanges.ts');
  assert.match(source, /patch\.homeworkCorrection > 0 && resolveKindPolicy\(config\.evaluationPolicy, 'maison'\)\.correction/);
});

test('le serveur accepte le réglage « correction » et refuse un type incorrect', () => {
  assert.equal(validateEvaluationKindOverrides({ maison: { correction: false } }).ok, true);
  assert.equal(validateEvaluationKindOverrides({ maison: { correction: 'non' } }).ok, false);
  assert.equal(countPolicyChanges(policyWith({ maison: { correction: false } })), 1);
  assert.deepEqual(diffKindPolicies(resolveAllKindPolicies(policyWith({ maison: { correction: false } })), EMPTY_EVALUATION_POLICY), { maison: { correction: false } });
});

test('l’administration ne propose la correction que là où elle existe', () => {
  const manager = read('src/admin/components/EvaluationPolicyManager.tsx');
  assert.match(manager, /support\.correction && \(\s*<Toggle\s+label="Correction du devoir"/);
  assert.match(manager, /disabled=\{locked \|\| !policy\.transmit\}/, 'suit la transmission du devoir');
  assert.match(manager, /'correction'\] as const/, 'compté parmi les réglages modifiés');
});