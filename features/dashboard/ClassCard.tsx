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

    return (
        <article
            className="group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-3xl border border-border/80 bg-card/80 p-5 shadow-xs backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:bg-zinc-900/80 dark:border-zinc-800 sm:p-6"
        >
            {/* Subtle glow background */}
            <div className={`absolute -left-10 -top-10 h-32 w-32 rounded-full blur-2xl transition-all pointer-events-none opacity-30 group-hover:opacity-60 ${visual.iconSurfaceClass}`} />

            {/* Header — icône centrée, sans badge de cycle */}
            <div className="relative z-10 flex items-center justify-center">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-inner transition-transform duration-300 group-hover:scale-110 ${visual.iconSurfaceClass}`}>
                    <Users className="h-6 w-6" />
                </div>
            </div>

            {/* Body */}
            <button
                type="button"
                onClick={handleCardClick}
                className="relative z-10 my-5 w-full text-center outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/30 rounded-xl py-1"
                aria-label={t('dashboard.openClass', { className: displayName })}
            >
                <h3
                    className="text-xl font-extrabold tracking-tighter text-foreground transition-colors group-hover:text-primary sm:text-2xl"
                    title={displayName}
                >
                    {formatSuperscript(displayName)}
                </h3>
            </button>

            {/* Footer split actions */}
            <div
                role="group"
                aria-label={t('dashboard.classActions', { className: displayName })}
                className="relative z-10 grid grid-cols-2 gap-2 pt-4 text-xs"
            >
                <button
                    type="button"
                    onClick={handleNotificationsClick}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 px-3 font-medium transition-colors cursor-pointer ${
                        issueStatus
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400'
                            : 'bg-muted/70 text-muted-foreground hover:bg-muted dark:bg-zinc-800/80 dark:hover:bg-zinc-800'
                    }`}
                    title={notificationButtonLabel}
                    aria-label={notificationButtonLabel}
                    aria-haspopup="dialog"
                >
                    <Info className="h-4 w-4 shrink-0" />
                    <span className="truncate">{issueStatus || t('notifications.classUpToDateTitle')}</span>
                </button>

                <button
                    type="button"
                    onClick={handleConfigureClick}
                    className="flex items-center justify-center gap-1.5 rounded-xl bg-muted/70 py-2.5 px-3 font-medium text-muted-foreground hover:bg-muted dark:bg-zinc-800/80 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title={t('dashboard.classSettings')}
                    aria-label={`${t('dashboard.edit')} ${displayName}`}
                >
                    <Settings className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>{t('dashboard.classSettings')}</span>
                </button>
            </div>
        </article>
    );
};

export const ClassCard = memo(ClassCardComponent);
