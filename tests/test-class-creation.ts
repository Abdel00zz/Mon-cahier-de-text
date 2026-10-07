import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { ClassInfo, Cycle } from '../src/types';
import { CLASS_LEVELS_BY_CYCLE, classLevelGroupsForCycle } from '../src/constants';
import { availableCycles, classCyclePolicy, existingClassCycle, firstFreeGroup, initialClassDraft, reconcileClassCycle, usedGroupsForLevel } from '../src/features/dashboard/modals/classCreationFlow';
import { normalizeTeacherCycles } from '../src/domain/classes/teacherCycles';

const classroom = (name: string, overrides: Partial<ClassInfo> = {}): ClassInfo => ({
  id: name, name, subject: 'Mathématiques', teacherName: 'Test', color: '', createdAt: '2026-08-31', cycle: 'college', ...overrides,
});

test('un cycle unique ouvre directement le choix de classe, même si le filtre courant est différent', () => {
  for (const cycle of ['college', 'lycee', 'prepa'] as const) {
    const draft = initialClassDraft([cycle], ['Mathématiques'], 'lycee');
    assert.equal(draft.step, 'level');
    assert.equal(draft.cycle, cycle);
  }
});

test('plusieurs cycles demandent un choix ; un profil vide ne bloque pas la création', () => {
  assert.equal(initialClassDraft(['college', 'lycee'], [], 'college').step, 'cycle');
  assert.deepEqual(availableCycles([]), ['college', 'lycee', 'prepa']);
  // Le profil ORDONNE, il ne filtre plus : les autres cycles restent proposés
  // (défaut constaté : la prépa était introuvable pour un profil collège+lycée).
  assert.deepEqual(availableCycles(['college', 'college', 'invalid' as Cycle]), ['college', 'lycee', 'prepa']);
});

test('le cycle existant reste modifiable après un changement de profil', () => {
  const cycles = availableCycles(['college'], 'prepa');
  assert.deepEqual(cycles, ['college', 'lycee', 'prepa'], 'le cycle du profil d’abord, les autres ensuite');
  assert.equal(initialClassDraft(cycles, [], 'college', classroom('MPSI 1', { cycle: 'prepa' })).cycle, 'prepa');
});

test('la prépa propose plusieurs filières pour chaque année', () => {
  const groups = classLevelGroupsForCycle('prepa');
  assert.equal(groups.length, 2);
  assert.ok(groups.every(group => group.levels.length > 1));
});

test('la prépa est TOUJOURS proposée, quel que soit le profil (défaut signalé)', () => {
  // Cas constaté : profil « collège + lycée » → la classe prépa était introuvable,
  // dans l'assistant comme dans l'onboarding.
  const policy = classCyclePolicy(['college', 'lycee']);
  assert.ok(policy.options.includes('prepa'), 'l’assistant de création propose la prépa');
  assert.equal(policy.showChoice, true, 'et l’étape « cycle » reste affichée');
  // Le profil ordonne : ses cycles d'abord, les autres ensuite.
  assert.deepEqual(availableCycles(['prepa', 'college']), ['prepa', 'college', 'lycee']);
  assert.deepEqual(availableCycles(['lycee']), ['lycee', 'college', 'prepa']);
  // Les niveaux du cycle prépa restent ceux du référentiel officiel.
  assert.deepEqual(CLASS_LEVELS_BY_CYCLE.prepa.filter(level => level.startsWith('1re année')),
    ['1re année MPSI', '1re année PCSI', '1re année TSI', '1re année ECS', '1re année ECT']);
});

test('l’étape « cycle » ouverte à la demande ne se referme pas toute seule', () => {
  // Profil mono-cycle : l'étape est masquée…
  assert.equal(classCyclePolicy(['college']).showChoice, false);
  assert.deepEqual(reconcileClassCycle(['college'], 'college', 'cycle', false), { cycle: 'college', step: 'level', resetLevel: false });
  // …mais « Autre cycle » l'ouvre, et la réconciliation la RESPECTE.
  assert.deepEqual(reconcileClassCycle(['college'], 'college', 'cycle', false, true), { cycle: 'college', step: 'cycle', resetLevel: false });
});

test('l’assistant et l’onboarding tirent leurs cycles de la MÊME politique', () => {
  const modal = readFileSync('src/features/dashboard/modals/CreateClassModal.tsx', 'utf8');
  const onboarding = readFileSync('src/features/dashboard/onboarding/steps/ClassesStep.tsx', 'utf8');
  // Assistant : fenêtre « Autre cycle » quand le profil n'en liste qu'un.
  assert.match(modal, /const \[showAllCycles, setShowAllCycles\] = useState\(false\)/, 'l’étape reste atteignable');
  assert.match(modal, /const hasCycleChoice = cyclePolicy\.showChoice \|\| showAllCycles;/, 'profil ou demande explicite');
  assert.match(modal, /\{copy\.otherCycle\} · \{cycleOptions\.map\(item => copy\.cycleLabels\[item\]\)\.join\(' \/ '\)\}/, 'les cycles disponibles sont annoncés');
  assert.match(modal, /reconcileClassCycle\(teacherCycles, cycle, currentStep, Boolean\(editingClass\), hasCycleChoice\)/, 'la réconciliation connaît l’état réel de l’étape');
  assert.match(modal, /cycleLabels: \{ college: 'Collège', lycee: 'Lycée qualifiant', prepa: 'Classe préparatoire' \}/, 'libellé du cycle prépa (FR)');
  // Onboarding : mêmes cycles, mêmes groupes de niveaux.
  assert.match(onboarding, /const cyclePolicy = useMemo\(\(\) => classCyclePolicy\(teacherCycles\), \[teacherCycles\]\)/, 'l’onboarding suit la même politique');
  assert.match(onboarding, /\} else if \(selectedCycle === 'prepa'\) \{[\s\S]{0,60}setSelectedGroupKey\('prepaFirst'\)/, 'et connaît le cycle prépa');
  assert.match(onboarding, /if \(level\.includes\('MPSI'\)\) return 'MPSI';/, 'sigles de filières prépa affichés');
});

test('modifier une classe conserve sa matière même hors sélection du profil', () => {
  const draft = initialClassDraft(['college'], ['Physique-Chimie'], 'college', classroom('1AC 3'));
  assert.equal(draft.subject, 'Mathématiques');
  assert.equal(draft.level, '1AC');
  assert.equal(draft.group, '3');
  assert.equal(draft.step, 'details');
});

test('les noms historiques et les chiffres arabes/persans sont reconnus', () => {
  for (const name of ['1AC01', '1AC 01', '1AC ١', '1AC ۱']) {
    const draft = initialClassDraft(['college'], [], 'college', classroom(name));
    assert.equal(draft.level, '1AC', name);
    assert.equal(draft.group, '1', name);
  }
});

test('un nom personnalisé conserve son libellé et son groupe', () => {
  const draft = initialClassDraft(['college'], [], 'college', classroom('Soutien avancé ١٢'));
  assert.equal(draft.customMode, true);
  assert.equal(draft.customLevel, 'Soutien avancé');
  assert.equal(draft.group, '12');
});

test('détection des doublons normalisée, sans confondre les niveaux', () => {
  const used = usedGroupsForLevel(['1AC01', '1AC ٢', '1AC ۳', '2AC 4'].map(name => classroom(name)), '1AC');
  assert.deepEqual([...used], ['1', '2', '3']);
  assert.equal(firstFreeGroup(used), '4');
});

test('la classe en cours de modification ne se bloque pas elle-même', () => {
  assert.equal(usedGroupsForLevel([classroom('1AC 1')], '1AC', '1AC 1').size, 0);
});

test('les groupes libres respectent les limites 1–99', () => {
  assert.equal(firstFreeGroup(new Set()), '1');
  assert.equal(firstFreeGroup(new Set(['1', '3'])), '2');
  const occupied = new Set(Array.from({ length: 99 }, (_, index) => String(index + 1)));
  assert.equal(firstFreeGroup(occupied), '');
  occupied.delete('99');
  assert.equal(firstFreeGroup(occupied), '99');
});

test('une ancienne classe hors profil ne réactive pas le choix de cycle', () => {
  const policy = classCyclePolicy(['college'], 'lycee');
  assert.equal(policy.showChoice, false);
  assert.equal(policy.singleCycle, 'college');
  assert.ok(policy.options.includes('lycee'));
});

test('le choix du cycle reste affiché pour plusieurs cycles et pour un profil non configuré', () => {
  assert.equal(classCyclePolicy(['college', 'prepa']).showChoice, true);
  assert.equal(classCyclePolicy([]).showChoice, true);
});

test('les doublons et valeurs invalides ne créent pas une fausse étape de sélection', () => {
  assert.deepEqual(normalizeTeacherCycles(['college', null, 'college', 'autre']), ['college']);
  assert.equal(classCyclePolicy(['college', 'college']).showChoice, false);
  assert.equal(initialClassDraft(['college', 'college'], [], 'lycee').step, 'level');
});

test('les anciennes classes sans cycle retrouvent leur cycle officiel sans changer de niveau', () => {
  const legacy = classroom('2ème Bac Sciences Physiques 2', { cycle: undefined });
  assert.equal(existingClassCycle(legacy), 'lycee');
  const draft = initialClassDraft(['college'], [], 'college', legacy);
  assert.equal(draft.cycle, 'lycee');
  assert.equal(draft.level, '2ème Bac Sciences Physiques');
  assert.equal(draft.customMode, false);
});

test('réduire le profil à un cycle retire immédiatement l’étape devenue inutile', () => {
  assert.deepEqual(reconcileClassCycle(['college'], 'college', 'cycle', false), { cycle: 'college', step: 'level', resetLevel: false });
});

test('un brouillon compatible reste intact quand la liste des cycles change', () => {
  assert.deepEqual(reconcileClassCycle(['college'], 'college', 'details', false), { cycle: 'college', step: 'details', resetLevel: false });
  assert.deepEqual(reconcileClassCycle(['college', 'lycee'], 'college', 'details', false), { cycle: 'college', step: 'details', resetLevel: false });
});

test('changer de profil ne détruit plus un brouillon : aucun cycle n’est interdit', () => {
  // Un cycle hors profil reste créable (le profil ordonne, il ne filtre pas) :
  // la création en cours garde donc son cycle au lieu d'être réinitialisée.
  assert.deepEqual(reconcileClassCycle(['prepa'], 'college', 'details', false), { cycle: 'college', step: 'details', resetLevel: false });
  // La seule réinitialisation qui subsiste : l'étape « cycle » devenue inutile.
  assert.deepEqual(reconcileClassCycle(['college'], 'college', 'cycle', false), { cycle: 'college', step: 'level', resetLevel: false });
});

test('un changement de profil ne migre jamais automatiquement une classe existante', () => {
  assert.deepEqual(reconcileClassCycle(['college'], 'lycee', 'details', true), { cycle: 'lycee', step: 'details', resetLevel: false });
});
