import type { CSSProperties } from 'react';
import type { ClassInfo } from '../../types';
import { KEEP_TONES, keepToneForClass } from '../../platform/keepTheme.js';
import { classIdentityFor } from './classIdentity.js';

export const isClassColor = (value: unknown): value is string => typeof value === 'string' && (KEEP_TONES.includes(value as typeof KEEP_TONES[number])
  || /^class-hue:(?:0|[1-9]\d{0,5})$/.test(value));

// Families seed new colors; every class has its own persistent tone.
const FAMILY_COLORS: Readonly<Record<string, string>> = {
  college1: 'sand', college2: 'lime', college3: 'rose', common: 'mint',
  'firstBac:science': 'sky', 'firstBac:letters': 'coral',
  'secondBac:science': 'indigo', 'secondBac:letters': 'lavender',
  'firstBac:economics': 'class-hue:34', 'secondBac:economics': 'class-hue:9',
};

export function classColorFamily(name: string): string | null {
  const { tierKey, streamCode, stream } = classIdentityFor(name);
  if (!tierKey) return null;
  if (tierKey.startsWith('college') || tierKey === 'common') return tierKey;
  if (tierKey === 'firstBac' || tierKey === 'secondBac') {
    if (['SM', 'SM-A', 'SM-B', 'SEXP', 'PC', 'SVT'].includes(streamCode ?? '')) return `${tierKey}:science`;
    if (['LSH', 'L', 'SH'].includes(streamCode ?? '')) return `${tierKey}:letters`;
    if (['SEG', 'SECO', 'SGC'].includes(streamCode ?? '')) return `${tierKey}:economics`;
  }
  return `${tierKey}:${streamCode ?? stream ?? 'general'}`;
}

const extendedFamilyColor = (family: string): string => {
  let hash = 0;
  for (const character of family) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) >>> 0;
  return `class-hue:${100 + hash % 999000}`;
};

const TONE_HUES: Record<typeof KEEP_TONES[number], number> = {
  sand: 43, coral: 24, lime: 77, mint: 155, sky: 204, indigo: 236, lavender: 276, rose: 348,
};
const hueOf = (color: string): number => color.startsWith('class-hue:')
  ? (Number(color.slice(10)) * 137.508 + 22) % 360 : TONE_HUES[color as keyof typeof TONE_HUES];
const hueDistance = (a: number, b: number): number => {
  const delta = Math.abs(a - b);
  return Math.min(delta, 360 - delta);
};

/** Stable per workspace. Preserve unique saved colors and repair old family
 * duplicates or visually ambiguous sister-class colors.
 * Guarantees that classes of the same level and branch receive distinct,
 * well-separated, harmonious background colors. */
export function assignClassColors(classes: ClassInfo[]): ClassInfo[] {
  const assigned = new Map<string, string>();
  const used = new Set<string>();
  const familyUsedHues = new Map<string, number[]>();
  const ordered = [...classes].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '') || a.id.localeCompare(b.id));

  for (const item of ordered) {
    const family = classColorFamily(item.name);
    const itemHue = isClassColor(item.color) ? hueOf(item.color) : -1;
    const existingFamilyHues = family ? familyUsedHues.get(family) ?? [] : [];
    const familyCollision = existingFamilyHues.some(h => hueDistance(h, itemHue) < 45);

    if (isClassColor(item.color) && !used.has(item.color) && !familyCollision) {
      assigned.set(item.id, item.color);
      used.add(item.color);
      if (family) {
        existingFamilyHues.push(itemHue);
        familyUsedHues.set(family, existingFamilyHues);
      }
    }
  }

  if (assigned.size === classes.length) return classes;

  const usedHues = [...used].map(hueOf);
  // Cache distances to avoid comparing every pair again for each assignment.
  const candidates = [...KEEP_TONES, ...Array.from({ length: Math.max(32, classes.length * 2) }, (_, i) => `class-hue:${i}`)]
    .filter(color => !used.has(color))
    .map(color => ({ color, hue: hueOf(color), distance: usedHues.reduce((min, hue) => Math.min(min, hueDistance(hueOf(color), hue)), 180) }));

  for (const item of ordered) {
    if (assigned.has(item.id)) continue;
    const family = classColorFamily(item.name);
    const preference = family ? FAMILY_COLORS[family] ?? extendedFamilyColor(family) : keepToneForClass(item.id);
    const available = candidates.filter(candidate => !used.has(candidate.color));
    const named = available.filter(candidate => KEEP_TONES.includes(candidate.color as typeof KEEP_TONES[number]));
    const pool = named.length ? named : available;
    const preferred = pool.find(candidate => candidate.color === preference);
    const choice = (preferred && preferred.distance >= 50) ? preferred : pool.reduce((best, candidate) => {
      if (candidate.distance !== best.distance) return candidate.distance > best.distance ? candidate : best;
      return hueDistance(candidate.hue, hueOf(preference)) > hueDistance(best.hue, hueOf(preference)) ? candidate : best;
    });
    const color = choice.color;
    assigned.set(item.id, color);
    used.add(color);
    if (family) {
      const existing = familyUsedHues.get(family) ?? [];
      existing.push(choice.hue);
      familyUsedHues.set(family, existing);
    }
    for (const candidate of candidates) candidate.distance = Math.min(candidate.distance, hueDistance(candidate.hue, choice.hue));
  }
  return classes.map(item => item.color === assigned.get(item.id) ? item : { ...item, color: assigned.get(item.id)! });
}

/** Shared DOM tokens for cards, list rows and timetable cells. */
export function classColorAttributes(item: Pick<ClassInfo, 'id' | 'color'>) {
  const color = item.color || keepToneForClass(item.id);
  const custom = /^class-hue:(\d{1,6})$/.exec(color);
  return {
    'data-keep-tone': KEEP_TONES.includes(color as typeof KEEP_TONES[number]) ? color : keepToneForClass(item.id),
    'data-class-color': custom ? color : undefined,
    style: custom ? { '--class-hue': hueOf(color).toFixed(3) } as CSSProperties : undefined,
  };
}
