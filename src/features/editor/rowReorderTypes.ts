export type Side = 'before' | 'after';
export type Reorder = (sourceKey: string, targetKey: string, side: Side) => boolean;
export type CanReorder = (sourceKey: string, targetKey: string, side: Side) => boolean;
export interface ReorderMessages {
  started: string; moved: string; cancelled: string;
  before?: string; after?: string; inside?: string; choose?: string; unavailable?: string; cancel?: string;
}
export interface DragState {
  source: HTMLElement;
  sourceKey: string;
  ghost: HTMLElement | null;
  target?: HTMLElement;
  targetKey?: string;
  side?: Side;
}

export const rows = (root: HTMLElement | null) =>
  Array.from(root?.querySelectorAll<HTMLElement>('[data-editor-sort-row]') ?? []);
