import { hueOf, isClassColor } from '@/domain/classes/classColors';

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
const PALETTE_CYCLE: readonly PaletteKey[] = ['peach', 'lavender', 'green', 'sky', 'sand', 'rose'];

/**
 * Déduit les tons d'une matière (fond, bordure, titre, secondaire)
 * en préservant les choix enregistrés et en variant les couleurs non choisies.
 */
export function pickDepartmentPalette(
  tone: string | undefined,
  subject: string | undefined,
  index: number,
  previousKey?: PaletteKey,
  usedKeys?: Set<PaletteKey> | readonly PaletteKey[],
): { key: PaletteKey; palette: DepartmentPalette } {
  const s = (subject || '').toLowerCase();
  const t = (tone || '').toLowerCase();
  const tones: Record<string, PaletteKey> = {
    coral: 'peach', peach: 'peach', lavender: 'lavender', indigo: 'lavender',
    mint: 'green', lime: 'green', green: 'green', sky: 'sky', sand: 'sand', rose: 'rose',
  };
  const saved = tones[t];
  const used = usedKeys instanceof Set ? usedKeys : new Set(usedKeys ?? []);

  let key: PaletteKey;
  if (saved) {
    key = saved;
  } else {
    let preferred: PaletteKey | undefined = saved;
    if (!preferred) {
      if (s.includes('svt') || s.includes('vie') || s.includes('terre')) preferred = 'green';
      else if (s.includes('lettre') || s.includes('arab') || s.includes('franç') || s.includes('angl')) preferred = 'rose';
      else if (s.includes('phys') || s.includes('chim')) preferred = 'peach';
    }

    const freeKeys = PALETTE_CYCLE.filter(k => !used.has(k));
    if (freeKeys.length > 0) {
      if (preferred && freeKeys.includes(preferred)) {
        key = preferred;
      } else {
        key = freeKeys[index % freeKeys.length];
      }
    } else {
      const pool = PALETTE_CYCLE.filter(k => k !== previousKey);
      key = pool.length > 0 ? pool[index % pool.length] : PALETTE_CYCLE[index % PALETTE_CYCLE.length];
    }
  }

  return { key, palette: DEPARTMENT_PALETTES[key] };
}

/**
 * Construit une table d'association unique et déterministe classe → palette
 * partagée à l'identique entre le tableau de bord et l'emploi du temps.
 */
export function buildUnifiedClassPaletteMap(
  classes: readonly { id: string; color?: string | null; subject?: string | null }[],
  classOrder?: readonly string[],
): Map<string, DepartmentPalette> {
  const classById = new Map<string, (typeof classes)[number]>();
  classes.forEach(c => classById.set(c.id, c));

  const orderedIds: string[] = [];
  const seen = new Set<string>();
  if (classOrder) {
    for (const id of classOrder) {
      if (classById.has(id) && !seen.has(id)) { orderedIds.push(id); seen.add(id); }
    }
  }
  for (const c of classes) {
    if (!seen.has(c.id)) { orderedIds.push(c.id); seen.add(c.id); }
  }

  let previousKey: PaletteKey | undefined;
  const usedKeys = new Set<PaletteKey>();
  const map = new Map<string, DepartmentPalette>();

  orderedIds.forEach((id, index) => {
    const item = classById.get(id);
    if (!item) return;
    if (isClassColor(item.color) && item.color.startsWith('class-hue:')) {
      const hue = hueOf(item.color).toFixed(3);
      map.set(id, {
        bg: `hsl(${hue} 55% 94%)`, border: `hsl(${hue} 45% 82%)`,
        title: `hsl(${hue} 65% 18%)`, secondary: `hsl(${hue} 45% 32%)`,
      });
      return;
    }
    const { key, palette } = pickDepartmentPalette(item.color ?? undefined, item.subject ?? undefined, index, previousKey, usedKeys);
    previousKey = key;
    usedKeys.add(key);
    map.set(id, palette);
  });

  return map;
}
