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
    badgeStyle: React.CSSProperties;
    badgeTextStyle: React.CSSProperties;
    titleColor: string;
    dividerColor: string;
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
            background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
            border: '1px solid rgba(217, 119, 6, 0.28)',
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
    },
    // Carte 2 – Haut droite (vert menthe / fresh natural)
    {
        cardBg: 'bg-[#F1FBF5] dark:bg-[#12221A]',
        cardBorder: 'border-[#D4EFE0] dark:border-[#1E3A2B]',
        badgeStyle: {
            background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)',
            border: '1px solid rgba(16, 185, 129, 0.28)',
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
    },
    // Carte 3 – Bas gauche (bleu clair / calm scientific)
    {
        cardBg: 'bg-[#F2F7FD] dark:bg-[#131E2B]',
        cardBorder: 'border-[#D5E5F8] dark:border-[#1F3349]',
        badgeStyle: {
            background: 'linear-gradient(135deg, #E0F2FE 0%, #BAE6FD 100%)',
            border: '1px solid rgba(14, 165, 233, 0.28)',
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
    },
    // Carte 4 – Bas droite (violet lavande / elegant dream)
    {
        cardBg: 'bg-[#F7F2FD] dark:bg-[#1E1629]',
        cardBorder: 'border-[#E6D8F8] dark:border-[#352548]',
        badgeStyle: {
            background: 'linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%)',
            border: '1px solid rgba(168, 85, 247, 0.28)',
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
     * Titre de filière, sans numéro de groupe dupliqué, pour les paliers qui
     * portent un badge. Sans badge (collège et prépa), l'intitulé d'origine est
     * conservé tel quel : c'est lui qui porte l'information de niveau.
     */
    const cardTitle = useMemo(() => {
        if (!identity.tierLabel) return displayName;
        if (!identity.stream) return displayName;
        if (groupNumber) {
            return identity.stream.replace(new RegExp(`\\s+${groupNumber}$`), '').trim();
        }
        return identity.stream;
    }, [identity.stream, identity.tierLabel, groupNumber, displayName]);

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
                "group relative flex w-full min-w-0 flex-col justify-between overflow-hidden rounded-lg border shadow-2xs hover:shadow-xs transition-all duration-150 select-none",
                theme.cardBg,
                theme.cardBorder,
                isDoubleColumn ? "min-h-[118px] sm:min-h-[126px]" : "min-h-[110px] sm:min-h-[118px]",
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

            {/* Partie supérieure : Badge placé haut, Réglages, Titre compacté et remonté */}
            <div className="relative z-20 flex flex-1 flex-col justify-start pt-3 px-3.5 pb-2 sm:pt-3.5 sm:px-4.5 sm:pb-2.5 pointer-events-none">
                {/* Ligne haute : Badge de niveau & Bouton Réglages */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {identity.tierLabel ? (
                            <ClassLevelBadge
                                label={identity.tierLabel}
                                style={theme.badgeStyle}
                                textStyle={theme.badgeTextStyle}
                            />
                        ) : null}

                        {isActiveSession && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-stone-900 text-white shadow-2xs">
                                <span className="h-1.5 w-1.5 rounded-full bg-white inline-block animate-ping" />
                                <span>{locale === 'ar' ? 'جلسة جارية' : 'En direct'}</span>
                            </span>
                        )}
                    </div>

                    {/* Menu de la classe : réglages et suppression au même endroit.
                        Le contenu est rendu dans un portail, donc jamais rogné
                        par le `overflow-hidden` de la carte. */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                onClick={(event) => event.stopPropagation()}
                                className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-md bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-stone-600 dark:text-stone-300 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs"
                                title={t('dashboard.classActions', { className: displayName })}
                                aria-label={t('dashboard.classActions', { className: displayName })}
                            >
                                <MoreVertical className="h-3.5 w-3.5" aria-hidden="true" />
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

                {/* Titre remonté vers le haut, plus serré et compact */}
                <div className="mt-1 sm:mt-1.5">
                    <h3 className={cn("font-serif text-lg sm:text-xl font-bold leading-tight line-clamp-2 tracking-[-0.015em]", theme.titleColor)}>
                        <span>{cardTitle}</span>
                        {identity.tierLabel && identity.group ? (
                            <ClassGroupWatermark group={groupNumber || identity.group} label={formatClassGroupLabel(identity.group, locale)} />
                        ) : null}
                        <span className="sr-only">{identity.full}</span>
                    </h3>
                </div>
            </div>

            {/* Ligne séparatrice fine */}
            <div className={cn("relative z-20 w-full border-t pointer-events-none", theme.dividerColor)} />

            {/* Pied de carte : Date/Statut d'ouverture plus serré et compact */}
            <div className="relative z-20 flex w-full items-center justify-between px-3.5 py-1.5 sm:px-4.5 sm:py-2 pointer-events-none">
                <span className="text-[11px] sm:text-xs font-normal tracking-normal text-stone-500/80 dark:text-stone-400/80 line-clamp-1">
                    {subtext}
                </span>
            </div>
        </article>
    );
};

export const ClassCard = memo(ClassCardComponent);
