import { memo, MouseEvent, FC, useState } from 'react';
import { ClassInfo } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { getClassVisual } from '@/utils/classVisuals';
import { NextSessionInfo } from '@/utils/timetable';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Trash2, Settings, Users } from '@/components/ui/icons';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useLocale } from '@/i18n/LocaleProvider';

interface ClassCardProps {
    classInfo: ClassInfo;
    lastModified: string | null | undefined;
    nextSession?: NextSessionInfo | null;
    onSelect: () => void;
    onDelete: () => void;
    onConfigure: () => void;
}

const containsArabic = (text: string): boolean => {
    if (!text) return false;
    return /[\u0600-\u06FF]/.test(text);
};

const formatSuperscript = (text: string) => {
    const parts = text.split(/(\d+(?:er|ere|eme|ère|ème))/);
    return parts.map((part, idx) => {
        if (part.endsWith('er')) return <span key={idx}>{part.slice(0, -2)}<sup>er</sup></span>;
        if (part.endsWith('ere')) return <span key={idx}>{part.slice(0, -3)}<sup>ere</sup></span>;
        if (part.endsWith('eme')) return <span key={idx}>{part.slice(0, -3)}<sup>eme</sup></span>;
        if (part.endsWith('ère')) return <span key={idx}>{part.slice(0, -3)}<sup>ère</sup></span>;
        if (part.endsWith('ème')) return <span key={idx}>{part.slice(0, -3)}<sup>ème</sup></span>;
        return part;
    });
};

const formatDate = (dateString: string | null | undefined, locale: string, emptyLabel: string): string => {
    if (!dateString) return emptyLabel;
    try {
        const date = new Date(dateString);
        const corrected = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
        const dateLocale = locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-FR';
        return corrected.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' });
    } catch {
        return '---';
    }
};

const CYCLE_BADGES: Record<string, { style: string; focusClass: string }> = {
    college: {
        style: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
        focusClass: 'focus-visible:border-blue-400 focus-visible:ring-blue-400/45 dark:focus-visible:border-blue-600 dark:focus-visible:ring-blue-500/45',
    },
    lycee: {
        style: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
        focusClass: 'focus-visible:border-purple-400 focus-visible:ring-purple-400/45 dark:focus-visible:border-purple-600 dark:focus-visible:ring-purple-500/45',
    },
    prepa: {
        style: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
        focusClass: 'focus-visible:border-amber-400 focus-visible:ring-amber-400/45 dark:focus-visible:border-amber-600 dark:focus-visible:ring-amber-500/45',
    },
};

const ClassCardComponent: FC<ClassCardProps> = ({ classInfo, lastModified, nextSession, onSelect, onDelete, onConfigure }) => {
    const [confirmDelete, setConfirmDelete] = useState(false);
    const { impact } = useHapticFeedback();
    const { locale, t, isRtl } = useLocale();

    const handleDeleteClick = (e: MouseEvent) => {
        e.stopPropagation();
        impact('medium');
        setConfirmDelete(true);
    };

    const handleConfigureClick = (e: MouseEvent) => {
        e.stopPropagation();
        impact('light');
        onConfigure();
    };

    const handleCardClick = () => {
        impact('light');
        onSelect();
    };

    const displayName = formatLocalizedClassDisplayName(classInfo.name, locale);
    const visual = getClassVisual(classInfo.name);
    
    let mainName = displayName;
    let groupNum = '';
    const groupSeparator = locale === 'ar' ? ' · المجموعة ' : ' · Gr. ';
    if (displayName.includes(groupSeparator)) {
        const parts = displayName.split(groupSeparator);
        mainName = parts[0];
        groupNum = parts[1];
    }

    const isArabic = containsArabic(mainName);
    const cycleBadge = classInfo.cycle ? CYCLE_BADGES[classInfo.cycle] : null;
    const cycleLabel = classInfo.cycle ? t(`cycle.${classInfo.cycle}`) : '';

    return (
        <div
            onClick={handleCardClick}
            className={`card-press group relative flex min-h-[156px] cursor-pointer flex-col overflow-hidden rounded-3xl border border-border/80 bg-card text-card-foreground shadow-2xs transition-all duration-300 ${visual.cardHoverClass} hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.985] ${cycleBadge?.focusClass ?? 'focus-visible:ring-primary/35'} sm:min-h-[168px] text-left`}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(); } }}
        >
            <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            {cycleBadge && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${cycleBadge.style}`}>
                                    {cycleLabel}
                                </span>
                            )}
                        </div>

                    <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
                        <button
                            onClick={handleConfigureClick}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 active:scale-95 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                            title={t('dashboard.edit')}
                            aria-label={`${t('dashboard.edit')} ${displayName}`}
                        >
                            <Settings className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={handleDeleteClick}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 active:scale-95 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            title={t('dashboard.delete')}
                            aria-label={`${t('dashboard.delete')} ${displayName}`}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                <div className="mt-5 flex min-w-0 items-center gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${visual.iconSurfaceClass}`}>
                        <Users className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="mb-0.5 text-[10px] font-medium text-muted-foreground">{t('dashboard.notebook')}</p>
                        <h3
                            className={`truncate text-sm font-bold tracking-tight text-foreground transition-colors sm:text-base ${isArabic ? 'font-ar text-sm' : 'font-display'}`}
                            title={displayName}
                        >
                            {formatSuperscript(mainName)}
                            {groupNum && (
                                <span className={`${isRtl ? 'mr-1.5' : 'ml-1.5'} font-itim text-lg opacity-90 ${visual.iconClass}`}>{groupNum}</span>
                            )}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Bottom info footer */}
            <div className="mt-auto flex items-center justify-between rounded-b-2xl bg-zinc-50/80 px-4 py-2.5 dark:bg-zinc-900/40 sm:px-5">
                <div className={`flex min-w-0 items-center gap-2 ${isRtl ? 'pl-2' : 'pr-2'}`}>
                    <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            nextSession?.kind === 'now'
                                ? 'bg-emerald-500 animate-pulse'
                                : nextSession
                                ? 'bg-[#007AFF]'
                                : 'bg-zinc-300 dark:bg-zinc-700'
                        }`}
                    />
                    <p className="min-w-0 truncate text-[10px] leading-none">
                        <span className="font-bold uppercase tracking-wide text-muted-foreground/55">{t('dashboard.nextSessionStatus')}</span>{' '}
                        <span className={`font-semibold ${nextSession?.kind === 'now' ? 'text-emerald-600 dark:text-emerald-400' : nextSession ? 'text-[#007AFF] dark:text-blue-400' : 'text-muted-foreground/70'}`}>
                            {nextSession?.label ?? t('dashboard.toSchedule')}
                        </span>
                    </p>
                </div>

                <div className="shrink-0 flex flex-col justify-center gap-0.5 text-right">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50 leading-none">{t('dashboard.lastLesson')}</span>
                    <span className="font-mono text-[11px] font-medium text-muted-foreground/80 leading-none">{formatDate(lastModified, locale, t('dashboard.none'))}</span>
                </div>
            </div>

            <ConfirmDialog
                open={confirmDelete}
                onOpenChange={setConfirmDelete}
                title={t('dashboard.deleteNotebookTitle', { name: displayName })}
                description={t('dashboard.deleteNotebookDescription')}
                confirmLabel={t('dashboard.delete')}
                onConfirm={onDelete}
            />
        </div>
    );
};

export const ClassCard = memo(ClassCardComponent);
