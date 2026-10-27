export interface DepartmentPalette {
  bg: string;
  border: string;
  title: string;
  secondary: string;
}

const DEPARTMENT_PALETTES = {
  green: { bg: '#EEF5DF', border: '#D5E5B5', title: '#2D4A14', secondary: '#4F6B2E' },
  rose: { bg: '#F9E8F3', border: '#EBC9DE', title: '#5E2150', secondary: '#86436F' },
  indigo: { bg: '#E9EBFA', border: '#CDD2F0', title: '#27307A', secondary: '#4A55A8' },
  orange: { bg: '#FDEADF', border: '#F3CDB8', title: '#7A2E10', secondary: '#96401A' },
} as const;

export type PaletteKey = keyof typeof DEPARTMENT_PALETTES;
const PALETTE_CYCLE: readonly PaletteKey[] = ['green', 'orange', 'indigo', 'rose'];

/**
 * Déduit les 4 tons d'une matière (fond, bordure, titre, secondaire)
 * et garantit que deux matières voisines n'ont pas la même famille de couleur.
 */
export function pickDepartmentPalette(
  tone: string | undefined,
  subject: string | undefined,
  index: number,
  previousKey?: PaletteKey,
): { key: PaletteKey; palette: DepartmentPalette } {
  const s = (subject || '').toLowerCase();
  const t = (tone || '').toLowerCase();
  let key: PaletteKey = 'green';

  if (s.includes('svt') || s.includes('vie') || s.includes('terre') || t === 'lime' || t === 'mint') {
    key = 'green';
  } else if (s.includes('lettre') || s.includes('arab') || s.includes('franç') || s.includes('angl') || t === 'lavender' || t === 'rose') {
    key = 'rose';
  } else if (s.includes('4') || t === 'indigo' || t === 'sky') {
    key = 'indigo';
  } else if (s.includes('phys') || s.includes('chim') || t === 'coral' || t === 'sand') {
    key = 'orange';
  } else {
    key = PALETTE_CYCLE[index % PALETTE_CYCLE.length];
  }

  // Évite deux couleurs proches ou identiques consécutives
  if (previousKey && key === previousKey) {
    const prevIdx = PALETTE_CYCLE.indexOf(previousKey);
    key = PALETTE_CYCLE[(prevIdx + 1) % PALETTE_CYCLE.length];
  }

  return { key, palette: DEPARTMENT_PALETTES[key] };
}
