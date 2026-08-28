import { FC } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { getSubjectVisual } from '@/utils/classVisuals';
import { ChevronRight, Settings, Users } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';

interface ClassListItemProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
}

export const ClassListItem: FC<ClassListItemProps> = ({
    classInfo,
    onSelect,
    onConfigure,
}) => {
    const { locale, t, isRtl } = useLocale();
    const { impact } = useHapticFeedback();
    const displayName = formatLocalizedClassDisplayName(classInfo.name, locale);
    const visual = getSubjectVisual(classInfo.subject);
    const selectClass = () => {
        impact('light');
        onSelect();
    };
    return (
        <article
            className="group relative flex min-h-[52px] sm:min-h-[58px] rounded-xl border border-border bg-card overflow-hidden transition-all duration-150 shadow-2xs hover:border-primary/40 hover:bg-muted/30"
        >
            <button
                type="button"
                onClick={selectClass}
                className="flex min-w-0 flex-1 touch-manipulation items-center gap-3 px-3.5 py-2 text-start outline-none transition-colors hover:bg-muted/40 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                aria-label={t('dashboard.openClass', { className: displayName })}
            >
                <div className={`flex h-8 w-8 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-xl ${visual.iconSurfaceClass}`} aria-hidden>
                    <Users className={`h-4 w-4 ${visual.iconClass}`} />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold text-foreground sm:text-[15px]">{displayName}</h3>
                    {classInfo.subject && (
                        <p className="truncate text-[10px] sm:text-[11px] font-medium text-muted-foreground">
                            {formatLocalizedSubjectDisplayName(classInfo.subject, locale)}
                        </p>
                    )}
                </div>
                <ChevronRight className={`h-4 w-4 shrink-0 text-muted-foreground/60 ${isRtl ? 'rotate-180' : ''}`} aria-hidden />
            </button>

            <div
                role="group"
                aria-label={t('dashboard.classActions', { className: displayName })}
                className={cn(
                    'flex shrink-0 items-center border-border/60',
                    isRtl ? 'border-r' : 'border-l',
                )}
            >
                <button
                    type="button"
                    onClick={() => {
                        impact('light');
                        onConfigure();
                    }}
                    className="flex h-full w-9.5 sm:w-10.5 touch-manipulation items-center justify-center text-slate-600 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-300 dark:hover:bg-blue-950/50 dark:hover:text-blue-300 transition-colors cursor-pointer"
                    aria-label={`${t('dashboard.edit')} ${displayName}`}
                >
                    <Settings className="h-4.5 w-4.5 stroke-[2.2]" />
                </button>
            </div>
        </article>
    );
};
