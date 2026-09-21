import type { CSSProperties } from 'react';
import type { ClassInfo } from '../types';
import { KEEP_TONES, keepToneForClass } from './keepTheme.js';

export const isClassColor = (value: unknown): value is string => typeof value === 'string' && (KEEP_TONES.includes(value as typeof KEEP_TONES[number])
  || /^class-hue:(?:0|[1-9]\d{0,5})$/.test(value));
const colorAt = (index: number): string => KEEP_TONES[index] ?? `class-hue:${index - KEEP_TONES.length}`;

/** Preserve assignments and list order; repair legacy colors and collisions.
 * Deterministic migration on every device, independent of display order. */
export function assignClassColors(classes: ClassInfo[]): ClassInfo[] {
  const assigned = new Map<string, string>();
  const used = new Set<string>();
  const ordered = [...classes].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '') || a.id.localeCompare(b.id));
  for (const item of ordered) {
    if (isClassColor(item.color) && !used.has(item.color)) {
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
