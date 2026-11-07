import type { PaginationResult } from './model';

export interface LayoutPreferences {
  /** Écart relatif au réglage de taille (plus lourd). */
  sizeDelta: number;
  /** Écart relatif au réglage d'interligne. */
  leadingDelta: number;
  /** Écart relatif au réglage d'espacement. */
  spacingDelta: number;
  /** Pénalité d'étirement visible. */
  stretch: number;
  /** Nombre de pages cible, si l'utilisateur en a fixé un. */
  targetPages?: number;
}

export function layoutCost(result: PaginationResult, prefs: LayoutPreferences): number {
  let score = 0;
  score += 30 * result.lastPageVoid;
  score += 10 * result.innerVoid;
  score += prefs.stretch * 12;
  score += prefs.sizeDelta * 0.9;
  score += prefs.leadingDelta * 0.5;
  score += prefs.spacingDelta * 0.3;
  if (prefs.targetPages !== undefined) score += Math.abs(result.pageCount - prefs.targetPages) * 25;
  return score;
}
