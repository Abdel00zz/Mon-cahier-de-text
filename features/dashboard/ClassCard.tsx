import { memo, FC, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { getSubjectVisual } from '@/utils/classVisuals';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { Settings } from '@/components/ui/icons';
import { FuturisticCardFrame } from '@/components/ui/FuturisticCardFrame';
import { getClassScheduleColor } from '@/utils/scheduleColors';

const SUBJECT_BADGE_BASE_CLASSES = 'inline-flex h-[22px] items-center justify-center rounded-md px-2.5 font-sans text-[9px] font-bold uppercase leading-none tracking-wider transition-colors sm:h-6 sm:text-[10px]';

interface ClassCardProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    showSubjectBadge?: boolean;
    allClasses?: ClassInfo[];
}

const renderClassTitleWithFonts = (text: string, accentColorClass: string) => {
    const parts = text.split(/([0-9\u0660-\u0669]+(?:er|ere|eme|ère|ème)?)/g);
    return parts.map((part, idx) => {
        if (!part) return null;

        const matchOrdinal = part.match(/^([0-9\u0660-\u0669]+)(er|ere|eme|ère|ème)$/);
        if (matchOrdinal) {
            const num = matchOrdinal[1];
            const suf = matchOrdinal[2];
            return (
                <span key={idx} className={`inline-block ${accentColorClass}`}>
                    <span className="font-itim font-bold text-[1.1em]">{num}</span>
                    <sup className="relative -top-[0.4em] text-[0.65em] font-semibold font-sans">{suf}</sup>
                </span>
            );
        }

        if (/^[0-9\u0660-\u0669]+$/.test(part)) {
            return (
                <span key={idx} className={`font-itim font-bold text-[1.12em] px-[1px] ${accentColorClass}`}>
                    {part}
                </span>
            );
        }

        return <span key={idx}>{part}</span>;
    });
};

const ClassCardComponent: FC<ClassCardProps> = ({
    classInfo,
    onSelect,
    onConfigure,
    showSubjectBadge = true,
    allClasses = [],
}) => {
    const { impact } = useHapticFeedback();
    const { locale, t } = useLocale();
    const isRtl = locale === 'ar';

    const handleConfigureClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        impact('light');
        onConfigure();
    };

    const handleCardClick = () => {
        impact('light');
        onSelect();
    };

    const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            impact('light');
            onSelect();
        }
    };

    const displayName = formatLocalizedClassDisplayName(classInfo.name, locale);
    const visual = getSubjectVisual(classInfo.subject);
    const colorTheme = getClassScheduleColor(classInfo, allClasses);
    const subjectBadgeText = classInfo.subject
        ? formatLocalizedSubjectDisplayName(classInfo.subject, locale)
        : null;

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            dir={isRtl ? 'rtl' : 'ltr'}
            aria-label={t('dashboard.openClass', { className: displayName })}
            style={{ aspectRatio: '460 / 250' }}
            className="group relative w-full cursor-pointer rounded-xl bg-transparent shadow-xs transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 active:translate-y-0 active:scale-[0.99] portrait:mx-auto portrait:w-[94%] portrait:max-w-[370px] landscape:mx-auto landscape:w-[96%] landscape:max-w-[420px] dark:shadow-zinc-950/40 dark:hover:shadow-zinc-950/70"
        >
            <FuturisticCardFrame colorTheme={colorTheme} />

            <div className="relative z-10 flex h-full w-full flex-col justify-between pt-5 pb-3.5 px-5 sm:px-6">
                <div className="flex min-h-[22px] items-center justify-start">
                    {showSubjectBadge && subjectBadgeText ? (
                        <span
                            className={`${SUBJECT_BADGE_BASE_CLASSES} ${visual.badgeStyle}`}
                        >
                            {subjectBadgeText}
                        </span>
                    ) : (
                        <div className="h-3" />
                    )}
                </div>

                <div className="my-auto flex min-h-0 w-full items-center justify-center px-2 py-0.5 text-center">
                    <h3
                        className={`max-w-[24ch] text-balance text-[clamp(1.12rem,1.2vw+0.7rem,1.5rem)] font-bold leading-snug tracking-tight text-foreground transition-colors duration-200 ${isRtl ? 'font-ibm-arabic' : 'font-sans'}`}
                        title={displayName}
                    >
                        {renderClassTitleWithFonts(displayName, colorTheme.textClass)}
                    </h3>
                </div>

                <div
                    role="group"
                    aria-label={t('dashboard.classActions', { className: displayName })}
                    className="flex min-h-[32px] items-center justify-end"
                >
                    <button
                        type="button"
                        onClick={handleConfigureClick}
                        className="group/btn relative flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95"
                        title={t('dashboard.classSettings')}
                        aria-label={`${t('dashboard.edit')} ${displayName}`}
                    >
                        <Settings className="h-4 w-4 shrink-0 stroke-[1.9]" />
                    </button>
                </div>
            </div>
        </article>
    );
};

export const ClassCard = memo(ClassCardComponent);
