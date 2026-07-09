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

interface ScheduleTabProps {
    classes: ClassInfo[];
    config: AppConfig;
    onChange: (patch: Partial<AppConfig>) => void;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ classes, config, onChange }) => {
    const calendar = getBundledCalendar();
    const timetable = config.timetable ?? [];

    const classById = React.useMemo(() => {
        const map = new Map<string, ClassInfo>();
        classes.forEach(c => map.set(c.id, c));
        return map;
    }, [classes]);

    const assign = (day: number, slot: number, classId: string | null) => {
        const nextTimetable = setTimetableEntry(timetable, day, slot, classId);
        onChange({ timetable: nextTimetable, schedules: deriveSchedules(nextTimetable) });
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
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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
                                    const entry = getTimetableEntry(timetable, day.value, hour.index);
                                    const classInfo = entry ? classById.get(entry.classId) : undefined;
                                    const run = runsByDay.get(day.value)?.get(hour.index);
                                    const merged = !!run && run.hours > 1;
                                    // cases d'une même séance continue : soudées entre
                                    // elles (padding et arrondis fusionnés), chaque
                                    // heure restant individuellement modifiable
                                    const cellPadding = merged
                                        ? run.isStart
                                            ? 'py-1 pl-1 pr-0'
                                            : run.isEnd
                                                ? 'py-1 pl-0 pr-1'
                                                : 'py-1 px-0'
                                        : 'p-1';
                                    const rounding = merged
                                        ? run.isStart
                                            ? 'rounded-l-lg rounded-r-none'
                                            : run.isEnd
                                                ? 'rounded-r-lg rounded-l-none'
                                                : 'rounded-none'
                                        : 'rounded-lg';
                                    return (
                                        <td
                                            key={hour.index}
                                            className={`relative align-top ${cellPadding} ${dayIndex < TIMETABLE_DAYS.length - 1 ? 'border-b border-border/40' : ''} ${hour.lunchBefore ? 'border-l border-l-primary/25' : ''}`}
                                        >
                                            <select
                                                value={entry?.classId ?? ''}
                                                onChange={e => assign(day.value, hour.index, e.target.value || null)}
                                                className={`h-11 w-full cursor-pointer border px-1.5 text-[11px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${rounding} ${
                                                    classInfo
                                                        ? `border-transparent text-white shadow-sm shadow-foreground/10 ${merged ? '' : 'hover:brightness-105'}`
                                                        : 'border-dashed border-border bg-background text-muted-foreground/60 hover:border-primary/50 hover:bg-secondary/40 hover:text-foreground'
                                                }`}
                                                style={classInfo ? { backgroundColor: classInfo.color } : undefined}
                                                aria-label={`${day.label} ${hour.label}${merged ? ` (séance continue de ${run.hours} h)` : ''}`}
                                            >
                                                <option value="">—</option>
                                                {classes.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {SUBJECT_ABBREV_MAP[c.subject] || c.subject} · {c.name}
                                                    </option>
                                                ))}
                                            </select>
                                            {merged && run.isStart && (
                                                <span className="pointer-events-none absolute left-2 top-0.5 rounded-full bg-background/25 px-1.5 text-[9px] font-bold leading-4 text-white shadow-sm font-mono">
                                                    {run.hours} h
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

            {/* Récapitulatif par classe : séances (blocs continus) et heures */}
            <div className="flex flex-wrap gap-2">
                {classes.map(c => {
                    const { hours, sessions } = weeklyStats(c.id);
                    return (
                        <span
                            key={c.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground shadow-sm font-sans"
                        >
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.name}
                            <span className="text-muted-foreground/60 font-mono">
                                · {sessions} séance{sessions > 1 ? 's' : ''}
                                {hours !== sessions ? ` (${hours} h)` : ''}/sem
                            </span>
                        </span>
                    );
                })}
            </div>

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
