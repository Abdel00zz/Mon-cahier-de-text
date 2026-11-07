import test from 'node:test';
import assert from 'node:assert/strict';
import {
  balancePrintLayout,
  chooseSessionSplits,
  justifyFlow,
  simulateFlow,
  type FlowInput,
} from '../src/infrastructure/printing/pagination';
import { formatPrintDate, splitPrintDates } from '../src/features/editor/printViewModel';

const page = 1000;
const base = (rows: FlowInput['rows'], extra: Partial<FlowInput> = {}): FlowInput => ({
  pageHeight: page, leadHeight: 200, headHeight: 40, rows, trailerHeight: 90, ...extra,
});

test('une séance insécable qui ne tient pas passe entière à la page suivante, en-tête répété', () => {
  const flow = simulateFlow(base([{ height: 500, avoid: true }, { height: 400, avoid: true }]));
  assert.equal(flow.pageCount, 2);
  assert.deepEqual(flow.pages[0].rows, [0]);
  assert.deepEqual(flow.pages[1].rows, [1]);
  assert.equal(flow.pages[1].used, 40 + 400 + 90, 'thead répété + ligne + signatures');
  assert.ok(flow.pages[1].hasTrailer);
});

test('une ligne libre se fragmente au lieu de laisser un trou', () => {
  const flow = simulateFlow(base([{ height: 600, avoid: true }, { height: 400, avoid: false }]));
  assert.deepEqual(flow.pages[0].split, [1]);
  assert.deepEqual(flow.pages[1].split, [1]);
  assert.equal(flow.pages[0].used, page);
});

test('une séance plus haute qu’une page se fragmente, jamais de boucle infinie', () => {
  const flow = simulateFlow(base([{ height: 2500, avoid: true }], { trailerHeight: 0 }));
  assert.ok(flow.pageCount >= 3);
});

test('un titre de chapitre ou de section de contexte ne reste jamais seul en bas de page', () => {
  const flow = simulateFlow(base([
    { height: 700, avoid: true },
    { height: 40, avoid: true, keepWithNext: true },
    { height: 300, avoid: true },
  ]));
  assert.deepEqual(flow.pages[1].rows, [1, 2]);
});

test('les signatures insécables ouvrent une page sans en-tête de tableau', () => {
  const flow = simulateFlow(base([{ height: 740, avoid: true }], { trailerHeight: 100 }));
  assert.equal(flow.pageCount, 2);
  assert.equal(flow.pages[1].used, 100);
});

test('justification : la dernière page garde le même vide que les précédentes, signatures en bas', () => {
  const rows = [
    { height: 690, avoid: true, itemGaps: 2 },
    { height: 860, avoid: true, itemGaps: 3 },
    { height: 500, avoid: true, itemGaps: 1 },
  ];
  const input = base(rows);
  const flow = simulateFlow(input);
  assert.equal(flow.pageCount, 3);
  const plan = justifyFlow(input, flow, { safety: 8 });
  const ends = flow.pages.map(p => p.used
    + p.rows.reduce((sum, row) => sum + plan.rowExtra[row] + plan.itemExtra[row] * (rows[row].itemGaps ?? 0), 0)
    + (p.hasLead ? plan.leadExtra : 0) + (p.hasTrailer ? plan.trailerExtra : 0));
  ends.forEach((end, index) => assert.ok(end <= page - 8 + 0.5, `page ${index + 1} ne déborde pas (${end})`));
  const voids = ends.map(end => page - end);
  const median = [...voids.slice(0, -1)].sort((a, b) => a - b)[0];
  assert.ok(Math.abs(voids[2] - median) <= 2, `dernier vide ${voids[2]} ≈ vide des pages précédentes ${median}`);
  assert.ok(plan.trailerExtra > 0, 'les signatures descendent');
  assert.ok(plan.rowExtra.every(extra => extra <= 14), 'air plafonné : jamais d’aspect étiré');
});

test('un tirage partiel d’une page peu remplie (nouvelles séances / sélection) n’est pas étiré', () => {
  const input = base([{ height: 120, avoid: true }]);
  const plan = justifyFlow(input, simulateFlow(input));
  assert.equal(plan.trailerExtra, 0);
  assert.deepEqual(plan.rowExtra, [0]);
});

test('coupe intelligente : autorise une coupe aux frontières d’éléments uniquement si le trou dépasse le seuil', () => {
  const input = base([
    { height: 550, avoid: true },
    { height: 350, avoid: true, breaks: [100, 200, 300] },
  ]);
  const split = chooseSessionSplits(input, 0.16);
  assert.deepEqual(split.allowed, [1]);
  assert.equal(split.flow.pages[0].used, 990);
});

test('cellule date multi-séances : découpe proprement deux ou plusieurs dates en FR et AR', () => {
  assert.deepEqual(splitPrintDates(formatPrintDate('Du 2026-09-14 au 2026-09-21', false)), ['14/09/2026', '21/09/2026']);
  assert.deepEqual(splitPrintDates(formatPrintDate('2026-09-14 et 2026-09-21', false)), ['14/09/2026', '21/09/2026']);
  assert.deepEqual(splitPrintDates(formatPrintDate('14/09/2026 و 21/09/2026', true)), ['14/09/2026', '21/09/2026']);
  assert.deepEqual(splitPrintDates(formatPrintDate('2026-09-14', false)), ['14/09/2026']);
});

test('balancePrintLayout : compacte une 2e page presque vide (mode nouvelles séances / sélection)', () => {
  let fill = 1;
  const baseHeights = [220, 220, 220, 160];
  const makeRow = (baseH: number) => {
    const props = new Map<string, string>();
    return {
      className: 'print-session-row new-date-row',
      dataset: {} as Record<string, string>,
      style: {
        setProperty: (k: string, v: string) => { props.set(k, v); },
        removeProperty: (k: string) => { props.delete(k); },
        getPropertyValue: (k: string) => props.get(k) ?? '',
      },
      querySelectorAll: () => [{}, {}],
      getBoundingClientRect: () => ({
        height: baseH * fill + parseFloat(props.get('--print-row-extra') ?? '0') + parseFloat(props.get('--print-item-extra') ?? '0'),
      }),
    };
  };
  const rows = baseHeights.map(makeRow);
  const rootProps = new Map<string, string>();
  const table = {
    tHead: { getBoundingClientRect: () => ({ height: 32 }) },
    tBodies: [{ rows }],
    getBoundingClientRect: () => {
      const lead = 180 * fill + parseFloat(rootProps.get('--print-lead-extra') ?? '0');
      const bodyH = rows.reduce((s, r) => s + r.getBoundingClientRect().height, 0);
      return { top: lead, bottom: lead + 32 + bodyH };
    },
  };
  const root = {
    isConnected: true,
    dataset: {} as Record<string, string>,
    style: {
      setProperty: (k: string, v: string) => {
        rootProps.set(k, v);
        if (k === '--print-fill') fill = parseFloat(v);
      },
      removeProperty: (k: string) => { rootProps.delete(k); },
    },
    getBoundingClientRect: () => {
      const tr = table.getBoundingClientRect();
      const trailer = 72 * fill + parseFloat(rootProps.get('--print-trailer-extra') ?? '0');
      return { width: 718, top: 0, bottom: tr.bottom + trailer };
    },
    querySelector: (sel: string) => sel === 'table.print-table' ? table : null,
  };

  balancePrintLayout(root as unknown as HTMLElement);
  assert.equal(root.dataset.printFillMode, 'compact');
  assert.equal(root.dataset.printPages, '1');
  assert.ok(Number(root.dataset.printFillFactor) < 1 && Number(root.dataset.printFillFactor) >= 0.8);
});
