import { FC } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { keepToneForClass } from '@/utils/keepTheme';
import { ChevronRight, Settings, Users } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import { classOpeningLabel } from '@/utils/classOpening';
import { useClassPress } from '@/hooks/useClassPress';

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
    const lastOpened = classOpeningLabel(classInfo.lastOpenedAt, locale);

    const pressHandlers = useClassPress(
        () => { impact('light'); onSelect(); },
        () => { impact('medium'); onConfigure(); }
    );

    return (
        <article
            data-keep-tone={keepToneForClass(classInfo.id)}
            className="keep-surface keep-interactive group relative flex min-h-[56px] overflow-hidden sm:min-h-[62px]"
        >
            <button
                type="button"
                {...pressHandlers}
                className="flex min-w-0 flex-1 touch-manipulation items-center gap-3 px-4 py-2 text-start outline-none transition-colors hover:bg-slate-50 dark:hover:bg-[#3c4043] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 cursor-pointer"
                aria-label={t('dashboard.openClass', { className: displayName })}
            >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-black/5 text-[#5f6368] dark:bg-white/10 dark:text-[#bdc1c6]" aria-hidden>
                    <Users className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className={cn("truncate font-medium text-[#202124] dark:text-[#e8eaed] leading-none", isRtl ? "text-lg font-ibm-arabic" : "text-base")}>{displayName}</h3>
                    <p
                        className={cn('mt-1 truncate text-[#5f6368] dark:text-[#bdc1c6]', isRtl ? 'text-sm leading-5' : 'text-[11.9px] leading-[1.35]')}
                        title={lastOpened}
                    >
                        {classInfo.lastOpenedAt ? <time dateTime={classInfo.lastOpenedAt}>{lastOpened}</time> : lastOpened}
                    </p>
                    {classInfo.subject && (
                        <p className="truncate text-xs text-[#5f6368] dark:text-[#bdc1c6] mt-1">
                            {formatLocalizedSubjectDisplayName(classInfo.subject, locale)}
                        </p>
                    )}
                </div>
                <ChevronRight className={cn('h-5 w-5 shrink-0 text-[#5f6368] dark:text-[#bdc1c6] transition-transform group-hover:translate-x-0.5', isRtl && 'rotate-180 group-hover:-translate-x-0.5')} aria-hidden />
            </button>
            <div
                role="group"
                aria-label={t('dashboard.classActions', { className: displayName })}
                className={cn(
                    'hidden md:flex shrink-0 items-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-within:opacity-100 border-[#e0e0e0] dark:border-[#5f6368]',
                    isRtl ? 'border-r' : 'border-l',
                )}
            >
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        impact('light');
                        onConfigure();
                    }}
                    className="flex h-full w-12 sm:w-14 touch-manipulation items-center justify-center text-[#5f6368] dark:text-[#bdc1c6] hover:bg-slate-50 dark:hover:bg-[#3c4043] hover:text-[#202124] dark:hover:text-[#e8eaed] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                    aria-label={`${t('dashboard.edit')} ${displayName}`}
                    title={t('dashboard.classSettings')}
                >
                    <Settings className="h-5 w-5 stroke-[2]" />
                </button>
            </div>
        </article>
    );
};
