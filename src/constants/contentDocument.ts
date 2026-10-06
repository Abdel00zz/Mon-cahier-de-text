/**
 * Bornes des documents pédagogiques rédigés par le professeur (devoir surveillé,
 * devoir maison, olympiade, corrigé).
 *
 * Une source est transportée dans le blob de réglages synchronisé, dont le
 * budget de push est de 700 000 octets par lot : 20 000 caractères par document
 * laissent une marge confortable, même avec plusieurs documents dans une classe.
 * La même constante sert au serveur (validation stricte) et à l'interface
 * (compteur et avertissement) — une seule vérité, donc aucun décalage possible.
 */
export const MAX_CONTENT_DOCUMENT_CHARS = 20000;

/** Seuil d'alerte : « il reste de la place » se dit AVANT la limite dure. */
export const CONTENT_DOCUMENT_WARN_CHARS = 16000;
