import React, { useMemo } from 'react';
import { AppConfig, ClassInfo, LessonsData } from '../types';
import { useLateness } from '../hooks/useLateness';
import { useUpcomingAssessments } from '../hooks/useAssessments';
import { computeProgressionStats } from '../utils/progression';
import { migrateLessonsData } from '../utils/dataUtils';
import { computeClassHoursInsight } from '../utils/scheduleInsights';
import { getBundledCalendar, isHoliday, isVacation, todayInMorocco } from '../utils/calendar';
import { withAbsences } from '../utils/lateness';
import { getDaySessionBlocks } from '../utils/timetable';
import {
    AnalystSummary,
    ClassAnalysis,
    Insight,
    InsightIcon,
    buildInsights,
    summarizeAnalysis,
} from '../utils/dashboardInsights';
import { Card } from './ui/card';
import {
    TriangleAlert,
    CalendarCheck,
    TrendingUp,
    Clock,
    CalendarX,
    CircleAlert,
    CalendarRange,
    CircleCheck,
    CalendarDays,
} from './ui/icons';

interface AnalystViewProps {
    classes: ClassInfo[];
    config: AppConfig;
    onSelectClass: (classInfo: ClassInfo) => void;
}

const readLessons = (classId: string): LessonsData => {
    try {
        const raw = localStorage.getItem(`classData_v1_${classId}`);
        const parsed = raw ? JSON.parse(raw) : [];
        return migrateLessonsData(Array.isArray(parsed) ? parsed : (parsed.lessonsData ?? []));
    } catch {
        return [];
    }
};

/** dates présentes dans un cahier (contenus + séparateurs) — pour « séance du jour datée ? » */
const collectDates = (lessons: LessonsData): Set<string> => {
    const dates = new Set<string>();
    const walk = (obj: any): void => {
        if (!obj || typeof obj !== 'object') return;
        if (typeof obj.date === 'string' && obj.date) dates.add(obj.date);
        if (obj.separatorAfter?.date) dates.add(obj.separatorAfter.date);
        for (const value of Object.values(obj)) {
            if (Array.isArray(value)) value.forEach(walk);
            else if (typeof value === 'object') walk(value);
        }
    };
    lessons.forEach(walk);
    return dates;
};

/** Le prochain contenu réellement daté : un repère pédagogique, pas une prédiction. */
const findNextContent = (lessons: LessonsData, todayISO: string): { title: string; date: string } | undefined => {
    let next: { title: string; date: string } | undefined;
    const visit = (node: any): void => {
        if (!node || typeof node !== 'object') return;
        if (typeof node.date === 'string' && node.date >= todayISO) {
            const title = typeof node.title === 'string' ? node.title.trim() : '';
            if (title && (!next || node.date < next.date)) next = { title, date: node.date };
        }
        for (const value of Object.values(node)) {
            if (Array.isArray(value)) value.forEach(visit);
        }
    };
    lessons.forEach(visit);
    return next;
};

const TONE_STYLE: Record<Insight['tone'], { card: string; icon: string; title: string }> = {
    critical: { card: 'border-red-200 bg-red-50/40', icon: 'text-red-600', title: 'text-red-700' },
    warn: { card: 'border-amber-200 bg-amber-50/40', icon: 'text-amber-600', title: 'text-amber-700' },
    info: { card: 'border-blue-200 bg-blue-50/40', icon: 'text-blue-600', title: 'text-blue-700' },
    good: { card: 'border-success/30 bg-success/5', icon: 'text-success', title: 'text-success' },
};

const ICON_MAP: Record<InsightIcon, React.ComponentType<{ className?: string }>> = {
    late: TriangleAlert,
    exam: CalendarCheck,
    progress: TrendingUp,
    hours: Clock,
    idle: CalendarX,
    schedule: CalendarRange,
    sparkle: CircleCheck,
    today: CalendarDays,
};

/** barre de progression fine, teintée selon le taux (rouge bas → vert haut) */
const progressColor = (rate: number): string => {
    if (rate >= 75) return 'bg-success';
    if (rate >= 40) return 'bg-primary';
    if (rate >= 15) return 'bg-amber-500';
    return 'bg-red-500';
};

/**
 * Vue « analyste » du tableau de bord : au-delà des chiffres bruts, elle
 * INTERPRÈTE les données — observations classées, barres de progression par
 * classe, bilan d'humeur. Tout est branché aux moteurs purs (retard,
 * progression, devoirs, volume horaire) : aucune règle dupliquée.
 */
export const AnalystView: React.FC<AnalystViewProps> = ({ classes, config, onSelectClass }) => {
    const lateness = useLateness(classes, config);
    const upcoming = useUpcomingAssessments(classes, config, 14);

    const { rows, insights, summary } = useMemo(() => {
        const calendar = withAbsences(getBundledCalendar(), config.absences);
        const todayISO = todayInMorocco(new Date(), calendar);
        const isOffDay = isHoliday(todayISO, calendar) || isVacation(todayISO, calendar);
        const [ty, tm, td] = todayISO.split('-').map(Number);
        const moroccoWeekday = new Date(Date.UTC(ty, tm - 1, td)).getUTCDay();

        const rows: ClassAnalysis[] = classes.map(classInfo => {
            const lessons = readLessons(classInfo.id);
            const stats = computeProgressionStats(lessons);
            const late = lateness?.perClass.find(p => p.classId === classInfo.id);
            const hours = computeClassHoursInsight(classInfo, config.timetable);
            const hasSchedule = (config.schedules?.find(s => s.classId === classInfo.id)?.slots.length ?? 0) > 0;
            return {
                classId: classInfo.id,
                className: classInfo.name,
                subject: classInfo.subject,
                completion: stats.completionRate,
                planned: stats.plannedCount,
                total: stats.totalItems,
                sessionsCount: stats.sessionsCount,
                gapSessions: late?.gapSessions ?? 0,
                severity: late?.severity ?? 'ok',
                daysSinceLastEntry: late?.daysSinceLastEntry ?? null,
                hasSchedule,
                hoursDeviation: hours.deviation,
                delta: hours.delta,
                officialHours: hours.officialHours,
                nextContent: findNextContent(lessons, todayISO),
            };
        });

        // séances du jour non datées (jour ouvré uniquement)
        const undatedToday = isOffDay
            ? []
            : classes
                  .filter(classInfo => {
                      const blocks = getDaySessionBlocks(config.timetable, moroccoWeekday).filter(b => b.classId === classInfo.id);
                      if (blocks.length === 0) return false;
                      return !collectDates(readLessons(classInfo.id)).has(todayISO);
                  })
                  .map(classInfo => ({ classId: classInfo.id, className: classInfo.name }));

        const upcomingLite = upcoming.map(u => ({
            classId: u.classId,
            className: u.className,
            label: u.label.split(' — ')[0],
            inDays: u.inDays,
        }));

        return {
            rows,
            insights: buildInsights(rows, upcomingLite, undatedToday),
            summary: summarizeAnalysis(rows, upcoming.length),
        };
    }, [classes, config.absences, config.timetable, config.schedules, lateness, upcoming]);

    if (classes.length === 0) return null;

    const sortedRows = [...rows].sort((a, b) => a.completion - b.completion);

    return (
        <div className="space-y-6">
            {/* Cartes KPI (dont la « prochaine séance » en tête) */}

            {/* Bilan d'humeur — la voix de l'analyste */}
            <AnalystHeader summary={summary} />
            <TeachingCircuit rows={rows} upcomingCount={upcoming.length} />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
                {/* Observations classées (suggestions) */}
                <section className="lg:col-span-3 space-y-3">
                    <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                        À votre attention
                    </h3>
                    {insights.length === 0 ? (
                        <div className="flex items-center gap-3 rounded-2xl border border-success/25 bg-success/10 p-4">
                            <CircleCheck className="h-6 w-6 shrink-0 text-success" />
                            <p className="text-sm font-bold text-success">
                                Rien ne réclame votre attention — tout roule. Profitez-en 🌱
                            </p>
                        </div>
                    ) : (
                        <ul className="space-y-2.5">
                            {insights.slice(0, 4).map(insight => {
                                const style = TONE_STYLE[insight.tone];
                                const Icon = ICON_MAP[insight.icon];
                                const cls = insight.classId ? classes.find(c => c.id === insight.classId) : undefined;
                                return (
                                    <li key={insight.id}>
                                        <button
                                            type="button"
                                            onClick={() => cls && onSelectClass(cls)}
                                            disabled={!cls}
                                            className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-all ${style.card} ${cls ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-sm' : 'cursor-default'}`}
                                        >
                                            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/70 shadow-sm ${style.icon}`}>
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className={`block text-sm font-extrabold ${style.title}`}>{insight.title}</span>
                                                <span className="mt-0.5 block text-xs font-medium leading-relaxed text-muted-foreground">
                                                    {insight.detail}
                                                </span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>

                {/* Progression par classe — barres classées (la moins avancée d'abord) */}
                <section className="lg:col-span-2 space-y-3">
                    <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                        Progression par classe
                    </h3>
                    {sortedRows.some(row => row.nextContent) && (
                        <Card className="space-y-2 rounded-xl border border-primary/15 bg-primary/[0.03] p-3.5 shadow-sm">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-primary">Prochains contenus prévus</p>
                            {sortedRows
                                .filter(row => row.nextContent)
                                .sort((a, b) => a.nextContent!.date.localeCompare(b.nextContent!.date))
                                .slice(0, 3)
                                .map(row => {
                                    const cls = classes.find(c => c.id === row.classId);
                                    return (
                                        <button key={`next-${row.classId}`} type="button" onClick={() => cls && onSelectClass(cls)} className="block w-full rounded-lg px-1 py-1.5 text-left hover:bg-card">
                                            <span className="flex items-center justify-between gap-2 text-xs font-bold text-foreground">
                                                <span className="truncate">{row.className}</span>
                                                <span className="shrink-0 text-[10px] text-primary">{row.nextContent!.date.split('-').reverse().join('/')}</span>
                                            </span>
                                            <span className="mt-0.5 block line-clamp-1 text-[11px] text-muted-foreground">{row.nextContent!.title}</span>
                                        </button>
                                    );
                                })}
                        </Card>
                    )}
                    <Card className="space-y-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        {sortedRows.slice(0, 6).map(row => {
                            const cls = classes.find(c => c.id === row.classId);
                            return (
                                <button
                                    key={row.classId}
                                    type="button"
                                    onClick={() => cls && onSelectClass(cls)}
                                    className="block w-full text-left cursor-pointer group"
                                >
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                        <span className="min-w-0 truncate text-xs font-bold text-slate-700 group-hover:text-primary transition-colors">{row.className}</span>
                                        <span className="shrink-0 text-xs font-black tabular-nums text-slate-500">
                                            {row.completion}%
                                            <span className="ml-1 font-bold text-slate-400">
                                                ({row.planned}/{row.total})
                                            </span>
                                        </span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                        <div
                                            className={`h-full rounded-full ${progressColor(row.completion)} transition-[width] duration-700 ease-out`}
                                            style={{ width: `${row.completion}%` }}
                                        />
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-[10px] font-semibold text-slate-400">
                                        <span>{row.sessionsCount} séance{row.sessionsCount > 1 ? 's' : ''}</span>
                                        {row.gapSessions > 0 && (
                                            <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                                                <CircleAlert className="h-3 w-3" />
                                                {row.gapSessions} en attente
                                            </span>
                                        )}
                                        {row.gapSessions === 0 && row.hasSchedule && (
                                            <span className="text-success font-bold">à jour</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                        {sortedRows.length > 6 && (
                            <p className="border-t border-slate-100 pt-2 text-center text-[11px] font-medium text-muted-foreground">
                                Les autres classes restent disponibles dans « Mes classes ».
                            </p>
                        )}
                    </Card>
                </section>
            </div>
        </div>
    );
};

/* ── En-tête de l'analyste : bilan chiffré + phrase d'humeur ── */

const AnalystHeader: React.FC<{ summary: AnalystSummary }> = ({ summary }) => (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Bilan de la semaine</p>
            <p className="mt-1 text-lg font-extrabold text-slate-800 font-display">{summary.mood}</p>
        </div>
        <div className="flex shrink-0 gap-5">
            <MiniStat value={`${summary.avgCompletion}%`} label="Progression moy." />
            <MiniStat value={summary.totalSessions} label="Séances" />
            <MiniStat
                value={summary.lateClasses}
                label="À compléter"
                tone={summary.lateClasses > 0 ? 'warn' : 'good'}
            />
        </div>
    </div>
);

/** Un circuit compact relie les données sources aux décisions de la journée. */
const TeachingCircuit: React.FC<{ rows: ClassAnalysis[]; upcomingCount: number }> = ({ rows, upcomingCount }) => {
    const scheduled = rows.filter(row => row.hasSchedule).length;
    const prepared = rows.filter(row => row.nextContent).length;
    const sessions = rows.reduce((total, row) => total + row.sessionsCount, 0);
    const stages = [
        { label: 'Emploi du temps', value: `${scheduled}/${rows.length}`, detail: 'classes reliées' },
        { label: 'Séances saisies', value: sessions, detail: 'dates dans les cahiers' },
        { label: 'Préparation', value: prepared, detail: 'contenus à venir' },
        { label: 'Devoirs', value: upcomingCount, detail: 'dans les 14 jours' },
    ];
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-primary">Circuit pédagogique</p>
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground">Une même donnée relie planning, contenus, progression et devoirs.</p>
                </div>
                <span className="hidden rounded-full bg-primary/5 px-2.5 py-1 text-[10px] font-bold text-primary sm:inline">temps réel local</span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-4 sm:divide-y-0">
                {stages.map((stage, index) => (
                    <div key={stage.label} className="relative px-4 py-3.5">
                        {index < stages.length - 1 && <span className="absolute -right-1.5 top-1/2 z-10 hidden h-3 w-3 -translate-y-1/2 rotate-45 border-r border-t border-slate-200 bg-white sm:block" />}
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{stage.label}</p>
                        <p className="mt-1 text-xl font-black tracking-tight text-slate-800 tabular-nums">{stage.value}</p>
                        <p className="mt-0.5 text-[10px] font-medium text-slate-500">{stage.detail}</p>
                    </div>
                ))}
            </div>
        </section>
    );
};

const MiniStat: React.FC<{ value: string | number; label: string; tone?: 'warn' | 'good' }> = ({ value, label, tone }) => (
    <div className="text-center">
        <div className={`text-2xl font-black tabular-nums ${tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-success' : 'text-primary'}`}>
            {value}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-medium">{label}</div>
    </div>
);
