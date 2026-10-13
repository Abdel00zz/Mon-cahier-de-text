/*
 * IDENTIFIANTS DU DEVOIR MAISON — module sans dépendance (chargé aussi par l'API : imports relatifs
 * avec extension, voir `check:api`).
 *
 * Le document du corrigé vit dans `assessmentDocuments[classe]` sous la clé `<devoir>:correction` :
 * même enregistrement que le devoir, aucun nouveau champ à synchroniser avec le cloud.
 */
const CORRECTION_SUFFIX = ':correction';

/** Clé du document du corrigé d'un devoir maison. */
export const homeworkCorrectionDocumentId = (id: string): string => `${id}${CORRECTION_SUFFIX}`;

/** Devoir auquel appartient une clé de document : `x:correction` → `x`, toute autre clé inchangée. */
export const homeworkDocumentOwnerId = (key: string): string =>
  key.endsWith(CORRECTION_SUFFIX) ? key.slice(0, -CORRECTION_SUFFIX.length) : key;