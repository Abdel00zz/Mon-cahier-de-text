import type { TopLevelType } from '../types';

/** Types reconnus par le cahier, indépendants des icônes et composants React. */
export const TOP_LEVEL_CONTENT_META: Record<TopLevelType, { name: string; autoNumber?: boolean }> = {
  chapter: { name: 'Chapitre' },
  evaluation_diagnostic: { name: 'Évaluation diagnostique', autoNumber: true },
  devoir_maison: { name: 'Devoir maison', autoNumber: true },
  controle_continu: { name: 'Devoir surveillé', autoNumber: true },
  correction_devoir_maison: { name: 'Correction Devoir maison', autoNumber: true },
  correction_controle_continu: { name: 'Correction du devoir surveillé', autoNumber: true },
};
