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

/** Langue du contenu pédagogique déduite de son sens d'écriture (FR ↔ AR). */
export const contentLocaleFromDirection = (direction: ContentDirection): AppLocale =>
  direction === 'rtl' ? 'ar' : 'fr';

export const isContentDirection = (value: unknown): value is ContentDirection =>
  value === 'rtl' || value === 'ltr';

/** Lit une préférence déjà sauvegardée sans faire confiance aux données brutes. */
export const readStoredContentDirection = (value: unknown): ContentDirection | undefined =>
  isRecord(value) && isContentDirection(value.contentDirection)
    ? value.contentDirection
    : undefined;

const readText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const MAX_SAMPLED_TEXTS = 16;

/**
 * Parcourt l'arbre du cahier et collecte jusqu'à `MAX_SAMPLED_TEXTS` intitulés
 * exploitables (titres, noms, contenus). Les dates et numéros isolés
 * n'influencent pas le résultat : seuls les caractères à écriture forte
 * (arabe / latin) sont comptés lors de l'agrégation.
 */
const collectContentTexts = (node: unknown, out: string[] = []): string[] => {
  if (out.length >= MAX_SAMPLED_TEXTS) return out;
  if (Array.isArray(node)) {
    for (const item of node) {
      collectContentTexts(item, out);
      if (out.length >= MAX_SAMPLED_TEXTS) return out;
    }
    return out;
  }
  if (!isRecord(node)) return out;

  for (const key of ['title', 'name', 'content'] as const) {
    const text = readText(node[key]);
    if (text) {
      out.push(text);
      if (out.length >= MAX_SAMPLED_TEXTS) return out;
    }
  }

  for (const key of ['sections', 'subsections', 'subsubsections', 'items'] as const) {
    collectContentTexts(node[key], out);
  }

  return out;
};

/**
 * Détermine l'écriture dominante du cahier en agrégeant le signal sur plusieurs
 * intitulés (et non le seul premier titre) : un intitulé français isolé en tête
 * ne bascule plus un cahier arabe en LTR, et réciproquement. L'arabe garde
 * priorité lorsqu'il ouvre le texte ou représente au moins autant de lettres
 * que le latin — utile pour « الدرس 1 : fonctions f(x) ».
 */
export const detectContentDirection = (
  content: unknown,
  fallback: ContentDirection = 'ltr',
): ContentDirectionDetection => {
  const texts = collectContentTexts(content);
  const title = texts[0] ?? '';

  let arabicCount = 0;
  let latinCount = 0;
  let firstStrongDirection: ContentDirection | undefined;

  for (const text of texts) {
    for (const character of Array.from(text)) {
      if (ARABIC_CHARACTER.test(character)) {
        arabicCount += 1;
        firstStrongDirection ??= 'rtl';
      } else if (LATIN_CHARACTER.test(character)) {
        latinCount += 1;
        firstStrongDirection ??= 'ltr';
      }
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
