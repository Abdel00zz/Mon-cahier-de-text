import { memo, FC, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { getClassVisual, getSubjectVisual } from '@/utils/classVisuals';
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
    const levelVisual = getClassVisual(classInfo.name);
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
            className={`group relative grid h-full w-full min-h-[164px] grid-rows-[2.25rem_minmax(0,1fr)_2.25rem] overflow-hidden rounded-[16px] border-[3px] px-3.5 py-3 sm:min-h-[184px] sm:rounded-[20px] sm:px-4 sm:py-3.5 lg:min-h-[198px] cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.995] focus-visible:ring-2 focus-visible:ring-blue-600/40 focus-visible:ring-offset-2 focus-visible:outline-none dark:bg-slate-900/90 dark:shadow-[0_8px_24px_rgba(0,0,0,0.4)] ${levelVisual.cardSurfaceClass}`}
        >
            {/* Slot fixed: the title stays optically centered with or without a subject. */}
            <div className="flex h-9 items-center justify-start">
                {showSubjectBadge && subjectBadgeText ? (
                    <span className={`${SUBJECT_BADGE_BASE_CLASSES} font-semibold ${visual.badgeStyle}`}>
                        {subjectBadgeText}
                    </span>
                ) : null}
            </div>

            {/* Centre optique : même équilibre pour un titre court ou sur deux lignes. */}
            <div className="flex min-h-0 w-full items-center justify-center px-1 py-1.5 text-center sm:px-2">
                <h3
                    className="max-w-[23ch] text-balance font-fira text-[clamp(0.98rem,1vw+0.62rem,1.28rem)] font-bold leading-[1.18] tracking-[-0.025em] text-foreground transition-colors group-hover:text-primary"
                    title={displayName}
                >
                    {renderClassTitleWithFonts(displayName)}
                </h3>
            </div>

            {/* Bottom area: settings only. Alerts live in the dashboard banner. */}
            <div
                role="group"
                aria-label={t('dashboard.classActions', { className: displayName })}
                className="flex h-9 items-center justify-end"
            >
                {/* Settings Button */}
                <button
                    type="button"
                    onClick={handleConfigureClick}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white/75 text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 hover:shadow-md active:scale-90 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-blue-700 dark:hover:bg-blue-950/60 dark:hover:text-blue-300 cursor-pointer"
                    title={t('dashboard.classSettings')}
                    aria-label={`${t('dashboard.edit')} ${displayName}`}
                >
                    <Settings className="h-5 w-5 shrink-0 stroke-[2.6]" />
                </button>
            </div>
        </article>
    );
};

export const ClassCard = memo(ClassCardComponent);
