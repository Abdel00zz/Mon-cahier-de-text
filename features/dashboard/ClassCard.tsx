import { memo, FC } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { getClassVisual } from '@/utils/classVisuals';
import { Info, Settings, Users } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';

interface ClassCardProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    onShowNotifications: () => void;
    notificationCount: number;
}

const containsArabic = (text: string): boolean => {
    if (!text) return false;
    return /[\u0600-\u06FF]/.test(text);
};

const formatSuperscript = (text: string) => {
    const parts = text.split(/(\d+(?:er|ere|eme|ère|ème))/);
    return parts.map((part, idx) => {
        if (part.endsWith('er')) return <span key={idx}>{part.slice(0, -2)}<sup>er</sup></span>;
        if (part.endsWith('ere')) return <span key={idx}>{part.slice(0, -3)}<sup>ere</sup></span>;
        if (part.endsWith('eme')) return <span key={idx}>{part.slice(0, -3)}<sup>eme</sup></span>;
        if (part.endsWith('ère')) return <span key={idx}>{part.slice(0, -3)}<sup>ère</sup></span>;
        if (part.endsWith('ème')) return <span key={idx}>{part.slice(0, -3)}<sup>ème</sup></span>;
        return part;
    });
};

const CYCLE_BADGES: Record<string, { style: string; focusClass: string }> = {
    college: {
        style: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
        focusClass: 'focus-visible:border-blue-400 focus-visible:ring-blue-400/45 dark:focus-visible:border-blue-600 dark:focus-visible:ring-blue-500/45',
    },
    lycee: {
        style: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
        focusClass: 'focus-visible:border-purple-400 focus-visible:ring-purple-400/45 dark:focus-visible:border-purple-600 dark:focus-visible:ring-purple-500/45',
    },
    prepa: {
        style: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
        focusClass: 'focus-visible:border-amber-400 focus-visible:ring-amber-400/45 dark:focus-visible:border-amber-600 dark:focus-visible:ring-amber-500/45',
    },
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

    const handleConfigureClick = () => {
        impact('light');
        onConfigure();
    };

    const handleNotificationsClick = () => {
        impact('light');
        onShowNotifications();
    };

    const handleCardClick = () => {
        impact('light');
        onSelect();
    };

    const displayName = formatLocalizedClassDisplayName(classInfo.name, locale);
    const visual = getClassVisual(classInfo.name);

    const isArabic = containsArabic(displayName);
    const issueStatus = notificationCount === 1
        ? t('notifications.classIssueCount.one', { count: notificationCount })
        : notificationCount > 1
            ? t('notifications.classIssueCount.many', { count: notificationCount })
            : null;
    const notificationButtonLabel = issueStatus
        ? `${t('notifications.classSummaryTitle', { className: displayName })}. ${issueStatus}`
        : t('notifications.classButtonLabel', { className: displayName });

    const cycleLabel = classInfo.cycle ? t(`cycle.${classInfo.cycle}`) : null;

    return (
        <article
            className="group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[2rem] p-6 transition-all duration-300 bg-white border-[3px] border-slate-200 hover:border-[#423ed8] hover:shadow-[0_12px_32px_rgba(66,62,216,0.15)] hover:-translate-y-1 dark:bg-slate-900 dark:border-slate-700 dark:hover:border-[#98e3ff]"
        >
            {/* Header: Cycle Badge + Icon */}
            <div className="relative z-10 flex items-center justify-between">
                {cycleLabel ? (
                    <span className="inline-flex items-center text-xs font-bold px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                        {cycleLabel}
                    </span>
                ) : (
                    <span />
                )}

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-6 w-6" />
                </div>
            </div>

            {/* Body */}
            <button
                type="button"
                onClick={handleCardClick}
                className="relative z-10 my-6 w-full text-center outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-[#423ed8]/40 rounded-xl py-1 active:scale-[0.98] transition-transform"
                aria-label={t('dashboard.openClass', { className: displayName })}
            >
                <h3
                    className="text-2xl font-black tracking-tight text-slate-900 dark:text-white transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-200 sm:text-2xl"
                    title={displayName}
                >
                    {formatSuperscript(displayName)}
                </h3>
            </button>

            {/* Footer split actions without separator line */}
            <div
                role="group"
                aria-label={t('dashboard.classActions', { className: displayName })}
                className="relative z-10 grid grid-cols-2 gap-2 pt-2 text-xs"
            >
                <button
                    type="button"
                    onClick={handleNotificationsClick}
                    className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl py-2.5 px-3 font-semibold transition-all duration-300 cursor-pointer active:scale-95 shadow-none relative overflow-hidden ${
                        issueStatus
                            ? 'bg-red-50 text-red-700 border-2 border-red-200 hover:bg-red-100 hover:border-red-300 dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-400'
                            : 'bg-white text-[#423ed8] border-2 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300'
                    }`}
                    title={notificationButtonLabel}
                    aria-label={notificationButtonLabel}
                    aria-haspopup="dialog"
                >
                    <Info className={`h-[18px] w-[18px] shrink-0 relative z-10 ${issueStatus ? 'text-red-600 dark:text-red-500' : ''}`} />
                    <span className={`truncate relative z-10 ${issueStatus ? 'text-red-600 dark:text-red-400 font-bold animate-advanced-blink' : ''}`}>
                        {issueStatus || t('notifications.classUpToDateTitle')}
                    </span>
                </button>
                <button
                    type="button"
                    onClick={handleConfigureClick}
                    className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-2xl bg-white text-[#423ed8] border-2 border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800 dark:text-slate-300 transition-all duration-200 cursor-pointer active:scale-95 shadow-none"
                    title={t('dashboard.classSettings')}
                    aria-label={`${t('dashboard.edit')} ${displayName}`}
                >
                    <Settings className="h-[18px] w-[18px] shrink-0" />
                    <span>{t('dashboard.classSettings')}</span>
                </button>
            </div>
        </article>
    );
};

export const ClassCard = memo(ClassCardComponent);
