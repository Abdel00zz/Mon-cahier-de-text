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
    if (/[؀-ۿ]/.test(name)) return name;
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

const CLASS_CELL_COLORS = [
    { bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' }, // sauge
    { bg: 'bg-orange-500/15', border: 'border-orange-500/30', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' }, // terracotta
    { bg: 'bg-blue-500/15', border: 'border-blue-500/30', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' }, // bleu doux
    { bg: 'bg-amber-500/15', border: 'border-amber-500/30', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' }, // ambre
    { bg: 'bg-indigo-500/15', border: 'border-indigo-500/30', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500' }, // lavande
    { bg: 'bg-rose-500/15', border: 'border-rose-500/30', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' }, // rose
];

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
    // Isole la plage numérique dans la phrase RTL pour préserver 2026-2027.
    const schoolYearLabel = locale === 'ar'
        ? `\u2066${effectiveSchoolYear.libelle}\u2069`
        : effectiveSchoolYear.libelle;
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

    const colorFor = (classId: string) => {
        const index = classes.findIndex(c => c.id === classId);
        return CLASS_CELL_COLORS[(index >= 0 ? index : 0) % CLASS_CELL_COLORS.length];
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
            <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/65 p-4 sm:p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 max-w-2xl text-start">
                    <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                        {t('schedule.intro')}
                    </p>
                    {noClassesYet && (
                        <p className="mt-2 flex items-center gap-2 text-xs font-bold leading-relaxed text-primary">
                            <span aria-hidden>✨</span>
                            {t('schedule.emptyHint')}
                        </p>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-2.5" aria-label={t('schedule.startYear')}>
                    <label className="text-xs font-bold text-foreground/80">{t('schedule.startYear')}</label>
                    <div className="relative">
                        <input
                            type="date"
                            value={schoolYearStart}
                            onChange={e => setSchoolYearStart(e.target.value)}
                            lang={locale === 'ar' ? 'ar-MA-u-nu-latn' : locale === 'en' ? 'en-GB' : 'fr-MA'}
                            dir="ltr"
                            className={`h-10 rounded-xl border border-border/80 bg-background/80 px-3 text-xs font-semibold shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/25 ${locale === 'ar' ? 'text-transparent' : 'text-foreground'}`}
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
            </div>

            <p className="-mt-3 text-start text-xs font-medium text-muted-foreground px-1">
                {t('schedule.calendar', { label: schoolYearLabel })}
            </p>

            {/* État de complétude et volumes horaires avant la saisie de la grille. */}
            {showHoursAdvisory && <HoursAdvisory classes={classes} timetable={timetable} />}

            <section className="space-y-3.5" aria-label={t('schedule.gridTitle')}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-start">
                        <h3 className="text-sm font-bold text-foreground">{t('schedule.gridTitle')}</h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">{t('schedule.gridHint')}</p>
                    </div>
                    <div className="inline-flex w-full rounded-2xl bg-muted/60 p-1 sm:w-auto border border-border/60 shadow-2xs" role="group" aria-label={t('schedule.viewLabel')}>
                        {periodOptions.map(option => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setVisiblePeriod(option.value)}
                                aria-pressed={visiblePeriod === option.value}
                                className={`min-w-0 flex-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all sm:flex-none sm:px-3.5 cursor-pointer ${
                                    visiblePeriod === option.value
                                        ? 'bg-card text-primary shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grille jours × créneaux : la vue demi-journée s'adapte à la largeur d'un téléphone. */}
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/65 shadow-2xs">
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
                                        hour.lunchBefore ? 'border-l border-l-primary/25' : ''
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
                                <td className={`sticky ${locale === 'ar' ? 'right-0 border-l' : 'left-0 border-r'} z-10 border-border/70 bg-card/95 px-3 py-2.5 font-bold text-foreground transition-colors group-hover:bg-muted/50 ${dayIndex < TIMETABLE_DAYS.length - 1 ? 'border-b border-border/50' : ''}`}>
                                    {t(`schedule.day.${day.value}`)}
                                </td>
                                {visibleHourSlots.map(hour => {
                                    const run = runsByDay.get(day.value)?.get(hour.index);
                                    /*
                                     * FUSION PARFAITE : une séance continue (2 h+) est UNE
                                     * seule cellule (colSpan) avec UN seul libellé, fini le
                                     * « math | math ». La cellule fusionnée pilote toutes
                                     * ses heures d'un coup (changer/effacer = tout le bloc).
                                     */
                                    if (run && !run.isStart) return null; // couverte par le colSpan de la cellule de départ
                                    const merged = !!run && run.hours > 1;
                                    const span = run ? run.hours : 1;
                                    const entry = getTimetableEntry(timetable, day.value, hour.index);
                                    const classInfo = entry ? classById.get(entry.classId) : undefined;
                                    const color = entry ? colorFor(entry.classId) : null;
                                    return (
                                        <td
                                            key={hour.index}
                                            colSpan={span}
                                            className={`relative p-1.5 align-top ${dayIndex < TIMETABLE_DAYS.length - 1 ? 'border-b border-border/40' : ''} ${hour.lunchBefore ? 'border-l border-l-primary/25' : ''}`}
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
                                                className={`h-12 w-full cursor-pointer rounded-xl border border-transparent px-2 text-center text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
                                                    classInfo && color
                                                        ? `${color.border} ${color.bg} text-transparent shadow-2xs hover:brightness-[0.98]`
                                                        : 'bg-transparent text-muted-foreground/60 hover:border-border hover:bg-muted/50 hover:text-foreground'
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
                                                    className={`pointer-events-none absolute inset-1.5 flex items-center justify-center truncate px-2 text-xs font-bold ${color.text}`}
                                                >
                                                    {abbreviateClassName(formatLocalizedClassDisplayName(classInfo.name, locale, { includeClassPrefix: false }))}
                                                </span>
                                            )}
                                            {merged && (
                                                <span className={`pointer-events-none absolute start-3 top-1 rounded-full bg-card px-1.5 text-[10px] font-bold leading-4 shadow-2xs border border-border/50 ${color?.text ?? 'text-primary'}`}>
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

                {/* Récapitulatif compact par classe : séances, heures et état horaire. */}
                <div className="flex flex-wrap gap-2 pt-1">
                {classes.map(c => {
                    const { hours, sessions } = weeklyStats(c.id);
                    const official = getOfficialWeeklyHours(c.cycle, c.name, c.subject);
                    const matches = official ? hours === official.hours : null;
                    return (
                        <span
                            key={c.id}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border/70 bg-card/80 px-3 py-1.5 text-xs font-bold text-foreground shadow-2xs"
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
                    teacherCycles={config.showAllCycles ? undefined : (config.selectedCycles as Cycle[] | undefined)}
                    existingClasses={classes}
                />
            )}
        </div>
    );
};

/* ── Avis « heures posées vs officiel », persistant, temps réel, non bloquant ── */

const HoursAdvisory: React.FC<{ classes: ClassInfo[]; timetable: TimetableEntry[] | undefined }> = ({ classes, timetable }) => {
    const { locale, t } = useLocale();
    const insights = React.useMemo(() => computeScheduleInsights(classes, timetable), [classes, timetable]);
    // on ne signale que les classes dont l'officiel est connu ET qui s'écartent
    const unplanned = insights.filter(i => i.deviation === 'empty');
    const deviations = insights.filter(i => i.officialHours !== null && (i.deviation === 'over' || i.deviation === 'under'));
    const conform = insights.filter(i => i.officialHours !== null && i.deviation === 'match' && i.scheduledHours > 0);

    if (unplanned.length === 0 && deviations.length === 0) {
        if (conform.length === 0) return null;
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
            {unplanned.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 shadow-2xs" role="status">
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold text-xs">
                        <TriangleAlert className="h-4 w-4" />
                        <span>
                            {t('schedule.classesToPlan', { count: unplanned.length, plural: unplanned.length > 1 && locale !== 'ar' ? 's' : '' })}
                        </span>
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                    {unplanned.map(i => (
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
