import { memo } from 'react';
import { cn } from '@/lib/utils';

interface ClassLevelBadgeProps {
    /** Libellé localisé du palier : « 2e Bac », « Tronc commun », « 2e Collège »… */
    label: string;
    /** Variante dense, alignée sur la hauteur des lignes de liste. */
    compact?: boolean;
    className?: string;
}

/**
 * Badge de palier affiché au-dessus de la filière, sur les cartes de classe.
 *
 * Le dégradé n'est pas figé ici : il est composé en CSS à partir des jetons de
 * la carte (`--keep-accent`, `--keep-dark`, `--keep-light`) hérités de son
 * `data-keep-tone`. Chaque badge reprend donc la couleur de sa propre carte,
 * dans les deux thèmes, sans seconde palette à maintenir.
 */
export const ClassLevelBadge = memo(({ label, compact = false, className }: ClassLevelBadgeProps) => (
    <span
        className={cn('keep-level-badge shrink-0', compact && 'keep-level-badge-compact', className)}
        data-level-badge=""
    >
        {label}
    </span>
));

ClassLevelBadge.displayName = 'ClassLevelBadge';

/**
 * Groupe (« 3 », « A ») en filigrane, posé juste après la filière.
 *
 * Un repère discret plutôt qu'un second badge : il précise la classe sans
 * entrer en concurrence visuelle avec le palier. Le libellé accessible dit ce
 * que ce numéro représente.
 */
export const ClassGroupWatermark = memo(({ group, label }: { group: string; label: string }) => (
    <span className="keep-group-watermark" title={label} aria-label={label}>
        {group}
    </span>
));

ClassGroupWatermark.displayName = 'ClassGroupWatermark';
