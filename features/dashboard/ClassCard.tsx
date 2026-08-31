import { memo, type FC } from 'react';
import type { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { Settings } from '@/components/ui/icons';
import { keepToneForClass } from '@/utils/keepTheme';
import { useClassPress } from '@/hooks/useClassPress';
import { classOpeningLabel } from '@/utils/classOpening';

interface ClassCardProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    showSubjectBadge?: boolean;
    allClasses?: ClassInfo[];
    index?: number;
}

const ClassCardComponent: FC<ClassCardProps> = ({ classInfo, onSelect, onConfigure, showSubjectBadge = true }) => {
    const { impact } = useHapticFeedback();
    const { locale, t, isRtl } = useLocale();
    const displayName = formatLocalizedClassDisplayName(classInfo.name, locale);
    const subject = classInfo.subject ? formatLocalizedSubjectDisplayName(classInfo.subject, locale) : null;
    const press = useClassPress(() => { impact('light'); onSelect(); }, () => { impact('medium'); onConfigure(); });
    const lastOpened = classOpeningLabel(classInfo.lastOpenedAt,locale);
    const hint = locale === 'ar' ? 'اضغط مطولاً لإعداد القسم' : locale === 'en' ? 'Hold to configure the class' : 'Maintenir pour régler la classe';

    return (
        <article dir={isRtl ? 'rtl' : 'ltr'} data-keep-tone={keepToneForClass(classInfo.id)}
            className="class-summary keep-surface keep-interactive group relative w-full min-w-0 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 flex-1 pt-2 text-base font-semibold leading-snug sm:text-lg">
                    <button type="button" {...press} aria-describedby={'class-hold-'+classInfo.id}
                        aria-label={t('dashboard.openClass', { className: displayName })}
                        title={displayName}
                        className="block min-h-11 w-full select-none touch-pan-y text-start outline-none after:absolute after:inset-0 after:rounded-[12px] focus-visible:after:outline-2 focus-visible:after:outline-offset-2">
                        <span className="line-clamp-2 break-words">{displayName}</span>
                    </button>
                </h3>
                <button type="button" onClick={() => { impact('light'); onConfigure(); }}
                    className="class-settings-trigger relative z-10 -me-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-[#5f6368] transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#bdc1c6] dark:hover:bg-white/10"
                    title={t('dashboard.classSettings')} aria-label={t('dashboard.edit') + ' ' + displayName}>
                    <Settings className="h-4.5 w-4.5" aria-hidden="true" />
                </button>
            </div>
            <p className="mt-1 truncate text-sm text-[#5f6368] dark:text-[#bdc1c6]" title={lastOpened}>{classInfo.lastOpenedAt ? <time dateTime={classInfo.lastOpenedAt}>{lastOpened}</time> : lastOpened}</p>
            {subject && showSubjectBadge && <p className="mt-2 truncate text-sm text-[#5f6368] dark:text-[#bdc1c6]" title={subject}>{subject}</p>}
            <p id={'class-hold-'+classInfo.id} className="class-hold-hint sr-only text-sm text-[#5f6368] dark:text-[#bdc1c6]">{hint}<span className="sr-only"> · Shift + F10</span></p>
        </article>
    );
};
export const ClassCard = memo(ClassCardComponent);
