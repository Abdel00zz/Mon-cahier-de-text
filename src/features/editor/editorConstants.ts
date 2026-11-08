/**
 * Constantes partagées du tableau de l'éditeur.
 *
 * Une seule source de largeurs pour toute l'application : `.editor-table-grid`
 * résout `--cdt-table-cols`, redéfini par `index.css` pour le téléphone
 * (largeurs MINIMALES comprises) puis pour le desktop. Des pourcentages
 * codés en dur dans les composants écrasaient ces bornes sur téléphone et
 * tassaient les colonnes — donc les rails et la lisibilité.
 */
export const TABLE_GRID_CLASS = 'editor-table-grid';
