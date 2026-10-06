/**
 * Dispositions du tableau de bord : la liste, une carte par ligne, deux cartes
 * par ligne. Source unique du type, de la validation du stockage local et du
 * CYCLE parcouru par le bouton unique (`ClassDisplayToggle`) — un seul geste,
 * trois états, aucun menu.
 */

export const CLASS_DISPLAY_MODES = ['list', 'single', 'double'] as const;

export type ClassDisplayMode = (typeof CLASS_DISPLAY_MODES)[number];

/** Ordre du cycle : du plus aéré au plus dense, puis retour aux deux colonnes. */
const NEXT_MODE: Record<ClassDisplayMode, ClassDisplayMode> = {
    double: 'single',
    single: 'list',
    list: 'double',
};

/** Une valeur relue du stockage local n'est retenue que si elle est connue. */
export const isClassDisplayMode = (value: unknown): value is ClassDisplayMode =>
    typeof value === 'string' && (CLASS_DISPLAY_MODES as readonly string[]).includes(value);

/** Disposition suivante — le bouton n'a jamais besoin de connaître son menu. */
export const nextClassDisplayMode = (mode: ClassDisplayMode): ClassDisplayMode => NEXT_MODE[mode];
