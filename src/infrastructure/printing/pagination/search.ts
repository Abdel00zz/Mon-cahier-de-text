import { layoutCost, type LayoutPreferences } from './cost';
import { paginateAtoms } from './paginate';
import type { PaginationOptions, PaginationResult, PrintAtom } from './model';

export interface SizeStep {
  sizeFactor: number;
  leadingFactor: number;
  spacingFactor: number;
}

export interface SearchResult {
  best: SizeStep;
  result: PaginationResult;
  cost: number;
  simulations: number;
}

const SIZES = 11;
const LEADINGS = 9;
const SPACINGS = 9;

/**
 * Grille 11 × 9 × 9 = 891 simulations. La hauteur de chaque atome est estimée
 * en mettant à l'échelle la hauteur mesurée : seule la taille change la vraie
 * mise en forme ; l'interligne et l'espacement sont des approximations.
 */
export function searchBestLayout(
  _atoms: readonly PrintAtom[],
  opts: PaginationOptions,
  prefs: LayoutPreferences,
  measure: (sizeFactor: number) => readonly PrintAtom[],
  around?: SizeStep,
): SearchResult {
  let bestCost = Infinity;
  let bestStep: SizeStep = { sizeFactor: 1, leadingFactor: 1, spacingFactor: 1 };
  let bestResult: PaginationResult = { pages: [], lastPageVoid: Infinity, innerVoid: Infinity, pageCount: 0 };
  let simulations = 0;

  const sizeStart = around ? around.sizeFactor - 0.05 : 0.9;
  const sizeStep = around ? 0.01 : 0.02;
  const leadingStart = around ? around.leadingFactor - 0.08 : 0.85;
  const spacingStart = around ? around.spacingFactor - 0.08 : 0.8;

  for (let si = 0; si < SIZES; si += 1) {
    const sizeFactor = Number((sizeStart + si * sizeStep).toFixed(3));
    const measured = measure(sizeFactor);
    for (let li = 0; li < LEADINGS; li += 1) {
      const leadingFactor = Number((leadingStart + li * 0.02).toFixed(3));
      const scaled = measured.map(atom => ({ ...atom, height: atom.height * leadingFactor }));
      for (let spi = 0; spi < SPACINGS; spi += 1) {
        const spacingFactor = Number((spacingStart + spi * 0.025).toFixed(3));
        const spaced = scaled.map(atom => ({ ...atom, height: atom.height + (atom.stretch * (spacingFactor - 1) * 6) }));
        const result = paginateAtoms(spaced, opts);
        const cost = layoutCost(result, {
          sizeDelta: Math.abs(sizeFactor - (prefs.targetPages ? 1 : 1)),
          leadingDelta: Math.abs(leadingFactor - 1),
          spacingDelta: Math.abs(spacingFactor - 1),
          stretch: result.innerVoid > 0 ? 1 : 0,
          targetPages: prefs.targetPages,
        });
        simulations += 1;
        if (cost < bestCost) {
          bestCost = cost;
          bestStep = { sizeFactor, leadingFactor, spacingFactor };
          bestResult = result;
        }
      }
    }
  }

  return { best: bestStep, result: bestResult, cost: bestCost, simulations };
}
