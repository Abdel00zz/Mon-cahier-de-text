import React from 'react';
import { AppConfig, ClassInfo, Cycle, TimetableEntry } from '@/types';
import { CreateClassModal } from '@/features/dashboard/modals/CreateClassModal';
import { getBundledCalendar, getEffectiveSchoolYear, todayInMorocco } from '@/utils/calendar';
import { SUBJECT_ABBREV_MAP, formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import {
    HOUR_SLOTS,
    TIMETABLE_DAYS,
    deriveSchedules,
    getDaySlotRuns,
    getTimetableEntry,
    setTimetableEntry,
} from '@/utils/timetable';
import { computeScheduleInsights } from '@/utils/scheduleInsights';
import { TriangleAlert, CircleCheck } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { keepToneForClass, KEEP_TONES } from '@/utils/keepTheme';

export interface ModernClassColor {
    key: string;
    bg: string;
    border: string;
    text: string;
    subtext: string;
    dot: string;
}

/** Palette synchronisée avec les cartes de classes (Google Keep tones) */
export const KEEP_SCHEDULE_PALETTE: Record<typeof KEEP_TONES[number], ModernClassColor> = {
    sand: {
        key: 'sand',
        bg: 'bg-[#fff8b8] dark:bg-[#4b443a]',
        border: 'border-[#ebd966] dark:border-[#5c5448]',
        text: 'text-[#3c362a] dark:text-[#f8f5ee]',
        subtext: 'text-[#6b6250] dark:text-[#ded7cb]',
        dot: 'bg-[#fbc02d]',
    },
    mint: {
        key: 'mint',
        bg: 'bg-[#e2f6d3] dark:bg-[#345039]',
        border: 'border-[#bfe5a5] dark:border-[#436449]',
        text: 'text-[#233d27] dark:text-[#ebf7eb]',
        subtext: 'text-[#4c7352] dark:text-[#c4e6c8]',
        dot: 'bg-[#4caf50]',
    },
    sky: {
        key: 'sky',
        bg: 'bg-[#d4e4ed] dark:bg-[#2d4855]',
        border: 'border-[#b0d1e3] dark:border-[#3d5d6c]',
        text: 'text-[#1e3440] dark:text-[#e8f1f5]',
        subtext: 'text-[#46697d] dark:text-[#bad7e7]',
        dot: 'bg-[#29b6f6]',
    },
    lavender: {
        key: 'lavender',
        bg: 'bg-[#e9e3f4] dark:bg-[#443e50]',
        border: 'border-[#cebfe4] dark:border-[#554e63]',
        text: 'text-[#2d2539] dark:text-[#f1edf7]',
        subtext: 'text-[#5d5172] dark:text-[#d3c8e7]',
        dot: 'bg-[#ab47bc]',
    },
    coral: {
        key: 'coral',
        bg: 'bg-[#f8e2dd] dark:bg-[#594340]',
        border: 'border-[#e6beb4] dark:border-[#6e5450]',
        text: 'text-[#3d2724] dark:text-[#f8ece9]',
        subtext: 'text-[#74504a] dark:text-[#e4c8c2]',
        dot: 'bg-[#ff7043]',
    },
};

export const MODERN_SCHEDULE_PALETTE: ModernClassColor[] = Object.values(KEEP_SCHEDULE_PALETTE);

interface ScheduleTabProps {
    classes: ClassInfo[];
    config: AppConfig;
    onChange: (patch: Partial<AppConfig>) => void;
    /**
     * Création AUTOMATIQUE depuis la grille : chaque cellule propose
     * « + Créer une classe… », la classe créée est aussitôt posée sur le
     * créneau. Le prof peut ainsi composer tout son emploi du temps d'abord,
     * les classes naissent au fil de la saisie.
     */
    onCreateClass?: (details: { name: string; subject: string; cycle?: Cycle }) => ClassInfo;
    /** Avis « heures posées vs officiel » — masqué dans l'étape d'onboarding. */
    showHoursAdvisory?: boolean;
}

/*
 * Couleur DISTINCTE par classe (palette papier harmonieuse) : la grille se lit
 * d'un coup d'œil, chaque classe garde sa teinte dans les cellules ET dans le
 * récapitulatif. Attribution stable par ordre des classes.
 */
/**
 * Abréviation du nom de classe pour la CELLULE (le menu déroulant garde
 * l'intitulé complet). Le niveau et le numéro/groupe restent toujours
 * visibles : « 2 Bac SM-A » → « 2B·SM-A », « 1ère Bac SE » → « 1B·SE »,
 * « 3AC 2 » → « 3AC·2 ». Les noms arabes sont conservés tels quels
 * (tronqués par la cellule si besoin).
 */
const abbreviateClassName = (name: string): string => {
    if (/[؀-ۿ]/.test(name)) {
        const cleaned = name.replace(/^قسم\s+/, '').trim();
        const group = cleaned.match(/\d+\s*$/)?.[0].trim();
        const compactArabicLevels: Array<[RegExp, string]> = [
            [/الجذع المشترك العلمي/, 'ج.م.ع'],
            [/الجذع المشترك الأدبي/, 'ج.م.أ'],
            [/الأولى إعدادي/, '1إ'],
            [/الثانية إعدادي/, '2إ'],
            [/الثالثة إعدادي/, '3إ'],
            [/(الأولى باك|الأولى بكالوريا)/, '1ب'],
            [/(الثانية باك|الثانية بكالوريا)/, '2ب'],
        ];
        const match = compactArabicLevels.find(([pattern]) => pattern.test(cleaned));
        if (match) return `${match[1]}${group ?? ''}`;
        return cleaned;
    }
    const words = name.trim().split(/\s+/);
    const parts = words.map(word => {
        if (/\d/.test(word)) return word.replace(/(ère|ere|ème|eme|er)$/i, ''); // 1ère → 1, 3AC → 3AC
        if (word === word.toUpperCase() || word.includes('-')) return word;      // SM-A, SE, TC…
        return word.charAt(0).toUpperCase();                                     // Bac → B
    });
    // groupe/numéro final séparé par un point médian pour rester lisible
    if (parts.length > 1) {
        const last = parts[parts.length - 1];
        return parts.slice(0, -1).join('') + '·' + last;
    }
    return parts.join('');
};

type SchedulePeriod = 'all' | 'morning' | 'afternoon';

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ classes, config, onChange, onCreateClass, showHoursAdvisory = true }) => {
    const { locale, t } = useLocale();
    const hourNumber = React.useMemo(
        () => new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, numberingSystem: 'latn', useGrouping: false }),
        [locale],
    );
    const hourLabel = (startMin: number, endMin: number) => locale === 'fr'
        ? `${String(Math.floor(startMin / 60)).padStart(2, '0')}h–${String(Math.floor(endMin / 60)).padStart(2, '0')}h`
        : `${hourNumber.format(Math.floor(startMin / 60))}:00–${hourNumber.format(Math.floor(endMin / 60))}:00`;
    const classLabel = (name: string) => formatLocalizedClassDisplayName(name, locale);
    const subjectLabel = (subject: string) => locale === 'ar'
        ? formatLocalizedSubjectDisplayName(subject, locale)
        : (SUBJECT_ABBREV_MAP[subject] || subject);
    const calendar = getBundledCalendar();
    const effectiveSchoolYear = getEffectiveSchoolYear(
        calendar,
        config.schoolYearStart,
        todayInMorocco(new Date(), calendar),
    );
    const schoolYearStart = config.schoolYearStart ?? effectiveSchoolYear.debut;
    const displaySchoolYearStart = React.useMemo(() => {
        const [year, month, day] = schoolYearStart.split('-');
        return `${day}/${month}/${year}`;
    }, [schoolYearStart]);
    const timetable = config.timetable ?? [];
    // créneau en attente d'une NOUVELLE classe (option « + Créer une classe… »)
    const [pendingCreate, setPendingCreate] = React.useState<{ day: number; slot: number; span: number } | null>(null);
    // Le matin est la vue initiale la plus rapide à lire, quel que soit
    // l'écran. L'enseignant peut basculer instantanément vers l'après-midi
    // ou la journée complète sans recharger la grille.
    const [visiblePeriod, setVisiblePeriod] = React.useState<SchedulePeriod>('morning');

    const classById = React.useMemo(() => {
        const map = new Map<string, ClassInfo>();
        classes.forEach(c => map.set(c.id, c));
        return map;
    }, [classes]);

    /**
     * Attribution de la couleur synchronisée avec la carte de classe (Google Keep tone).
     */
    const colorFor = React.useCallback((classId: string): ModernClassColor => {
        const tone = keepToneForClass(classId);
        return KEEP_SCHEDULE_PALETTE[tone] || KEEP_SCHEDULE_PALETTE.sand;
    }, []);

    // Les avis sont recalculés dans le bloc unique au-dessus de la grille.
    // L'affectation reste immédiate et ne déclenche pas de toast en doublon.
    const assign = (day: number, slot: number, classId: string | null) => {
        const nextTimetable = setTimetableEntry(timetable, day, slot, classId);
        onChange({ timetable: nextTimetable, schedules: deriveSchedules(nextTimetable) });
    };

    // séance fusionnée (2 h+) : la cellule unique pilote TOUTES ses heures d'un coup
    const assignRun = (day: number, startSlot: number, hours: number, classId: string | null) => {
        let next = timetable;
        for (let slot = startSlot; slot < startSlot + hours; slot++) {
            next = setTimetableEntry(next, day, slot, classId);
        }
        onChange({ timetable: next, schedules: deriveSchedules(next) });
    };

    // séances continues par jour : deux créneaux consécutifs de la même classe
    // s'affichent soudés (badge « 2 h ») et comptent pour UNE séance
    const runsByDay = React.useMemo(() => {
        const map = new Map<number, ReturnType<typeof getDaySlotRuns>>();
        TIMETABLE_DAYS.forEach(day => map.set(day.value, getDaySlotRuns(timetable, day.value)));
        return map;
    }, [timetable]);

    const visibleHourSlots = React.useMemo(() => {
        if (visiblePeriod === 'morning') return HOUR_SLOTS.filter(slot => slot.startMin < 12 * 60);
        if (visiblePeriod === 'afternoon') return HOUR_SLOTS.filter(slot => slot.startMin >= 12 * 60);
        return HOUR_SLOTS;
    }, [visiblePeriod]);

    const setSchoolYearStart = (value: string) => onChange({ schoolYearStart: value || undefined });

    // ZÉRO classe ≠ blocage : la grille reste affichée, les classes se créent
    // directement depuis les cases (« + Créer une classe… »). On encourage.
    const noClassesYet = classes.length === 0;
    // Dès qu'une classe existe, la grille sert à FINIR sa configuration : on
    // évite de répéter « créer une classe » dans chacune des 48 cases.
    const canCreateFromSchedule = !!onCreateClass && noClassesYet;
    if (noClassesYet && !onCreateClass) {
        return (
            <p className="px-1 py-2 text-center text-sm text-muted-foreground">
                {t('schedule.empty')}
            </p>
        );
    }

    // heures = cases cochées ; séances = blocs continus (ce que compte le
    // moteur de retard : une séance de 2 h = une seule date attendue)
    const weeklyStats = (classId: string) => {
        const hours = timetable.filter(e => e.classId === classId).length;
        let sessions = 0;
        for (const runs of runsByDay.values()) {
            for (const run of runs.values()) {
                if (run.classId === classId && run.isStart) sessions += 1;
            }
        }
        return { hours, sessions };
    };

    const periodOptions: Array<{ value: SchedulePeriod; label: string }> = [
        { value: 'all', label: t('schedule.viewAll') },
        { value: 'morning', label: t('schedule.viewMorning') },
        { value: 'afternoon', label: t('schedule.viewAfternoon') },
    ];

    return (
        <div className="space-y-5">
            <section className="rounded-xl border border-border/70 bg-card/60 p-4 sm:p-5 shadow-2xs space-y-4" aria-label={t('schedule.gridTitle')}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex shrink-0 items-center gap-2.5" aria-label={t('schedule.startYear')}>
                        <label className="text-xs font-bold text-foreground/80">{t('schedule.startYear')}</label>
                        <div className="relative">
                            <input
                                type="date"
                                value={schoolYearStart}
                                onChange={e => setSchoolYearStart(e.target.value)}
                                lang={locale === 'ar' ? 'ar-MA-u-nu-latn' : locale === 'en' ? 'en-GB' : 'fr-MA'}
                                dir="ltr"
                                className={`h-9 rounded-md border border-border/70 bg-background/80 px-3 text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/25 ${locale === 'ar' ? 'text-transparent' : 'text-foreground'}`}
                            />
                            {locale === 'ar' && (
                                <span
                                    aria-hidden
                                    dir="ltr"
                                    className="pointer-events-none absolute inset-y-0 left-3 right-10 flex items-center text-xs font-bold text-foreground"
                                >
                                    {displaySchoolYearStart}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="inline-flex w-full rounded-md border border-zinc-200 bg-zinc-100/90 p-1 shadow-none dark:border-zinc-800 dark:bg-zinc-900/80 sm:w-auto" role="group" aria-label={t('schedule.viewLabel')}>
                        {periodOptions.map(option => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setVisiblePeriod(option.value)}
                                aria-pressed={visiblePeriod === option.value}
                                className={`min-w-0 flex-1 rounded-md px-3 py-1.5 text-xs font-bold transition-all sm:flex-none sm:px-3.5 cursor-pointer ${
                                    visiblePeriod === option.value
                                        ? 'bg-white text-zinc-950 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                                        : 'text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-100'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {noClassesYet && (
                    <p className="-mt-1 text-xs font-semibold text-primary">{t('schedule.emptyHint')}</p>
                )}

                {/* Une seule zone d'avis, toujours avant la grille. */}
                <HoursAdvisory classes={classes} timetable={timetable} showHoursAdvisory={showHoursAdvisory} />

                {/* Grille jours × créneaux : la vue demi-journée s'adapte à la largeur d'un téléphone. */}
                <div className="settings-surface overflow-hidden">
                    <div className="overflow-x-auto overscroll-x-contain">
                    <table className={`rtl-table w-full border-separate border-spacing-0 text-xs sm:text-sm ${visiblePeriod === 'all' ? 'min-w-[44rem]' : 'min-w-full table-fixed'}`}>
                    <thead>
                        <tr>
                            <th className={`sticky ${locale === 'ar' ? 'right-0 border-l' : 'left-0 border-r'} z-20 w-[5.75rem] border-b border-border/70 bg-muted/70 px-3 py-3 text-start font-bold tracking-wide text-foreground/70`}>
                                {t('schedule.day')}
                            </th>
                            {visibleHourSlots.map(hour => (
                                <th
                                    key={hour.index}
                                    className={`border-b border-border/70 bg-muted/70 px-1 py-2 text-center text-[9px] sm:text-[10px] font-bold text-foreground/75 ${
                                        hour.lunchBefore ? 'border-l border-l-indigo-500/25' : ''
                                    }`}
                                >
                                    <span dir="ltr" className="inline-block leading-tight tracking-tight">{hourLabel(hour.startMin, hour.endMin)}</span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {TIMETABLE_DAYS.map((day, dayIndex) => (
                            <tr key={day.value} className="group transition-colors hover:bg-muted/30">
                                <td className={`sticky ${locale === 'ar' ? 'right-0 border-l' : 'left-0 border-r'} z-10 border-border/70 bg-muted/70 px-3 py-2.5 font-bold text-foreground transition-colors group-hover:bg-muted ${dayIndex < TIMETABLE_DAYS.length - 1 ? 'border-b border-border/50' : ''}`}>
                                    {t(`schedule.day.${day.value}`)}
                                </td>
                                {visibleHourSlots.map(hour => {
                                    const run = runsByDay.get(day.value)?.get(hour.index);
                                    if (run && !run.isStart) return null;
                                    const merged = !!run && run.hours > 1;
                                    const span = run ? run.hours : 1;
                                    const entry = getTimetableEntry(timetable, day.value, hour.index);
                                    const classInfo = entry ? classById.get(entry.classId) : undefined;
                                    const color = entry ? colorFor(entry.classId) : null;
                                    return (
                                        <td
                                            key={hour.index}
                                            colSpan={span}
                                            className={`relative p-2 align-top ${dayIndex < TIMETABLE_DAYS.length - 1 ? 'border-b border-border/40' : ''} ${hour.lunchBefore ? 'border-l border-l-indigo-500/25' : ''}`}
                                        >
                                            <select
                                                value={entry?.classId ?? ''}
                                                onChange={e => {
                                                    if (e.target.value === '__create__') {
                                                        setPendingCreate({ day: day.value, slot: hour.index, span });
                                                        e.target.value = entry?.classId ?? '';
                                                        return;
                                                    }
                                                    if (merged) assignRun(day.value, hour.index, span, e.target.value || null);
                                                    else assign(day.value, hour.index, e.target.value || null);
                                                }}
                                                title={classInfo ? `${subjectLabel(classInfo.subject)} · ${classLabel(classInfo.name)}` : undefined}
                                                className={`h-16 w-full cursor-pointer rounded-2xl border px-2 text-center text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                                    classInfo && color
                                                    ? `${color.border} ${color.bg} text-transparent shadow-[0_6px_18px_-6px_rgba(0,0,0,0.22)] hover:-translate-y-0.5 hover:shadow-[0_10px_22px_-6px_rgba(0,0,0,0.30)] hover:brightness-105 active:scale-[0.99]`
                                                    : 'border-dashed border-border/70 bg-muted/20 text-zinc-700 dark:text-zinc-300 hover:border-primary/40 hover:bg-primary/[0.06] hover:text-zinc-950 dark:hover:text-zinc-50'
                                                }`}
                                                aria-label={`${t(`schedule.day.${day.value}`)} ${hourLabel(hour.startMin, hour.endMin)}${classInfo ? `, ${classLabel(classInfo.name)}` : ''}${merged ? ` (${t('schedule.mergedSession', { count: span })})` : ''}`}
                                            >
                                                <option value="" className="text-zinc-700 dark:text-zinc-300 dark:bg-zinc-800">{t('schedule.noClass')}</option>
                                                {classes.map(c => (
                                                    <option key={c.id} value={c.id} className="text-slate-800 dark:text-slate-100 dark:bg-zinc-800">
                                                        {subjectLabel(c.subject)} · {classLabel(c.name)}
                                                    </option>
                                                ))}
                                                {canCreateFromSchedule && (
                                                    <option value="__create__" className="text-slate-800 dark:text-slate-100 dark:bg-zinc-800 font-bold">
                                                        ＋ {t('schedule.createClass')}
                                                    </option>
                                                )}
                                            </select>
                                            {classInfo && color && (
                                                <span
                                                    className={`pointer-events-none absolute inset-2 flex min-w-0 flex-col items-center justify-center px-1.5 text-center ${color.text}`}
                                                >
                                                    <span className="max-w-full truncate text-[11.5px] font-black tracking-tight drop-shadow-xs sm:text-xs">
                                                        {abbreviateClassName(formatLocalizedClassDisplayName(classInfo.name, locale, { includeClassPrefix: false }))}
                                                    </span>
                                                    <span className={`mt-0.5 max-w-full truncate text-[9.5px] font-bold uppercase tracking-wider ${color.subtext}`}>
                                                        {subjectLabel(classInfo.subject)}
                                                    </span>
                                                </span>
                                            )}
                                            {merged && (
                                                <span className="pointer-events-none absolute start-3 top-1.5 rounded-full border border-white/30 bg-black/30 px-1.5 text-[9px] font-bold leading-4 text-white shadow-xs backdrop-blur-xs">
                                                    {t('schedule.hoursShort', { count: span })}
                                                </span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>

                {/* Récapitulatif neutre : les avertissements restent uniquement en haut. */}
                <div className="flex flex-wrap gap-2 pt-1">
                {classes.map(c => {
                    const { hours, sessions } = weeklyStats(c.id);
                    return (
                        <span
                            key={c.id}
                            className="settings-surface inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-foreground"
                        >
                            <span className={`h-2.5 w-2.5 rounded-full ${colorFor(c.id).dot}`} />
                            {classLabel(c.name)}
                            <span className="text-muted-foreground font-medium">
                                · {t('schedule.sessionsPerWeek', { count: sessions, plural: sessions > 1 && locale !== 'ar' ? 's' : ''})}
                                {hours !== sessions ? ` (${t('schedule.hoursShort', { count: hours })})` : ''}
                            </span>
                        </span>
                    );
                })}
                </div>
            </section>
            {/* Création de classe DEPUIS la grille : la classe naît et se pose
                aussitôt sur le créneau qui l'a demandée. */}
            {onCreateClass && (
                <CreateClassModal
                    isOpen={pendingCreate !== null}
                    onClose={() => setPendingCreate(null)}
                    onCreate={details => {
                        if (!pendingCreate) return;
                        const created = onCreateClass(details);
                        if (pendingCreate.span > 1) assignRun(pendingCreate.day, pendingCreate.slot, pendingCreate.span, created.id);
                        else assign(pendingCreate.day, pendingCreate.slot, created.id);
                        setPendingCreate(null);
                    }}
                    defaultCycle={config.selectedCycles?.[0] ?? 'lycee'}
                    teacherSubjects={config.selectedSubjects}
                    teacherCycles={config.selectedCycles}
                    existingClasses={classes}
                />
            )}
        </div>
    );
};

/* ── Avis « heures posées vs officiel », persistant, temps réel, non bloquant ── */

const HoursAdvisory: React.FC<{
    classes: ClassInfo[];
    timetable: TimetableEntry[] | undefined;
    showHoursAdvisory: boolean;
}> = ({ classes, timetable, showHoursAdvisory }) => {
    const { locale, t } = useLocale();
    const titleId = React.useId();
    const insights = React.useMemo(() => computeScheduleInsights(classes, timetable), [classes, timetable]);
    const unplanned = insights.filter(i => i.deviation === 'empty');
    const deviations = showHoursAdvisory
        ? insights.filter(i => i.officialHours !== null && (i.deviation === 'over' || i.deviation === 'under'))
        : [];
    const conform = insights.filter(i => i.officialHours !== null && i.deviation === 'match' && i.scheduledHours > 0);

    if (unplanned.length === 0 && deviations.length === 0) {
        if (!showHoursAdvisory || conform.length === 0) return null;
        return (
            <aside className="flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-3 shadow-2xs" role="status">
                <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {t('schedule.hoursMatch', { count: conform.length, plural: conform.length > 1 && locale !== 'ar' ? 's' : '' })}
                </p>
            </aside>
        );
    }

    return (
        <aside
            className="rounded-xl border border-amber-300/60 bg-amber-50/80 p-3.5 shadow-xs dark:border-amber-400/25 dark:bg-amber-500/[0.08] sm:p-4"
            role="status"
            aria-atomic="false"
        >
            {unplanned.length > 0 && (
                <section aria-labelledby={`${titleId}-unplanned`}>
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-500/15" aria-hidden="true">
                            <TriangleAlert className="h-4 w-4" />
                        </span>
                        <h3 id={`${titleId}-unplanned`} className="text-xs font-bold sm:text-sm">
                            {t('schedule.classesToPlan', { count: unplanned.length, plural: unplanned.length > 1 && locale !== 'ar' ? 's' : '' })}
                        </h3>
                    </div>
                    <ul className="mt-3 grid gap-2 lg:grid-cols-2">
                        {unplanned.map(i => (
                            <li key={i.classId} className="min-w-0 rounded-lg border border-amber-200/80 bg-background/80 px-3 py-2.5 dark:border-amber-400/20">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${KEEP_SCHEDULE_PALETTE[keepToneForClass(i.classId)].dot}`} aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground" title={formatLocalizedClassDisplayName(i.className, locale)}>
                                        {formatLocalizedClassDisplayName(i.className, locale)}
                                    </span>
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                                    <span className="text-muted-foreground">{t('schedule.noSlotsPlanned')}</span>
                                    {i.officialHours !== null && (
                                        <span className="whitespace-nowrap rounded-md bg-amber-500/15 px-1.5 py-0.5 font-bold text-amber-800 dark:text-amber-200">
                                            {t('schedule.hoursToAdd', { count: i.officialHours })}
                                        </span>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {deviations.length > 0 && (
                <section
                    className={unplanned.length > 0 ? 'mt-4 border-t border-amber-300/50 pt-4 dark:border-amber-400/20' : ''}
                    aria-labelledby={`${titleId}-deviations`}
                >
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-amber-500/15" aria-hidden="true">
                            <TriangleAlert className="h-4 w-4" />
                        </span>
                        <h3 id={`${titleId}-deviations`} className="text-xs font-bold sm:text-sm">
                            {t('schedule.hoursCheck', { count: deviations.length, plural: deviations.length > 1 && locale !== 'ar' ? 's' : '' })}
                        </h3>
                    </div>
                    <ul className="mt-3 grid gap-2 lg:grid-cols-2">
                        {deviations.map(i => {
                        const isOver = i.deviation === 'over';
                        const adjustment = Math.abs(i.delta);
                        return (
                            <li
                                key={i.classId}
                                className="min-w-0 rounded-lg border border-amber-200/80 bg-background/80 px-3 py-2.5 dark:border-amber-400/20"
                                title={t('schedule.hoursPlanned', { scheduled: i.scheduledHours, expected: i.officialHours ?? 0 })}
                            >
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${KEEP_SCHEDULE_PALETTE[keepToneForClass(i.classId)].dot}`} aria-hidden="true" />
                                    <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
                                        {formatLocalizedClassDisplayName(i.className, locale)}
                                    </span>
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                                    <span className="text-muted-foreground">
                                        {t('schedule.hoursPlanned', { scheduled: i.scheduledHours, expected: i.officialHours ?? 0 })}
                                    </span>
                                    <span className={`whitespace-nowrap rounded-md px-1.5 py-0.5 font-bold ${isOver ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200' : 'bg-primary/15 text-primary'}`}>
                                        {t(isOver ? 'schedule.hoursExcess' : 'schedule.hoursToAdd', { count: adjustment })}
                                    </span>
                                </div>
                            </li>
                        );
                        })}
                    </ul>
                </section>
            )}
        </aside>
    );
};
