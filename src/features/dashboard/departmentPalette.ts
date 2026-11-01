export interface DepartmentPalette {
  bg: string;
  border: string;
  title: string;
  secondary: string;
}

const DEPARTMENT_PALETTES = {
  peach: { bg: '#fcefdf', border: '#f0cfb4', title: '#69381c', secondary: '#825034' },
  lavender: { bg: '#eeecfa', border: '#d3cef0', title: '#362e6e', secondary: '#595092' },
  green: { bg: '#e7f4ec', border: '#c1e2ce', title: '#1f5438', secondary: '#356b4c' },
  sky: { bg: '#e9f3fa', border: '#c3dcf0', title: '#1f4b6e', secondary: '#396b90' },
  sand: { bg: '#f9f2df', border: '#e6d5ab', title: '#634918', secondary: '#765c27' },
  rose: { bg: '#fae9ee', border: '#eec7d3', title: '#6b273a', secondary: '#90475b' },
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
