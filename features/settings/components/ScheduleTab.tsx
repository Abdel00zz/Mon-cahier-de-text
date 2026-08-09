import React from 'react';
import { AppConfig, ClassInfo, Cycle, TimetableEntry } from '@/types';
import { CreateClassModal } from '@/features/dashboard/modals/CreateClassModal';
import { getBundledCalendar } from '@/utils/calendar';
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
    { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', dot: 'bg-emerald-400' }, // sauge
    { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', dot: 'bg-orange-400' }, // terracotta
    { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', dot: 'bg-blue-400' }, // bleu doux
    { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', dot: 'bg-amber-400' }, // ambre
    { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', dot: 'bg-indigo-400' }, // lavande
    { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-600', dot: 'bg-rose-400' }, // rose
];

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ classes, config, onChange, onCreateClass }) => {
    const { locale, t } = useLocale();
    const hourNumber = React.useMemo(
        () => new Intl.NumberFormat(locale, { minimumIntegerDigits: 2, useGrouping: false }),
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
    const timetable = config.timetable ?? [];
    // créneau en attente d'une NOUVELLE classe (option « + Créer une classe… »)
    const [pendingCreate, setPendingCreate] = React.useState<{ day: number; slot: number; span: number } | null>(null);

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

    const setSchoolYearStart = (value: string) => onChange({ schoolYearStart: value || undefined });

    // ZÉRO classe ≠ blocage : la grille reste affichée, les classes se créent
    // directement depuis les cases (« + Créer une classe… »). On encourage.
    const noClassesYet = classes.length === 0;
    // Dès qu'une classe existe, la grille sert à FINIR sa configuration : on
    // évite de répéter « créer une classe » dans chacune des 48 cases.
    const canCreateFromSchedule = !!onCreateClass && noClassesYet;
    if (noClassesYet && !onCreateClass) {
        return (
            <div className="rounded-md border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                {t('schedule.empty')}
            </div>
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

    return (
        <div className="space-y-4">
            <p className="text-xs leading-relaxed text-muted-foreground">
                {t('schedule.intro')}
            </p>
            {noClassesYet && (
                <div className="flex items-center gap-2.5 rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
                    <span aria-hidden>✨</span>
                    <p className="text-xs font-semibold leading-relaxed text-primary">
                        {t('schedule.emptyHint')}
                    </p>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm" aria-label={t('schedule.startYear')}>
                <label className="text-xs font-semibold text-muted-foreground">{t('schedule.startYear')}</label>
                <input
                    type="date"
                    value={config.schoolYearStart ?? calendar.anneeScolaire.debut}
                    onChange={e => setSchoolYearStart(e.target.value)}
                    className="h-11 rounded-lg border border-border/80 bg-background text-foreground px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="text-[11px] text-muted-foreground/60 font-mono">{t('schedule.calendar', { label: calendar.anneeScolaire.libelle })}</span>
            </div>

            {/* État de complétude et volumes horaires avant la saisie de la grille. */}
            <HoursAdvisory classes={classes} timetable={timetable} />

            {/* Grille jours × créneaux (façon emploi du temps papier, sans la colonne 24 h) */}
            <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
                <div className="overflow-x-auto custom-scrollbar">
                <table className="rtl-table w-full min-w-[48rem] border-separate border-spacing-0 text-xs">
                    <thead>
                        <tr>
                            <th className={`sticky ${locale === 'ar' ? 'right-0 border-l' : 'left-0 border-r'} z-20 border-b border-border bg-muted/80 px-3 py-3 text-start font-semibold uppercase tracking-wider text-muted-foreground font-mono`}>
                                {t('schedule.day')}
                            </th>
                            {HOUR_SLOTS.map(hour => (
                                <th
                                    key={hour.index}
                                    className={`border-b border-border bg-muted/80 px-2 py-3 text-center font-semibold text-muted-foreground font-mono ${
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
                                <td className={`sticky ${locale === 'ar' ? 'right-0 border-l' : 'left-0 border-r'} z-10 border-border bg-card px-3 py-2.5 font-bold text-foreground transition-colors group-hover:bg-muted/50 ${dayIndex < TIMETABLE_DAYS.length - 1 ? 'border-b border-border/50' : ''}`}>
                                    {t(`schedule.day.${day.value}`)}
                                </td>
                                {HOUR_SLOTS.map(hour => {
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
                                            className={`relative p-1 align-top ${dayIndex < TIMETABLE_DAYS.length - 1 ? 'border-b border-border/40' : ''} ${hour.lunchBefore ? 'border-l border-l-primary/25' : ''}`}
                                        >
                                            {/*
                                              * Cellule ABRÉGÉE, menu COMPLET : le texte natif du
                                              * select est rendu transparent quand une classe est
                                              * posée ; un libellé court superposé (niveau + groupe,
                                              * sans la matière) tient dans la cellule. Le menu
                                              * déroulant, lui, garde « Matière · Nom complet ».
                                              */}
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
                                                className={`h-11 w-full cursor-pointer rounded border px-1.5 text-center text-[11px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                                                    classInfo && color
                                                        ? `${color.border} ${color.bg} text-transparent shadow-sm shadow-foreground/5 hover:brightness-[0.98]`
                                                        : 'border-dashed border-border bg-background text-muted-foreground/60 hover:border-primary/50 hover:bg-secondary/40 hover:text-foreground'
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
                                                    className={`pointer-events-none absolute inset-1 flex items-center justify-center truncate px-1 text-[11px] font-bold ${color.text}`}
                                                >
                                                    {abbreviateClassName(classInfo.name)}
                                                </span>
                                            )}
                                            {merged && (
                                                <span className={`pointer-events-none absolute start-2 top-0.5 rounded-full bg-card/80 px-1.5 text-[9px] font-bold leading-4 shadow-sm font-mono ${color?.text ?? 'text-primary'}`}>
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
            <div className="flex flex-wrap gap-2">
                {classes.map(c => {
                    const { hours, sessions } = weeklyStats(c.id);
                    const official = getOfficialWeeklyHours(c.cycle, c.name, c.subject);
                    const matches = official ? hours === official.hours : null;
                    return (
                        <span
                            key={c.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm font-sans"
                        >
                            <span className={`h-2 w-2 rounded-full ${colorFor(c.id).dot}`} />
                            {classLabel(c.name)}
                            <span className="text-muted-foreground/60 font-mono">
                                · {t('schedule.sessionsPerWeek', { count: sessions, plural: sessions > 1 && locale !== 'ar' ? 's' : ''})}
                                {hours !== sessions ? ` (${t('schedule.hoursShort', { count: hours })})` : ''}
                            </span>
                            {official && (
                                <span
                                    className={`font-mono ${matches ? 'text-success-strong' : hours > 0 ? 'text-warning-strong' : 'text-muted-foreground/50'}`}
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
            <div className="flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-2">
                <CircleCheck className="h-4 w-4 shrink-0 text-success" />
                <p className="text-xs font-semibold text-success">
                    {t('schedule.hoursMatch', { count: conform.length, plural: conform.length > 1 && locale !== 'ar' ? 's' : '' })}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2.5" role="status">
            {unplanned.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex shrink-0 items-center gap-1.5 text-amber-700">
                        <TriangleAlert className="h-4 w-4" />
                        <span className="text-xs font-bold">
                            {t('schedule.classesToPlan', { count: unplanned.length, plural: unplanned.length > 1 && locale !== 'ar' ? 's' : '' })}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        {unplanned.map(i => (
                            <span
                                key={i.classId}
                                className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg bg-card px-2.5 py-1.5 text-[11px] leading-snug shadow-2xs"
                            >
                                <span className="max-w-28 truncate font-bold text-foreground">{formatLocalizedClassDisplayName(i.className, locale)}</span>
                                <span className="text-muted-foreground">· {t('schedule.noSlotsPlanned')}</span>
                                {i.officialHours !== null && (
                                    <span className="rounded bg-blue-50 px-1.5 py-0.5 font-semibold text-blue-700">
                                        {t('schedule.hoursToAdd', { count: i.officialHours })}
                                    </span>
                                )}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {deviations.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <div className="inline-flex shrink-0 items-center gap-1.5 text-amber-700">
                        <TriangleAlert className="h-4 w-4" />
                        <span className="text-xs font-bold">
                            {t('schedule.hoursCheck', { count: deviations.length, plural: deviations.length > 1 && locale !== 'ar' ? 's' : '' })}
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                {deviations.map(i => {
                    const isOver = i.deviation === 'over';
                    const adjustment = Math.abs(i.delta);
                    return (
                        <span
                            key={i.classId}
                            className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg bg-card px-2.5 py-1.5 text-[11px] leading-snug shadow-2xs"
                            title={t('schedule.hoursPlanned', { scheduled: i.scheduledHours, expected: i.officialHours ?? 0 })}
                        >
                            <span className="max-w-28 truncate font-bold text-foreground">{formatLocalizedClassDisplayName(i.className, locale)}</span>
                            <span className="text-muted-foreground">· {t('schedule.hoursPlanned', { scheduled: i.scheduledHours, expected: i.officialHours ?? 0 })}</span>
                            <span className={`rounded px-1.5 py-0.5 font-semibold ${isOver ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-700'}`}>
                                {t(isOver ? 'schedule.hoursExcess' : 'schedule.hoursToAdd', { count: adjustment })}
                            </span>
                        </span>
                    );
                })}
                    </div>
                </div>
            )}
            </div>
    );
};
