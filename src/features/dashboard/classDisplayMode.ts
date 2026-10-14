/**
 * Dispositions du tableau de bord : une liste ou une grille de une à trois
 * cartes par ligne. Source unique du type et de la validation du stockage ; le
 * choix se fait dans la barre d'actions (`DashboardActions`).
 */

export const CLASS_DISPLAY_MODES = ['triple', 'double', 'single', 'list'] as const;

export type ClassDisplayMode = (typeof CLASS_DISPLAY_MODES)[number];

/** Une valeur relue du stockage local n'est retenue que si elle est connue. */
export const isClassDisplayMode = (value: unknown): value is ClassDisplayMode =>
    typeof value === 'string' && (CLASS_DISPLAY_MODES as readonly string[]).includes(value);

export const nextClassDisplayMode = (mode: ClassDisplayMode): ClassDisplayMode =>
    CLASS_DISPLAY_MODES[(CLASS_DISPLAY_MODES.indexOf(mode) + 1) % CLASS_DISPLAY_MODES.length];
