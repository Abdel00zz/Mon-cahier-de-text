/** Hauteur utile d'une page A4 : 297 mm − 10 mm haut − 12 mm bas. */
const A4_PRINT_CONTENT_HEIGHT_MM = 275;
const MM_TO_PX = 96 / 25.4;
export const PRINT_PAGE_HEIGHT_PX = A4_PRINT_CONTENT_HEIGHT_MM * MM_TO_PX;

type PrintFillMode = 'none' | 'fill' | 'compact';

export interface PrintFillPlan {
  mode: PrintFillMode;
  /** Nombre de pages visé après ajustement. */
  targetPages: number;
  /** Hauteur totale visée, en pixels CSS. */
  targetHeight: number;
}

const SAFETY_GAP_PX = 4;

/**
 * Décide s'il faut étirer le rendu pour remplir la dernière page, ou le
 * compacter pour supprimer une dernière page presque vide.
 *
 * - dernière page < 45 % : on tente de la faire disparaître ;
 * - sinon : on étire jusqu'au bas de la page courante, dans une limite douce.
 */
export function planPrintFill(contentHeight: number, pageHeight = PRINT_PAGE_HEIGHT_PX): PrintFillPlan {
  if (!Number.isFinite(contentHeight) || contentHeight <= 0 || !Number.isFinite(pageHeight) || pageHeight <= 0) {
    return { mode: 'none', targetPages: 1, targetHeight: 0 };
  }
  const pages = Math.max(1, Math.ceil(contentHeight / pageHeight));
  if (pages <= 1) return { mode: 'none', targetPages: 1, targetHeight: contentHeight };
  const lastPageHeight = contentHeight - (pages - 1) * pageHeight;
  const lastPageRatio = lastPageHeight / pageHeight;
  if (lastPageRatio < 0.45) {
    return {
      mode: 'compact',
      targetPages: pages - 1,
      targetHeight: Math.max(0, (pages - 1) * pageHeight - SAFETY_GAP_PX),
    };
  }
  return {
    mode: 'fill',
    targetPages: pages,
    targetHeight: Math.max(0, pages * pageHeight - SAFETY_GAP_PX),
  };
}

export const pageCountFor = (height: number, pageHeight = PRINT_PAGE_HEIGHT_PX): number =>
  Math.max(1, Math.ceil(Math.max(0, height) / pageHeight));
