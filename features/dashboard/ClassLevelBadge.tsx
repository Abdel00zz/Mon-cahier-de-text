import { memo } from 'react';
import { cn } from '@/lib/utils';

interface ClassLevelBadgeProps {
    /** Libellé localisé du palier : « 2e Bac », « Tronc commun », « 2e Collège »… */
    label: string;
    tierKey?: string | null;
    themeTone?: 'sand' | 'mint' | 'sky' | 'lavender' | string;
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
        case 'mint':
            return 'bg-emerald-500/[0.09] text-emerald-900 border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200 dark:border-emerald-400/25';
        case 'sky':
            return 'bg-sky-500/[0.09] text-sky-900 border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-200 dark:border-sky-400/25';
        case 'lavender':
            return 'bg-purple-500/[0.09] text-purple-900 border-purple-400/30 dark:bg-purple-400/10 dark:text-purple-200 dark:border-purple-400/25';
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
 * Couleurs harmonisées pour le numéro de classe (accordées à la teinte du badge).
 */
function getToneGroupNumberClasses(tone?: string): string {
    switch (tone) {
        case 'sand':
            return 'text-amber-700/90 dark:text-amber-300';
        case 'mint':
            return 'text-emerald-700/90 dark:text-emerald-300';
        case 'sky':
            return 'text-sky-700/90 dark:text-sky-300';
        case 'lavender':
            return 'text-purple-700/90 dark:text-purple-300';
        default:
            return 'text-stone-700/80 dark:text-stone-300/80';
    }
}

function getTierGroupNumberClasses(tierKey?: string | null, label?: string): string {
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
            return 'text-emerald-700/90 dark:text-emerald-300';
        case 'firstBac':
            return 'text-sky-700/90 dark:text-sky-300';
        case 'secondBac':
            return 'text-purple-700/90 dark:text-purple-300';
        case 'college':
        case 'college1':
        case 'college2':
        case 'college3':
            return 'text-amber-700/90 dark:text-amber-300';
        case 'prepa':
        case 'prepaFirst':
        case 'prepaSecond':
            return 'text-rose-700/90 dark:text-rose-300';
        default:
            return 'text-stone-700/80 dark:text-stone-300/80';
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
                'keep-level-badge inline-flex items-center justify-center shrink-0 font-sans font-semibold border shadow-2xs select-none transition-colors overflow-visible',
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
                {label}
            </span>
        </span>
    );
});

ClassLevelBadge.displayName = 'ClassLevelBadge';

export interface ClassGroupWatermarkProps {
    group: string;
    label?: string;
    themeTone?: string;
    tierKey?: string | null;
    className?: string;
}

/**
 * Numéro de classe moderne et élégant à côté du titre (ex : « 1 », « 2 », « 3 »).
 * Couleur cohérente avec le badge/thème de la carte, sans boîte, net et lisible.
 */
export const ClassGroupWatermark = memo(({
    group,
    label,
    themeTone,
    tierKey,
    className,
}: ClassGroupWatermarkProps) => {
    const numberColorClasses = themeTone
        ? getToneGroupNumberClasses(themeTone)
        : getTierGroupNumberClasses(tierKey, label);

    return (
        <span
            className={cn(
                'keep-group-watermark inline-flex items-baseline align-baseline select-none font-serif font-bold tabular-nums leading-none ms-1.5',
                numberColorClasses,
                className
            )}
            data-tone={themeTone}
            title={label}
            aria-label={label}
        >
            <bdi dir="ltr">{group}</bdi>
        </span>
    );
});

ClassGroupWatermark.displayName = 'ClassGroupWatermark';
