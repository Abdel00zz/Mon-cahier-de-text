import type { Cycle } from '@/types';

export const TEACHING_CYCLES: readonly Cycle[] = ['college', 'lycee', 'prepa'];

/** Compter des cycles réels, pas les doublons ou les valeurs d'un ancien import. */
export const normalizeTeacherCycles = (cycles: readonly unknown[] = []): Cycle[] =>
  [...new Set(cycles.filter((cycle): cycle is Cycle => TEACHING_CYCLES.includes(cycle as Cycle)))];
