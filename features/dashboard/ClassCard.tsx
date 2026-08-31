import { memo, type FC } from 'react';
import type { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { ArrowRight, Settings } from '@/components/ui/icons';
import { keepToneForClass } from '@/utils/keepTheme';

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

    return (
        <article dir={isRtl ? 'rtl' : 'ltr'} data-keep-tone={keepToneForClass(classInfo.id)}
            className="keep-surface keep-interactive group relative w-full min-w-0 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 flex-1 pt-2 text-base font-semibold leading-snug sm:text-lg">
                    <button type="button" onClick={() => { impact('light'); onSelect(); }}
                        aria-label={t('dashboard.openClass', { className: displayName })}
                        title={displayName}
                        className="block w-full text-start outline-none after:absolute after:inset-0 after:rounded-[12px] focus-visible:after:outline-2 focus-visible:after:outline-offset-2">
                        <span className="line-clamp-2 break-words">{displayName}</span>
                    </button>
                </h3>
                <button type="button" onClick={() => { impact('light'); onConfigure(); }}
                    className="relative z-10 -me-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-[#5f6368] transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#bdc1c6] dark:hover:bg-white/10"
                    title={t('dashboard.classSettings')} aria-label={t('dashboard.edit') + ' ' + displayName}>
                    <Settings className="h-4.5 w-4.5" aria-hidden="true" />
                </button>
            </div>
            {subject && showSubjectBadge && <p className="mt-2 truncate text-sm text-[#5f6368] dark:text-[#bdc1c6]" title={subject}>{subject}</p>}
            <p className="mt-6 flex items-center justify-between gap-2 text-xs text-[#5f6368] dark:text-[#bdc1c6]" aria-hidden="true">
                <span>{locale === 'ar' ? 'فتح دفتر النصوص' : locale === 'en' ? 'Open notebook' : 'Ouvrir le cahier'}</span>
                <ArrowRight className={'h-4 w-4 shrink-0 ' + (isRtl ? 'rotate-180' : '')} />
            </p>
        </article>
    );
};
export const ClassCard = memo(ClassCardComponent);
