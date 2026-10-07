import React from 'react';
import { cn } from '@/lib/utils';
import type { BookOpen } from '@/components/ui/icons';

/**
 * EN-TÊTE D'UNE FAMILLE D'ÉVALUATIONS — la même ligne partout.
 *
 * « Devoirs et évaluations » et « Activités pédagogiques » sont les deux
 * familles du cahier de textes. Elles se lisent de la même façon dans la page
 * principale ET dans la fenêtre de création : une pastille d'icône teintée du
 * ton de la famille, le titre, et le compte. Deux endroits, une seule règle —
 * c'est ce qui fait qu'un professeur reconnaît l'endroit où il se trouve.
 *
 * Le ton passe par `evaluation-tone` + `data-tone` : la palette de teintes est
 * partagée avec les cartes (`index.css`), donc aucune couleur locale à tenir.
 * L'icône est décorative — le titre porte le sens pour un lecteur d'écran — et
 * le compte, lui, reste lisible quand il est informatif (« 12 devoirs »).
 */
export interface KindGroupHeaderProps {
    title: string;
    tone: string;
    Icon: typeof BookOpen;
    /** Compte traduit et lisible par les lecteurs d'écran (« 12 devoirs »). */
    countLabel?: string;
    /** Nombre de natures : pastille chiffrée, purement décorative. */
    count?: number;
    /** Niveau de titre, pour ne pas casser la hiérarchie de la page d'accueil. */
    headingLevel?: 3 | 4;
    titleId?: string;
    className?: string;
}

export const KindGroupHeader: React.FC<KindGroupHeaderProps> = ({
    title,
    tone,
    Icon,
    countLabel,
    count,
    headingLevel = 3,
    titleId,
    className,
}) => {
    const Heading = headingLevel === 4 ? 'h4' : 'h3';
    return (
        <div className={cn('kind-group evaluation-tone', className)} data-tone={tone}>
            <span className="kind-group__badge" aria-hidden="true"><Icon /></span>
            <Heading id={titleId} className="evaluations-category-title min-w-0 flex-1 text-foreground">{title}</Heading>
            {countLabel !== undefined ? (
                <span className="kind-group__count">{countLabel}</span>
            ) : count !== undefined ? (
                <span className="kind-group__count" aria-hidden="true">{count}</span>
            ) : null}
        </div>
    );
};
