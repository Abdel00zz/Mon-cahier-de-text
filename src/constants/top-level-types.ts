import type { TopLevelType } from '../types';

/** Types reconnus par le cahier, indépendants des icônes et composants React. */
export const TOP_LEVEL_CONTENT_META: Record<TopLevelType, { name: string; autoNumber?: boolean }> = {
  chapter: { name: 'Chapitre' },
  evaluation_diagnostic: { name: 'Évaluation diagnostique', autoNumber: true },
  // Le travail à la maison s'énonce dans la REMARQUE de sa séance : ce libellé
  // nomme le fait pédagogique, pas un contenu de cours.
  devoir_maison: { name: 'Devoir à la maison assigné aux élèves', autoNumber: true },
  controle_continu: { name: 'Devoir surveillé', autoNumber: true },
  controle_court: { name: 'Devoir écrit court', autoNumber: true },
  controle_global: { name: 'Devoir écrit global', autoNumber: true },
  oral: { name: 'Évaluation orale', autoNumber: true },
  correction_devoir_maison: { name: 'Correction du devoir maison', autoNumber: true },
  correction_controle_continu: { name: 'Correction du devoir surveillé', autoNumber: true },
  examen_blanc: { name: 'Examen blanc', autoNumber: true },
  olympiade: { name: 'Olympiade', autoNumber: true },
  concours: { name: 'Concours', autoNumber: true },
  // La « colle » : interrogation orale hebdomadaire des classes préparatoires.
  colle: { name: 'Colle', autoNumber: true },
};

/**
 * Les épreuves et leurs corrections ne font PAS partie du plan d'un chapitre :
 * elles sont reconnues par leur TYPE (`dev-block-<id>` / `event-<id>`), jamais
 * par leur position. Elles peuvent donc se poser JUSTE APRÈS l'élément cliqué
 * (`insertAssessmentBlock` dans `dataUtils.ts`), y compris à l'intérieur d'une
 * section, sans jamais entrer dans la numérotation du chapitre.
 */
