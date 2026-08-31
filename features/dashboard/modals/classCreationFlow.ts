import type { ClassInfo, Cycle } from '@/types';
import { CLASS_LEVELS_BY_CYCLE, SUBJECTS, classLevelGroupsForCycle, normalizeOfficialClassName } from '@/constants';
import type { ClassLevelGroupKey } from '@/constants';
import { isSameClassGroup, normalizeGroupNumber } from '@/utils/classGroup';
import { normalizeTeacherCycles, TEACHING_CYCLES } from '@/utils/teacherCycles';

export type WizardStep = 'cycle' | 'level' | 'branch' | 'details';

export const availableCycles = (selected: readonly Cycle[] = [], editingCycle?: Cycle): Cycle[] => {
  const cycles = normalizeTeacherCycles(selected);
  if (!cycles.length) cycles.push(...TEACHING_CYCLES);
  if (editingCycle && TEACHING_CYCLES.includes(editingCycle) && !cycles.includes(editingCycle)) cycles.push(editingCycle);
  return cycles;
};

/** La visibilité dépend du profil, jamais du cycle d'une ancienne classe. */
export const classCyclePolicy = (selected: readonly Cycle[] = [], editingCycle?: Cycle) => {
  const configured = availableCycles(selected);
  return {
    options: availableCycles(selected, editingCycle),
    showChoice: configured.length > 1,
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

/** Réconcilier la navigation si le profil change, sans réinitialiser un brouillon compatible. */
export const reconcileClassCycle = (selected: readonly Cycle[], current: Cycle, step: WizardStep, editing: boolean) => {
  const policy = classCyclePolicy(selected);
  const nextCycle = editing || policy.options.includes(current) ? current : policy.options[0];
  const resetLevel = nextCycle !== current;
  return {
    cycle: nextCycle,
    resetLevel,
    step: editing ? 'details' as const : resetLevel
      ? (policy.showChoice ? 'cycle' : 'level') as WizardStep
      : step === 'cycle' && !policy.showChoice ? 'level' as const : step,
  };
};

/** Une initialisation par ouverture : un rafraîchissement du parent ne touche pas au brouillon. */
export const initialClassDraft = (
  cycles: readonly Cycle[], subjects: readonly string[], defaultCycle: Cycle, editing?: ClassInfo | null,
) => {
  const options = availableCycles(cycles);
  const cycle = existingClassCycle(editing) ?? (options.includes(defaultCycle) ? defaultCycle : options[0]);
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
    step: (editing ? 'details' : options.length > 1 ? 'cycle' : 'level') as WizardStep,
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
