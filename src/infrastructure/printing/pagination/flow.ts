import { PRINT_PAGE_HEIGHT_PX } from '../printBalance';

// Simulation fidèle de la fragmentation A4 et justification verticale.

export interface FlowRow {
  height: number;
  avoid: boolean;
  keepWithNext?: boolean;
  itemGaps?: number;
  breaks?: readonly number[];
}

export interface FlowInput {
  pageHeight: number;
  leadHeight: number;
  headHeight: number;
  rows: readonly FlowRow[];
  trailerHeight: number;
}

export interface FlowPage {
  rows: number[];
  split: number[];
  used: number;
  hasLead: boolean;
  hasTrailer: boolean;
}

export interface FlowResult {
  pages: FlowPage[];
  pageCount: number;
  lastRatio: number;
}
const MIN_FRAGMENT_PX = 36;

export function simulateFlow(input: FlowInput): FlowResult {
  const { pageHeight, headHeight, rows } = input;
  const pages: FlowPage[] = [];
  const freshCapacity = pageHeight - headHeight;
  let page: FlowPage = { rows: [], split: [], used: input.leadHeight + headHeight, hasLead: input.leadHeight > 0, hasTrailer: false };
  const newPage = (withHead = true) => {
    pages.push(page);
    page = { rows: [], split: [], used: withHead ? headHeight : 0, hasLead: false, hasTrailer: false };
  };
  const isEmpty = () => page.rows.length === 0 && page.split.length === 0;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const next = rows[index + 1];
    let remaining = Math.max(0, row.height);
    let consumed = 0;

    while (remaining > 0) {
      const room = pageHeight - page.used;
      const tail = row.keepWithNext && next && consumed === 0 ? Math.min(next.height, MIN_FRAGMENT_PX * 2) : 0;
      if (remaining + tail <= room) {
        (consumed > 0 ? page.split : page.rows).push(index);
        page.used += remaining;
        break;
      }

      const splittable = !row.avoid || remaining > freshCapacity;
      let cut = 0;
      if (splittable && !(row.keepWithNext && !isEmpty())) {
        if (row.breaks) {
          for (const at of row.breaks) {
            const local = at - consumed;
            if (local > 0 && local < remaining && local <= room) cut = local;
          }
        } else if (room >= MIN_FRAGMENT_PX) {
          cut = room;
        }
        if (cut === 0 && isEmpty()) cut = Math.min(room, remaining);
      }

      if (cut > 0) {
        page.split.push(index);
        page.used += cut;
        consumed += cut;
        remaining -= cut;
        newPage();
        continue;
      }
      if (isEmpty()) {
        page.rows.push(index);
        page.used += remaining;
        break;
      }
      newPage();
    }
  }

  if (input.trailerHeight > 0) {
    if (page.used + input.trailerHeight > pageHeight && !isEmpty()) newPage(false);
    page.hasTrailer = true;
    page.used += input.trailerHeight;
  }
  pages.push(page);
  const last = pages[pages.length - 1];
  return { pages, pageCount: pages.length, lastRatio: Math.min(1, last.used / pageHeight) };
}

export interface SplitChoice {
  rows: FlowRow[];
  allowed: number[];
  flow: FlowResult;
}
export function chooseSessionSplits(input: FlowInput, maxVoidRatio = 0.16): SplitChoice {
  const rows = input.rows.map(row => ({ ...row }));
  const allowed: number[] = [];
  let flow = simulateFlow({ ...input, rows });

  for (let guard = 0; guard < rows.length; guard += 1) {
    let changed = false;
    for (let pageIndex = 0; pageIndex < flow.pages.length - 1; pageIndex += 1) {
      const slack = input.pageHeight - flow.pages[pageIndex].used;
      if (slack <= maxVoidRatio * input.pageHeight) continue;
      const nextPage = flow.pages[pageIndex + 1];
      const first = nextPage.split[0] ?? nextPage.rows[0];
      if (first === undefined) continue;
      const row = rows[first];
      if (!row.avoid || row.keepWithNext || !row.breaks?.length) continue;
      if (row.breaks[0] > slack) continue;
      row.avoid = false;
      allowed.push(first);
      changed = true;
      break;
    }
    if (!changed) break;
    flow = simulateFlow({ ...input, rows });
  }
  return { rows, allowed, flow };
}

export interface JustifyOptions {
  safety?: number;
  maxRowExtra?: number;
  maxItemExtra?: number;
  maxLeadExtra?: number;
  singlePageMinRatio?: number;
}

export interface JustifyPlan {
  rowExtra: number[];
  itemExtra: number[];
  leadExtra: number;
  trailerExtra: number;
}
export function justifyFlow(input: FlowInput, flow: FlowResult, options: JustifyOptions = {}): JustifyPlan {
  const safety = options.safety ?? 8;
  const maxRowExtra = options.maxRowExtra ?? 14;
  const maxItemExtra = options.maxItemExtra ?? 6;
  const maxLeadExtra = options.maxLeadExtra ?? 24;
  const singlePageMinRatio = options.singlePageMinRatio ?? 0.55;
  const rowExtra = input.rows.map(() => 0);
  const itemExtra = input.rows.map(() => 0);
  let leadExtra = 0;
  let trailerExtra = 0;
  const spread = (page: FlowPage, budget: number): number => {
    let slack = budget;
    if (slack <= 0) return 0;
    if (page.hasLead) {
      leadExtra = Math.min(maxLeadExtra, slack * 0.16);
      slack -= leadExtra;
    }
    if (page.rows.length > 0) {
      const each = Math.floor(Math.min(maxRowExtra, slack / page.rows.length) * 10) / 10;
      if (each > 0) {
        for (const index of page.rows) rowExtra[index] = each;
        slack -= each * page.rows.length;
      }
      const totalGaps = page.rows.reduce((sum, idx) => sum + (input.rows[idx]?.itemGaps ?? 0), 0);
      if (slack > 1 && totalGaps > 0) {
        const perGap = Math.floor(Math.min(maxItemExtra, slack / totalGaps) * 10) / 10;
        if (perGap > 0) {
          for (const index of page.rows) {
            const gaps = input.rows[index]?.itemGaps ?? 0;
            if (gaps > 0) {
              itemExtra[index] = perGap;
              slack -= perGap * gaps;
            }
          }
        }
      }
    }
    return slack;
  };

  const last = flow.pages[flow.pages.length - 1];
  const residuals: number[] = [];
  for (const page of flow.pages.slice(0, -1)) {
    residuals.push(Math.max(0, spread(page, input.pageHeight - page.used - safety)));
  }

  const shortSingle = flow.pageCount === 1 && flow.lastRatio < singlePageMinRatio;
  const onlyTrailer = last.rows.length === 0 && last.split.length === 0;
  if (!shortSingle && !onlyTrailer) {
    const sorted = [...residuals].sort((a, b) => a - b);
    const targetVoid = sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : 0;
    const rest = spread(last, input.pageHeight - last.used - safety - targetVoid);
    if (last.hasTrailer) trailerExtra = Math.max(0, Math.floor(rest));
  }

  return { rowExtra, itemExtra, leadExtra: Math.floor(leadExtra), trailerExtra };
}

const AVOID_ROW = /\b(print-session-row|print-absence-row|print-chapter-row|print-separator-row)\b/;
const PAGE_SAFETY_PX = 14;
const MAX_EXPAND = 1.12;

const bodyRows = (root: HTMLElement): HTMLTableRowElement[] =>
  Array.from(root.querySelector<HTMLTableElement>('table.print-table')?.tBodies[0]?.rows ?? []);

function measureDomFlow(root: HTMLElement): FlowInput | null {
  const table = root.querySelector<HTMLTableElement>('table.print-table');
  if (!table || typeof root.getBoundingClientRect !== 'function') return null;
  const rootRect = root.getBoundingClientRect();
  const tableRect = table.getBoundingClientRect();
  if (!rootRect.width || !tableRect) return null;
  const rows = bodyRows(root).map(row => ({
    height: row.getBoundingClientRect().height,
    avoid: AVOID_ROW.test(row.className) && row.dataset.printOversized !== 'true',
    keepWithNext: /\b(print-chapter-row|print-context-row)\b/.test(row.className),
    itemGaps: Math.max(0, row.querySelectorAll('.print-session-item').length - 1),
  }));
  return {
    pageHeight: PRINT_PAGE_HEIGHT_PX - PAGE_SAFETY_PX,
    leadHeight: Math.max(0, tableRect.top - rootRect.top),
    headHeight: table.tHead?.getBoundingClientRect().height ?? 0,
    rows,
    trailerHeight: Math.max(0, rootRect.bottom - tableRect.bottom),
  };
}

export function clearPrintBalance(root: HTMLElement): void {
  for (const row of bodyRows(root)) {
    row.style.removeProperty('--print-row-extra');
    row.style.removeProperty('--print-item-extra');
  }
  root.style.removeProperty('--print-lead-extra');
  root.style.removeProperty('--print-trailer-extra');
}

function applyJustifyPlan(root: HTMLElement, plan: JustifyPlan): void {
  bodyRows(root).forEach((row, index) => {
    const extra = plan.rowExtra[index] ?? 0;
    const item = plan.itemExtra[index] ?? 0;
    if (extra > 0) row.style.setProperty('--print-row-extra', `${extra}px`);
    if (item > 0) row.style.setProperty('--print-item-extra', `${item}px`);
  });
  if (plan.leadExtra !== 0) root.style.setProperty('--print-lead-extra', `${plan.leadExtra}px`);
  if (plan.trailerExtra > 0) root.style.setProperty('--print-trailer-extra', `${plan.trailerExtra}px`);
}
export function balancePrintLayout(root: HTMLElement): void {
  if (!root.isConnected || typeof root.querySelector !== 'function') return;
  const table = root.querySelector<HTMLTableElement>('table.print-table');
  if (!table) return;

  clearPrintBalance(root);
  const applyFactor = (factor: number) => root.style.setProperty('--print-fill', factor.toFixed(4));
  const flowAt = (factor: number) => {
    applyFactor(factor);
    const input = measureDomFlow(root);
    return input ? { input, flow: simulateFlow(input) } : null;
  };

  const base = flowAt(1);
  if (!base || base.input.rows.length === 0) return;

  const freshCapacity = base.input.pageHeight - base.input.headHeight - 2;
  bodyRows(root).forEach((row, index) => {
    if (/\bprint-session-row\b/.test(row.className)) {
      row.dataset.printOversized = String(base.input.rows[index].height > freshCapacity);
    }
  });

  let factor = 1;
  let mode: 'compact' | 'expand' | 'justify' = 'justify';
  const { pageCount, lastRatio } = base.flow;
  const compactThreshold = pageCount <= 3 ? 0.55 : 0.45;
  const minCompact = pageCount === 2 ? 0.80 : 0.84;

  // 1. Compactage : absorbe une dernière feuille peu remplie sur les précédentes.
  if (pageCount > 1 && lastRatio < compactThreshold) {
    root.style.setProperty('--print-lead-extra', '-6px');
    const floor = flowAt(minCompact);
    if (floor && floor.flow.pageCount < pageCount && floor.flow.lastRatio <= 0.96) {
      let low = minCompact;
      let high = 1;
      for (let attempt = 0; attempt < 7; attempt += 1) {
        const middle = (low + high) / 2;
        const trial = flowAt(middle);
        if (trial && trial.flow.pageCount < pageCount && trial.flow.lastRatio <= 0.96) low = middle;
        else high = middle;
      }
      factor = low;
      mode = 'compact';
    } else {
      root.style.removeProperty('--print-lead-extra');
    }
  }

  // 2. Expansion : si le nombre de pages reste fixe et la dernière feuille
  //    manque de matière, on dilate légèrement pour y faire descendre 1–2 lignes.
  const canExpandMulti = mode !== 'compact' && pageCount > 1 && lastRatio < 0.86;
  const canExpandSingle = pageCount === 1 && lastRatio >= 0.55 && lastRatio < 0.88;
  if (canExpandMulti || canExpandSingle) {
    let low = 1;
    let high = MAX_EXPAND;
    let best = 1;
    for (let attempt = 0; attempt < 7; attempt += 1) {
      const middle = (low + high) / 2;
      const trial = flowAt(middle);
      if (trial && trial.flow.pageCount === pageCount && trial.flow.lastRatio <= 0.95) {
        best = middle;
        low = middle;
      } else {
        high = middle;
      }
    }
    if (best > 1.005) {
      factor = best;
      mode = 'expand';
    }
  }

  const settled = flowAt(factor);
  if (!settled) return;
  const plan = justifyFlow(settled.input, settled.flow);
  if (mode === 'compact' && plan.leadExtra === 0) plan.leadExtra = -6;
  applyJustifyPlan(root, plan);

  // Contrôle final : la justification ne doit jamais créer de page supplémentaire.
  const check = measureDomFlow(root);
  if (check && simulateFlow(check).pageCount > settled.flow.pageCount) {
    clearPrintBalance(root);
  }

  root.dataset.printFillMode = mode;
  root.dataset.printFillFactor = factor.toFixed(3);
  root.dataset.printPages = String(settled.flow.pageCount);
}
