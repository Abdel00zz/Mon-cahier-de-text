import { memo, FC, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { getSubjectVisual } from '@/utils/classVisuals';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
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
            className="group relative flex h-full w-full min-h-[148px] sm:min-h-[160px] cursor-pointer flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs pt-4 px-4 pb-2.5 sm:pt-4.5 sm:px-5 sm:pb-3 transition-all duration-250 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_26px_-4px_rgba(37,99,235,0.1)] dark:hover:shadow-[0_10px_26px_-4px_rgba(0,0,0,0.6)] hover:border-blue-400/70 dark:hover:border-blue-500/50 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:outline-none"
        >
            {/* Top area: Minimalist subject pill (Top Left / Start) */}
            <div className="flex items-center justify-start w-full">
                {subjectBadgeText ? (
                    <span className={`inline-flex items-center justify-center font-sans font-semibold text-[10px] sm:text-[11px] py-1 px-2.5 rounded-full border border-black/5 dark:border-white/5 transition-all ${visual.badgeStyle}`}>
                        {subjectBadgeText}
                    </span>
                ) : (
                    <span className="inline-flex items-center justify-center font-sans font-medium text-[10px] sm:text-[11px] py-1 px-2.5 rounded-full bg-slate-100/90 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700/60">
                        {t('dashboard.notebook')}
                    </span>
                )}
            </div>

            {/* Center area: Class title (Airy, centered, high contrast) */}
            <div className="w-full my-3 sm:my-4 text-center flex flex-col items-center justify-center">
                <h3
                    className="text-sm sm:text-base lg:text-xl font-semibold lg:font-bold tracking-tight text-slate-900 dark:text-zinc-50 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400"
                    title={displayName}
                >
                    {renderClassTitleWithFonts(displayName)}
                </h3>
            </div>

            {/* Bottom area: Status Pill (Left) + Settings button (Right) */}
            <div
                role="group"
                aria-label={t('dashboard.classActions', { className: displayName })}
                className="flex items-center justify-between gap-2 mt-auto"
            >
                {/* Status Pill (Opens detailed information & issues) */}
                <button
                    type="button"
                    onClick={handleNotificationsClick}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 min-h-[28px] rounded-full font-sans text-xs font-medium transition-all cursor-pointer active:scale-95 ${
                        issueStatus
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                    }`}
                    title={notificationButtonLabel}
                    aria-label={notificationButtonLabel}
                    aria-haspopup="dialog"
                >
                    {issueStatus ? (
                        <CircleAlert className="w-3.5 h-3.5 shrink-0 text-rose-600 dark:text-rose-400" />
                    ) : (
                        <CircleCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400 opacity-90" />
                    )}
                    <span className="truncate max-w-[140px] sm:max-w-[190px]">
                        {issueStatus || t('notifications.classUpToDateTitle')}
                    </span>
                </button>

                {/* Settings Button: Large, dark and bold */}
                <button
                    type="button"
                    onClick={handleConfigureClick}
                    className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full text-slate-800 hover:text-slate-950 hover:bg-slate-100/90 dark:text-zinc-100 dark:hover:text-white dark:hover:bg-zinc-800 transition-all cursor-pointer active:scale-90"
                    title={t('dashboard.classSettings')}
                    aria-label={`${t('dashboard.edit')} ${displayName}`}
                >
                    <Settings className="w-5 h-5 shrink-0 text-slate-800 dark:text-zinc-100" strokeWidth={2.3} />
                </button>
            </div>
        </article>
    );
};

export const ClassCard = memo(ClassCardComponent);
