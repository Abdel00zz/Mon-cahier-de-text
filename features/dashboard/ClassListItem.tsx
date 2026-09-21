import { memo, useMemo, type FC } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedSubjectDisplayName } from '@/constants';
import { formatClassGroupLabel } from '@/constants/class-levels';
import { classTitleStyle } from '@/constants/classTitleTypography';
import { classColorAttributes } from '@/utils/classColors';
import { classCardLabelFor, classIdentityFor } from '@/utils/classIdentity';
import { ChevronRight, MoreVertical, Settings, Trash2 } from '@/components/ui/icons';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocale } from '@/i18n/LocaleProvider';
import { useShowsSubjectLabels } from '@/contexts/SubjectScopeContext';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import { classOpeningLabel } from '@/utils/classOpening';
import { useClassPress } from '@/hooks/useClassPress';
import { ClassGroupWatermark, ClassLevelBadge } from './ClassLevelBadge';
import { ClassCardTitle } from './ClassCardTitle';
import { formatWithOrdinals } from '@/utils/ordinalTypography';

interface ClassListItemProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    /** Suppression depuis le menu de la ligne ; le parent confirme l'action. */
    onDelete?: () => void;
    isActiveSession?: boolean;
}

const ClassListItemComponent: FC<ClassListItemProps> = ({
    classInfo,
    onSelect,
    onConfigure,
    onDelete,
    isActiveSession,
}) => {
    const { locale, t, isRtl } = useLocale();
    const { impact } = useHapticFeedback();
    /* Une seule matière ne se distingue de rien : ligne masquée (règle partagée). */
    const showsSubjectLabels = useShowsSubjectLabels();
    const identity = useMemo(() => classIdentityFor(classInfo.name, locale), [classInfo.name, locale]);
    const label = useMemo(() => classCardLabelFor(identity, locale), [identity, locale]);
    const className = label.fullName;
    const displayName = isActiveSession ? t('dashboard.session.teaching', { className }) : className;
    // Le libellé passe par Intl.DateTimeFormat : une seule fois par valeur,
    // jamais à chaque rendu de la liste.
    const lastOpened = useMemo(
        () => classOpeningLabel(classInfo.lastOpenedAt, locale),
        [classInfo.lastOpenedAt, locale],
    );

    /** Même identité que la carte en grille : palier puis filière. */
    const intro = isActiveSession ? t('dashboard.session.teaching', { className: '' }).trimEnd() : undefined;

    const pressHandlers = useClassPress(
        () => { impact('light'); onSelect(); },
        () => { impact('medium'); onConfigure(); },
    );

    return (
        <article
            dir={isRtl ? 'rtl' : 'ltr'}
            {...classColorAttributes(classInfo)}
            data-session-active={isActiveSession ? 'true' : undefined}
            className={cn(
                // Même principe que la carte en grille : hauteur fixe, calculée
                // dans index.css, pour que toutes les lignes de la liste aient
                // exactement la même hauteur.
                "group relative flex h-[var(--class-list-row-h)] items-center overflow-hidden border-b border-border/40 bg-card last:border-b-0",
                isActiveSession && "keep-session-active z-10"
            )}
        >
            <button
                type="button"
                {...pressHandlers}
                className="flex min-w-0 flex-1 touch-manipulation items-center gap-2.5 sm:gap-3 px-3 py-1.5 sm:px-4 sm:py-2 text-start outline-none transition-colors hover:bg-muted/60 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary cursor-pointer"
                aria-label={isActiveSession ? displayName : t('dashboard.openClass', { className: displayName })}
            >
                <div className="min-w-0 flex-1 py-0.5">
                    {/* Même échelle que la carte en grille, avec un cran de
                        plus pour l'arabe (lecture plus dense en hauteur). */}
                    <h3
                        aria-live="polite"
                        aria-atomic="true"
                        style={classTitleStyle(isRtl, 'list')}
                        className={cn("keep-class-title min-w-0 text-foreground leading-snug", isRtl ? "text-[15px] sm:text-[15.5px] lg:text-[16px]" : "text-[14px] sm:text-[14.5px] lg:text-[15px]")}
                    >
                        <span className="sr-only">{displayName}</span>
                            <span aria-hidden="true" className="inline-flex min-w-0 max-w-full flex-nowrap items-center gap-x-2">
                                {intro && <span className="keep-session-intro">{intro}</span>}
                                {label.tier && <ClassLevelBadge label={label.tier} tierKey={identity.tierKey} />}
                                    <span className="min-w-0 truncate" title={label.fullName}>
                                        {label.tier ? formatWithOrdinals(label.title) : <ClassCardTitle name={label.title} compact />}
                                    </span>
                                {label.group && (
                                     <ClassGroupWatermark
                                         group={label.group}
                                         label={formatClassGroupLabel(label.group, locale)}
                                         tierKey={identity.tierKey}
                                     />
                                 )}
                            </span>
                    </h3>
                    <div className="mt-0.5 flex items-center gap-1.5 truncate text-muted-foreground">
                        <span
                            className={cn('truncate', isRtl ? 'text-xs leading-none' : 'text-[10.5px] sm:text-[11.9px] leading-none')}
                            title={lastOpened}
                        >
                            {classInfo.lastOpenedAt ? <time dateTime={classInfo.lastOpenedAt}>{lastOpened}</time> : lastOpened}
                        </span>
                        {showsSubjectLabels && classInfo.subject && (
                            <>
                                <span className="text-[10px] opacity-60 shrink-0" aria-hidden="true">•</span>
                                <span className="truncate text-xs font-medium" title={formatLocalizedSubjectDisplayName(classInfo.subject, locale)}>
                                    {formatLocalizedSubjectDisplayName(classInfo.subject, locale)}
                                </span>
                            </>
                        )}
                    </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
            </button>
            <div
                role="group"
                aria-label={t('dashboard.classActions', { className: displayName })}
                className="flex shrink-0 items-center opacity-100 md:opacity-0 transition-opacity duration-200 md:group-hover:opacity-100 md:focus-within:opacity-100"
            >
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            onClick={(event) => event.stopPropagation()}
                            className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                            title={t('dashboard.classActions', { className: displayName })}
                            aria-label={t('dashboard.classActions', { className: displayName })}
                        >
                            <MoreVertical className="h-4 w-4" aria-hidden="true" />
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
        </article>
    );
};

/** Comparateur : la ligne ne se re-rend que si ses données changent. */
const areEqual = (previous: ClassListItemProps, next: ClassListItemProps) =>
    previous.classInfo.id === next.classInfo.id
    && previous.classInfo.color === next.classInfo.color
    && previous.classInfo.name === next.classInfo.name
    && previous.classInfo.lastOpenedAt === next.classInfo.lastOpenedAt
    && previous.classInfo.subject === next.classInfo.subject
    && previous.isActiveSession === next.isActiveSession;

ClassListItemComponent.displayName = 'ClassListItem';

export const ClassListItem = memo(ClassListItemComponent, areEqual);
