/** Intersection of a window viewport with a document-positioned list. */
export function listViewport(tableTop: number, tableHeight: number, windowHeight: number, margin = 0) {
  const top = Math.max(0, -tableTop + margin);
  const bottom = Math.min(tableHeight, Math.max(0, windowHeight - tableTop + margin));
  return { top, height: Math.max(0, bottom - top) };
}

function nearest(offsets: number[], value: number) {
  let low = 0;
  let high = Math.max(0, offsets.length - 1);
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (offsets[mid] <= value) low = mid + 1;
    else high = mid;
  }
  return Math.max(0, low - 1);
}

export function visibleRange(offsets: number[], top: number, height: number, overscan: number) {
  const count = offsets.length - 1;
  if (count <= 0 || height <= 0) return { start: 0, end: -1 };
  return {
    start: Math.max(0, nearest(offsets, top) - overscan),
    end: Math.min(count - 1, nearest(offsets, top + height) + overscan),
  };
}
