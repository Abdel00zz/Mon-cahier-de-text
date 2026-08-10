import { FC } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { getClassVisual } from '@/utils/classVisuals';
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
    const visual = getClassVisual(classInfo.name);
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
            className="group relative flex min-h-[72px] overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-slate-900 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0b57d0]/30 hover:shadow-md dark:border-slate-800 dark:bg-[#1e1f20] dark:text-slate-100"
        >
            <button
                type="button"
                onClick={selectClass}
                className="flex min-w-0 flex-1 touch-manipulation items-center gap-3 px-4 py-3 text-start outline-none transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0b57d0]/30"
                aria-label={t('dashboard.openClass', { className: displayName })}
            >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${visual.iconSurfaceClass}`} aria-hidden>
                    <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-sm font-bold text-slate-900 dark:text-slate-100">{displayName}</h3>
                    <p className="mt-0.5 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                        {classInfo.subject ? formatLocalizedSubjectDisplayName(classInfo.subject, locale) : t('dashboard.notebook')}
                    </p>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500 ${isRtl ? 'rotate-180' : ''}`} aria-hidden />
            </button>

            <div
                role="group"
                aria-label={t('dashboard.classActions', { className: displayName })}
                className={cn(
                    'flex shrink-0 bg-slate-50/50 dark:bg-slate-900/30',
                    isRtl ? 'border-r border-slate-100 dark:border-slate-800' : 'border-l border-slate-100 dark:border-slate-800',
                )}
            >
                <button
                    type="button"
                    onClick={() => runAction(onConfigure)}
                    className="flex min-h-[70px] w-12 touch-manipulation items-center justify-center text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0b57d0]/30 active:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    aria-label={`${t('dashboard.edit')} ${displayName}`}
                >
                    <Settings className="h-4 w-4" />
                </button>
                <button
                    type="button"
                    onClick={() => runAction(onShowNotifications)}
                    className={`${issueStatus ? 'w-[7.5rem] px-2 sm:w-32' : 'w-12 sm:w-14'} flex min-h-[70px] min-w-0 touch-manipulation items-center justify-center gap-1.5 border-s border-slate-100 text-[#0b57d0] transition-all hover:bg-[#e8f0fe] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0b57d0]/30 dark:border-slate-800 dark:text-[#a8c7fa] dark:hover:bg-[#004a77]/40`}
                    aria-label={notificationButtonLabel}
                    title={notificationButtonLabel}
                    aria-haspopup="dialog"
                >
                    <Info className="h-4 w-4 shrink-0" />
                    {issueStatus && (
                        <span className="line-clamp-2 min-w-0 text-center text-[9px] font-semibold leading-[1.12] text-[#b3261e] dark:text-[#f2b8b5]">
                            ({issueStatus})
                        </span>
                    )}
                </button>
            </div>
        </article>
    );
};
