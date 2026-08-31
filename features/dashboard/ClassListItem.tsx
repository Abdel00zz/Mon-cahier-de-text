import { FC } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { keepToneForClass } from '@/utils/keepTheme';
import { ChevronRight, Settings, Users } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import { useClassPress } from '@/hooks/useClassPress';
import { classOpeningLabel } from '@/utils/classOpening';

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
    const selectClass = () => {
        impact('light');
        onSelect();
    };
    const press = useClassPress(selectClass,()=>{impact('medium');onConfigure();});
    const lastOpened = classOpeningLabel(classInfo.lastOpenedAt,locale);
    return (
        <article
            data-keep-tone={keepToneForClass(classInfo.id)}
            className="class-summary keep-surface keep-interactive group relative flex min-h-[56px] overflow-hidden sm:min-h-[62px]"
        >
            <button
                type="button"
                {...press}
                aria-describedby={'class-list-hold-'+classInfo.id}
                className="flex min-w-0 flex-1 select-none touch-pan-y items-center gap-3 px-4 py-3 text-start outline-none transition-colors hover:bg-slate-50 dark:hover:bg-[#3c4043] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                aria-label={t('dashboard.openClass', { className: displayName })}
            >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-black/5 text-[#5f6368] dark:bg-white/10 dark:text-[#bdc1c6]" aria-hidden>
                    <Users className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-medium leading-snug text-[#202124] dark:text-[#e8eaed]">{displayName}</h3>
                    <p className="mt-1 truncate text-sm text-[#5f6368] dark:text-[#bdc1c6]" title={lastOpened}>{lastOpened}</p>
                    {classInfo.subject && (
                        <p className="truncate text-xs text-[#5f6368] dark:text-[#bdc1c6] mt-1">
                            {formatLocalizedSubjectDisplayName(classInfo.subject, locale)}
                        </p>
                    )}
                    <p id={'class-list-hold-'+classInfo.id} className="class-hold-hint sr-only text-sm text-[#5f6368] dark:text-[#bdc1c6]">{locale==='ar'?'اضغط مطولاً لإعداد القسم':locale==='en'?'Hold to configure the class':'Maintenir pour régler la classe'}<span className="sr-only"> · Shift + F10</span></p>
                </div>
                <ChevronRight className={cn('h-5 w-5 shrink-0 text-[#5f6368] dark:text-[#bdc1c6] transition-transform group-hover:translate-x-0.5', isRtl && 'rotate-180 group-hover:-translate-x-0.5')} aria-hidden />
            </button>
            <div
                role="group"
                aria-label={t('dashboard.classActions', { className: displayName })}
                className={cn(
                    'class-settings-trigger flex shrink-0 items-center border-[#e0e0e0] dark:border-[#5f6368]',
                    isRtl ? 'border-r' : 'border-l',
                )}
            >
                <button
                    type="button"
                    onClick={() => {
                        impact('light');
                        onConfigure();
                    }}
                    className="flex h-full w-12 sm:w-14 touch-manipulation items-center justify-center text-[#5f6368] dark:text-[#bdc1c6] hover:bg-slate-50 dark:hover:bg-[#3c4043] hover:text-[#202124] dark:hover:text-[#e8eaed] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                    aria-label={`${t('dashboard.edit')} ${displayName}`}
                >
                    <Settings className="h-5 w-5 stroke-[2]" />
                </button>
            </div>
        </article>
    );
};
