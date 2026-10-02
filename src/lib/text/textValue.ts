/**
 * Texte affichable d'une valeur quelle qu'elle soit : JSON importé, données
 * synchronisées, localStorage…
 *
 * Une chaîne passe telle quelle, un nombre fini s'affiche (un titre « 2026 »,
 * une page « 12 ») et tout le reste — objet, tableau, booléen, `null`,
 * `undefined` — devient une chaîne vide.
 *
 * Règle du dépôt : une donnée abîmée ne doit jamais casser un rendu ni
 * afficher « [object Object] » à un enseignant. Les helpers de texte
 * (formules, direction d'écriture, descriptions) passent tous par ici.
 */
export const toDisplayText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  return '';
};
