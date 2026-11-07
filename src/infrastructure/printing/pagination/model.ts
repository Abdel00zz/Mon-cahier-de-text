type AtomKind = 'title' | 'block' | 'list-item' | 'table-row';

export interface PrintAtom {
  id: string;
  kind: AtomKind;
  /** Hauteur totale, mesurée (px). */
  height: number;
  /** Nombre de lignes logiques (pour veuves/orphelines). */
  lines: number;
  /** Une ligne de tableau peut se couper ; liste des hauteurs de coupes valides, croissante. */
  splitHeights?: number[];
  /** Le titre doit rester avec le bloc suivant. */
  keepWithNext?: boolean;
  /** Capacité relative à absorber l'espacement vertical (1 = par défaut). */
  stretch: number;
}

export interface PaginationOptions {
  pageHeight: number;
  /** Hauteur d'en-tête répété (0 si absent). */
  headerHeight: number;
  /** Chevauchement de bordure entre l'en-tête et la première ligne. */
  headerOverlap: number;
  /** Minimum de lignes conservées en bas d'un paragraphe. */
  widowLines: number;
  /** Minimum de lignes conservées en haut d'un paragraphe. */
  orphanLines: number;
  /** Espacement minimal entre deux blocs (px). */
  blockGap: number;
  /** Espacement minimal entre deux lignes de tableau (px). */
  rowGap: number;
}

export interface AtomPlacement {
  atom: PrintAtom;
  /** Hauteur effectivement utilisée (peut être une coupe). */
  height: number;
  /** Début du fragment dans l'atome (0 = entier). */
  start: number;
}

export interface PaginationPage {
  placements: AtomPlacement[];
  /** Hauteur de contenu utilisée (sans en-tête ni espaces distribués). */
  usedHeight: number;
  /** Espace restant avant justification. */
  slack: number;
}

export interface PaginationResult {
  pages: PaginationPage[];
  /** Vide non rattrapable sur la dernière page (px). */
  lastPageVoid: number;
  /** Somme du vide des pages intermédiaires (px). */
  innerVoid: number;
  /** Pages consommées. */
  pageCount: number;
}
