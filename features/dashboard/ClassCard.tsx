import { memo, useMemo, type FC } from 'react';
import type { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';
import { ArrowRight, Settings } from '@/components/ui/icons';
import { keepToneForClass } from '@/utils/keepTheme';
import { classOpeningLabel } from '@/utils/classOpening';
import { classIdentityFor } from '@/utils/classIdentity';
import { useClassPress } from '@/hooks/useClassPress';
import { cn } from '@/lib/utils';
import { getBaseLevelKey } from '@/constants/class-levels';
import { getIllustrationForClass } from './classIllustration';

interface ClassCardProps {
    classInfo: ClassInfo;
    onSelect: () => void;
    onConfigure: () => void;
    showSubjectBadge?: boolean;
    allClasses?: ClassInfo[];
    index?: number;
    isActiveSession?: boolean;
    isDoubleColumn?: boolean;
}

const ClassCardComponent: FC<ClassCardProps> = ({ classInfo, onSelect, onConfigure, showSubjectBadge = true, isActiveSession, index = 0, isDoubleColumn = false }) => {
    const { impact } = useHapticFeedback();
    const { locale, t, isRtl } = useLocale();
    const className = formatLocalizedClassDisplayName(classInfo.name, locale, { includeClassPrefix: !isActiveSession });
    const displayName = isActiveSession ? t('dashboard.session.teaching', { className }) : className;
    const subject = classInfo.subject ? formatLocalizedSubjectDisplayName(classInfo.subject, locale) : null;
    const lastOpened = classOpeningLabel(classInfo.lastOpenedAt, locale);
    const lastOpenedCompact = classOpeningLabel(classInfo.lastOpenedAt, locale, { compact: true });

    /** Palier (« 2e Bac ») et filière (« Sciences Physiques »), déduits du nom */
    const identity = useMemo(() => classIdentityFor(classInfo.name, locale), [classInfo.name, locale]);
    const intro = isActiveSession ? t('dashboard.session.teaching', { className: '' }).trimEnd() : undefined;

    /** Illustration poétique thématique représentative de la matière et du niveau de la classe */
    const illustration = useMemo(() => getIllustrationForClass(classInfo, index), [classInfo, index]);

    const pressHandlers = useClassPress(
        () => { impact('light'); onSelect(); },
        () => { impact('medium'); onConfigure(); },
    );

    /** Branche / Filière principale ou intitulé si nom libre */
    const branchTitle = identity.stream || displayName;

    /** Numéro seul du groupe (ex: « 1 » pour « Sciences Mathématiques A 1 ») */
    const groupNumber = identity.group
        ? identity.group.replace(/^(?:groupe|grp|g|فوج)\s*/i, '').trim() || identity.group
        : null;
    const shouldAppendGroup = Boolean(
        groupNumber && !branchTitle.trim().endsWith(groupNumber)
    );

    return (
        <article
            dir={isRtl ? 'rtl' : 'ltr'}
            data-keep-tone={keepToneForClass(classInfo.id || getBaseLevelKey(classInfo.name), index)}
            data-session-active={isActiveSession ? 'true' : undefined}
            className={cn(
                "editorial-class-card group relative flex w-full min-w-0 flex-col justify-between overflow-hidden rounded-[9px] sm:rounded-[11px] bg-[#fbfbfa] dark:bg-[#13151b] border border-stone-200/90 dark:border-white/[0.08] shadow-[0_2px_7px_-3px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.38)] transition-all duration-300 select-none",
                isDoubleColumn ? "aspect-[1.26/1] landscape:aspect-[1.95/1] sm:aspect-[2.05/1]" : "aspect-[1.8/1] landscape:aspect-[1.95/1] sm:aspect-[2.05/1]",
                isActiveSession && "ring-2 ring-emerald-500 dark:ring-emerald-400 z-10"
            )}
        >
            {/* 1. Illustration fond plein format haute résolution (adaptée DPI, sans marges blanches ni déchirures) */}
            <img
                src={illustration.src}
                alt={illustration.alt}
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none select-none transition-transform duration-700 ease-out group-hover:scale-[1.03] dark:brightness-[0.74] dark:contrast-[1.12]"
            />

            {/* 2. Voile créatif assurant une lisibilité maximale sur tous écrans */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-9 bg-gradient-to-b from-black/8 via-transparent to-transparent dark:from-black/30" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[68%] bg-gradient-to-t from-white/96 via-white/84 to-transparent dark:from-[#13151b]/98 dark:via-[#13151b]/88 dark:to-transparent" />

            {/* 3. Filigrane artisanal discret dans la teinte de l'aquarelle */}
            {groupNumber && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute top-0.5 end-2 font-serif font-black select-none text-[26px] landscape:text-[40px] sm:text-[44px] leading-none opacity-[0.13] dark:opacity-[0.18]"
                    style={{ color: illustration.accentColor }}
                >
                    {groupNumber}
                </div>
            )}

            {/* 4. Bouton d'action principal couvrant toute la carte */}
            <button
                type="button"
                {...pressHandlers}
                aria-label={isActiveSession ? displayName : t('dashboard.openClass', { className: displayName })}
                title={displayName}
                className="absolute inset-0 z-10 w-full h-full cursor-pointer rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            />

            {/* 5. Partie supérieure : En-tête et Titre de la classe */}
            <div className="relative z-20 flex flex-1 flex-col justify-between p-2 landscape:p-3 sm:p-3.5 pb-1 landscape:pb-1.5 sm:pb-2 pointer-events-none">
                {/* Haut : Indicateur séance active & Bouton Réglages */}
                <div className="flex items-center justify-between">
                    {isActiveSession ? (
                        <div className="inline-flex items-center gap-1 px-1.5 py-0.5 landscape:px-2 landscape:py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8.5px] landscape:text-[10px] sm:text-[10.5px] font-bold bg-emerald-600 text-white shadow-xs animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-white inline-block" />
                            <span>{locale === 'ar' ? 'جلسة جارية' : 'En direct'}</span>
                        </div>
                    ) : (
                        <div />
                    )}

                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            impact('light');
                            onConfigure();
                        }}
                        className="pointer-events-auto flex h-6 w-6 landscape:h-7 landscape:w-7 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-white/90 hover:bg-white dark:bg-black/60 dark:hover:bg-black/90 backdrop-blur-md border border-stone-200/90 dark:border-white/15 text-stone-700 dark:text-stone-200 hover:text-stone-950 dark:hover:text-white transition-all hover:scale-105 active:scale-95 cursor-pointer touch-manipulation shadow-xs"
                        title={t('dashboard.classSettings')}
                        aria-label={t('dashboard.edit') + ' ' + displayName}
                    >
                        <Settings className="h-3 w-3 landscape:h-3.5 landscape:w-3.5 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                    </button>
                </div>

                {/* Titre & Palier */}
                <div className="mt-auto">
                    {identity.tierLabel && (
                        <div className="text-[8px] landscape:text-[10.5px] sm:text-[11px] font-bold uppercase tracking-[0.05em] landscape:tracking-[0.12em] sm:tracking-[0.14em] text-stone-600 dark:text-amber-300/90 font-mono leading-none">
                            {identity.tierLabel}
                        </div>
                    )}

                    <h3 className="font-serif text-[11.5px] landscape:text-[17px] sm:text-[18px] lg:text-[18.5px] font-bold text-stone-900 dark:text-stone-100 leading-[1.18] landscape:leading-[1.22] sm:leading-[1.24] line-clamp-2 mt-0.5 sm:mt-1 group-hover:text-amber-900 dark:group-hover:text-amber-200 transition-colors">
                        {intro && <span className="inline text-[9px] landscape:text-[11px] sm:text-[11.5px] font-sans font-semibold text-emerald-700 dark:text-emerald-400 me-1">{intro}</span>}
                        <span>{branchTitle}</span>
                        {shouldAppendGroup && (
                            <span
                                className="inline-block ms-1 landscape:ms-1.5 sm:ms-1.5 font-sans font-black tracking-tight"
                                style={{ color: illustration.accentColor }}
                                title={`${locale === 'ar' ? 'فوج' : 'Groupe'} ${groupNumber}`}
                            >
                                {groupNumber}
                            </span>
                        )}
                    </h3>
                </div>
            </div>

            {/* 6. Ligne séparatrice COMPLÈTE de bord à bord */}
            <div className="relative z-20 w-full border-t border-stone-200/90 dark:border-white/12 pointer-events-none" />

            {/* 7. Pied de carte : Date et micro flèche d'action sur toute la largeur */}
            <div className="relative z-20 flex w-full items-center justify-between px-2 py-1.5 landscape:px-3 landscape:py-2 sm:px-3.5 sm:py-2.5 pointer-events-none">
                <time className="text-[8.5px] landscape:text-[10.5px] sm:text-[11px] font-medium text-stone-500 dark:text-stone-400 truncate max-w-[calc(100%-28px)]">
                    <span className="sm:hidden landscape:hidden">{isDoubleColumn ? lastOpenedCompact : lastOpened}</span>
                    <span className="hidden sm:inline landscape:inline">{lastOpened}</span>
                </time>

                <div
                    className="inline-flex h-4.5 w-4.5 landscape:h-5.5 landscape:w-5.5 sm:h-6 sm:w-6 shrink-0 items-center justify-center rounded-full bg-stone-900/5 dark:bg-white/10 group-hover:bg-stone-900 dark:group-hover:bg-white text-stone-700 dark:text-stone-200 group-hover:text-white dark:group-hover:text-stone-950 transition-all duration-200 group-hover:scale-105"
                    aria-hidden="true"
                >
                    <ArrowRight className="h-2.5 w-2.5 landscape:h-3 landscape:w-3 sm:h-3.5 sm:w-3.5 rtl:rotate-180" />
                </div>
            </div>
        </article>
    );
};

export const ClassCard = memo(ClassCardComponent);

