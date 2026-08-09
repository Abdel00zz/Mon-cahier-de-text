import { FC } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { getClassVisual } from '@/utils/classVisuals';
import { ChevronRight, Settings, Users } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';

interface ClassListItemProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    onShowNotifications: () => void;
    notificationCount: number;
}

export const ClassListItem: FC<ClassListItemProps> = ({
    classInfo,
    onSelect,
    onConfigure,
    onShowNotifications,
    notificationCount,
}) => {
    const { locale, t, isRtl } = useLocale();
    const { impact } = useHapticFeedback();
    const displayName = formatLocalizedClassDisplayName(classInfo.name, locale);
    const visual = getClassVisual(classInfo.name);
    const issueStatus = notificationCount === 0
        ? t('notifications.classIssueCount.none')
        : notificationCount === 1
            ? t('notifications.classIssueCount.one', { count: notificationCount })
            : t('notifications.classIssueCount.many', { count: notificationCount });
    const notificationButtonLabel = `${t('notifications.classSummaryTitle', { className: displayName })}. ${issueStatus}`;

    const selectClass = () => {
        impact('light');
        onSelect();
    };
    const runAction = (action: () => void) => {
        impact('light');
        action();
    };

    return (
        <article
            className="group relative flex min-h-[68px] overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xs transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
        >
            <button
                type="button"
                onClick={selectClass}
                className="flex min-w-0 flex-1 touch-manipulation items-center gap-2.5 px-3 py-2.5 text-start outline-none transition-colors hover:bg-muted/25 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30 active:bg-muted/50 sm:px-4"
                aria-label={t('dashboard.openClass', { className: displayName })}
            >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${visual.iconSurfaceClass}`} aria-hidden>
                    <Users className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-xs font-bold text-zinc-900 dark:text-zinc-100 sm:text-sm">{displayName}</h3>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 sm:text-xs">
                        {classInfo.subject ? formatLocalizedSubjectDisplayName(classInfo.subject, locale) : t('dashboard.notebook')}
                    </p>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600 ${isRtl ? 'rotate-180' : ''}`} aria-hidden />
            </button>

            <div
                role="group"
                aria-label={t('dashboard.classActions', { className: displayName })}
                className={cn(
                    'flex shrink-0 bg-muted/20',
                    isRtl ? 'border-r border-border/70' : 'border-l border-border/70',
                )}
            >
                <button
                    type="button"
                    onClick={() => runAction(onConfigure)}
                    className="flex min-h-[66px] w-11 touch-manipulation items-center justify-center text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35 active:bg-muted sm:w-12"
                    aria-label={`${t('dashboard.edit')} ${displayName}`}
                >
                    <Settings className="h-[15px] w-[15px]" />
                </button>
                <button
                    type="button"
                    onClick={() => runAction(onShowNotifications)}
                    className="flex min-h-[66px] w-[7.25rem] min-w-0 touch-manipulation items-center justify-center gap-1.5 border-s border-border/70 px-1.5 text-primary transition-colors hover:bg-primary/10 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35 active:bg-primary/15 sm:w-32 sm:px-2"
                    aria-label={notificationButtonLabel}
                    title={notificationButtonLabel}
                    aria-haspopup="dialog"
                >
                    <span className="min-w-0 text-center leading-tight">
                        <span className="block text-[9px] font-extrabold sm:text-[10px]">{t('dashboard.classStatus')}</span>
                        <span className={`mt-0.5 line-clamp-2 text-[7.5px] font-semibold leading-[1.12] sm:text-[8px] ${notificationCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            ({issueStatus})
                        </span>
                    </span>
                </button>
            </div>
        </article>
    );
};
