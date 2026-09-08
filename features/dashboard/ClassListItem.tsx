import { FC } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { keepToneForClass } from '@/utils/keepTheme';
import { ChevronRight, Settings, Users } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import { classOpeningLabel } from '@/utils/classOpening';
import { useClassPress } from '@/hooks/useClassPress';

interface ClassListItemProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    isActiveSession?: boolean;
    isDragActive?: boolean;
}

export const ClassListItem: FC<ClassListItemProps> = ({
    classInfo,
    onSelect,
    onConfigure,
    isActiveSession,
    isDragActive,
}) => {
    const { locale, t, isRtl } = useLocale();
    const { impact } = useHapticFeedback();
    const displayName = formatLocalizedClassDisplayName(classInfo.name, locale);
    const lastOpened = classOpeningLabel(classInfo.lastOpenedAt, locale);

    const pressHandlers = useClassPress(
        () => { impact('light'); onSelect(); },
        () => { impact('medium'); onConfigure(); },
        isDragActive,
    );

    return (
        <article
            data-keep-tone={keepToneForClass(classInfo.id)}
            data-session-active={isActiveSession ? 'true' : undefined}
            className={cn(
                "keep-surface keep-interactive group relative flex h-[68px] sm:h-[72px] min-h-[68px] items-center overflow-hidden",
                isActiveSession && "keep-session-active z-10"
            )}
        >
            <button
                type="button"
                {...pressHandlers}
                className="flex min-w-0 flex-1 touch-manipulation items-center gap-3 px-4 py-2 text-start outline-none transition-colors hover:bg-muted/60 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary cursor-pointer"
                aria-label={`${t('dashboard.openClass', { className: displayName })}${isActiveSession ? ` · ${t('dashboard.session.now')}` : ''}`}
            >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground" aria-hidden>
                    <Users className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 py-0.5">
                    <h3 className={cn("truncate font-medium text-foreground leading-snug", isRtl ? "text-lg font-ibm-arabic" : "text-base")}>{displayName}</h3>
                    <div className="mt-1 flex items-center gap-1.5 truncate text-muted-foreground">
                        <span
                            className={cn('truncate', isRtl ? 'text-sm leading-none' : 'text-[11.9px] leading-none')}
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
                {isActiveSession && (
                    <span className="keep-session-chip inline-flex min-h-6 shrink-0 items-center gap-1.5 px-2 py-1 text-[10px] font-bold leading-none" role="status">
                        <span className="keep-session-dot h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden="true" />
                        <span className="max-[380px]:sr-only">{t('dashboard.session.now')}</span>
                    </span>
                )}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5" aria-hidden />
            </button>
            <div
                role="group"
                aria-label={t('dashboard.classActions', { className: displayName })}
                className="hidden md:flex shrink-0 items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100 border-inline-start border-border"
            >
                <button
                    type="button"
                    data-class-drag-ignore
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
