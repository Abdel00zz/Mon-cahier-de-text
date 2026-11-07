import type { PaginationOptions, PaginationPage } from './model';

export interface JustifiedPage extends PaginationPage {
  /** Espace distribué entre les blocs/lignes. */
  extra: number;
}

/**
 * Répartit le vide restant de chaque page entre les interstices, pondéré par
 * la capacité d'étirement de chaque bloc. La dernière page n'est pas étirée
 * au-delà de son contenu naturel si elle doit être supprimée par le compactage.
 */
export function justifyPages(pages: PaginationPage[], opts: PaginationOptions, fillLastPage: boolean): JustifiedPage[] {
  return pages.map((page, index) => {
    const isLast = index === pages.length - 1;
    const target = (isLast && !fillLastPage) ? page.usedHeight : opts.pageHeight - opts.headerHeight + opts.headerOverlap;
    const extra = Math.max(0, target - page.usedHeight);
    return { ...page, extra };
  });
}
