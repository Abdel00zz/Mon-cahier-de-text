import type { AtomPlacement, PaginationOptions, PaginationPage, PaginationResult, PrintAtom } from './model';

const usableOn = (opts: PaginationOptions, _index: number) =>
  opts.pageHeight - (opts.headerHeight > 0 ? opts.headerHeight - opts.headerOverlap : 0);

/** Hauteur minimale d'un fragment selon sa nature et les règles de veuves/orphelines. */
const lineHeightOf = (atom: PrintAtom): number => (atom.lines > 0 ? atom.height / atom.lines : atom.height);

const minFragment = (atom: PrintAtom, opts: PaginationOptions): number => {
  const lh = lineHeightOf(atom);
  if (atom.kind === 'table-row') return Math.max(lh, Math.min(atom.height, lh * Math.max(1, opts.widowLines)));
  if (atom.kind === 'title') return atom.height;
  return Math.max(lh, Math.min(atom.height, lh * opts.orphanLines));
};

/**
 * Pagination gloutonne, page après page. Les coupes n'ont lieu qu'aux hauteurs
 * fournies par la mesure ; un fragment qui ne respecte pas les veuves/orphelines
 * est renvoyé à la page suivante.
 */
export function paginateAtoms(atoms: readonly PrintAtom[], opts: PaginationOptions): PaginationResult {
  const pages: PaginationPage[] = [];
  let placements: AtomPlacement[] = [];
  let used = 0;
  let pageIndex = 0;

  const flush = () => {
    if (placements.length === 0) return;
    const usable = usableOn(opts, pageIndex);
    pages.push({ placements, usedHeight: used, slack: Math.max(0, usable - used) });
    placements = [];
    used = 0;
    pageIndex += 1;
  };

  for (let i = 0; i < atoms.length; i += 1) {
    const atom = atoms[i];
    const next = atoms[i + 1];
    const required = atom.keepWithNext && next ? atom.height + minFragment(next, opts) : atom.height;
    const usable = usableOn(opts, pageIndex);

    if (used + required <= usable) {
      placements.push({ atom, height: atom.height, start: 0 });
      used += atom.height;
      continue;
    }

    if (placements.length === 0 && !(atom.kind === 'table-row' && atom.splitHeights && atom.splitHeights.length > 0)) {
      // Aucune progression possible sans fragment : on autorise le débordement
      // plutôt qu'une boucle infinie ; l'appelant peut le détecter par la taille.
      placements.push({ atom, height: atom.height, start: 0 });
      used += atom.height;
      continue;
    }

    if (atom.kind === 'table-row' && atom.splitHeights && atom.splitHeights.length > 0) {
      const remaining = usable - used;
      const cut = [...atom.splitHeights]
        .filter(h => h > 0 && h <= remaining && h >= minFragment(atom, opts))
        .at(-1);
      if (cut !== undefined && (!next || !atom.keepWithNext || cut + minFragment(next, opts) <= remaining)) {
        placements.push({ atom, height: cut, start: 0 });
        used += cut;
        // Le reste de la ligne est remis au début de la page suivante.
        atoms = [...atoms];
        (atoms as PrintAtom[])[i] = { ...atom, height: atom.height - cut, splitHeights: (atom.splitHeights ?? []).map(h => Math.max(0, h - cut)).filter((h, idx, arr) => h > 0 && arr[idx - 1] !== h), lines: Math.max(1, atom.lines - 1) };
        i -= 1;
        continue;
      }
    }

    flush();
    i -= 1;
  }

  flush();

  const lastPage = pages.at(-1);
  const lastPageVoid = lastPage ? lastPage.slack : 0;
  const innerVoid = pages.slice(0, -1).reduce((sum, page) => sum + page.slack, 0);
  return { pages, lastPageVoid, innerVoid, pageCount: pages.length };
}
