import { memo, type FC } from 'react';
import type { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { ArrowRight, Settings } from '@/components/ui/icons';
import { keepToneForClass } from '@/utils/keepTheme';
import { classOpeningLabel } from '@/utils/classOpening';
import { useClassPress } from '@/hooks/useClassPress';

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
    const lastOpened = classOpeningLabel(classInfo.lastOpenedAt, locale);

    const pressHandlers = useClassPress(
        () => { impact('light'); onSelect(); },
        () => { impact('medium'); onConfigure(); }
    );

    return (
        <article dir={isRtl ? 'rtl' : 'ltr'} data-keep-tone={keepToneForClass(classInfo.id)}
            className="keep-surface keep-interactive group relative w-full min-w-0 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
                <h3 className="min-w-0 flex-1 pt-2 text-base font-semibold leading-snug sm:text-lg">
                    <button
                        type="button"
                        {...pressHandlers}
                        aria-label={t('dashboard.openClass', { className: displayName })}
                        title={displayName}
                        className="block w-full text-start outline-none after:absolute after:inset-0 after:rounded-[12px] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 cursor-pointer">
                        <span className="line-clamp-2 break-words">{displayName}</span>
                    </button>
                </h3>
                {/* Style Google Keep PC : bouton paramètre affiché uniquement au survol sur ordinateur, masqué sur mobile/tablette */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        impact('light');
                        onConfigure();
                    }}
                    className="relative z-10 -me-1 hidden md:flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#5f6368] opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-black/10 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-[#bdc1c6] dark:hover:bg-white/10 cursor-pointer"
                    title={t('dashboard.classSettings')}
                    aria-label={t('dashboard.edit') + ' ' + displayName}
                >
                    <Settings className="h-4.5 w-4.5" aria-hidden="true" />
                </button>
            </div>
            <p
                className={isRtl ? 'mt-1 truncate text-sm leading-5 text-[#5f6368] dark:text-[#bdc1c6]' : 'mt-1 truncate text-[11.9px] leading-[1.35] text-[#5f6368] dark:text-[#bdc1c6]'}
                title={lastOpened}
            >
                {classInfo.lastOpenedAt ? <time dateTime={classInfo.lastOpenedAt}>{lastOpened}</time> : lastOpened}
            </p>
            {subject && showSubjectBadge && <p className="mt-2 truncate text-sm text-[#5f6368] dark:text-[#bdc1c6]" title={subject}>{subject}</p>}
            <p className="mt-6 flex items-center justify-between gap-2 text-xs text-[#5f6368] dark:text-[#bdc1c6]" aria-hidden="true">
                <span>{locale === 'ar' ? 'فتح دفتر النصوص' : locale === 'en' ? 'Open notebook' : 'Ouvrir le cahier'}</span>
                <ArrowRight className={'h-4 w-4 shrink-0 ' + (isRtl ? 'rotate-180' : '')} />
            </p>
        </article>
    );
};
export const ClassCard = memo(ClassCardComponent);
