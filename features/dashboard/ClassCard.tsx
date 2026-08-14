import { memo, FC, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { getSubjectVisual } from '@/utils/classVisuals';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useDevice } from '@/hooks/useDevice';
import { useLocale } from '@/i18n/LocaleProvider';
import { Settings, CircleAlert, CircleCheck } from '@/components/ui/icons';

interface ClassCardProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    onShowNotifications: () => void;
    notificationCount: number;
}

const renderClassTitleWithFonts = (text: string) => {
    const parts = text.split(/([0-9\u0660-\u0669]+(?:er|ere|eme|ère|ème)?)/g);
    return parts.map((part, idx) => {
        if (!part) return null;

        const matchOrdinal = part.match(/^([0-9\u0660-\u0669]+)(er|ere|eme|ère|ème)$/);
        if (matchOrdinal) {
            const num = matchOrdinal[1];
            const suf = matchOrdinal[2];
            return (
                <span key={idx} className="inline-block text-blue-600 dark:text-blue-400">
                    <span className="font-itim font-bold text-[1.1em]">{num}</span>
                    <sup className="relative -top-[0.4em] text-[0.65em] font-semibold font-sans">{suf}</sup>
                </span>
            );
        }

        if (/^[0-9\u0660-\u0669]+$/.test(part)) {
            return (
                <span key={idx} className="font-itim font-bold text-[1.12em] px-[1px] text-blue-600 dark:text-blue-400">
                    {part}
                </span>
            );
        }

        return <span key={idx}>{part}</span>;
    });
};

const ClassCardComponent: FC<ClassCardProps> = ({
    classInfo,
    onSelect,
    onConfigure,
    onShowNotifications,
    notificationCount,
}) => {
    const { impact } = useHapticFeedback();
    const { type: deviceType } = useDevice();
    const { locale, t, isRtl } = useLocale();

    const handleConfigureClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        impact('light');
        onConfigure();
    };

    const handleNotificationsClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        impact('light');
        onShowNotifications();
    };

    const handleCardClick = () => {
        impact('light');
        onSelect();
    };

    const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            impact('light');
            onSelect();
        }
    };

    const displayName = formatLocalizedClassDisplayName(classInfo.name, locale);
    const visual = getSubjectVisual(classInfo.subject);
    const subjectBadgeText = classInfo.subject
        ? formatLocalizedSubjectDisplayName(classInfo.subject, locale)
        : null;

    const issueStatus = notificationCount === 1
        ? t('notifications.classIssueCount.one', { count: notificationCount })
        : notificationCount > 1
            ? t('notifications.classIssueCount.many', { count: notificationCount })
            : null;
    const notificationButtonLabel = issueStatus
        ? `${t('notifications.classSummaryTitle', { className: displayName })}. ${issueStatus}`
        : t('notifications.classButtonLabel', { className: displayName });

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            aria-label={t('dashboard.openClass', { className: displayName })}
            className="group relative flex w-full min-h-[102px] sm:min-h-[116px] cursor-pointer flex-col justify-between rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 sm:p-3.5 transition-all duration-150 shadow-2xs hover:shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50/50 dark:hover:bg-zinc-900/80 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
        >
            {/* Top area: Subject badge & Centered class title */}
            <div className="w-full text-center">
                {subjectBadgeText && (
                    <div className="flex justify-end mb-1">
                        <span className={`inline-flex items-center justify-center font-sans font-medium text-[10px] sm:text-[11px] py-0.5 px-2 rounded-md ${visual.badgeStyle} shadow-2xs`}>
                            {subjectBadgeText}
                        </span>
                    </div>
                )}
                <h3
                    className="text-[14.5px] sm:text-[16.5px] font-semibold tracking-tight text-slate-800 dark:text-zinc-100 transition-colors group-hover:text-slate-950 dark:group-hover:text-white"
                    title={displayName}
                >
                    {renderClassTitleWithFonts(displayName)}
                </h3>
            </div>

            {/* Card Footer: Notion-style actions without separator line */}
            <div
                role="group"
                aria-label={t('dashboard.classActions', { className: displayName })}
                className="flex items-center justify-between gap-1.5 pt-1.5 mt-1"
            >
                {/* Notion-style Status Pill */}
                <button
                    type="button"
                    onClick={handleNotificationsClick}
                    className={`flex flex-1 min-h-[26px] sm:min-h-[28px] items-center justify-center gap-1.5 px-2 rounded-md font-sans text-[11px] font-medium transition-colors cursor-pointer active:scale-95 overflow-hidden ${
                        issueStatus
                            ? 'bg-rose-50 text-rose-700 border border-rose-200/70 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                    }`}
                    title={notificationButtonLabel}
                    aria-label={notificationButtonLabel}
                    aria-haspopup="dialog"
                >
                    {issueStatus ? (
                        <CircleAlert className="w-3 h-3 shrink-0 text-rose-600 dark:text-rose-400" />
                    ) : (
                        <CircleCheck className="w-3 h-3 shrink-0 text-emerald-600 dark:text-emerald-400 opacity-80" />
                    )}
                    <span className="truncate">
                        {issueStatus || t('notifications.classUpToDateTitle')}
                    </span>
                </button>

                {/* Notion-style Settings Icon Button */}
                <button
                    type="button"
                    onClick={handleConfigureClick}
                    className="flex h-6.5 w-6.5 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer active:scale-95"
                    title={t('dashboard.classSettings')}
                    aria-label={`${t('dashboard.edit')} ${displayName}`}
                >
                    <Settings className="w-3.5 h-3.5 shrink-0" />
                </button>
            </div>
        </article>
    );
};

export const ClassCard = memo(ClassCardComponent);
