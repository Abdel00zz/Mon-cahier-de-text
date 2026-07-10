import React from 'react';
import { AppConfig, ClassInfo } from '../../types';
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

interface ScheduleTabProps {
    classes: ClassInfo[];
    config: AppConfig;
    onChange: (patch: Partial<AppConfig>) => void;
}

/*
 * Couleur DISTINCTE par classe (palette papier harmonieuse) : la grille se lit
 * d'un coup d'œil — chaque classe garde sa teinte dans les cellules ET dans le
 * récapitulatif. Attribution stable par ordre des classes.
 */
const CLASS_CELL_COLORS = [
    { bg: 'bg-[#e8f0ec]', border: 'border-[#cad2c5]', text: 'text-[#52796f]', dot: 'bg-[#84a98c]' }, // sauge
    { bg: 'bg-[#fff3ec]', border: 'border-[#ffd6c2]', text: 'text-[#c05a38]', dot: 'bg-[#e76f51]' }, // terracotta
    { bg: 'bg-[#eaf1f8]', border: 'border-[#c9dcf2]', text: 'text-[#39628c]', dot: 'bg-[#457b9d]' }, // bleu doux
    { bg: 'bg-[#faf3e3]', border: 'border-[#ecdfc0]', text: 'text-[#8a6d1f]', dot: 'bg-[#c9a227]' }, // ambre
    { bg: 'bg-[#f3eefb]', border: 'border-[#dccff0]', text: 'text-[#65539a]', dot: 'bg-[#8a76c4]' }, // lavande
    { bg: 'bg-[#fdeef2]', border: 'border-[#f5cdd8]', text: 'text-[#a34e69]', dot: 'bg-[#d0728f]' }, // rose
];

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ classes, config, onChange }) => {
    const calendar = getBundledCalendar();
    const timetable = config.timetable ?? [];

    const classById = React.useMemo(() => {
        const map = new Map<string, ClassInfo>();
        classes.forEach(c => map.set(c.id, c));
        return map;
    }, [classes]);

    const colorFor = (classId: string) => {
        const index = classes.findIndex(c => c.id === classId);
        return CLASS_CELL_COLORS[(index >= 0 ? index : 0) % CLASS_CELL_COLORS.length];
    };

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

    if (classes.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
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
                Composez votre emploi du temps : pour chaque créneau, choisissez la classe que vous enseignez. La grille
                s'enregistre automatiquement et se synchronise ; elle alimente le calcul de votre progression et les
                alertes de retard (vacances et jours fériés exclus). Deux heures consécutives avec la même classe sont
                automatiquement lues comme <b>une seule séance de 2 h</b> — une seule date attendue dans le cahier.
            </p>

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
                                            <select
                                                value={entry?.classId ?? ''}
                                                onChange={e => merged
                                                    ? assignRun(day.value, hour.index, span, e.target.value || null)
                                                    : assign(day.value, hour.index, e.target.value || null)}
                                                className={`h-11 w-full cursor-pointer rounded border px-1.5 text-center text-[11px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                                                    classInfo && color
                                                        ? `${color.border} ${color.bg} ${color.text} shadow-sm shadow-foreground/5 hover:brightness-[0.98]`
                                                        : 'border-dashed border-border bg-background text-muted-foreground/60 hover:border-primary/50 hover:bg-secondary/40 hover:text-foreground'
                                                }`}
                                                aria-label={`${day.label} ${hour.label}${merged ? ` (séance fusionnée de ${span} h)` : ''}`}
                                            >
                                                <option value="">—</option>
                                                {classes.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {SUBJECT_ABBREV_MAP[c.subject] || c.subject} · {c.name}
                                                    </option>
                                                ))}
                                            </select>
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
