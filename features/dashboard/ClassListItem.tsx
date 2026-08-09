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
    const notificationButtonLabel = notificationCount > 0
        ? t('notifications.classButtonLabelCount', { className: displayName, count: notificationCount })
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
            className="group relative flex min-h-[62px] overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xs transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
        >
            <button
                type="button"
                onClick={selectClass}
                className="flex min-w-0 flex-1 touch-manipulation items-center gap-2.5 px-3 py-2.5 text-start outline-none transition-colors hover:bg-muted/25 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/30 active:bg-muted/50 sm:px-4"
                aria-label={t('dashboard.openClass', { className: displayName })}
            >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${visual.iconSurfaceClass}`} aria-hidden>
                    <Users className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-xs font-bold text-zinc-900 dark:text-zinc-100 sm:text-sm">{displayName}</h3>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 sm:text-xs">
                        {classInfo.subject ? formatLocalizedSubjectDisplayName(classInfo.subject, locale) : t('dashboard.notebook')}
                    </p>
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 text-zinc-300 dark:text-zinc-600 ${isRtl ? 'rotate-180' : ''}`} aria-hidden />
            </button>

            <div
                role="group"
                aria-label={t('dashboard.classActions', { className: displayName })}
                className={cn(
                    'grid shrink-0 grid-cols-2 bg-muted/20',
                    isRtl ? 'border-r border-border/70' : 'border-l border-border/70',
                )}
            >
                <button
                    type="button"
                    onClick={() => runAction(onShowNotifications)}
                    className="relative flex min-h-[60px] w-11 touch-manipulation items-center justify-center text-primary transition-colors hover:bg-primary/10 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35 active:bg-primary/15 sm:w-12"
                    aria-label={notificationButtonLabel}
                    title={notificationButtonLabel}
                    aria-haspopup="dialog"
                >
                    <Info className="h-[15px] w-[15px]" />
                    {notificationCount > 0 && (
                        <span className={cn('absolute top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-extrabold leading-none text-white ring-2 ring-card', isRtl ? 'left-1.5' : 'right-1.5')}>
                            {notificationCount > 9 ? '9+' : notificationCount}
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => runAction(onConfigure)}
                    className="flex min-h-[60px] w-11 touch-manipulation items-center justify-center border-s border-border/70 text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/35 active:bg-muted sm:w-12"
                    aria-label={`${t('dashboard.edit')} ${displayName}`}
                >
                    <Settings className="h-[15px] w-[15px]" />
                </button>
            </div>
        </article>
    );
};
