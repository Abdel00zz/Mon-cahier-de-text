import { FC, useMemo } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { getBaseLevelKey, formatClassGroupLabel } from '@/constants/class-levels';
import { keepToneForClass } from '@/utils/keepTheme';
import { classIdentityFor } from '@/utils/classIdentity';
import { ChevronRight, MoreVertical, Settings, Trash2 } from '@/components/ui/icons';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLocale } from '@/i18n/LocaleProvider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import { classOpeningLabel } from '@/utils/classOpening';
import { useClassPress } from '@/hooks/useClassPress';
import { ClassCardTitle } from './ClassCardTitle';
import { ClassGroupWatermark } from './ClassLevelBadge';

interface ClassListItemProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    /** Suppression depuis le menu de la ligne ; le parent confirme l'action. */
    onDelete?: () => void;
    isActiveSession?: boolean;
}

export const ClassListItem: FC<ClassListItemProps> = ({
    classInfo,
    onSelect,
    onConfigure,
    onDelete,
    isActiveSession,
}) => {
    const { locale, t, isRtl } = useLocale();
    const { impact } = useHapticFeedback();
    const className = formatLocalizedClassDisplayName(classInfo.name, locale, { includeClassPrefix: !isActiveSession });
    const displayName = isActiveSession ? t('dashboard.session.teaching', { className }) : className;
    const lastOpened = classOpeningLabel(classInfo.lastOpenedAt, locale);

    /** Même identité que la carte en grille : palier puis filière. */
    const identity = useMemo(() => classIdentityFor(classInfo.name, locale), [classInfo.name, locale]);
    const intro = isActiveSession ? t('dashboard.session.teaching', { className: '' }).trimEnd() : undefined;

    const pressHandlers = useClassPress(
        () => { impact('light'); onSelect(); },
        () => { impact('medium'); onConfigure(); },
    );

    return (
        <article
            dir={isRtl ? 'rtl' : 'ltr'}
            data-keep-tone={keepToneForClass(getBaseLevelKey(classInfo.name))}
            data-session-active={isActiveSession ? 'true' : undefined}
            className={cn(
                "group relative flex min-h-[56px] sm:min-h-[60px] items-center overflow-hidden border-b border-border/40 bg-card last:border-b-0",
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
                    {/* Titre complet : niveau + filière + groupe combinés (sans badge séparé) */}
                    <h3 aria-live="polite" aria-atomic="true" className={cn("keep-class-title min-w-0 font-semibold text-foreground leading-snug font-sans", isRtl ? "text-[17.25px] sm:text-[17.83px] lg:text-[18.4px]" : "text-[16.1px] sm:text-[16.68px] lg:text-[17.25px]")}>
                        {identity.tierLabel ? (
                            <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                {intro && <span className="keep-session-intro">{intro}</span>}
                                <span className="min-w-0 truncate">
                                    {identity.tierLabel}
                                    {identity.stream && ` ${identity.stream}`}
                                </span>
                                {identity.group && (
                                     <ClassGroupWatermark
                                         group={identity.group}
                                         label={formatClassGroupLabel(identity.group, locale)}
                                         tierKey={identity.tierKey}
                                     />
                                 )}
                            </span>
                        ) : (
                            <ClassCardTitle name={displayName} compact={!isActiveSession} intro={intro} />
                        )}
                    </h3>
                    <div className="mt-0.5 flex items-center gap-1.5 truncate text-muted-foreground">
                        <span
                            className={cn('truncate', isRtl ? 'text-xs leading-none' : 'text-[10.5px] sm:text-[11.9px] leading-none')}
                            title={lastOpened}
                        >
                            {classInfo.lastOpenedAt ? <time dateTime={classInfo.lastOpenedAt}>{lastOpened}</time> : lastOpened}
                        </span>
                        {classInfo.subject && (
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
                            className="flex h-9 w-9 touch-manipulation items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
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
