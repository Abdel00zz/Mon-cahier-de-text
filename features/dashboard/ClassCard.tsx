import { memo, FC, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { getSubjectVisual } from '@/utils/classVisuals';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useDevice } from '@/hooks/useDevice';
import { useLocale } from '@/i18n/LocaleProvider';

interface ClassCardProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    onShowNotifications: () => void;
    notificationCount: number;
}

const renderClassTitleWithFonts = (text: string) => {
    const parts = text.split(/(\d+(?:er|ere|eme|ère|ème)?)/g);
    return parts.map((part, idx) => {
        if (!part) return null;

        const matchOrdinal = part.match(/^(\d+)(er|ere|eme|ère|ème)$/);
        if (matchOrdinal) {
            const num = matchOrdinal[1];
            const suf = matchOrdinal[2];
            return (
                <span key={idx} className="inline-inline-block">
                    <span className="font-itim font-bold text-[1.1em]">{num}</span>
                    <sup className="relative -top-[0.4em] text-[0.65em] font-normal font-sans">{suf}</sup>
                </span>
            );
        }

        if (/^\d+$/.test(part)) {
            return (
                <span key={idx} className="font-itim font-bold text-[1.12em] px-[1px]">
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
    onShowNotifications,
    notificationCount,
}) => {
    const { impact } = useHapticFeedback();
    const { type: deviceType } = useDevice();
    const { locale, t } = useLocale();

    const handleConfigureClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        impact('light');
        onConfigure();
    };

    const handleNotificationsClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        impact('light');
        onShowNotifications();
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

    const issueStatus = notificationCount === 1
        ? t('notifications.classIssueCount.one', { count: notificationCount })
        : notificationCount > 1
            ? t('notifications.classIssueCount.many', { count: notificationCount })
            : null;
    const notificationButtonLabel = issueStatus
        ? `${t('notifications.classSummaryTitle', { className: displayName })}. ${issueStatus}`
        : t('notifications.classButtonLabel', { className: displayName });

    const subjectBadgeText = classInfo.subject
        ? formatLocalizedSubjectDisplayName(classInfo.subject, locale).toUpperCase()
        : 'MATHÉMATIQUES';

    return (
        <article
            role="button"
            tabIndex={0}
            onClick={handleCardClick}
            onKeyDown={handleCardKeyDown}
            aria-label={t('dashboard.openClass', { className: displayName })}
            className={`group relative flex min-h-[196px] sm:min-h-[208px] cursor-pointer flex-col justify-between rounded-[20px] p-[8px] transition-all duration-300 shadow-[0_6px_16px_rgba(0,0,0,0.05)] hover:-translate-y-[3px] hover:shadow-[0_10px_24px_rgba(0,0,0,0.1)] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#423ed8]/40 focus-visible:outline-none ${visual.frameBg}`}
        >
            {/* Inner Content Area */}
            <div
                className="relative z-10 flex flex-1 w-full flex-col justify-between rounded-[14px] border border-black/5 bg-white dark:border-white/10 dark:bg-slate-900 pt-[10px] px-[14px] pb-[8px]"
                style={{
                    backgroundImage: 'radial-gradient(circle, rgb(148 163 184 / 0.22) 1px, transparent 1.2px)',
                    backgroundSize: '16px 16px',
                }}
            >
                {/* 1. En-tête (Header): Flexbox justify-between, align-center, mb-14px */}
                <div className="relative z-10 flex items-center justify-between mb-[10px]">
                    {/* Badge Mère / Matière ("MATHÉMATIQUES") */}
                    <span className={`inline-flex items-center justify-center font-sans font-bold uppercase text-[10px] tracking-[0.06em] py-[4px] px-[12px] rounded-[100px] ${visual.badgeStyle}`}>
                        {subjectBadgeText}
                    </span>

                    {/* Icône Groupe d'élèves (users) 18px x 18px */}
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full ${visual.iconSurfaceClass}`}>
                        <svg
                            className={`w-[16px] h-[16px] ${visual.iconClass}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                    </div>
                </div>

                {/* 2. Corps de la carte (Titre principal): Centré, mt-12px mb-20px */}
                <div className="relative z-10 mt-[10px] mb-[12px] w-full text-center py-0.5">
                    <h3
                        className={`font-lateef text-[22px] sm:text-[24px] leading-[1.2] text-[#191C1F] dark:text-slate-100 transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-300 ${deviceType === 'desktop' ? 'font-medium' : 'font-normal'}`}
                        title={displayName}
                    >
                        {renderClassTitleWithFonts(displayName)}
                    </h3>
                </div>

                {/* 3. Pied de carte (Actions & Boutons): Grid 1fr auto, gap 12px */}
                <div
                    role="group"
                    aria-label={t('dashboard.classActions', { className: displayName })}
                    className="relative z-10 grid grid-cols-[1fr_auto] gap-[8px] text-xs"
                >
                    {/* Bouton d'Alerte ("1 problème à résoudre" / Up to date) */}
                    <button
                        type="button"
                        onClick={handleNotificationsClick}
                        className={`flex min-h-[32px] items-center justify-center gap-[6px] px-[12px] rounded-[100px] font-sans font-medium text-[11px] transition-all duration-300 cursor-pointer active:scale-95 relative overflow-hidden ${
                            issueStatus
                                ? 'bg-red-600 text-white border border-red-700 shadow-sm hover:bg-red-700 dark:bg-red-700 dark:text-white dark:border-red-500 dark:hover:bg-red-600'
                                : `${visual.badgeStyle} border border-black/5 dark:border-white/10`
                        }`}
                        title={notificationButtonLabel}
                        aria-label={notificationButtonLabel}
                        aria-haspopup="dialog"
                    >
                        {/* SVG alert-circle 10px x 10px, stroke 1.8px */}
                        <svg
                            className={`w-[12px] h-[12px] shrink-0 relative z-10 ${issueStatus ? 'text-white' : ''}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <span className={`truncate relative z-10 ${issueStatus ? 'font-semibold animate-advanced-blink' : ''}`}>
                            {issueStatus || t('notifications.classUpToDateTitle')}
                        </span>
                    </button>

                    {/* Bouton Réglages ("Paramètres"): Icône plus grande sans label ni box */}
                    <button
                        type="button"
                        onClick={handleConfigureClick}
                        className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-full text-[#191C1F] hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer active:scale-95"
                        title={t('dashboard.classSettings')}
                        aria-label={`${t('dashboard.edit')} ${displayName}`}
                    >
                        {/* SVG settings (Roue dentée) 14px x 14px, stroke 1.8px */}
                        <svg
                            className="w-[16px] h-[16px] shrink-0"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                            <circle cx="12" cy="12" r="3" />
                        </svg>
                    </button>
                </div>
            </div>
        </article>
    );
};

export const ClassCard = memo(ClassCardComponent);
