import { memo } from 'react';
import { cn } from '@/lib/utils';

/** Le numéro de classe s'écrit toujours en chiffres latins (1 2 3), même saisi en chiffres arabes. */
const toLatinDigits = (value: string): string =>
    value.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, digit => String(digit.charCodeAt(0) & 0xF));
interface ClassGroupWatermarkProps {
    group: string;
    label?: string;
    themeTone?: string;
    tierKey?: string | null;
    className?: string;
    /**
     * Emplacement du numéro :
     * - `inline` : à côté d'un titre (liste des classes) ;
     * - `end` : après le nom ;
     * - `engraved` : grand chiffre gravé, en filigrane, juste après le nom dans
     *   la carte (géométrie, encre et gravure portées par `classCards.css`) ;
     * - `background` : décor indépendant, masqué aux lecteurs d’écran.
     */
    variant?: 'inline' | 'end' | 'background' | 'engraved';
}

/**
 * Numéro de classe : un chiffre écrit à l'encre, sans pastille ni cadre.
 * L'encre et le contour viennent de la palette (`index.css`), donc du thème :
 * noir chaud en clair, ivoire en sombre, pleinement opaque, détouré d'un filet
 * couleur carte. Le ton de la classe reste porté par la carte elle-même.
 */
export const ClassGroupWatermark = memo(({
    group,
    label,
    themeTone,
    tierKey,
    className,
    variant = 'inline',
}: ClassGroupWatermarkProps) => {
    // Le nom d'usage lu par les lecteurs d'écran contient DÉJÀ le groupe : un
    // décor (filigrane de fond, sceau de la carte) ne doit pas le répéter.
    const isDecorative = variant === 'background' || variant === 'engraved';
    return (
        <span
            data-variant={variant}
            className={cn(
                'keep-group-watermark inline-flex items-baseline align-baseline select-none font-sans font-bold tracking-tight tabular-nums leading-none',
                variant === 'end' && 'ms-1.5 sm:ms-2 text-[1.8em] sm:text-[2.2em] -translate-y-[2px] sm:-translate-y-[3px]',
                variant === 'inline' && 'ms-1.5 text-[1.25em] sm:text-[1.35em]',
                className
            )}
            data-tone={themeTone}
            data-tier={tierKey ?? undefined}
            title={label}
            aria-label={isDecorative ? undefined : label}
            aria-hidden={isDecorative ? true : undefined}
        >
            <bdi dir="ltr">{toLatinDigits(group)}</bdi>
        </span>
    );
});

ClassGroupWatermark.displayName = 'ClassGroupWatermark';
