import type { TopLevelType } from '../types';

/** Types reconnus par le cahier, indépendants des icônes et composants React. */
export const TOP_LEVEL_CONTENT_META: Record<TopLevelType, { name: string; autoNumber?: boolean }> = {
  chapter: { name: 'Chapitre' },
  evaluation_diagnostic: { name: 'Évaluation diagnostique', autoNumber: true },
  devoir_maison: { name: 'Devoir maison', autoNumber: true },
  controle_continu: { name: 'Devoir surveillé', autoNumber: true },
  controle_court: { name: 'Devoir écrit court', autoNumber: true },
  controle_global: { name: 'Devoir écrit global', autoNumber: true },
  oral: { name: 'Évaluation orale', autoNumber: true },
  correction_devoir_maison: { name: 'Correction Devoir maison', autoNumber: true },
  correction_controle_continu: { name: 'Correction du devoir surveillé', autoNumber: true },
  examen_blanc: { name: 'Examen blanc', autoNumber: true },
  olympiade: { name: 'Olympiade', autoNumber: true },
  concours: { name: 'Concours', autoNumber: true },
};
