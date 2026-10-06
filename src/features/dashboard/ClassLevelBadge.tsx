import { memo } from 'react';
import { cn } from '@/lib/utils';
import { formatWithOrdinals } from '@/components/typography/ordinalTypography';

interface ClassLevelBadgeProps {
    /** Libellé localisé du palier : « 2e Bac », « Tronc commun », « 2e Collège »… */
    label: string;
    tierKey?: string | null;
    themeTone?: string;
    compact?: boolean;
    className?: string;
    style?: React.CSSProperties;
    textStyle?: React.CSSProperties;
}

/**
 * Palette cohérente avec le thème visuel de la carte (légère, translucide et raffinée).
 */
function getToneBadgeClasses(tone?: string): string {
    switch (tone) {
        case 'sand':
            return 'bg-amber-500/[0.09] text-amber-900 border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200 dark:border-amber-400/25';
        case 'coral':
            return 'bg-orange-500/[0.09] text-orange-900 border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-200 dark:border-orange-400/25';
        case 'lime':
            return 'bg-lime-500/[0.12] text-lime-900 border-lime-500/30 dark:bg-lime-400/10 dark:text-lime-200 dark:border-lime-400/25';
        case 'mint':
            return 'bg-emerald-500/[0.09] text-emerald-900 border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200 dark:border-emerald-400/25';
        case 'sky':
            return 'bg-sky-500/[0.09] text-sky-900 border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200 dark:border-sky-400/25';
        case 'indigo':
            return 'bg-indigo-500/[0.09] text-indigo-900 border-indigo-400/30 dark:bg-indigo-400/10 dark:text-indigo-200 dark:border-indigo-400/25';
        case 'lavender':
            return 'bg-fuchsia-500/[0.09] text-fuchsia-900 border-fuchsia-400/30 dark:bg-fuchsia-400/10 dark:text-fuchsia-200 dark:border-fuchsia-400/25';
        case 'rose':
            return 'bg-rose-500/[0.09] text-rose-900 border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200 dark:border-rose-400/25';
        default:
            return '';
    }
}

/**
 * Palette sémantique par palier d'enseignement (translucide et moderne).
 */
function getTierBadgeClasses(tierKey?: string | null, label?: string): string {
    const key = tierKey || (
        label?.includes('2') || label?.includes('الثانية')
            ? 'secondBac'
            : label?.includes('1') || label?.includes('الأولى')
                ? 'firstBac'
                : label?.includes('Tronc') || label?.includes('الجذع')
                    ? 'common'
                    : label?.includes('Collège') || label?.includes('إعدادي') || label?.includes('AC')
                        ? 'college'
                        : label?.includes('Prépa') || label?.includes('CPGE')
                            ? 'prepa'
                            : 'default'
    );

    switch (key) {
        case 'common':
            return 'bg-emerald-500/[0.09] text-emerald-900 border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200 dark:border-emerald-400/25';
        case 'firstBac':
            return 'bg-sky-500/[0.09] text-sky-900 border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200 dark:border-sky-400/25';
        case 'secondBac':
            return 'bg-purple-500/[0.09] text-purple-900 border-purple-400/30 dark:bg-purple-400/10 dark:text-purple-200 dark:border-purple-400/25';
        case 'college':
        case 'college1':
        case 'college2':
        case 'college3':
            return 'bg-amber-500/[0.09] text-amber-900 border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200 dark:border-amber-400/25';
        case 'prepa':
        case 'prepaFirst':
        case 'prepaSecond':
            return 'bg-rose-500/[0.09] text-rose-900 border-rose-400/30 dark:bg-rose-400/10 dark:text-rose-200 dark:border-rose-400/25';
        default:
            return 'bg-stone-500/[0.08] text-stone-800 border-stone-300/40 dark:bg-white/10 dark:text-stone-200 dark:border-white/15';
    }
}

/**
 * Badge de palier au format standardisé, sans coupure de texte en bas (préservant les jambages arabes).
 * Coins sobres et moins arrondis (rounded-[3px]).
 */
export const ClassLevelBadge = memo(({ label, tierKey, themeTone, compact = false, className, style, textStyle }: ClassLevelBadgeProps) => {
    const badgeColorClasses = themeTone ? getToneBadgeClasses(themeTone) : getTierBadgeClasses(tierKey, label);

    return (
        <span
            className={cn(
                'keep-level-badge inline-flex items-center justify-center shrink-0 font-lato font-semibold border shadow-2xs select-none transition-colors overflow-visible',
                compact
                    ? 'min-h-[19px] px-1.5 pt-0.5 pb-[2px] rounded-[3px] text-[10px] leading-tight'
                    : 'min-h-[21px] px-2 pt-0.5 pb-[2px] rounded-[3px] text-[10.5px] sm:text-[11px] leading-tight',
                badgeColorClasses,
                className
            )}
            style={style}
            data-level-badge=""
        >
            <span style={textStyle} className="inline-block whitespace-nowrap overflow-visible leading-normal">
                <span className="sr-only">{label}</span>
                <span aria-hidden="true">{formatWithOrdinals(label)}</span>
            </span>
        </span>
    );
});

ClassLevelBadge.displayName = 'ClassLevelBadge';

/** Le numéro de classe s'écrit toujours en chiffres latins (1 2 3), même saisi en chiffres arabes. */
const toLatinDigits = (value: string): string =>
    value.replace(/[\u0660-\u0669\u06F0-\u06F9]/g, digit => String(digit.charCodeAt(0) & 0xF));
export interface ClassGroupWatermarkProps {
    group: string;
    label?: string;
    themeTone?: string;
    tierKey?: string | null;
    className?: string;
    /**
     * Emplacement du numéro :
     * - `inline` : à côté d'un titre (liste des classes) ;
     * - `end` : après le nom ;
     * - `seal` : sceau compact posé juste après le nom, dans la carte (géométrie
     *   et encre portées par `classCards.css`) ;
     * - `background` : décor indépendant, masqué aux lecteurs d’écran.
     */
    variant?: 'inline' | 'end' | 'background' | 'seal';
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
    const isDecorative = variant === 'background' || variant === 'seal';
    return (
        <span
            data-variant={variant}
            className={cn(
                'keep-group-watermark inline-flex items-baseline align-baseline select-none font-serif italic font-normal tracking-tight tabular-nums leading-none',
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
