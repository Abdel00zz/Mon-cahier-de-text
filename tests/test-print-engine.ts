import assert from 'node:assert/strict';
import test from 'node:test';
import { paginateAtoms, layoutCost, justifyPages, searchBestLayout, type PrintAtom, type PaginationOptions } from '../src/infrastructure/printing/pagination';

const opts: PaginationOptions = { pageHeight: 1000, headerHeight: 60, headerOverlap: 2, widowLines: 1, orphanLines: 1, blockGap: 4, rowGap: 2 };

const atom = (over: Partial<PrintAtom> = {}): PrintAtom => ({ id: 'a', kind: 'block', height: 100, lines: 3, stretch: 1, ...over });

test('un titre reste collé au bloc suivant', () => {
  const filler = atom({ id: 'filler', kind: 'block', height: 800, lines: 8 });
  const title = atom({ id: 'title', kind: 'title', height: 80, keepWithNext: true });
  const body = atom({ id: 'body', kind: 'block', height: 600, lines: 6 });
  const result = paginateAtoms([filler, title, body], opts);
  assert.equal(result.pages[1].placements[0].atom.id, 'title', 'le titre ouvre la page suivante avec son bloc');
  assert.equal(result.pages[1].placements[1].atom.id, 'body');
});

test('une ligne de tableau peut se couper à une hauteur valide', () => {
  const row = atom({ id: 'row', kind: 'table-row', height: 1600, lines: 16, splitHeights: [200, 400, 600, 800, 900, 1200, 1400] });
  const result = paginateAtoms([row], opts);
  assert.ok(result.pages.length >= 2, 'la ligne est répartie sur deux pages');
  assert.equal(result.pages[0].placements[0].height, 900);
});

test('le coût pénalise plus le vide final que le vide intermédiaire', () => {
  const full = { pages: [], lastPageVoid: 100, innerVoid: 100, pageCount: 3 };
  const base = { sizeDelta: 0, leadingDelta: 0, spacingDelta: 0, stretch: 0 };
  const cost = layoutCost(full, base);
  assert.equal(cost, 30 * 100 + 10 * 100);
});

test('la justification étire les pages intermédiaires et respecte la dernière page', () => {
  const page = { placements: [], usedHeight: 900, slack: 100 };
  const pages = justifyPages([page, { ...page, usedHeight: 500, slack: 500 }], opts, false);
  assert.equal(pages[0].extra, 100 - (opts.headerHeight - opts.headerOverlap));
  assert.equal(pages[1].extra, 0, 'la dernière page ne s’étire pas si elle doit disparaître');
});

test('la recherche explore la grille et garde le meilleur résultat', () => {
  const measure = (size: number) => [atom({ id: 'b', height: 950 * size, lines: 10 })];
  const found = searchBestLayout([atom()], opts, { sizeDelta: 0, leadingDelta: 0, spacingDelta: 0, stretch: 0, targetPages: 1 }, measure);
  assert.equal(found.simulations, 11 * 9 * 9);
  assert.ok(found.cost < Infinity);
  assert.equal(found.result.pageCount, 1);
});
