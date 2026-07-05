import React from 'react';
import { AppConfig, ClassInfo } from '../../types';
import { getBundledCalendar } from '../../utils/calendar';
import { SUBJECT_ABBREV_MAP } from '../../constants';
import {
    HOUR_SLOTS,
    TIMETABLE_DAYS,
    deriveSchedules,
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

    const setSchoolYearStart = (value: string) => onChange({ schoolYearStart: value || undefined });

    if (classes.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-slate-500">
                Créez d'abord une classe pour composer votre emploi du temps.
            </div>
        );
    }

    const sessionsPerWeek = (classId: string) => timetable.filter(e => e.classId === classId).length;

    return (
        <div className="space-y-4">
            <p className="text-xs leading-relaxed text-slate-500">
                Composez votre emploi du temps : pour chaque créneau, choisissez la classe que vous enseignez. La grille
                s'enregistre automatiquement et se synchronise ; elle alimente le calcul de votre progression et les
                alertes de retard (vacances et jours fériés exclus).
            </p>

            {/* Grille jours × créneaux (façon emploi du temps papier, sans la colonne 24 h) */}
            <div className="overflow-x-auto rounded-2xl border border-border bg-white">
                <table className="w-full min-w-[46rem] border-collapse text-xs">
                    <thead>
                        <tr className="bg-slate-50">
                            <th className="sticky left-0 z-10 border-b border-r border-border bg-slate-50 px-3 py-2 text-left font-semibold uppercase tracking-wider text-slate-500">
                                Jour
                            </th>
                            {HOUR_SLOTS.map(hour => (
                                <th
                                    key={hour.index}
                                    className={`border-b border-border px-1 py-2 text-center font-semibold text-slate-500 ${
                                        hour.lunchBefore ? 'border-l-4 border-l-amber-200' : ''
                                    }`}
                                >
                                    {hour.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {TIMETABLE_DAYS.map(day => (
                            <tr key={day.value} className="border-b border-border/60 last:border-0">
                                <td className="sticky left-0 z-10 border-r border-border bg-white px-3 py-2 font-bold text-slate-700">
                                    {day.label}
                                </td>
                                {HOUR_SLOTS.map(hour => {
                                    const entry = getTimetableEntry(timetable, day.value, hour.index);
                                    const classInfo = entry ? classById.get(entry.classId) : undefined;
                                    return (
                                        <td
                                            key={hour.index}
                                            className={`p-1 align-top ${hour.lunchBefore ? 'border-l-4 border-l-amber-200' : ''}`}
                                        >
                                            <select
                                                value={entry?.classId ?? ''}
                                                onChange={e => assign(day.value, hour.index, e.target.value || null)}
                                                className={`h-11 w-full cursor-pointer rounded-lg border px-1 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                                    classInfo
                                                        ? 'border-transparent text-white'
                                                        : 'border-dashed border-border bg-white text-slate-300'
                                                }`}
                                                style={classInfo ? { backgroundColor: classInfo.color } : undefined}
                                                aria-label={`${day.label} ${hour.label}`}
                                            >
                                                <option value="">—</option>
                                                {classes.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {SUBJECT_ABBREV_MAP[c.subject] || c.subject} · {c.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Récapitulatif séances/semaine par classe */}
            <div className="flex flex-wrap gap-2">
                {classes.map(c => {
                    const count = sessionsPerWeek(c.id);
                    return (
                        <span
                            key={c.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                        >
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.name}
                            <span className="text-slate-400">· {count}/sem</span>
                        </span>
                    );
                })}
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white p-3">
                <label className="text-xs font-semibold text-slate-600">Début de l'année scolaire</label>
                <input
                    type="date"
                    value={config.schoolYearStart ?? calendar.anneeScolaire.debut}
                    onChange={e => setSchoolYearStart(e.target.value)}
                    className="h-11 rounded-lg border border-border bg-background px-2 text-sm"
                />
                <span className="text-[11px] text-slate-400">Calendrier : {calendar.anneeScolaire.libelle} (Maroc)</span>
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
        <div className="space-y-3 rounded-2xl border border-border bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Planning des devoirs</h4>
                <select
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="h-9 rounded-md border border-border bg-background px-2 text-xs"
                >
                    {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>

            {!hasPlan ? (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-400">
                    Aucun planning officiel de devoirs pour ce niveau/matière. Vous pourrez saisir vos propres dates
                    ultérieurement.
                </p>
            ) : (
                <>
                    <p className="text-[11px] leading-relaxed text-slate-400">
                        Dates <b>indicatives</b> issues du planning ministériel (semaines relatives au semestre). Ajustez
                        librement : elles déclenchent un rappel quand un devoir approche, sans jamais vous contraindre.
                    </p>
                    <div className="space-y-1.5">
                        {assessments.map(a => {
                            const custom = !!config.assessmentDates?.[selectedClassId]?.[a.id];
                            return (
                                <div key={a.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
                                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${a.type === 'controle' ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'}`}>
                                        {a.type === 'controle' ? `Surveillé ${a.num}` : `Maison ${a.num}`}
                                    </span>
                                    <span className="text-[11px] font-semibold text-slate-500">S{a.semestre}</span>
                                    {a.duree && <span className="text-[10px] text-slate-400">{a.duree}</span>}
                                    <input
                                        type="date"
                                        value={a.dateISO}
                                        onChange={e => setAssessmentDate(a.id, e.target.value)}
                                        className={`ml-auto h-8 rounded-md border px-2 text-xs ${custom ? 'border-primary text-primary' : 'border-border'}`}
                                        title={a.fenetre ? `Fenêtre officielle : ${a.fenetre}` : undefined}
                                    />
                                    {custom && (
                                        <button
                                            type="button"
                                            onClick={() => setAssessmentDate(a.id, '')}
                                            className="text-[10px] font-semibold text-slate-400 hover:text-red-500"
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
                            className="text-[11px] font-semibold text-slate-400 hover:text-primary"
                        >
                            Réinitialiser toutes les dates de cette classe
                        </button>
                    )}
                </>
            )}
        </div>
    );
};
