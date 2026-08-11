import type { AppLocale, ContentDirection } from '../types.js';

export interface ContentDirectionDetection {
  direction: ContentDirection;
  /** Premier titre exploitable : c'est la référence la plus fiable d'un import. */
  title: string;
  /** Indique que la direction vient d'une écriture détectée et non du secours local. */
  detected: boolean;
}

const ARABIC_CHARACTER = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/u;
const LATIN_CHARACTER = /[A-Za-zÀ-ÖØ-öø-ÿ]/u;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Direction utilisée quand un cahier est vide ou qu'aucune écriture n'est détectable. */
export const defaultContentDirection = (locale?: AppLocale): ContentDirection =>
  locale === 'ar' ? 'rtl' : 'ltr';

export const isContentDirection = (value: unknown): value is ContentDirection =>
  value === 'rtl' || value === 'ltr';

/** Lit une préférence déjà sauvegardée sans faire confiance aux données brutes. */
export const readStoredContentDirection = (value: unknown): ContentDirection | undefined =>
  isRecord(value) && isContentDirection(value.contentDirection)
    ? value.contentDirection
    : undefined;

const readText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/**
 * Le premier titre réel suffit à classer un cahier scolaire : il est stable,
 * humainement choisi et évite d'être trompé par une date, un numéro ou une
 * petite annotation dans une autre langue.
 */
export const findPrimaryContentTitle = (value: unknown): string => {
  const visit = (node: unknown): string => {
    if (Array.isArray(node)) {
      for (const item of node) {
        const title = visit(item);
        if (title) return title;
      }
      return '';
    }
    if (!isRecord(node)) return '';

    for (const key of ['title', 'name', 'content'] as const) {
      const text = readText(node[key]);
      if (text) return text;
    }

    for (const key of ['sections', 'subsections', 'subsubsections', 'items'] as const) {
      const title = visit(node[key]);
      if (title) return title;
    }

    return '';
  };

  return visit(value);
};

/**
 * Détermine l'écriture dominante du titre. L'arabe garde priorité lorsqu'il
 * ouvre le titre ou représente au moins autant de lettres que le latin —
 * utile pour « الدرس 1 : fonctions f(x) ». À l'inverse, un intitulé français
 * contenant un mot arabe isolé reste LTR.
 */
export const detectContentDirection = (
  content: unknown,
  fallback: ContentDirection = 'ltr',
): ContentDirectionDetection => {
  const title = findPrimaryContentTitle(content);
  if (!title) return { direction: fallback, title: '', detected: false };

  let arabicCount = 0;
  let latinCount = 0;
  let firstStrongDirection: ContentDirection | undefined;

  for (const character of Array.from(title)) {
    if (ARABIC_CHARACTER.test(character)) {
      arabicCount += 1;
      firstStrongDirection ??= 'rtl';
    } else if (LATIN_CHARACTER.test(character)) {
      latinCount += 1;
      firstStrongDirection ??= 'ltr';
    }
  }

  if (arabicCount === 0 && latinCount === 0) {
    return { direction: fallback, title, detected: false };
  }

  const direction: ContentDirection = arabicCount > 0 && (
    latinCount === 0 || arabicCount >= latinCount || firstStrongDirection === 'rtl'
  )
    ? 'rtl'
    : 'ltr';

  return { direction, title, detected: true };
};
