/**
 * Ligne libre : un contenu du professeur posé **hors du plan** du cours.
 *
 * Elle n'appartient PAS à la hiérarchie (chapitre → section → sous-section →
 * sous-sous-section → élément) : ni parent, ni niveau, ni numéro, ni
 * progression, ni date de séance. Elle est reconnue UNIQUEMENT par son type,
 * jamais par sa position dans l'arbre, afin qu'aucune règle de structure ne
 * puisse la prendre pour un nœud du plan.
 *
 * Ce module est volontairement sans aucune dépendance : `lessonRows` peut
 * l'importer sans créer de cycle (il est la base de tous les modules de plan).
 */
export const FREE_TYPE = 'free';

export const isFreeContent = (value: unknown): boolean =>
  typeof value === 'object' && value !== null && (value as { type?: unknown }).type === FREE_TYPE;
