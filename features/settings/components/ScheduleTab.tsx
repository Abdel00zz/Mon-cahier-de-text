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
import { getOfficialWeeklyHours } from '@/utils/officialHours';
import { computeScheduleInsights } from '@/utils/scheduleInsights';
import { getClassVisual } from '@/utils/classVisuals';
import { TriangleAlert, CircleCheck } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';

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
    const classesWithoutSlots = React.useMemo(
        () => classes.filter(classInfo => !timetable.some(entry => entry.classId === classInfo.id)),
        [classes, timetable],
    );
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

    const colorFor = (classId: string) => {
        const visual = getClassVisual(classById.get(classId)?.name ?? '');
        return {
            bg: visual.chapterSurfaceClass,
            border: '',
            text: visual.iconClass,
            subtext: 'text-foreground/65 dark:text-white/75',
            dot: visual.frameBg,
        };
    };

    /*
     * Avis intelligent en TEMPS RÉEL : après chaque modif de la grille, on
     * confronte les heures posées à l'horaire officiel de la classe touchée.
     * Un dépassement (ou un manque net) déclenche un toast bienveillant, le
     * prof reste libre (dédoublement, option), mais il est PRÉVENU de la
     * probable coquille (« 6 h pour 2BAC PC alors que l'officiel est 5 h »).
     */
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
            <section className="space-y-3.5" aria-label={t('schedule.gridTitle')}>
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
                                className={`h-9 rounded-xl border border-border/70 bg-background/80 px-3 text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/25 ${locale === 'ar' ? 'text-transparent' : 'text-foreground'}`}
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
                    <div className="inline-flex w-full rounded-xl border border-zinc-200 bg-zinc-100/90 p-1 shadow-none dark:border-zinc-800 dark:bg-zinc-900/80 sm:w-auto" role="group" aria-label={t('schedule.viewLabel')}>
                        {periodOptions.map(option => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setVisiblePeriod(option.value)}
                                aria-pressed={visiblePeriod === option.value}
                                className={`min-w-0 flex-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all sm:flex-none sm:px-3.5 cursor-pointer ${
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
                                    className={`border-b border-border/70 bg-muted/70 px-2 py-3 text-center font-bold text-foreground/70 ${
                                        hour.lunchBefore ? 'border-l border-l-indigo-500/25' : ''
                                    }`}
                                >
                                    <span dir="ltr">{hourLabel(hour.startMin, hour.endMin)}</span>
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
                                                        ? `${color.border} ${color.bg} text-transparent shadow-[0_8px_20px_-13px_rgba(15,23,42,0.6)] hover:-translate-y-0.5 hover:saturate-[1.04]`
                                                        : 'border-dashed border-border/70 bg-muted/20 text-muted-foreground/70 hover:border-primary/40 hover:bg-primary/[0.06] hover:text-foreground'
                                                }`}
                                                aria-label={`${t(`schedule.day.${day.value}`)} ${hourLabel(hour.startMin, hour.endMin)}${classInfo ? `, ${classLabel(classInfo.name)}` : ''}${merged ? ` (${t('schedule.mergedSession', { count: span })})` : ''}`}
                                            >
                                                <option value="" className="text-slate-800">{t('schedule.noClass')}</option>
                                                {classes.map(c => (
                                                    <option key={c.id} value={c.id} className="text-slate-800">
                                                        {subjectLabel(c.subject)} · {classLabel(c.name)}
                                                    </option>
                                                ))}
                                                {canCreateFromSchedule && (
                                                    <option value="__create__" className="text-slate-800 font-bold">
                                                        ＋ {t('schedule.createClass')}
                                                    </option>
                                                )}
                                            </select>
                                            {classInfo && color && (
                                                <span
                                                    className={`pointer-events-none absolute inset-2 flex min-w-0 flex-col items-center justify-center px-2 text-center ${color.text}`}
                                                >
                                                    <span className="max-w-full truncate text-[11px] font-black tracking-[-0.02em] drop-shadow-sm sm:text-xs">
                                                        {abbreviateClassName(formatLocalizedClassDisplayName(classInfo.name, locale, { includeClassPrefix: false }))}
                                                    </span>
                                                    <span className={`mt-0.5 max-w-full truncate text-[9px] font-bold uppercase tracking-[0.08em] ${color.subtext}`}>
                                                        {subjectLabel(classInfo.subject)}
                                                    </span>
                                                </span>
                                            )}
                                            {merged && (
                                                <span className="pointer-events-none absolute start-3 top-1.5 rounded-full border border-slate-900/10 bg-white/55 px-1.5 text-[9px] font-bold leading-4 text-slate-700 shadow-sm backdrop-blur-sm dark:border-white/20 dark:bg-black/25 dark:text-white">
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

                {classesWithoutSlots.length > 0 && (
                    <aside className="flex flex-col gap-3 rounded-[1.25rem] border border-amber-300/55 bg-[#fff9eb]/90 p-3.5 shadow-[0_8px_22px_-20px_rgba(120,83,12,0.55)] dark:border-amber-400/20 dark:bg-amber-500/[0.08] sm:flex-row sm:items-center" role="status">
                        <div className="flex shrink-0 items-center gap-2 text-amber-800 dark:text-amber-200">
                            <span className="grid h-7 w-7 place-items-center rounded-xl bg-amber-500/15">
                                <TriangleAlert className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-xs font-bold">
                                {t('schedule.classesToPlan', { count: classesWithoutSlots.length, plural: classesWithoutSlots.length > 1 && locale !== 'ar' ? 's' : '' })}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {classesWithoutSlots.map(classInfo => {
                                const official = getOfficialWeeklyHours(classInfo.cycle, classInfo.name, classInfo.subject);
                                return (
                                    <span key={classInfo.id} className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200/70 bg-white/75 px-2.5 py-1.5 text-xs shadow-2xs dark:border-amber-400/15 dark:bg-background/35">
                                        <span className={`h-2 w-2 rounded-full ${colorFor(classInfo.id).dot}`} />
                                        <span className="max-w-32 truncate font-bold text-foreground">{classLabel(classInfo.name)}</span>
                                        <span className="text-muted-foreground">· {t('schedule.noSlotsPlanned')}</span>
                                        {official && (
                                            <span className="rounded-md bg-amber-500/12 px-1.5 py-0.5 text-[11px] font-bold text-amber-800 dark:text-amber-200">
                                                {t('schedule.hoursToAdd', { count: official.hours })}
                                            </span>
                                        )}
                                    </span>
                                );
                            })}
                        </div>
                    </aside>
                )}

                {showHoursAdvisory && <HoursAdvisory classes={classes} timetable={timetable} showUnplanned={false} />}

                {/* Récapitulatif compact par classe : séances, heures et état horaire. */}
                <div className="flex flex-wrap gap-2 pt-1">
                {classes.map(c => {
                    const { hours, sessions } = weeklyStats(c.id);
                    const official = getOfficialWeeklyHours(c.cycle, c.name, c.subject);
                    const matches = official ? hours === official.hours : null;
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
                            {official && (
                                <span
                                    className={`font-semibold ${matches ? 'text-emerald-600 dark:text-emerald-400' : hours > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground/60'}`}
                                    title={
                                        matches
                                            ? t('schedule.officialMatchTitle', { expected: official.hours })
                                            : t('schedule.officialReferenceTitle', { scheduled: hours, expected: official.hours })
                                    }
                                >
                                    · {matches ? `✓ ${t('schedule.official')}` : t('schedule.officialShort', { count: official.hours })}
                                </span>
                            )}
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
                    defaultCycle={(config.selectedCycles?.[0] as Cycle) ?? 'lycee'}
                    teacherSubjects={config.selectedSubjects}
                    teacherCycles={config.selectedCycles?.length ? (config.selectedCycles as Cycle[]) : undefined}
                    existingClasses={classes}
                />
            )}
        </div>
    );
};

/* ── Avis « heures posées vs officiel », persistant, temps réel, non bloquant ── */

const HoursAdvisory: React.FC<{ classes: ClassInfo[]; timetable: TimetableEntry[] | undefined; showUnplanned?: boolean }> = ({ classes, timetable, showUnplanned = true }) => {
    const { locale, t } = useLocale();
    const insights = React.useMemo(() => computeScheduleInsights(classes, timetable), [classes, timetable]);
    // on ne signale que les classes dont l'officiel est connu ET qui s'écartent
    const unplanned = insights.filter(i => i.deviation === 'empty');
    const deviations = insights.filter(i => i.officialHours !== null && (i.deviation === 'over' || i.deviation === 'under'));
    const conform = insights.filter(i => i.officialHours !== null && i.deviation === 'match' && i.scheduledHours > 0);

    const visibleUnplanned = showUnplanned ? unplanned : [];

    if (visibleUnplanned.length === 0 && deviations.length === 0) {
        if (conform.length === 0 || (!showUnplanned && unplanned.length > 0)) return null;
        return (
            <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 shadow-2xs">
                <CircleCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    {t('schedule.hoursMatch', { count: conform.length, plural: conform.length > 1 && locale !== 'ar' ? 's' : '' })}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {visibleUnplanned.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 shadow-2xs" role="status">
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold text-xs">
                        <TriangleAlert className="h-4 w-4" />
                        <span>
                            {t('schedule.classesToPlan', { count: visibleUnplanned.length, plural: visibleUnplanned.length > 1 && locale !== 'ar' ? 's' : '' })}
                        </span>
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                    {visibleUnplanned.map(i => (
                        <span key={i.classId} className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/90 px-2.5 py-1 text-xs shadow-2xs">
                            <span className="max-w-28 truncate font-bold text-foreground">{formatLocalizedClassDisplayName(i.className, locale)}</span>
                            <span className="text-muted-foreground">· {t('schedule.noSlotsPlanned')}</span>
                            {i.officialHours !== null && (
                                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 font-bold text-primary text-[11px]">
                                    {t('schedule.hoursToAdd', { count: i.officialHours })}
                                </span>
                            )}
                        </span>
                    ))}
                    </div>
                </div>
            )}

            {deviations.length > 0 && (
                <div className="space-y-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 shadow-2xs" role="status">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="inline-flex shrink-0 items-center gap-1.5 text-amber-700 dark:text-amber-300">
                            <TriangleAlert className="h-4 w-4" />
                            <span className="text-xs font-bold">
                                {t('schedule.hoursCheck', { count: deviations.length, plural: deviations.length > 1 && locale !== 'ar' ? 's' : '' })}
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                    {deviations.map(i => {
                        const isOver = i.deviation === 'over';
                        const adjustment = Math.abs(i.delta);
                        return (
                            <span
                                key={i.classId}
                                className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-border/60 bg-card/90 px-2.5 py-1 text-xs shadow-2xs"
                                title={t('schedule.hoursPlanned', { scheduled: i.scheduledHours, expected: i.officialHours ?? 0 })}
                            >
                                <span className="max-w-28 truncate font-bold text-foreground">{formatLocalizedClassDisplayName(i.className, locale)}</span>
                                <span className="text-muted-foreground">· {t('schedule.hoursPlanned', { scheduled: i.scheduledHours, expected: i.officialHours ?? 0 })}</span>
                                <span className={`rounded-md px-1.5 py-0.5 font-bold text-[11px] ${isOver ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-primary/15 text-primary'}`}>
                                    {t(isOver ? 'schedule.hoursExcess' : 'schedule.hoursToAdd', { count: adjustment })}
                                </span>
                            </span>
                        );
                    })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
