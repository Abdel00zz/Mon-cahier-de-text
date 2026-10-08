import type { CSSProperties } from 'react';
import type { ClassInfo } from '../../types';
import { KEEP_TONES, keepToneForClass } from '../../platform/keepTheme.js';
import { classIdentityFor } from './classIdentity.js';

export const isClassColor = (value: unknown): value is string => typeof value === 'string' && (KEEP_TONES.includes(value as typeof KEEP_TONES[number])
  || /^class-hue:(?:0|[1-9]\d{0,5})$/.test(value));
const colorAt = (index: number): string => KEEP_TONES[index] ?? `class-hue:${index - KEEP_TONES.length}`;

// A shared teaching family is a visual landmark, independent of group and language.
// All common-core streams share one tone; science/letters/economics differ by year.
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

/** Migrate recognized levels to their teaching-family palette. Preserve free-name
 * assignments, list order and references when unchanged, including cloud round trips. */
export function assignClassColors(classes: ClassInfo[]): ClassInfo[] {
  const assigned = new Map<string, string>();
  const used = new Set<string>();
  const ordered = [...classes].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '') || a.id.localeCompare(b.id));
  const families = new Map(classes.map(item => [item.id, classColorFamily(item.name)]));
  const colorsByFamily = new Map<string, string>();
  for (const family of [...new Set(families.values())].filter((key): key is string => key !== null).sort()) {
    let color = FAMILY_COLORS[family] ?? extendedFamilyColor(family);
    // Repair even an unlikely hash collision without depending on class display order.
    let cursor = KEEP_TONES.length;
    while (used.has(color)) color = colorAt(cursor++);
    colorsByFamily.set(family, color);
    used.add(color);
  }
  for (const item of ordered) {
    const family = families.get(item.id);
    if (family) assigned.set(item.id, colorsByFamily.get(family)!);
  }
  for (const item of ordered) {
    if (!assigned.has(item.id) && isClassColor(item.color) && !used.has(item.color)) {
      assigned.set(item.id, item.color);
      used.add(item.color);
    }
  }
  let cursor = 0;
  for (const item of ordered) {
    if (assigned.has(item.id)) continue;
    while (used.has(colorAt(cursor))) cursor++;
    const color = colorAt(cursor++);
    assigned.set(item.id, color);
    used.add(color);
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
    style: custom ? { '--class-hue': ((Number(custom[1]) * 137.508 + 22) % 360).toFixed(3) } as CSSProperties : undefined,
  };
}
