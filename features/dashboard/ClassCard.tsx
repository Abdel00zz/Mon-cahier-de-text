import { memo, type FC } from 'react';
import type { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { ArrowRight, Settings } from '@/components/ui/icons';
import { keepToneForClass } from '@/utils/keepTheme';
import { classOpeningLabel } from '@/utils/classOpening';
import { useClassPress } from '@/hooks/useClassPress';
import { cn } from '@/lib/utils';

interface ClassCardProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    showSubjectBadge?: boolean;
    allClasses?: ClassInfo[];
    index?: number;
    isActiveSession?: boolean;
    isDragActive?: boolean;
}

const ClassCardComponent: FC<ClassCardProps> = ({ classInfo, onSelect, onConfigure, showSubjectBadge = true, isActiveSession, isDragActive }) => {
    const { impact } = useHapticFeedback();
    const { locale, t, isRtl } = useLocale();
    const displayName = formatLocalizedClassDisplayName(classInfo.name, locale);
    const subject = classInfo.subject ? formatLocalizedSubjectDisplayName(classInfo.subject, locale) : null;
    const lastOpened = classOpeningLabel(classInfo.lastOpenedAt, locale);

    const pressHandlers = useClassPress(
        () => { impact('light'); onSelect(); },
        () => { impact('medium'); onConfigure(); },
        isDragActive,
    );

    return (
        <article
            dir={isRtl ? 'rtl' : 'ltr'}
            data-keep-tone={keepToneForClass(classInfo.id)}
            data-session-active={isActiveSession ? 'true' : undefined}
            className={cn(
                "keep-surface dashboard-class-surface keep-interactive group relative flex h-full min-h-[140px] sm:min-h-[146px] w-full min-w-0 flex-col justify-between overflow-hidden",
                isActiveSession && "keep-session-active z-10"
            )}
        >
            {/* Zone Supérieure : Titre et Métadonnées avec espacement équilibré et hauteur compacte */}
            <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4 pb-2.5">
                <div className="flex items-start justify-between gap-2.5">
                    <h3 className="keep-class-title min-w-0 flex-1 text-sm sm:text-base font-bold leading-snug">
                        <button
                            type="button"
                            {...pressHandlers}
                            aria-label={`${t('dashboard.openClass', { className: displayName })}${isActiveSession ? ` · ${t('dashboard.session.now')}` : ''}`}
                            title={displayName}
                            className="block w-full text-start outline-none after:absolute after:inset-0 after:rounded-[12px] focus-visible:after:outline-2 focus-visible:after:outline-offset-2 cursor-pointer"
                        >
                            <span className="line-clamp-2 break-words text-balance">{displayName}</span>
                        </button>
                    </h3>
                    {isActiveSession && (
                        <span className="keep-session-chip relative z-10 inline-flex min-h-6 shrink-0 items-center gap-1.5 px-2 py-1 text-[10px] font-bold leading-none" role="status">
                            <span className="keep-session-dot h-1.5 w-1.5 shrink-0 rounded-full" aria-hidden="true" />
                            {t('dashboard.session.now')}
                        </span>
                    )}
                    {/* Style Google Keep PC : bouton paramètre discret affiché au survol sur ordinateur */}
                    <button
                        type="button"
                        data-class-drag-ignore
                        onClick={(e) => {
                            e.stopPropagation();
                            impact('light');
                            onConfigure();
                        }}
                        className="relative z-10 -me-1 -mt-1 hidden md:flex h-7 w-7 shrink-0 items-center justify-center rounded-none text-muted-foreground opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-black/10 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 hover:text-foreground dark:hover:bg-white/10 cursor-pointer"
                        title={t('dashboard.classSettings')}
                        aria-label={t('dashboard.edit') + ' ' + displayName}
                    >
                        <Settings className="h-4 w-4" aria-hidden="true" />
                    </button>
                </div>

                {/* Métadonnées compactes et élégantes (Dernière ouverture & Matière sur ligne fluide) */}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs text-muted-foreground">
                    <span className="truncate" title={lastOpened}>
                        {classInfo.lastOpenedAt ? <time dateTime={classInfo.lastOpenedAt}>{lastOpened}</time> : lastOpened}
                    </span>
                    {subject && showSubjectBadge && (
                        <>
                            <span className="opacity-50 select-none text-[10px]" aria-hidden="true">•</span>
                            <span className="truncate font-medium text-foreground/80" title={subject}>
                                {subject}
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Zone Inférieure : Design minimaliste et aérien, couleur unie */}
            <div className="keep-session-footer w-full bg-black/[0.015] dark:bg-white/[0.02] border-t border-black/[0.04] dark:border-white/[0.04] px-3.5 py-2 sm:px-4 sm:py-2.5 transition-colors duration-300 group-hover:bg-black/[0.03] dark:group-hover:bg-white/[0.05]">
                <p className="keep-session-action flex items-center justify-between gap-2 text-[11px] sm:text-xs font-medium text-foreground/40 group-hover:text-foreground/80 transition-colors" aria-hidden="true">
                    <span className="tracking-tight">{locale === 'ar' ? 'فتح دفتر النصوص' : locale === 'en' ? 'Open notebook' : 'Ouvrir le cahier'}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
                </p>
            </div>
        </article>
    );
};
export const ClassCard = memo(ClassCardComponent);
