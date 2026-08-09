import { memo, MouseEvent, FC } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { getClassVisual } from '@/utils/classVisuals';
import { Settings, Users, Info } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { cn } from '@/lib/utils';

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

    const handleConfigureClick = (e: MouseEvent) => {
        e.stopPropagation();
        impact('light');
        onConfigure();
    };

    const handleNotificationsClick = (e: MouseEvent) => {
        e.stopPropagation();
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
    const notificationButtonLabel = notificationCount > 0
        ? t('notifications.classButtonLabelCount', { className: displayName, count: notificationCount })
        : t('notifications.classButtonLabel', { className: displayName });

    return (
        <div
            onClick={handleCardClick}
            className={`card-press group relative flex min-h-[112px] cursor-pointer flex-col overflow-hidden rounded-3xl border border-border/80 bg-card text-card-foreground shadow-2xs transition-all duration-300 ${visual.cardHoverClass} hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.985] ${cycleBadge?.focusClass ?? 'focus-visible:ring-primary/35'} sm:min-h-[120px] text-left`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(); } }}
        >
            <div className="flex flex-1 flex-col p-3.5 sm:p-4">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            {cycleBadge && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${cycleBadge.style}`}>
                                    {cycleLabel}
                                </span>
                            )}
                        </div>

                    <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                        <button
                            type="button"
                            onClick={handleNotificationsClick}
                            className="relative flex !h-10 !w-10 items-center justify-center rounded-lg text-primary/70 transition-colors hover:bg-primary/[0.08] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-95 sm:!h-8 sm:!w-8 sm:rounded-xl"
                            title={notificationButtonLabel}
                            aria-label={notificationButtonLabel}
                            aria-haspopup="dialog"
                        >
                            <Info className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            {notificationCount > 0 && (
                                <span className={cn(
                                    'absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-0.5 text-[7px] font-extrabold leading-none text-white ring-1 ring-card',
                                    notificationCount > 9 ? 'bg-red-500' : 'bg-primary',
                                )}>
                                    {notificationCount > 9 ? '9+' : notificationCount}
                                </span>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={handleConfigureClick}
                            className="flex !h-10 !w-10 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-95 sm:!h-8 sm:!w-8 sm:rounded-xl dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            title={t('dashboard.edit')}
                            aria-label={`${t('dashboard.edit')} ${displayName}`}
                        >
                            <Settings className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </button>
                    </div>
                </div>

                <div className="mt-3.5 flex min-w-0 items-center gap-2.5">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${visual.iconSurfaceClass}`}>
                        <Users className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                        <p className="mb-0.5 text-[10px] font-medium text-muted-foreground">{t('dashboard.notebook')}</p>
                        <h3
                            className={`line-clamp-2 text-sm font-bold leading-tight tracking-tight text-foreground transition-colors sm:text-base ${isArabic ? 'font-ar text-sm' : 'font-display'}`}
                            title={displayName}
                        >
                            {formatSuperscript(mainName)}
                            {groupNum && (
                                <span className={`${isRtl ? 'mr-1.5' : 'ml-1.5'} font-itim text-lg opacity-90 ${visual.iconClass}`}>{groupNum}</span>
                            )}
                        </h3>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ClassCard = memo(ClassCardComponent);
