// Imports RELATIFS avec extension : module pur, partageable avec l'API.
import type { Cycle } from '../../types.js';

/*
 * QUELLES NATURES PROPOSER À LA CRÉATION, SELON LA CLASSE ?
 *
 * Une seule règle pour toutes les portes (ajout de contenu, éditeur de devoir,
 * pastilles de la remarque). Elle ne cache QUE la création : une donnée déjà
 * saisie hors de son cycle reste toujours visible et modifiable.
 *
 *  - colle             : classes préparatoires uniquement ;
 *  - contrôle des cahiers, olympiade : pas en prépa (pas d'olympiade scolaire,
 *    pas de cahier d'élève contrôlé) ;
 *  - examen blanc      : années d'examen — 3AC (examen régional), 1re Bac
 *    (régional), 2e Bac (national) et prépa (concours blanc). Ni 1AC/2AC, ni
 *    tronc commun.
 *
 * Quand le niveau n'est pas reconnaissable, on PROPOSE : mieux vaut une carte
 * de trop qu'une nature introuvable.
 */
export interface KindAudience {
  cycle?: Cycle;
  /** Niveau officiel (`ClassInfo.level`) ou, à défaut, le nom de la classe. */
  level?: string;
}

type ExamTier = 'nonExam' | 'exam' | 'unknown';

const examTier = ({ cycle, level }: KindAudience): ExamTier => {
  const text = (level ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (cycle === 'prepa') return 'exam';
  if (cycle === 'college') {
    if (/\b3\s*(ac|apic|asc|eme|e)\b|3\s*annee/.test(text)) return 'exam';
    if (/\b[12]\s*(ac|apic|asc|er|ere|re|eme|e)\b|\b[12]\s*annee/.test(text)) return 'nonExam';
    return 'unknown';
  }
  if (cycle === 'lycee') {
    if (/tronc|\btc[slt]?\b|جذع/.test(text)) return 'nonExam';
    if (/\b[12]\s*(er|ere|eme|e)?\s*bac|bac|باك/.test(text)) return 'exam';
    return 'unknown';
  }
  return 'unknown';
};

/** Vrai si la nature doit être proposée à la création pour cette classe. */
export const isKindOffered = (type: string, audience: KindAudience): boolean => {
  switch (type) {
    case 'colle':
      return audience.cycle === 'prepa';
    case 'controle_cahiers':
    case 'olympiade':
      return audience.cycle !== 'prepa';
    case 'examen_blanc':
      return examTier(audience) !== 'nonExam';
    default:
      return true;
  }
};
