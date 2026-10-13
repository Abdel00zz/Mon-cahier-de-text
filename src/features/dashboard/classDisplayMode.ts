/**
 * Dispositions du tableau de bord : la liste, une carte par ligne, deux cartes
 * par ligne. Source unique du type et de la validation du stockage local ; le
 * choix se fait dans le menu d'actions (`DashboardActionsMenu`).
 */

const CLASS_DISPLAY_MODES = ['list', 'single', 'double'] as const;

export type ClassDisplayMode = (typeof CLASS_DISPLAY_MODES)[number];

/** Une valeur relue du stockage local n'est retenue que si elle est connue. */
export const isClassDisplayMode = (value: unknown): value is ClassDisplayMode =>
    typeof value === 'string' && (CLASS_DISPLAY_MODES as readonly string[]).includes(value);
