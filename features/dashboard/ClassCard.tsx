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
import { classTitleStyle } from '@/constants/classTitleTypography';
import { ClassGroupWatermark } from './ClassLevelBadge';

interface ClassCardProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    /** Suppression depuis le menu de la carte ; le parent confirme l'action. */
    onDelete?: () => void;
    index?: number;
    isActiveSession?: boolean;
}

interface CardThemeStyle {
    cardBg: string;
    cardBorder: string;
    titleColor: string;
    dividerColor: string;
    /** Variante de tache de peinture, accordée à la palette de cette carte. */
    texture: 'sand' | 'mint' | 'sky' | 'lavender';
}

/**
 * 4 thèmes pastel Soft UI, un par position dans la grille (index % 4) :
 * 1. Jaune crème, 2. Vert menthe, 3. Bleu pâle, 4. Violet lavande.
 * Chaque thème porte un fond, une bordure, une couleur de titre, un filet et
 * une texture ; les pastilles empruntent la palette sémantique de leur palier.
 */
const CARD_THEMES: CardThemeStyle[] = [
    // Carte 1 – Haut gauche (jaune crème / warm solar)
    {
        cardBg: 'bg-[#FFFDF3] dark:bg-[#221B13]',
        cardBorder: 'border-[#F4E8BF] dark:border-[#382E1E]',
        titleColor: 'text-[#482B17] dark:text-[#FDE68A]',
        dividerColor: 'border-[#F2E5BA]/70 dark:border-[#382E1E]',
        texture: 'sand',
    },
    // Carte 2 – Haut droite (vert menthe / fresh natural)
    {
        cardBg: 'bg-[#F1FBF5] dark:bg-[#12221A]',
        cardBorder: 'border-[#D4EFE0] dark:border-[#1E3A2B]',
        titleColor: 'text-[#113B26] dark:text-[#A7F3D0]',
        dividerColor: 'border-[#D4EFE0]/75 dark:border-[#1E3A2B]',
        texture: 'mint',
    },
    // Carte 3 – Bas gauche (bleu clair / calm scientific)
    {
        cardBg: 'bg-[#F2F7FD] dark:bg-[#131E2B]',
        cardBorder: 'border-[#D5E5F8] dark:border-[#1F3349]',
        titleColor: 'text-[#122E4E] dark:text-[#BAE6FD]',
        dividerColor: 'border-[#D5E5F8]/75 dark:border-[#1F3349]',
        texture: 'sky',
    },
    // Carte 4 – Bas droite (violet lavande / elegant dream)
    {
        cardBg: 'bg-[#F7F2FD] dark:bg-[#1E1629]',
        cardBorder: 'border-[#E6D8F8] dark:border-[#352548]',
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
     * Titre complet de la carte : « palier + filière » (« 2ème Bac Sciences
     * Physiques »). Le numéro de groupe n'y figure pas : il a sa propre place
     * (ligne de tête, ou ligne dédiée sur téléphone). Sans palier identifié
     * (collège, prépa), l'intitulé localisé est conservé tel quel.
     */
    const fullTitle = useMemo(() => {
        if (!identity.tierLabel) return displayName;
        const stream = identity.stream ?? '';
        const withoutGroup = groupNumber && stream.endsWith(groupNumber)
            ? stream.slice(0, -groupNumber.length).trim()
            : stream;
        return withoutGroup ? `${identity.tierLabel} ${withoutGroup}`.trim() : displayName;
    }, [identity.tierLabel, identity.stream, groupNumber, displayName]);

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
                "group relative flex w-full min-w-0 flex-col justify-between overflow-hidden rounded-xl sm:rounded-2xl border shadow-2xs hover:shadow-xs active:scale-[0.985] transition-all duration-150 select-none",
                theme.cardBg,
                theme.cardBorder,
                // Hauteur unique, calculée dans index.css à partir des parties de
                // la carte (--class-card-h) : aucune carte ne peut dépasser ni
                // rester plus courte que ses voisines, quel que soit le contenu.
                "h-[var(--class-card-h)]",
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

            {/* Corps de la carte : menu, titre + numéro */}
            <div className="relative z-20 flex flex-1 flex-col justify-start px-4 pt-[var(--class-card-pad-top)] pb-[var(--class-card-pad-bottom)] sm:px-4.5 pointer-events-none">
                {/* Ligne de tête : état de séance et menu. Hauteur fixe et non
                    extensible : elle ne peut pas repousser le titre ni le pied. */}
                <div className="flex h-[var(--class-card-top-row-h)] items-center justify-between gap-2 overflow-hidden flex-nowrap">
                    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
                        {isActiveSession && (
                            <span className="inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-stone-900 text-white dark:bg-white dark:text-stone-900 shadow-2xs">
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

                {/* Titre puis numéro de groupe : le numéro suit immédiatement le nom
                    (« Sciences Physiques 3 »). Le titre n'est pas étiré : il prend la
                    largeur de son texte, donc le numéro reste collé au nom ; quand le
                    nom occupe les deux lignes, le numéro se cale en fin de première
                    ligne sans jamais être rogné. Le flux suit la direction du document
                    (à droite du nom en français, à gauche en arabe) et le nom complet
                    reste annoncé en entier (sr-only). */}
                <div className="mt-[var(--class-card-title-gap)] flex min-w-0 items-start gap-1">
                    {/* Typographie du titre : famille, graisse et interlettrage
                        viennent exclusivement de `constants/classTitleTypography`.
                        Ne jamais écrire de police ici. */}
                    <h3
                        style={classTitleStyle(isRtl)}
                        className={cn("h-[var(--class-card-title-box)] min-w-0 text-[16px] sm:text-[19px] leading-[1.3] line-clamp-2", theme.titleColor)}
                    >
                        {fullTitle}
                    </h3>
                    {identity.tierLabel && identity.group ? (
                        <ClassGroupWatermark
                            group={groupNumber || identity.group}
                            label={formatClassGroupLabel(identity.group, locale)}
                            themeTone={theme.texture}
                            tierKey={identity.tierKey}
                            variant="end"
                            className="shrink-0"
                        />
                    ) : null}
                    <span className="sr-only">{identity.full}</span>
                </div>
            </div>

            {/* Ligne séparatrice fine */}
            <div className={cn("relative z-20 w-full border-t pointer-events-none", theme.dividerColor)} />

            {/* Pied de carte : Date/Statut d'ouverture. Hauteur fixe (--class-card-footer-h)
                pour que le filet séparateur et la ligne d'état soient alignés d'une
                carte à l'autre. */}
            <div className="relative z-20 flex h-[var(--class-card-footer-h)] w-full items-center justify-between px-4 sm:px-4.5 pointer-events-none">
                <span className="truncate text-[11px] sm:text-xs font-normal tracking-normal text-stone-500/90 dark:text-stone-400/90">
                    {subtext}
                </span>
            </div>
        </article>
    );
};

/**
 * Comparateur de la carte.
 *
 * Les rappels (`onSelect`, `onConfigure`, `onDelete`) sont recréés à chaque
 * rendu du tableau de bord : les comparer par identité annulait la mémoïsation
 * et re-rendait les 25 cartes à chaque synchronisation (≈ 450 ms de tâche
 * longue mesurée). On compare donc les données réellement affichées.
 */
const areCardPropsEqual = (previous: ClassCardProps, next: ClassCardProps) =>
    previous.classInfo.id === next.classInfo.id
    && previous.classInfo.name === next.classInfo.name
    && previous.classInfo.lastOpenedAt === next.classInfo.lastOpenedAt
    && previous.classInfo.subject === next.classInfo.subject
    && previous.index === next.index
    && previous.isActiveSession === next.isActiveSession
    && Boolean(previous.onDelete) === Boolean(next.onDelete);

ClassCardComponent.displayName = 'ClassCard';

export const ClassCard = memo(ClassCardComponent, areCardPropsEqual);
