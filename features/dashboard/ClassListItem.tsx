import { FC, KeyboardEvent, MouseEvent } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { getClassVisual } from '@/utils/classVisuals';
import { ChevronRight, Info, Settings, Users } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';

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
    const displayName = formatLocalizedClassDisplayName(classInfo.name, locale);
    const visual = getClassVisual(classInfo.name);
    const notificationButtonLabel = notificationCount > 0
        ? t('notifications.classButtonLabelCount', { className: displayName, count: notificationCount })
        : t('notifications.classButtonLabel', { className: displayName });

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect();
        }
    };
    const stopAnd = (event: React.SyntheticEvent, action: () => void) => {
        event.stopPropagation();
        if (event.nativeEvent) {
            event.nativeEvent.stopImmediatePropagation?.();
        }
        action();
    };

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={handleKeyDown}
            className="group relative flex min-h-14 cursor-pointer items-center gap-2.5 rounded-[20px] border border-border bg-card text-card-foreground px-4 py-3 text-left shadow-2xs transition-all duration-300 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:min-h-[58px]"
        >
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${visual.iconSurfaceClass}`} aria-hidden>
                <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <h3 className="truncate font-display text-xs font-bold text-zinc-900 dark:text-zinc-100 sm:text-sm">{displayName}</h3>
                </div>
                <p className="mt-0.5 truncate text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 sm:text-xs">
                    {classInfo.subject ? formatLocalizedSubjectDisplayName(classInfo.subject, locale) : t('dashboard.notebook')}
                </p>
            </div>

            <div
                className="relative z-20 flex shrink-0 items-center gap-1 sm:opacity-70 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <button
                    type="button"
                    onClick={(event) => stopAnd(event, onShowNotifications)}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="relative flex !h-10 !w-10 items-center justify-center rounded-lg text-primary/80 transition-colors hover:bg-primary/[0.08] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 active:scale-95 sm:!h-8 sm:!w-8 sm:rounded-xl cursor-pointer"
                    aria-label={notificationButtonLabel}
                    title={notificationButtonLabel}
                    aria-haspopup="dialog"
                >
                    <Info className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    {notificationCount > 0 && (
                        <span className="absolute right-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-[7px] font-extrabold leading-none text-white ring-1 ring-card">
                            {notificationCount > 9 ? '9+' : notificationCount}
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={(event) => stopAnd(event, onConfigure)}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="flex !h-10 !w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 sm:!h-8 sm:!w-8 sm:rounded-lg cursor-pointer"
                    aria-label={`${t('dashboard.edit')} ${displayName}`}
                >
                    <Settings className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                </button>
                <ChevronRight className={`h-4 w-4 text-zinc-300 dark:text-zinc-600 ${isRtl ? 'rotate-180 sm:mr-0.5' : 'sm:ml-0.5'}`} aria-hidden />
            </div>
        </div>
    );
};
