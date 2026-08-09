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

    const stopAction = (e: React.SyntheticEvent, action: () => void) => {
        e.stopPropagation();
        if (e.nativeEvent) {
            e.nativeEvent.stopImmediatePropagation?.();
        }
    };

    const handleConfigureClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        impact('light');
        onConfigure();
    };

    const handleNotificationsClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        impact('light');
        onShowNotifications();
    };

    const handleCardClick = (e?: React.MouseEvent) => {
        if (e && e.defaultPrevented) return;
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
            className={`card-press group relative flex min-h-[128px] cursor-pointer flex-col overflow-hidden rounded-xl border border-border/80 bg-card text-card-foreground shadow-2xs transition-all duration-300 ${visual.cardHoverClass} hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.985] ${cycleBadge?.focusClass ?? 'focus-visible:ring-primary/35'} sm:min-h-[136px] text-center`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(); } }}
        >
            <div className="flex flex-1 flex-col p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-2 w-full mb-2.5 relative z-20">
                <div className="flex items-center gap-1.5 min-w-0">
                    {cycleBadge ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase ${cycleBadge.style}`}>
                            {cycleLabel}
                        </span>
                    ) : <div />}
                </div>

                <div
                    className="flex shrink-0 items-center gap-1 sm:gap-1.5 opacity-90 transition-opacity group-hover:opacity-100"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button
                        type="button"
                        onClick={handleNotificationsClick}
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="relative flex h-7 w-7 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-lg bg-background/80 text-primary transition-all duration-200 border border-border/60 shadow-2xs hover:bg-primary/10 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-90 cursor-pointer"
                        title={notificationButtonLabel}
                        aria-label={notificationButtonLabel}
                        aria-haspopup="dialog"
                    >
                        <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        {notificationCount > 0 && (
                            <span className={cn(
                                'absolute -top-1 -right-1 flex h-3.5 min-w-3.5 sm:h-4 sm:min-w-4 items-center justify-center rounded-full px-1 text-[7px] sm:text-[8px] font-extrabold leading-none text-white ring-2 ring-card shadow-xs',
                                notificationCount > 9 ? 'bg-red-500' : 'bg-primary',
                            )}>
                                {notificationCount > 9 ? '9+' : notificationCount}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfigureClick}
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="flex h-7 w-7 sm:h-8.5 sm:w-8.5 items-center justify-center rounded-lg bg-background/80 text-muted-foreground transition-all duration-200 border border-border/60 shadow-2xs hover:bg-muted hover:text-foreground hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-90 cursor-pointer"
                        title={t('dashboard.edit')}
                        aria-label={`${t('dashboard.edit')} ${displayName}`}
                    >
                        <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </button>
                </div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center text-center py-2 px-1">
                <div className={`mb-2.5 flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform duration-200 group-hover:scale-105 ${visual.iconSurfaceClass}`}>
                    <Users className="h-6 w-6" />
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
            </div>
        </div>
    );
};

export const ClassCard = memo(ClassCardComponent);
