import React from 'react';
import { toast } from 'sonner';
import { AppConfig, ClassInfo, Cycle, TimetableEntry } from '../../types';
import { CreateClassModal } from '../modals/CreateClassModal';
import { getBundledCalendar } from '../../utils/calendar';
import { SUBJECT_ABBREV_MAP } from '../../constants';
import {
    HOUR_SLOTS,
    TIMETABLE_DAYS,
    deriveSchedules,
    getDaySlotRuns,
    getTimetableEntry,
    setTimetableEntry,
} from '../../utils/timetable';
import { useClassAssessments } from '../../hooks/useAssessments';
import { getOfficialWeeklyHours } from '../../utils/officialHours';
import { computeScheduleInsights, hoursDeviationMessage } from '../../utils/scheduleInsights';
import { TriangleAlert, CircleCheck, Info } from '../ui/icons';

interface ScheduleTabProps {
    classes: ClassInfo[];
    config: AppConfig;
    onChange: (patch: Partial<AppConfig>) => void;
    /**
     * Création AUTOMATIQUE depuis la grille : chaque cellule propose
     * « + Créer une classe… » — la classe créée est aussitôt posée sur le
     * créneau. Le prof peut ainsi composer tout son emploi du temps d'abord,
     * les classes naissent au fil de la saisie.
     */
    onCreateClass?: (details: { name: string; subject: string; cycle?: Cycle }) => ClassInfo;
}

/*
 * Couleur DISTINCTE par classe (palette papier harmonieuse) : la grille se lit
 * d'un coup d'œil — chaque classe garde sa teinte dans les cellules ET dans le
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
     * Un dépassement (ou un manque net) déclenche un toast bienveillant — le
     * prof reste libre (dédoublement, option), mais il est PRÉVENU de la
     * probable coquille (« 6 h pour 2BAC PC alors que l'officiel est 5 h »).
     */
    const notifyHoursDeviation = React.useCallback((nextTimetable: typeof timetable, classId: string | null) => {
        if (!classId) return;
        const classInfo = classById.get(classId);
        if (!classInfo) return;
        const [insight] = computeScheduleInsights([classInfo], nextTimetable);
        if (insight.deviation === 'over' || (insight.deviation === 'under' && insight.officialHours !== null)) {
            const message = hoursDeviationMessage(insight);
            if (message) {
                if (insight.deviation === 'over') toast.warning(message, { id: `hours-${classId}` });
                else toast.info(message, { id: `hours-${classId}` });
            }
        } else if (insight.deviation === 'match' && insight.officialHours !== null && insight.scheduledHours > 0) {
            toast.success(`${insight.className} : ${insight.scheduledHours} h — conforme à l'horaire officiel ✓`, { id: `hours-${classId}` });
        }
    }, [classById]);

    const assign = (day: number, slot: number, classId: string | null) => {
        const nextTimetable = setTimetableEntry(timetable, day, slot, classId);
        onChange({ timetable: nextTimetable, schedules: deriveSchedules(nextTimetable) });
        notifyHoursDeviation(nextTimetable, classId);
    };

    // séance fusionnée (2 h+) : la cellule unique pilote TOUTES ses heures d'un coup
    const assignRun = (day: number, startSlot: number, hours: number, classId: string | null) => {
        let next = timetable;
        for (let slot = startSlot; slot < startSlot + hours; slot++) {
            next = setTimetableEntry(next, day, slot, classId);
        }
        onChange({ timetable: next, schedules: deriveSchedules(next) });
        notifyHoursDeviation(next, classId);
    };

    // séances continues par jour : deux créneaux consécutifs de la même classe
    // s'affichent soudés (badge « 2 h ») et comptent pour UNE séance
    const runsByDay = React.useMemo(() => {
        const map = new Map<number, ReturnType<typeof getDaySlotRuns>>();
        TIMETABLE_DAYS.forEach(day => map.set(day.value, getDaySlotRuns(timetable, day.value)));
        return map;
    }, [timetable]);

    const setSchoolYearStart = (value: string) => onChange({ schoolYearStart: value || undefined });

    // ZÉRO classe ≠ blocage : la grille reste affichée — les classes se créent
    // directement depuis les cases (« + Créer une classe… »). On encourage.
    const noClassesYet = classes.length === 0;
    if (noClassesYet && !onCreateClass) {
        return (
            <div className="rounded-md border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
                Créez d'abord une classe pour composer votre emploi du temps.
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
                Composez votre emploi du temps : pour chaque créneau, choisissez la classe que vous enseignez — ou créez-la
                à la volée avec <b>« ＋ Créer une classe… »</b> directement dans la case. La grille s'enregistre
                automatiquement et se synchronise ; elle alimente le calcul de votre progression et les alertes de retard
                (vacances et jours fériés exclus). Deux heures consécutives avec la même classe sont automatiquement lues
                comme <b>une seule séance de 2 h</b> — une seule date attendue dans le cahier.
            </p>
            {noClassesYet && (
                <div className="flex items-center gap-2.5 rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
                    <span aria-hidden>✨</span>
                    <p className="text-xs font-semibold leading-relaxed text-primary">
                        C'est ici que tout commence ! Touchez une case de la grille et choisissez
                        « ＋ Créer une classe… » — votre première classe naîtra directement sur son créneau.
                    </p>
                </div>
            )}

            {/* Grille jours × créneaux (façon emploi du temps papier, sans la colonne 24 h) */}
            <div className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[46rem] border-separate border-spacing-0 text-xs">
                    <thead>
                        <tr>
                            <th className="sticky left-0 z-20 border-b border-r border-border bg-secondary px-3 py-3 text-left font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                                Jour
                            </th>
                            {HOUR_SLOTS.map(hour => (
                                <th
                                    key={hour.index}
                                    className={`border-b border-border bg-secondary px-2 py-3 text-center font-semibold text-muted-foreground font-mono ${
                                        hour.lunchBefore ? 'border-l border-l-primary/25' : ''
                                    }`}
                                >
                                    {hour.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {TIMETABLE_DAYS.map((day, dayIndex) => (
                            <tr key={day.value} className="group transition-colors hover:bg-secondary/20">
                                <td className={`sticky left-0 z-10 border-r border-border bg-card px-3 py-2.5 font-bold text-foreground transition-colors group-hover:bg-secondary/40 ${dayIndex < TIMETABLE_DAYS.length - 1 ? 'border-b border-border/50' : ''}`}>
                                    {day.label}
                                </td>
                                {HOUR_SLOTS.map(hour => {
                                    const run = runsByDay.get(day.value)?.get(hour.index);
                                    /*
                                     * FUSION PARFAITE : une séance continue (2 h+) est UNE
                                     * seule cellule (colSpan) avec UN seul libellé — fini le
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
                                                title={classInfo ? `${SUBJECT_ABBREV_MAP[classInfo.subject] || classInfo.subject} · ${classInfo.name}` : undefined}
                                                className={`h-11 w-full cursor-pointer rounded border px-1.5 text-center text-[11px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                                                    classInfo && color
                                                        ? `${color.border} ${color.bg} text-transparent shadow-sm shadow-foreground/5 hover:brightness-[0.98]`
                                                        : 'border-dashed border-border bg-background text-muted-foreground/60 hover:border-primary/50 hover:bg-secondary/40 hover:text-foreground'
                                                }`}
                                                aria-label={`${day.label} ${hour.label}${classInfo ? ` — ${classInfo.name}` : ''}${merged ? ` (séance fusionnée de ${span} h)` : ''}`}
                                            >
                                                <option value="" className="text-slate-800">—</option>
                                                {classes.map(c => (
                                                    <option key={c.id} value={c.id} className="text-slate-800">
                                                        {SUBJECT_ABBREV_MAP[c.subject] || c.subject} · {c.name}
                                                    </option>
                                                ))}
                                                {onCreateClass && (
                                                    <option value="__create__" className="text-slate-800 font-bold">
                                                        ＋ Créer une classe…
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
                                                <span className={`pointer-events-none absolute left-2 top-0.5 rounded-full bg-card/80 px-1.5 text-[9px] font-bold leading-4 shadow-sm font-mono ${color?.text ?? 'text-primary'}`}>
                                                    {span} h
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

            {/* Avis intelligent PERSISTANT : écarts entre heures posées et
                horaire officiel, remis à jour en direct. Non bloquant. */}
            <HoursAdvisory classes={classes} timetable={timetable} />

            {/* Récapitulatif par classe : séances (blocs continus) et heures.
                Repère officiel indicatif (MEN) affiché en douceur — jamais contraignant. */}
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
                            {c.name}
                            <span className="text-muted-foreground/60 font-mono">
                                · {sessions} séance{sessions > 1 ? 's' : ''}
                                {hours !== sessions ? ` (${hours} h)` : ''}/sem
                            </span>
                            {official && (
                                <span
                                    className={`font-mono ${matches ? 'text-success/80' : hours > 0 ? 'text-warning' : 'text-muted-foreground/50'}`}
                                    title={
                                        matches
                                            ? `Conforme à l'horaire officiel indicatif (${official.context} : ${official.hours} h/sem).`
                                            : `Horaire officiel indicatif : ${official.hours} h/sem (${official.context}). Vous avez saisi ${hours} h — simple repère, non contraignant.`
                                    }
                                >
                                    · {matches ? '✓ officiel' : `off. ${official.hours} h`}
                                </span>
                            )}
                        </span>
                    );
                })}
            </div>
            {classes.some(c => getOfficialWeeklyHours(c.cycle, c.name, c.subject)) && (
                <p className="text-[10px] leading-snug text-muted-foreground/60 font-sans">
                    « officiel » = horaire hebdomadaire <b>indicatif</b> du MEN pour la matière/niveau — un simple repère
                    pour vérifier qu'aucun créneau ne manque, jamais une contrainte.
                </p>
            )}

            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
                <label className="text-xs font-semibold text-muted-foreground">Début de l'année scolaire</label>
                <input
                    type="date"
                    value={config.schoolYearStart ?? calendar.anneeScolaire.debut}
                    onChange={e => setSchoolYearStart(e.target.value)}
                    className="h-11 rounded-lg border border-border/80 bg-background text-foreground px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="text-[11px] text-muted-foreground/60 font-mono">Calendrier : {calendar.anneeScolaire.libelle} (Maroc)</span>
            </div>

            {/* Planning officiel des devoirs — dates indicatives, MODIFIABLES */}
            <AssessmentsPlanner classes={classes} config={config} onChange={onChange} />

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
                />
            )}
        </div>
    );
};

/* ── Avis « heures posées vs officiel » — persistant, temps réel, non bloquant ── */

const HoursAdvisory: React.FC<{ classes: ClassInfo[]; timetable: TimetableEntry[] | undefined }> = ({ classes, timetable }) => {
    const insights = React.useMemo(() => computeScheduleInsights(classes, timetable), [classes, timetable]);
    // on ne signale que les classes dont l'officiel est connu ET qui s'écartent
    const deviations = insights.filter(i => i.officialHours !== null && (i.deviation === 'over' || i.deviation === 'under'));
    const conform = insights.filter(i => i.officialHours !== null && i.deviation === 'match' && i.scheduledHours > 0);

    if (deviations.length === 0) {
        if (conform.length === 0) return null;
        return (
            <div className="flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-2">
                <CircleCheck className="h-4 w-4 shrink-0 text-success" />
                <p className="text-xs font-semibold text-success">
                    Volume horaire conforme à l'officiel pour {conform.length} classe{conform.length > 1 ? 's' : ''}. Parfait.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-1.5 rounded-lg border border-warning/30 bg-warning/5 p-3">
            <div className="flex items-center gap-2">
                <TriangleAlert className="h-4 w-4 shrink-0 text-warning" />
                <p className="text-xs font-bold text-amber-600">
                    Volume horaire à vérifier ({deviations.length})
                </p>
            </div>
            <ul className="space-y-1 pl-6">
                {deviations.map(i => (
                    <li key={i.classId} className="text-[11px] leading-relaxed text-muted-foreground">
                        <span className="font-bold text-foreground">{i.className}</span> —{' '}
                        <span className={i.deviation === 'over' ? 'font-bold text-warning' : 'font-bold text-blue-600'}>
                            {i.scheduledHours} h posée{i.scheduledHours > 1 ? 's' : ''}
                        </span>{' '}
                        pour {i.officialHours} h officielles ({i.officialContext}) :{' '}
                        {i.deviation === 'over'
                            ? `${i.delta} h de trop`
                            : `${Math.abs(i.delta)} h manquante${Math.abs(i.delta) > 1 ? 's' : ''}`}
                        .
                    </li>
                ))}
            </ul>
            <p className="flex items-start gap-1.5 pl-6 pt-0.5 text-[10px] leading-snug text-muted-foreground/70">
                <Info className="mt-0.5 h-3 w-3 shrink-0" />
                Simple repère : un dédoublement, une option ou une spécificité d'établissement peut justifier l'écart. Vous
                décidez.
            </p>
        </div>
    );
};

/* ── Planning des devoirs par classe (dates officielles + surcharge prof) ── */

const AssessmentsPlanner: React.FC<ScheduleTabProps> = ({ classes, config, onChange }) => {
    const [selectedClassId, setSelectedClassId] = React.useState<string>(classes[0]?.id ?? '');
    const selectedClass = classes.find(c => c.id === selectedClassId) ?? null;
    const { assessments, hasPlan } = useClassAssessments(selectedClass, config);

    const setAssessmentDate = (assessmentId: string, dateISO: string) => {
        const classId = selectedClassId;
        const next: Record<string, Record<string, string>> = {
            ...(config.assessmentDates ?? {}),
            [classId]: { ...(config.assessmentDates?.[classId] ?? {}) },
        };
        if (dateISO) next[classId][assessmentId] = dateISO;
        else delete next[classId][assessmentId];
        onChange({ assessmentDates: next });
    };

    const resetClass = () => {
        const next = { ...(config.assessmentDates ?? {}) };
        delete next[selectedClassId];
        onChange({ assessmentDates: next });
    };

    if (classes.length === 0) return null;

    return (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">Planning des devoirs</h4>
                <select
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="h-9 rounded-md border border-border/80 bg-background text-foreground px-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold"
                >
                    {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {!hasPlan ? (
                <p className="rounded-lg bg-secondary px-3 py-2 text-[11px] text-muted-foreground/60 border border-border/30 font-sans">
                    Aucun planning officiel de devoirs pour ce niveau/matière. Vous pourrez saisir vos propres dates
                    ultérieurement.
                </p>
            ) : (
                <>
                    <p className="text-[11px] leading-relaxed text-muted-foreground font-sans">
                        Dates <b>indicatives</b> issues du planning ministériel (semaines relatives au semestre). Ajustez
                        librement : elles déclenchent un rappel quand un devoir approche, sans jamais vous contraindre.
                    </p>
                    <div className="space-y-1.5">
                        {assessments.map(a => {
                            const custom = !!config.assessmentDates?.[selectedClassId]?.[a.id];
                            return (
                                <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-secondary/70 border border-border/20 px-2.5 py-1.5 hover:bg-secondary transition-colors">
                                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase font-mono ${a.type === 'controle' ? 'border-success/20 bg-success/10 text-success' : 'border-primary/20 bg-primary/10 text-primary'}`}>
                                        {a.type === 'controle' ? `Surveillé ${a.num}` : `Maison ${a.num}`}
                                    </span>
                                    <span className="text-[11px] font-bold text-muted-foreground font-mono">S{a.semestre}</span>
                                    {a.duree && <span className="text-[10px] text-muted-foreground/60 font-mono">{a.duree}</span>}
                                    <input
                                        type="date"
                                        value={a.dateISO}
                                        onChange={e => setAssessmentDate(a.id, e.target.value)}
                                        className={`ml-auto h-8 rounded-md border px-2 text-xs text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 ${custom ? 'border-primary text-primary' : 'border-border/80'}`}
                                        title={a.fenetre ? `Fenêtre officielle : ${a.fenetre}` : undefined}
                                    />
                                    {custom && (
                                        <button
                                            type="button"
                                            onClick={() => setAssessmentDate(a.id, '')}
                                            className="text-[11px] font-semibold text-muted-foreground/60 hover:text-destructive"
                                            title="Revenir à la date officielle"
                                        >
                                            ↺
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {config.assessmentDates?.[selectedClassId] && Object.keys(config.assessmentDates[selectedClassId]).length > 0 && (
                        <button
                            type="button"
                            onClick={resetClass}
                            className="text-[11px] font-bold text-muted-foreground hover:text-primary font-sans transition-colors cursor-pointer"
                        >
                            Réinitialiser toutes les dates de cette classe
                        </button>
                    )}
                </>
            )}
        </div>
    );
};
