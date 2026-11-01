export interface DepartmentPalette {
  bg: string;
  border: string;
  title: string;
  secondary: string;
}

const DEPARTMENT_PALETTES = {
  peach: { bg: '#fdeede', border: '#f6d9bd', title: '#6b3a12', secondary: '#a8642a' },
  lavender: { bg: '#ece9f7', border: '#d9d4ee', title: '#2e2766', secondary: '#5d55a3' },
  green: { bg: '#e6f3e9', border: '#cfe6d5', title: '#14503a', secondary: '#3f7f63' },
  sky: { bg: '#e0eefa', border: '#c6dff2', title: '#0f3f6b', secondary: '#3a78a8' },
  sand: { bg: '#f7f0d4', border: '#ebe0ad', title: '#5c4a05', secondary: '#8f7a1c' },
  rose: { bg: '#fbe6ee', border: '#f2cddb', title: '#6e1c3e', secondary: '#a8486f' },
} as const;

export type PaletteKey = keyof typeof DEPARTMENT_PALETTES;
const PALETTE_CYCLE: readonly PaletteKey[] = ['green', 'peach', 'lavender', 'sky', 'sand', 'rose'];

/**
 * Déduit les tons d'une matière (fond, bordure, titre, secondaire)
 * en respectant en priorité la couleur enregistrée de chaque classe.
 */
export function pickDepartmentPalette(
  tone: string | undefined,
  subject: string | undefined,
  index: number,
  previousKey?: PaletteKey,
): { key: PaletteKey; palette: DepartmentPalette } {
  const s = (subject || '').toLowerCase();
  const t = (tone || '').toLowerCase();
  const tones: Record<string, PaletteKey> = {
    coral: 'peach', peach: 'peach', lavender: 'lavender', indigo: 'lavender',
    mint: 'green', lime: 'green', green: 'green', sky: 'sky', sand: 'sand', rose: 'rose',
  };
  // A saved choice is stable across sorting and never overwritten by its neighbours.
  const saved = tones[t];
  let key: PaletteKey = saved ?? PALETTE_CYCLE[index % PALETTE_CYCLE.length];
  if (!saved) {
    if (s.includes('svt') || s.includes('vie') || s.includes('terre')) key = 'green';
    else if (s.includes('lettre') || s.includes('arab') || s.includes('franç') || s.includes('angl')) key = 'rose';
    else if (s.includes('phys') || s.includes('chim')) key = 'peach';
    if (previousKey && key === previousKey) {
      key = PALETTE_CYCLE[(PALETTE_CYCLE.indexOf(previousKey) + 1) % PALETTE_CYCLE.length];
    }
  }

  return { key, palette: DEPARTMENT_PALETTES[key] };
}
