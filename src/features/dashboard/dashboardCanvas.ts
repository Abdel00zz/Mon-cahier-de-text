import type { CSSProperties } from 'react';

/** Variables consommées par `dashboardCanvas.css`. Objet gelé : une seule
 *  référence, aucune allocation pendant les rendus. Les deux thèmes reprennent
 *  le fond neutre de l'interface pour détacher les fiches de cours. */
export const DASHBOARD_CANVAS_STYLE = Object.freeze({
    '--canvas-base': 'hsl(var(--background))',
    '--canvas-base-dark': 'hsl(var(--background))',
} as CSSProperties);
