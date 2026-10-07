import React from 'react';
import { cn } from '@/lib/utils';

/**
 * EN-TÊTE D'UNE FAMILLE D'ÉVALUATIONS — la même ligne partout.
 *
 * « Devoirs et évaluations » et « Activités pédagogiques » sont les deux
 * familles du cahier de textes. Elles se lisent de la même façon dans la page
 * principale ET dans la fenêtre de création : le titre, puis le compte.
 *
 * AUCUNE ICÔNE À CÔTÉ DU TITRE. La pastille de famille répétait en image ce que
 * le titre dit déjà en toutes lettres, à chaque écran et à chaque zone : le titre
 * d'une CATÉGORIE se lit, il ne se dessine pas. Les icônes restent là où elles
 * servent — sur les grandes cartes de nature, que l'on choisit d'un coup d'œil,
 * et dans les commandes.
 *
 * Le ton de la famille subsiste, mais uniquement sur le COMPTE (pastille légère
 * du ton) : la palette est partagée avec les cartes (`index.css`), donc aucune
 * couleur locale à tenir, et l'identité de la famille reste lisible sans image.
 */
export interface KindGroupHeaderProps {
    title: string;
    /** Ton de la famille, appliqué au compte — jamais au titre. */
    tone: string;
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
    countLabel,
    count,
    headingLevel = 3,
    titleId,
    className,
}) => {
    const Heading = headingLevel === 4 ? 'h4' : 'h3';
    return (
        <div className={cn('kind-group evaluation-tone', className)} data-tone={tone}>
            <Heading id={titleId} className="evaluations-category-title min-w-0 flex-1 text-foreground">{title}</Heading>
            {countLabel !== undefined ? (
                <span className="kind-group__count">{countLabel}</span>
            ) : count !== undefined ? (
                <span className="kind-group__count" aria-hidden="true">{count}</span>
            ) : null}
        </div>
    );
};
