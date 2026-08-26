import { memo, FC, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { getSubjectVisual } from '@/utils/classVisuals';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { Settings } from '@/components/ui/icons';

const SUBJECT_BADGE_BASE_CLASSES = 'inline-flex h-5 sm:h-[22px] items-center justify-center px-2 sm:px-2.5 rounded-full font-sans text-[9px] sm:text-[10px] leading-none border transition-all';
interface ClassCardProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    showSubjectBadge?: boolean;
}

const renderClassTitleWithFonts = (text: string) => {
    const parts = text.split(/([0-9\u0660-\u0669]+(?:er|ere|eme|ère|ème)?)/g);
    return parts.map((part, idx) => {
        if (!part) return null;

        const matchOrdinal = part.match(/^([0-9\u0660-\u0669]+)(er|ere|eme|ère|ème)$/);
        if (matchOrdinal) {
            const num = matchOrdinal[1];
            const suf = matchOrdinal[2];
            return (
                <span key={idx} className="inline-block text-blue-600 dark:text-blue-400">
                    <span className="font-itim font-bold text-[1.1em]">{num}</span>
                    <sup className="relative -top-[0.4em] text-[0.65em] font-semibold font-sans">{suf}</sup>
                </span>
            );
        }

        if (/^[0-9\u0660-\u0669]+$/.test(part)) {
            return (
                <span key={idx} className="font-itim font-bold text-[1.12em] px-[1px] text-blue-600 dark:text-blue-400">
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
}) => {
    const { impact } = useHapticFeedback();
    const { locale, t } = useLocale();

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
    const frame = locale === 'ar'
        ? { src: '/cadre-AR.png', aspectRatio: '1672 / 941' }
        : { src: '/cadre-fr.png', aspectRatio: '1536 / 1024' };
    const subjectBadgeText = classInfo.subject
        ? formatLocalizedSubjectDisplayName(classInfo.subject, locale)
        : null;

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            aria-label={t('dashboard.openClass', { className: displayName })}
            style={{ aspectRatio: frame.aspectRatio }}
            className="group relative w-full bg-transparent cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:drop-shadow-xl active:translate-y-0 active:scale-[0.985] focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
            <img
                src={frame.src}
                alt=""
                aria-hidden="true"
                draggable={false}
                loading="lazy"
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain drop-shadow-md"
            />

            <div className="relative z-10 flex h-full w-full flex-col justify-between px-[5%] py-[4%] sm:px-[6%] sm:py-[5%]">
                {/* Slot fixed: the title stays optically centered with or without a subject. */}
                <div className="flex items-center justify-start">
                    {showSubjectBadge && subjectBadgeText ? (
                        <span className={`${SUBJECT_BADGE_BASE_CLASSES} font-semibold ${visual.badgeStyle} shadow-sm backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border border-black/5 dark:border-white/10`}>
                            {subjectBadgeText}
                        </span>
                    ) : null}
                </div>

                {/* Centre optique : même équilibre pour un titre court ou sur deux lignes. */}
                <div className="flex min-h-0 w-full items-center justify-center px-1 py-1 text-center sm:px-2 pt-[6%]">
                    <h3
                        className="max-w-[23ch] text-balance font-fira text-[clamp(1.15rem,1.5vw+0.75rem,1.8rem)] font-bold leading-[1.25] tracking-[-0.02em] text-slate-800 dark:text-slate-100 transition-colors group-hover:text-blue-700 dark:group-hover:text-blue-300"
                        title={displayName}
                    >
                        {renderClassTitleWithFonts(displayName)}
                    </h3>
                </div>

                {/* Bottom area: settings only. Alerts live in the dashboard banner. */}
                <div
                    role="group"
                    aria-label={t('dashboard.classActions', { className: displayName })}
                    className="flex items-center justify-end"
                >
                    {/* Settings Button */}
                    <button
                        type="button"
                        onClick={handleConfigureClick}
                        className="group/btn flex h-[28px] w-[28px] sm:h-[34px] sm:w-[34px] shrink-0 items-center justify-center rounded-full border border-white/40 bg-white/30 text-slate-700 shadow-[0_4px_12px_rgba(0,0,0,0.06)] backdrop-blur-md outline-none focus-visible:ring-2 focus-visible:ring-blue-600/50 transition-all duration-300 hover:scale-110 hover:bg-white/60 hover:text-blue-600 active:scale-95 dark:border-white/20 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-blue-400 cursor-pointer"
                        title={t('dashboard.classSettings')}
                        aria-label={`${t('dashboard.edit')} ${displayName}`}
                    >
                        <Settings className="h-[14px] w-[14px] sm:h-[16px] sm:w-[16px] shrink-0 stroke-[2.2] transition-transform duration-500 group-hover/btn:rotate-90" />
                    </button>
                </div>
            </div>
        </article>
    );
};

export const ClassCard = memo(ClassCardComponent);
