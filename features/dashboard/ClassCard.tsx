import { memo, FC } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { getClassVisual } from '@/utils/classVisuals';
import { Settings, Users } from '@/components/ui/icons';
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
    
    let mainName = displayName;
    let groupNum = '';
    const groupSeparator = locale === 'ar' ? ' · المجموعة ' : ' · Gr. ';
    if (displayName.includes(groupSeparator)) {
        const parts = displayName.split(groupSeparator);
        mainName = parts[0];
        groupNum = parts[1];
    }

    const isArabic = containsArabic(mainName);
    const cycleBadge = classInfo.cycle ? CYCLE_BADGES[classInfo.cycle] : null;
    const cycleLabel = classInfo.cycle ? t(`cycle.${classInfo.cycle}`) : '';
    const issueStatus = notificationCount === 0
        ? t('notifications.classIssueCount.none')
        : notificationCount === 1
            ? t('notifications.classIssueCount.one', { count: notificationCount })
            : t('notifications.classIssueCount.many', { count: notificationCount });
    const notificationButtonLabel = `${t('notifications.classSummaryTitle', { className: displayName })}. ${issueStatus}`;

    return (
        <article
            className={`group relative flex min-h-[164px] flex-col overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-2xs transition-[border-color,box-shadow,transform] duration-200 ${visual.cardHoverClass} hover:-translate-y-0.5 hover:shadow-md sm:min-h-[172px]`}
        >
            <button
                type="button"
                onClick={handleCardClick}
                className={`flex min-h-[118px] w-full min-w-0 flex-1 touch-manipulation flex-col p-3 text-center outline-none transition-colors hover:bg-muted/25 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset active:bg-muted/50 sm:p-3.5 ${cycleBadge?.focusClass ?? 'focus-visible:ring-primary/35'}`}
                aria-label={t('dashboard.openClass', { className: displayName })}
            >
                <div className="flex min-h-5 items-center">
                    {cycleBadge ? (
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cycleBadge.style}`}>
                            {cycleLabel}
                        </span>
                    ) : null}
                </div>
                <div className="flex flex-1 flex-col items-center justify-center px-1 py-1.5 text-center">
                    <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-xl shadow-sm transition-transform duration-200 group-hover:scale-105 ${visual.iconSurfaceClass}`}>
                        <Users className="h-5 w-5" />
                    </div>
                    <h3
                        className={`line-clamp-2 text-base font-bold leading-tight tracking-tight text-foreground transition-colors sm:text-lg ${isArabic ? 'font-ar' : 'font-display'}`}
                        title={displayName}
                    >
                        {formatSuperscript(mainName)}
                        {groupNum && (
                            <span className={`${isRtl ? 'mr-1.5' : 'ml-1.5'} font-itim text-lg font-bold opacity-90 ${visual.iconClass}`}>{groupNum}</span>
                        )}
                    </h3>
                </div>
            </button>

            <div
                role="group"
                aria-label={t('dashboard.classActions', { className: displayName })}
                className="grid min-h-14 w-full shrink-0 grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] border-t border-border/70 bg-muted/20"
            >
                <button
                    type="button"
                    onClick={handleConfigureClick}
                    className="flex min-h-14 touch-manipulation items-center justify-center gap-1.5 px-2 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 active:bg-muted sm:px-3 sm:text-xs"
                    title={t('dashboard.classSettings')}
                    aria-label={`${t('dashboard.edit')} ${displayName}`}
                >
                    <Settings className="h-[14px] w-[14px] shrink-0" />
                    <span className="truncate">{t('dashboard.classSettings')}</span>
                </button>
                <button
                    type="button"
                    onClick={handleNotificationsClick}
                    className="flex min-h-14 min-w-0 touch-manipulation items-center justify-center gap-1.5 border-s border-border/70 px-1.5 text-primary transition-colors hover:bg-primary/10 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 active:bg-primary/15 sm:px-2"
                    title={notificationButtonLabel}
                    aria-label={notificationButtonLabel}
                    aria-haspopup="dialog"
                >
                    <span className="min-w-0 text-center leading-tight">
                        <span className="block text-[10px] font-extrabold sm:text-[11px]">{t('dashboard.classStatus')}</span>
                        <span className={`mt-0.5 block text-[8px] font-semibold leading-[1.15] sm:text-[9px] ${notificationCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            ({issueStatus})
                        </span>
                    </span>
                </button>
            </div>
        </article>
    );
};

export const ClassCard = memo(ClassCardComponent);
