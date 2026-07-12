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
import { nextSessionInfoForClass } from '../utils/timetable';
import { getTeachingResume } from '../utils/notebookIntelligence';
import {
    AnalystSummary,
    ClassAnalysis,
    Insight,
    InsightIcon,
    buildInsights,
    summarizeAnalysis,
} from '../utils/dashboardInsights';
import { Card } from './ui/card';
import { MathText } from './ui/math-text';
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

const TONE_STYLE: Record<Insight['tone'], { card: string; icon: string; title: string }> = {
    critical: { card: 'border-red-200 bg-white', icon: 'text-red-600', title: 'text-foreground' },
    warn: { card: 'border-border bg-white', icon: 'text-red-500', title: 'text-foreground' },
    info: { card: 'border-primary/25 bg-white', icon: 'text-primary', title: 'text-foreground' },
    good: { card: 'border-emerald-200 bg-white', icon: 'text-emerald-600', title: 'text-foreground' },
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
    if (rate >= 75) return 'bg-emerald-400';
    if (rate >= 40) return 'bg-primary';
    if (rate >= 15) return 'bg-primary/75';
    return 'bg-primary/50';
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
            const resume = getTeachingResume(lessons);
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
                lastContent: resume.last,
                nextContent: resume.next,
                nextSessionLabel: nextSessionInfoForClass(
                    classInfo.id,
                    config.timetable,
                    config.schedules?.find(schedule => schedule.classId === classInfo.id)?.slots.map(slot => slot.weekday) ?? [],
                    calendar,
                )?.label,
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
    const progressRows = sortedRows.filter(row => row.total > 0 || row.sessionsCount > 0);

    return (
        <div className="space-y-4 sm:space-y-5">
            {/* Cartes KPI (dont la « prochaine séance » en tête) */}

            {/* Bilan d'humeur — la voix de l'analyste */}
            <AnalystHeader summary={summary} />
            <NextSessionsPlan rows={rows} classes={classes} onSelectClass={onSelectClass} />

            <div className="dashboard-reveal dashboard-reveal-3 flex flex-col gap-5">
                {/* Observations classées (suggestions) */}
                <section className="order-2 space-y-3 rounded-2xl bg-secondary/55 p-3 sm:p-4">
                    <h3 className="dashboard-section-title text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        À votre attention — action requise
                    </h3>
                    {insights.length === 0 ? (
                        <div className="dashboard-panel flex items-center gap-3 rounded-xl border-success/25 bg-success/10 p-4">
                            <CircleCheck className="h-6 w-6 shrink-0 text-success" />
                            <p className="text-sm font-bold text-success">
                                Rien ne réclame votre attention — tout roule. Profitez-en 🌱
                            </p>
                        </div>
                    ) : (
                        <ul className="dashboard-stagger space-y-2.5">
                            {insights.slice(0, 3).map(insight => {
                                const style = TONE_STYLE[insight.tone];
                                const Icon = ICON_MAP[insight.icon];
                                const shouldBlink = insight.tone === 'critical' || insight.tone === 'warn';
                                const cls = insight.classId ? classes.find(c => c.id === insight.classId) : undefined;
                                return (
                                    <li key={insight.id}>
                                        <button
                                            type="button"
                                            onClick={() => cls && onSelectClass(cls)}
                                            disabled={!cls}
                                            data-urgent={shouldBlink}
                                            className={`dashboard-panel dashboard-attention-card flex w-full items-start gap-3 rounded-xl p-3 pl-4 text-left transition-[border-color,box-shadow,background-color] ${style.card} ${cls ? 'cursor-pointer hover:border-primary/35 hover:shadow-md' : 'cursor-default'}`}
                                        >
                                            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${shouldBlink ? 'bg-red-50 motion-safe:animate-pulse' : 'bg-accent'} ${style.icon}`}>
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
                <section className="order-1 space-y-3 rounded-2xl bg-accent/55 p-3 sm:p-4">
                    <h3 className="dashboard-section-title text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        Progression par classe
                    </h3>
                    <Card className="dashboard-panel dashboard-panel--dark dashboard-stagger space-y-3 rounded-xl border-foreground/90 bg-foreground p-4 text-primary-foreground shadow-[0_2px_6px_rgba(15,20,25,0.055)]">
                        {progressRows.length === 0 && (
                            <p className="py-2 text-center text-xs font-medium text-primary-foreground/70">La progression apparaîtra après votre première séance datée.</p>
                        )}
                        {progressRows.slice(0, 5).map(row => {
                            const cls = classes.find(c => c.id === row.classId);
                            return (
                                <button
                                    key={row.classId}
                                    type="button"
                                    onClick={() => cls && onSelectClass(cls)}
                                    className="block w-full text-left cursor-pointer group"
                                >
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                        <span className="min-w-0 truncate text-sm font-bold text-primary-foreground transition-colors group-hover:text-primary">{row.className}</span>
                                        <span className="shrink-0 text-xs font-black tabular-nums text-primary-foreground/90">
                                            {row.completion}%
                                            <span className="ml-1 font-bold text-primary-foreground/60">
                                                ({row.planned}/{row.total})
                                            </span>
                                        </span>
                                    </div>
                                    <div className="h-1.5 overflow-hidden rounded-full bg-primary-foreground/20">
                                        <div
                                            className={`h-full rounded-full ${progressColor(row.completion)} transition-[width] duration-700 ease-out`}
                                            style={{ width: `${row.completion}%` }}
                                        />
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-2 text-[10px] font-semibold text-primary-foreground/65">
                                        <span>{row.sessionsCount} séance{row.sessionsCount > 1 ? 's' : ''}</span>
                                        {row.gapSessions > 0 && (
                                            <span className="flex items-center gap-0.5 font-bold text-amber-300">
                                                <CircleAlert className="h-3 w-3" />
                                                {row.gapSessions} en attente
                                            </span>
                                        )}
                                        {row.gapSessions === 0 && row.hasSchedule && (
                                            <span className="font-bold text-emerald-300">à jour</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                        {progressRows.length > 5 && (
                            <p className="border-t border-primary-foreground/15 pt-2 text-center text-[11px] font-medium text-primary-foreground/65">
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
    <div className="dashboard-panel dashboard-panel--primary dashboard-reveal dashboard-reveal-1 flex flex-col gap-4 rounded-xl p-4 text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground/75">Aujourd’hui</p>
            <p className="mt-1 text-base font-extrabold leading-snug text-primary-foreground font-display sm:text-lg">{summary.mood}</p>
        </div>
        <div className="grid shrink-0 grid-cols-3 divide-x divide-primary-foreground/20 rounded-lg border border-primary-foreground/20 bg-primary-foreground/10 px-1 py-2.5 sm:min-w-[290px]">
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

/** Repère central du professeur : dernière limite atteinte et point de reprise. */
const NextSessionsPlan: React.FC<{
    rows: ClassAnalysis[];
    classes: ClassInfo[];
    onSelectClass: (classInfo: ClassInfo) => void;
}> = ({ rows, classes, onSelectClass }) => {
    const prepared = rows.filter(row => row.nextContent || row.lastContent);
    if (prepared.length === 0) return null;

    return (
        <section className="dashboard-panel dashboard-reveal dashboard-reveal-2 overflow-hidden rounded-xl bg-card">
            <div className="flex items-center gap-3 bg-foreground px-4 py-3.5 text-primary-foreground">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <CalendarDays className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0">
                    <h2 className="text-sm font-black text-primary-foreground sm:text-base">Prochaines séances</h2>
                    <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-primary-foreground/65">
                        Le point exact où reprendre dans chaque cahier.
                    </p>
                </div>
            </div>
            <div className="dashboard-stagger divide-y divide-border/70">
                {prepared.slice(0, 6).map(row => {
                    const classInfo = classes.find(item => item.id === row.classId);
                    return (
                        <button
                            key={row.classId}
                            type="button"
                            onClick={() => classInfo && onSelectClass(classInfo)}
                            className="group grid w-full min-w-0 gap-2 px-4 py-3.5 text-left transition-colors hover:bg-accent/70 sm:grid-cols-[minmax(8rem,0.34fr)_minmax(0,1fr)] sm:items-center"
                        >
                            <span className="flex min-w-0 items-center justify-between gap-2 sm:block">
                                <span className="block truncate text-sm font-extrabold text-foreground group-hover:text-primary">{row.className}</span>
                                <span className="mt-1 block shrink-0 text-[10px] font-bold text-primary">
                                    {row.nextSessionLabel ?? 'horaire à compléter'}
                                </span>
                            </span>
                            <span className="min-w-0 border-l-2 border-primary/25 pl-3">
                                <span className="block text-[9px] font-black uppercase tracking-wider text-primary">Début de la prochaine séance</span>
                                <span className="mt-0.5 block line-clamp-2 text-sm font-extrabold leading-snug text-foreground sm:line-clamp-1">
                                    <MathText
                                        source={row.nextContent?.title}
                                        cacheKey={`dashboard-next-${row.classId}-${row.nextContent?.title ?? ''}`}
                                        inline
                                    >
                                        {row.nextContent?.title ?? 'Programme terminé — ajoutez le prochain contenu'}
                                    </MathText>
                                </span>
                                {row.lastContent && (
                                    <span className="mt-1 block truncate text-[10px] font-medium text-muted-foreground">
                                        Dernier point :{' '}
                                        <MathText source={row.lastContent.title} cacheKey={`dashboard-last-${row.classId}-${row.lastContent.title}`} inline>
                                            {row.lastContent.title}
                                        </MathText>
                                    </span>
                                )}
                                {row.nextContent?.breadcrumb && (
                                    <span className="mt-0.5 block truncate text-[10px] font-semibold text-muted-foreground/75">
                                        <MathText source={row.nextContent.breadcrumb} cacheKey={`dashboard-path-${row.classId}-${row.nextContent.breadcrumb}`} inline>
                                            {row.nextContent.breadcrumb}
                                        </MathText>
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
};

const MiniStat: React.FC<{ value: string | number; label: string; tone?: 'warn' | 'good' }> = ({ value, label, tone }) => (
    <div className="px-2 text-center">
        <div className={`text-xl font-black tabular-nums ${tone === 'warn' ? 'text-amber-300' : tone === 'good' ? 'text-emerald-300' : 'text-white'}`}>
            {value}
        </div>
        <div className="text-[8px] font-bold uppercase leading-tight tracking-wider text-primary-foreground/75">{label}</div>
    </div>
);
