import { FC } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { getSubjectVisual } from '@/utils/classVisuals';
import { ChevronRight, Info, Settings, Users } from '@/components/ui/icons';
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
    const visual = getSubjectVisual(classInfo.subject);
    const issueStatus = notificationCount === 1
        ? t('notifications.classIssueCount.one', { count: notificationCount })
        : notificationCount > 1
            ? t('notifications.classIssueCount.many', { count: notificationCount })
            : null;
    const notificationButtonLabel = issueStatus
        ? `${t('notifications.classSummaryTitle', { className: displayName })}. ${issueStatus}`
        : t('notifications.classButtonLabel', { className: displayName });

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
            className="group relative flex min-h-[50px] sm:min-h-[56px] rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden transition-all duration-150 shadow-2xs hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50/50 dark:hover:bg-zinc-900/80"
        >
            <button
                type="button"
                onClick={selectClass}
                className="flex min-w-0 flex-1 touch-manipulation items-center gap-2.5 sm:gap-3 px-3 py-2 text-start outline-none transition-colors hover:bg-slate-50/80 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400 dark:hover:bg-zinc-800/50"
                aria-label={t('dashboard.openClass', { className: displayName })}
            >
                <div className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg ${visual.iconSurfaceClass}`} aria-hidden>
                    <Users className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${visual.iconClass}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-xs sm:text-[13px] font-semibold text-slate-800 dark:text-zinc-100">{displayName}</h3>
                    <p className="truncate text-[10px] sm:text-[11px] font-normal text-slate-500 dark:text-zinc-400">
                        {classInfo.subject ? formatLocalizedSubjectDisplayName(classInfo.subject, locale) : t('dashboard.notebook')}
                    </p>
                </div>
                <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-zinc-500 ${isRtl ? 'rotate-180' : ''}`} aria-hidden />
            </button>

            <div
                role="group"
                aria-label={t('dashboard.classActions', { className: displayName })}
                className={cn(
                    'flex shrink-0 items-center border-slate-100 dark:border-zinc-800',
                    isRtl ? 'border-r' : 'border-l',
                )}
            >
                <button
                    type="button"
                    onClick={() => runAction(onConfigure)}
                    className="flex h-full w-8 sm:w-9 touch-manipulation items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors"
                    aria-label={`${t('dashboard.edit')} ${displayName}`}
                >
                    <Settings className="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    onClick={() => runAction(onShowNotifications)}
                    className={`flex h-full min-w-0 touch-manipulation items-center justify-center gap-1 px-2 border-s border-slate-100 dark:border-zinc-800 transition-colors ${
                        issueStatus
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                    }`}
                    aria-label={notificationButtonLabel}
                    title={notificationButtonLabel}
                    aria-haspopup="dialog"
                >
                    <Info className="h-3.5 w-3.5 shrink-0" />
                    {issueStatus && (
                        <span className="truncate max-w-[80px] text-[10px] font-medium">
                            {issueStatus}
                        </span>
                    )}
                </button>
            </div>
        </article>
    );
};
