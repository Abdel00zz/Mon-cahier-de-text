/** Shared gesture decisions, independent of rendering and pointer frequency. */
export const normalizeSheetDetents = (values: number[]): number[] => {
  const valid = values.filter(Number.isFinite).map(value => Math.min(.96, Math.max(.32, value))).sort((a, b) => a - b);
  return [...new Set(valid.length ? valid : [.9, .96])];
};

export type SheetReleaseAction = 'expand' | 'collapse' | 'dismiss' | 'settle';

export function sheetReleaseAction({ distance, velocity, height, canExpand, canCollapse, fromHandle }: {
  distance: number; velocity: number; height: number;
  canExpand: boolean; canCollapse: boolean; fromHandle: boolean;
}): SheetReleaseAction {
  if (fromHandle && canExpand && (distance <= -Math.min(72, height * .16) || (distance <= -24 && velocity <= -.75))) return 'expand';
  if (distance >= Math.min(112, height * .24) || (distance >= 28 && velocity >= .75)) return canCollapse ? 'collapse' : 'dismiss';
  return 'settle';
}

export type SheetPointerSample = { y: number; time: number };

/** A short recent window retains flick velocity when pointerup repeats the last coordinates. */
export function sheetReleaseVelocity(samples: SheetPointerSample[], end: SheetPointerSample): number {
  const start = samples.find(sample => end.time - sample.time <= 100);
  return start ? (end.y - start.y) / Math.max(1, end.time - start.time) : 0;
}
