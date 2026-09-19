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
 * Palette cohérente avec le thème visuel de la carte (lumineuse, moins foncée et attractive).
 */
export function getToneBadgeClasses(tone?: string): string {
    switch (tone) {
        case 'sand':
            return 'bg-amber-100/70 text-amber-800 border-amber-300/60 dark:bg-amber-400/15 dark:text-amber-200 dark:border-amber-400/30';
        case 'mint':
            return 'bg-emerald-100/70 text-emerald-800 border-emerald-300/60 dark:bg-emerald-400/15 dark:text-emerald-200 dark:border-emerald-400/30';
        case 'sky':
            return 'bg-sky-100/70 text-sky-800 border-sky-300/60 dark:bg-sky-400/15 dark:text-sky-200 dark:border-sky-400/30';
        case 'lavender':
            return 'bg-purple-100/70 text-purple-800 border-purple-300/60 dark:bg-purple-400/15 dark:text-purple-200 dark:border-purple-400/30';
        default:
            return '';
    }
}

/**
 * Palette sémantique par palier d'enseignement (moins foncée et moderne).
 */
export function getTierBadgeClasses(tierKey?: string | null, label?: string): string {
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
            return 'bg-emerald-100/70 text-emerald-800 border-emerald-300/60 dark:bg-emerald-400/15 dark:text-emerald-200 dark:border-emerald-400/30';
        case 'firstBac':
            return 'bg-sky-100/70 text-sky-800 border-sky-300/60 dark:bg-sky-400/15 dark:text-sky-200 dark:border-sky-400/30';
        case 'secondBac':
            return 'bg-purple-100/70 text-purple-800 border-purple-300/60 dark:bg-purple-400/15 dark:text-purple-200 dark:border-purple-400/30';
        case 'college':
        case 'college1':
        case 'college2':
        case 'college3':
            return 'bg-amber-100/70 text-amber-800 border-amber-300/60 dark:bg-amber-400/15 dark:text-amber-200 dark:border-amber-400/30';
        case 'prepa':
        case 'prepaFirst':
        case 'prepaSecond':
            return 'bg-rose-100/70 text-rose-800 border-rose-300/60 dark:bg-rose-400/15 dark:text-rose-200 dark:border-rose-400/30';
        default:
            return 'bg-stone-100/80 text-stone-700 border-stone-200 dark:bg-white/10 dark:text-stone-200 dark:border-white/15';
    }
}

/**
 * Badge de palier au format standardisé, sans coupure de texte en bas (préservant les jambages arabes).
 */
export const ClassLevelBadge = memo(({ label, tierKey, themeTone, compact = false, className, style, textStyle }: ClassLevelBadgeProps) => {
    const badgeColorClasses = themeTone ? getToneBadgeClasses(themeTone) : getTierBadgeClasses(tierKey, label);

    return (
        <span
            className={cn(
                'keep-level-badge inline-flex items-center justify-center shrink-0 font-sans font-semibold border shadow-2xs select-none transition-colors overflow-visible',
                compact
                    ? 'min-h-[19px] px-1.5 pt-0.5 pb-[2px] rounded text-[10px] leading-tight'
                    : 'min-h-[21px] px-2 pt-0.5 pb-[2px] rounded-md text-[10.5px] sm:text-[11px] leading-tight',
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

/**
 * Numéro de classe moderne et élégant à côté du titre (ex : « 1 », « 2 », « 3 »).
 * Typographie contemporaine épurée, proportionnée, sans boîte ni contour lourd.
 */
export const ClassGroupWatermark = memo(({
    group,
    label,
    className,
}: {
    group: string;
    label?: string;
    className?: string;
}) => (
    <span
        className={cn(
            'keep-group-watermark inline-flex items-baseline align-baseline select-none font-sans font-bold tabular-nums leading-none ms-1.5',
            className
        )}
        title={label}
        aria-label={label}
    >
        <bdi dir="ltr">{group}</bdi>
    </span>
));

ClassGroupWatermark.displayName = 'ClassGroupWatermark';
