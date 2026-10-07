import type { ClassInfo, Cycle } from '@/types';
import { CLASS_LEVELS_BY_CYCLE, SUBJECTS, classLevelGroupsForCycle, normalizeOfficialClassName } from '@/constants';
import type { ClassLevelGroupKey } from '@/constants';
import { isSameClassGroup, normalizeGroupNumber } from '@/domain/classes/classGroup';
import { normalizeTeacherCycles, TEACHING_CYCLES } from '@/domain/classes/teacherCycles';

export type WizardStep = 'cycle' | 'level' | 'branch' | 'details';

/**
 * Tous les cycles enseignables, ceux du profil EN TÊTE.
 *
 * Le profil ORDONNE et pré-sélectionne, il ne FILTRE plus : un professeur dont
 * le profil ne liste que collège et lycée doit pouvoir créer une classe prépa
 * sans repasser par les réglages. C'était le défaut constaté — le cycle prépa
 * (1re et 2e année CPGE : MPSI, PCSI, TSI, ECS, ECT…) était introuvable dans
 * l'assistant de création comme dans l'onboarding.
 */
export const availableCycles = (selected: readonly Cycle[] = [], editingCycle?: Cycle): Cycle[] => {
  const preferred = normalizeTeacherCycles(selected);
  const ordered = [...preferred, ...TEACHING_CYCLES.filter(cycle => !preferred.includes(cycle))];
  if (editingCycle && TEACHING_CYCLES.includes(editingCycle) && !ordered.includes(editingCycle)) ordered.push(editingCycle);
  return [...new Set(ordered)];
};

/**
 * Le profil décide s'il faut DEMANDER le cycle (un seul cycle → on va droit au
 * choix de la classe), jamais ce qui est proposé quand on le demande.
 */
export const classCyclePolicy = (selected: readonly Cycle[] = [], editingCycle?: Cycle) => {
  const configured = normalizeTeacherCycles(selected);
  return {
    options: availableCycles(selected, editingCycle),
    showChoice: configured.length > 1 || configured.length === 0,
    singleCycle: configured.length === 1 ? configured[0] : null,
  };
};

const officialLevelInName = (name: string, cycle: Cycle): string =>
  (CLASS_LEVELS_BY_CYCLE[cycle] ?? []).find(item => {
    const suffix = name.slice(item.length).trim();
    return name.startsWith(item) && (suffix === '' || normalizeGroupNumber(suffix) !== null);
  }) ?? '';

export const existingClassCycle = (classInfo?: ClassInfo | null): Cycle | undefined => {
  if (!classInfo) return undefined;
  if (classInfo.cycle && TEACHING_CYCLES.includes(classInfo.cycle)) return classInfo.cycle;
  const name = normalizeOfficialClassName(classInfo.name);
  return TEACHING_CYCLES.find(cycle => officialLevelInName(name, cycle));
};

/**
 * Réconcilier la navigation si le profil change, sans réinitialiser un brouillon compatible.
 *
 * `showChoice` est l'état RÉEL de l'étape « cycle » : celle du profil, ou celle
 * qu'un « Autre cycle » vient d'ouvrir à la demande. Sans lui, la réconciliation
 * refermerait aussitôt l'étape que le professeur vient d'ouvrir.
 */
export const reconcileClassCycle = (
  selected: readonly Cycle[],
  current: Cycle,
  step: WizardStep,
  editing: boolean,
  showChoice: boolean = classCyclePolicy(selected).showChoice,
) => {
  const policy = classCyclePolicy(selected);
  const nextCycle = editing || policy.options.includes(current) ? current : policy.options[0];
  const resetLevel = nextCycle !== current;
  return {
    cycle: nextCycle,
    resetLevel,
    step: editing ? 'details' as const : resetLevel
      ? (showChoice ? 'cycle' : 'level') as WizardStep
      : step === 'cycle' && !showChoice ? 'level' as const : step,
  };
};

/** Une initialisation par ouverture : un rafraîchissement du parent ne touche pas au brouillon. */
export const initialClassDraft = (
  cycles: readonly Cycle[], subjects: readonly string[], defaultCycle: Cycle, editing?: ClassInfo | null,
) => {
  const editingCycle = existingClassCycle(editing);
  const policy = classCyclePolicy(cycles, editingCycle);
  const options = policy.options;
  /*
   * Le cycle d'ouverture suit le PROFIL, pas `defaultCycle` : un professeur dont
   * le profil ne liste que le collège ouvre sur le collège, même si l'écran
   * parent suggère le lycée. Le défaut ne sert qu'en dernier recours.
   */
  const configured = normalizeTeacherCycles(cycles);
  const cycle = editingCycle
    ?? (configured.includes(defaultCycle) ? defaultCycle : configured[0] ?? (options.includes(defaultCycle) ? defaultCycle : options[0]));
  const name = normalizeOfficialClassName(editing?.name ?? '');
  const level = officialLevelInName(name, cycle);
  const customMatch = name.match(/^(.*?)\s+([0-9٠-٩۰-۹]{1,2})$/);
  const suffix = level ? name.slice(level.length).trim() : customMatch?.[2] ?? '';
  return {
    cycle, level,
    levelGroupKey: (classLevelGroupsForCycle(cycle).find(item => item.levels.includes(level))?.key ?? '') as ClassLevelGroupKey | '',
    group: normalizeGroupNumber(suffix) ?? suffix,
    subject: editing?.subject || subjects[0] || SUBJECTS[0],
    customMode: Boolean(editing && !level),
    customLevel: editing && !level ? customMatch?.[1] ?? name : '',
    customSubject: editing?.subject ?? '',
    // L'étape « cycle » n'apparaît que si le PROFIL en liste plusieurs ; sinon
    // on ouvre le choix de classe (le cycle reste changeable par « Autre cycle »).
    step: (editing ? 'details' : policy.showChoice ? 'cycle' : 'level') as WizardStep,
  };
};

/** Normalisation/regex une fois par classe, au lieu de 99 parcours de toute la liste. */
export const usedGroupsForLevel = (classes: readonly ClassInfo[], level: string, editingId?: string): Set<string> => {
  const used = new Set<string>();
  if (!level.trim()) return used;
  for (const item of classes) {
    if (item.id === editingId) continue;
    const name = normalizeOfficialClassName(item.name);
    const suffix = name.match(/([0-9٠-٩۰-۹]+)\s*$/)?.[1];
    const group = suffix ? normalizeGroupNumber(suffix.replace(/^0+(?=\d)/, '')) : null;
    if (group && isSameClassGroup(name, level, group)) used.add(group);
  }
  return used;
};

export const firstFreeGroup = (used: ReadonlySet<string>): string => {
  for (let number = 1; number <= 99; number++) if (!used.has(String(number))) return String(number);
  return '';
};
