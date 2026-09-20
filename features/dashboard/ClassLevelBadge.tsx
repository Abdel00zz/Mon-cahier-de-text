import { memo } from 'react';
import { cn } from '@/lib/utils';
import { formatWithOrdinals } from '@/utils/ordinalTypography';

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
 * Couleurs harmonisées pour le numéro de classe (accordées à la teinte du badge).
 */
function getToneGroupNumberClasses(tone?: string): string {
    switch (tone) {
        case 'sand':
            return 'text-amber-800/95 dark:text-amber-200';
        case 'coral':
            return 'text-orange-800/95 dark:text-orange-200';
        case 'lime':
            return 'text-lime-800/95 dark:text-lime-200';
        case 'mint':
            return 'text-emerald-800/95 dark:text-emerald-200';
        case 'sky':
            return 'text-sky-800/95 dark:text-sky-200';
        case 'indigo':
            return 'text-indigo-800/95 dark:text-indigo-200';
        case 'lavender':
            return 'text-fuchsia-800/95 dark:text-fuchsia-200';
        case 'rose':
            return 'text-rose-800/95 dark:text-rose-200';
        default:
            return 'text-stone-800/90 dark:text-stone-100';
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
            return 'text-emerald-800/95 dark:text-emerald-200';
        case 'firstBac':
            return 'text-sky-800/95 dark:text-sky-200';
        case 'secondBac':
            return 'text-purple-800/95 dark:text-purple-200';
        case 'college':
        case 'college1':
        case 'college2':
        case 'college3':
            return 'text-amber-800/95 dark:text-amber-200';
        case 'prepa':
        case 'prepaFirst':
        case 'prepaSecond':
            return 'text-rose-800/95 dark:text-rose-200';
        default:
            return 'text-stone-800/90 dark:text-stone-100';
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

export interface ClassGroupWatermarkProps {
    group: string;
    label?: string;
    themeTone?: string;
    tierKey?: string | null;
    className?: string;
    /**
     * Emplacement du numéro :
     * - `inline` : à côté d'un titre (liste des classes) ;
     * - `end`    : juste après le nom, comme un filigrane majestueux et chic
     *              (plus grand, en italique serif distingué).
     */
    variant?: 'inline' | 'end';
}

/**
 * Numéro de classe chic, italique et majestueux (façon belle édition scolaire).
 * Typographie serif italique fluide, teinté harmonieusement avec le thème de la carte.
 */
export const ClassGroupWatermark = memo(({
    group,
    label,
    themeTone,
    tierKey,
    className,
    variant = 'inline',
}: ClassGroupWatermarkProps) => {
    const numberColorClasses = themeTone
        ? getToneGroupNumberClasses(themeTone)
        : getTierGroupNumberClasses(tierKey, label);

    return (
        <span
            data-variant={variant}
            className={cn(
                'keep-group-watermark inline-flex items-baseline align-baseline select-none font-serif italic font-normal tracking-tight tabular-nums leading-none',
                variant === 'end' && 'ms-1.5 sm:ms-2 text-[1.8em] sm:text-[2.2em] -translate-y-[2px] sm:-translate-y-[3px]',
                variant === 'inline' && 'ms-1.5 text-[1.25em] sm:text-[1.35em]',
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
