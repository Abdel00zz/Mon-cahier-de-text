import { memo, useMemo, type FC } from 'react';
import type { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { MoreVertical, Settings, Trash2 } from '@/components/ui/icons';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { keepToneForClass } from '@/utils/keepTheme';
import { classOpeningLabel } from '@/utils/classOpening';
import { classIdentityFor } from '@/utils/classIdentity';
import { useClassPress } from '@/hooks/useClassPress';
import { cn } from '@/lib/utils';
import { formatClassGroupLabel, getBaseLevelKey } from '@/constants/class-levels';
import { ClassGroupWatermark, ClassLevelBadge } from './ClassLevelBadge';

interface ClassCardProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    /** Suppression depuis le menu de la carte ; le parent confirme l'action. */
    onDelete?: () => void;
    showSubjectBadge?: boolean;
    allClasses?: ClassInfo[];
    index?: number;
    isActiveSession?: boolean;
    isDoubleColumn?: boolean;
}

interface CardThemeStyle {
    cardBg: string;
    cardBorder: string;
    /** Palette du badge : la pastille reste toujours plus claire que la carte. */
    badgeStyle: React.CSSProperties & Record<`--${string}`, string>;
    badgeTextStyle: React.CSSProperties;
    titleColor: string;
    dividerColor: string;
    /** Variante de tache de peinture, accordée à la palette de cette carte. */
    texture: 'sand' | 'mint' | 'sky' | 'lavender';
}

/**
 * 4 Thèmes pastel exclusifs Soft UI :
 * 1. Haut gauche : Jaune très doux / crème, badge ambre doux avec texte dégradé bronze/ambre
 * 2. Haut droite : Vert menthe très clair, badge menthe douce avec texte dégradé émeraude/vert
 * 3. Bas gauche  : Bleu très pâle, badge azur doux avec texte dégradé saphir/océan
 * 4. Bas droite  : Violet lavande très doux, badge lilas doux avec texte dégradé améthyste/prune
 */
const CARD_THEMES: CardThemeStyle[] = [
    // Carte 1 – Haut gauche (jaune crème / warm solar)
    {
        cardBg: 'bg-[#FFFDF3] dark:bg-[#221B13]',
        cardBorder: 'border-[#F4E8BF] dark:border-[#382E1E]',
        badgeStyle: {
            '--badge-from': '#FFFFFF',
            '--badge-to': '#FEF8E7',
            border: '1px solid rgba(217, 119, 6, 0.22)',
            borderRadius: '5px',
            padding: '0.14rem 0.5rem',
            fontSize: '0.72rem',
            lineHeight: '1.2',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        },
        badgeTextStyle: {
            background: 'linear-gradient(135deg, #78350F 0%, #92400E 50%, #B45309 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: '#854D0E',
            fontWeight: 700,
            letterSpacing: '0.01em',
        },
        titleColor: 'text-[#482B17] dark:text-[#FDE68A]',
        dividerColor: 'border-[#F2E5BA]/70 dark:border-[#382E1E]',
        texture: 'sand',
    },
    // Carte 2 – Haut droite (vert menthe / fresh natural)
    {
        cardBg: 'bg-[#F1FBF5] dark:bg-[#12221A]',
        cardBorder: 'border-[#D4EFE0] dark:border-[#1E3A2B]',
        badgeStyle: {
            '--badge-from': '#FFFFFF',
            '--badge-to': '#EDFAF3',
            border: '1px solid rgba(16, 185, 129, 0.22)',
            borderRadius: '5px',
            padding: '0.14rem 0.5rem',
            fontSize: '0.72rem',
            lineHeight: '1.2',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        },
        badgeTextStyle: {
            background: 'linear-gradient(135deg, #064E3B 0%, #065F46 50%, #047857 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: '#065F46',
            fontWeight: 700,
            letterSpacing: '0.01em',
        },
        titleColor: 'text-[#113B26] dark:text-[#A7F3D0]',
        dividerColor: 'border-[#D4EFE0]/75 dark:border-[#1E3A2B]',
        texture: 'mint',
    },
    // Carte 3 – Bas gauche (bleu clair / calm scientific)
    {
        cardBg: 'bg-[#F2F7FD] dark:bg-[#131E2B]',
        cardBorder: 'border-[#D5E5F8] dark:border-[#1F3349]',
        badgeStyle: {
            '--badge-from': '#FFFFFF',
            '--badge-to': '#EFF6FE',
            border: '1px solid rgba(14, 165, 233, 0.22)',
            borderRadius: '5px',
            padding: '0.14rem 0.5rem',
            fontSize: '0.72rem',
            lineHeight: '1.2',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        },
        badgeTextStyle: {
            background: 'linear-gradient(135deg, #0C4A6E 0%, #0369A1 50%, #0284C7 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: '#0369A1',
            fontWeight: 700,
            letterSpacing: '0.01em',
        },
        titleColor: 'text-[#122E4E] dark:text-[#BAE6FD]',
        dividerColor: 'border-[#D5E5F8]/75 dark:border-[#1F3349]',
        texture: 'sky',
    },
    // Carte 4 – Bas droite (violet lavande / elegant dream)
    {
        cardBg: 'bg-[#F7F2FD] dark:bg-[#1E1629]',
        cardBorder: 'border-[#E6D8F8] dark:border-[#352548]',
        badgeStyle: {
            '--badge-from': '#FFFFFF',
            '--badge-to': '#F5F0FE',
            border: '1px solid rgba(168, 85, 247, 0.22)',
            borderRadius: '5px',
            padding: '0.14rem 0.5rem',
            fontSize: '0.72rem',
            lineHeight: '1.2',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        },
        badgeTextStyle: {
            background: 'linear-gradient(135deg, #4C1D95 0%, #6B21A8 50%, #7E22CE 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: '#6B21A8',
            fontWeight: 700,
            letterSpacing: '0.01em',
        },
        titleColor: 'text-[#38194D] dark:text-[#E9D5FF]',
        dividerColor: 'border-[#E6D8F8]/75 dark:border-[#352548]',
        texture: 'lavender',
    },
];

const ClassCardComponent: FC<ClassCardProps> = ({
    classInfo,
    onSelect,
    onConfigure,
    onDelete,
    isActiveSession,
    index = 0,
    isDoubleColumn = false,
}) => {
    const { impact } = useHapticFeedback();
    const { locale, t, isRtl } = useLocale();

    const className = formatLocalizedClassDisplayName(classInfo.name, locale, { includeClassPrefix: !isActiveSession });
    const displayName = isActiveSession ? t('dashboard.session.teaching', { className }) : className;

    /** Palier (« 2e Bac ») et filière (« Sciences Physiques »), déduits du nom */
    const identity = useMemo(() => classIdentityFor(classInfo.name, locale), [classInfo.name, locale]);
    const theme = CARD_THEMES[index % CARD_THEMES.length];

    const pressHandlers = useClassPress(
        () => { impact('light'); onSelect(); },
        () => { impact('medium'); onConfigure(); },
    );

    /** Numéro seul du groupe (ex: « 1 » pour « Sciences Mathématiques A 1 ») */
    const groupNumber = identity.group
        ? identity.group.replace(/^(?:groupe|grp|g|فوج)\s*/i, '').trim() || identity.group
        : null;

    /**
     * Titre complet combinant le niveau et la filière (sans badge séparé)
     * Ex: "2ème Bac Sciences Physiques 3" ou "Tronc Commun Sciences 2"
     */
    const fullTitle = useMemo(() => {
        // Si pas de label de niveau (collège sans distinction), retourner le nom complet
        if (!identity.tierLabel) return displayName;
        
        // Combiner niveau + filière
        const parts = [];
        
        // Ajouter le niveau (ex: "2ème Bac", "Tronc Commun")
        parts.push(identity.tierLabel);
        
        // Ajouter la filière si elle existe
        if (identity.stream) {
            parts.push(identity.stream);
        }
        
        // Joindre avec un espace
        return parts.join(' ');
    }, [identity.tierLabel, identity.stream, displayName]);

    /** Sous-texte d'état : « Dernière ouverture · ... » ou « Prêt pour votre première séance » */
    const subtext = useMemo(() => {
        return classOpeningLabel(classInfo.lastOpenedAt, locale);
    }, [classInfo.lastOpenedAt, locale]);

    return (
        <article
            dir={isRtl ? 'rtl' : 'ltr'}
            data-keep-tone={keepToneForClass(classInfo.id || getBaseLevelKey(classInfo.name), index)}
            data-session-active={isActiveSession ? 'true' : undefined}
            className={cn(
                "group card-andalusian relative flex w-full min-w-0 flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border shadow-2xs hover:shadow-xs active:scale-[0.985] transition-all duration-150 select-none",
                theme.cardBg,
                theme.cardBorder,
                isDoubleColumn ? "min-h-[145px] sm:min-h-[160px]" : "min-h-[140px] sm:min-h-[152px]",
                isActiveSession && "ring-2 ring-stone-900 dark:ring-white z-10"
            )}
        >
            {/* Bouton d'action principal couvrant toute la carte */}
            <button
                type="button"
                {...pressHandlers}
                aria-label={isActiveSession ? displayName : t('dashboard.openClass', { className: displayName })}
                title={displayName}
                className="absolute inset-0 z-10 w-full h-full cursor-pointer rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            />

            {/* Tache de peinture : décor de fond très doux, jamais cliquable ni annoncé. */}
            <span className="card-texture opacity-30 dark:opacity-20" data-texture={theme.texture} aria-hidden="true" />

            {/* Partie supérieure : Titre combiné (niveau + filière), Réglages */}
            <div className="relative z-20 flex flex-1 flex-col justify-start pt-3.5 px-4 pb-3 sm:pt-4 sm:px-4.5 sm:pb-3.5 pointer-events-none">
                {/* Ligne haute : Badge session active (si applicable) & Bouton Réglages */}
                <div className="flex items-center justify-between gap-2 min-h-[26px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {isActiveSession && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-2xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                                <span>{locale === 'ar' ? 'جلسة جارية' : 'En direct'}</span>
                            </span>
                        )}
                    </div>

                    {/* Menu de la classe : réglages et suppression au même endroit. */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                onClick={(event) => event.stopPropagation()}
                                className="pointer-events-auto flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-stone-700 dark:text-stone-300 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                                title={t('dashboard.classActions', { className: displayName })}
                                aria-label={t('dashboard.classActions', { className: displayName })}
                            >
                                <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[10.5rem]">
                            <DropdownMenuItem onSelect={() => { impact('light'); onConfigure(); }}>
                                <Settings aria-hidden="true" />
                                {t('dashboard.classSettings')}
                            </DropdownMenuItem>
                            {onDelete && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem destructive onSelect={() => { impact('medium'); onDelete(); }}>
                                        <Trash2 aria-hidden="true" />
                                        {t('dashboard.delete')}
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Titre complet de la classe : niveau + filière + groupe combinés */}
                <div className="mt-2.5 sm:mt-3">
                    <h3 className={cn("keep-class-title min-w-0 break-words whitespace-normal font-cyber-clean text-[18.4px] sm:text-[21.85px] font-semibold leading-[1.35] flex items-baseline flex-wrap gap-x-1 gap-y-0.5", theme.titleColor)}>
                        <span>{fullTitle}</span>
                        {identity.group && groupNumber && (
                            <ClassGroupWatermark
                                group={groupNumber}
                                label={formatClassGroupLabel(identity.group, locale)}
                                themeTone={theme.texture}
                                tierKey={identity.tierKey}
                            />
                        )}
                        <span className="sr-only">{identity.full}</span>
                    </h3>
                </div>
            </div>

            {/* Ligne séparatrice fine */}
            <div className={cn("relative z-20 w-full border-t pointer-events-none", theme.dividerColor)} />

            {/* Pied de carte : Date/Statut d'ouverture */}
            <div className="relative z-20 flex w-full items-center justify-between px-4 py-2 sm:px-4.5 sm:py-2.5 pointer-events-none">
                <span className="text-[11px] sm:text-xs font-normal tracking-normal text-stone-500/90 dark:text-stone-400/90 line-clamp-1">
                    {subtext}
                </span>
            </div>
        </article>
    );
};

export const ClassCard = memo(ClassCardComponent);
