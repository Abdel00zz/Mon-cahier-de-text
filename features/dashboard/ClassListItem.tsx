import { FC } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { getBaseLevelKey } from '@/constants/class-levels';
import { keepToneForClass } from '@/utils/keepTheme';
import { ChevronRight, Settings, Users } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import { classOpeningLabel } from '@/utils/classOpening';
import { useClassPress } from '@/hooks/useClassPress';
import { ClassCardTitle } from './ClassCardTitle';

interface ClassListItemProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    isActiveSession?: boolean;
}

export const ClassListItem: FC<ClassListItemProps> = ({
    classInfo,
    onSelect,
    onConfigure,
    isActiveSession,
}) => {
    const { locale, t, isRtl } = useLocale();
    const { impact } = useHapticFeedback();
    const className = formatLocalizedClassDisplayName(classInfo.name, locale, { includeClassPrefix: !isActiveSession });
    const displayName = isActiveSession ? t('dashboard.session.teaching', { className }) : className;
    const lastOpened = classOpeningLabel(classInfo.lastOpenedAt, locale);

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
                "group relative flex min-h-[60px] sm:min-h-[72px] items-center overflow-hidden border-b border-border/40 bg-card last:border-b-0",
                isActiveSession && "keep-session-active z-10"
            )}
        >
            <button
                type="button"
                {...pressHandlers}
                className="flex min-w-0 flex-1 touch-manipulation items-center gap-2.5 sm:gap-3 px-3 py-1.5 sm:px-4 sm:py-2 text-start outline-none transition-colors hover:bg-muted/60 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary cursor-pointer"
                aria-label={isActiveSession ? displayName : t('dashboard.openClass', { className: displayName })}
            >
                <div className="keep-class-icon flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden>
                    <Users className="h-[15px] w-[15px] sm:h-4 sm:w-4" />
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                    {/* Même échelle que la carte en grille, avec un cran de
                        plus pour l'arabe (lecture plus dense en hauteur). */}
                    <h3 aria-live="polite" aria-atomic="true" className={cn("keep-class-title min-w-0 font-semibold text-foreground leading-snug", isRtl ? "text-[15px] sm:text-[15.5px] lg:text-[16px]" : "text-[14px] sm:text-[14.5px] lg:text-[15px]")}><ClassCardTitle name={displayName} compact={!isActiveSession} intro={isActiveSession ? t('dashboard.session.teaching', { className: '' }).trimEnd() : undefined} /></h3>
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
                className="hidden md:flex shrink-0 items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100 border-inline-start border-border"
            >
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        impact('light');
                        onConfigure();
                    }}
                    className="flex h-full w-12 sm:w-14 touch-manipulation items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    aria-label={`${t('dashboard.edit')} ${displayName}`}
                    title={t('dashboard.classSettings')}
                >
                    <Settings className="h-4 w-4 stroke-[2]" />
                </button>
            </div>
        </article>
    );
};
