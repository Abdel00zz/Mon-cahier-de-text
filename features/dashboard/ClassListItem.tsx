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
            className={`group relative flex min-h-[72px] rounded-[24px] p-[12px] transition-all duration-300 shadow-[0_10px_25px_rgba(0,0,0,0.05)] hover:-translate-y-[4px] hover:shadow-[0_16px_35px_rgba(0,0,0,0.1)] ${visual.frameBg}`}
        >
            {/* Inner Content Area */}
            <div className="relative z-10 flex flex-1 w-full items-stretch justify-between rounded-[18px] bg-white dark:bg-slate-900 overflow-hidden">
                <button
                type="button"
                onClick={selectClass}
                className="flex min-w-0 flex-1 touch-manipulation items-center gap-3 px-4 py-3 text-start outline-none transition-colors hover:bg-slate-50 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#423ed8]/40 dark:hover:bg-slate-800"
                aria-label={t('dashboard.openClass', { className: displayName })}
            >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 group-hover:scale-110 transition-transform duration-300 dark:bg-amber-900/40 dark:text-amber-400" aria-hidden>
                    <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold tracking-tight text-slate-900 dark:text-white">{displayName}</h3>
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
                    'flex shrink-0 bg-slate-50 dark:bg-slate-900/50',
                    isRtl ? 'border-r-2 border-slate-200 dark:border-slate-700' : 'border-l-2 border-slate-200 dark:border-slate-700',
                )}
            >
                <button
                    type="button"
                    onClick={() => runAction(onConfigure)}
                    className="flex min-h-[70px] w-12 touch-manipulation items-center justify-center text-slate-500 transition-colors hover:bg-slate-100 hover:text-[#423ed8] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#423ed8]/40 active:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-[#98e3ff]"
                    aria-label={`${t('dashboard.edit')} ${displayName}`}
                >
                    <Settings className="h-[18px] w-[18px]" />
                </button>
                <button
                    type="button"
                    onClick={() => runAction(onShowNotifications)}
                    className={`${issueStatus ? 'w-[7.5rem] px-2 sm:w-32 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 relative overflow-hidden' : 'w-12 sm:w-14 text-[#423ed8] hover:bg-slate-100 dark:hover:bg-slate-800'} flex min-h-[70px] min-w-0 touch-manipulation items-center justify-center gap-1.5 border-s-2 border-slate-200 dark:border-slate-700 transition-all focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#423ed8]/40`}
                    aria-label={notificationButtonLabel}
                    title={notificationButtonLabel}
                    aria-haspopup="dialog"
                >
                    <Info className={`h-[18px] w-[18px] shrink-0 relative z-10 ${issueStatus ? 'text-red-600 dark:text-red-500' : ''}`} />
                    {issueStatus && (
                        <span className="line-clamp-2 min-w-0 text-center text-[9px] font-bold leading-[1.12] text-red-600 dark:text-red-400 animate-advanced-blink relative z-10">
                            ({issueStatus})
                        </span>
                    )}
                </button>
            </div>
            </div>
        </article>
    );
};
