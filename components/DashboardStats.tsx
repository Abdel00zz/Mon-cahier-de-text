import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppConfig, ClassInfo, LessonsData } from '../types';
import { computeProgressionStats } from '../utils/progression';
import { getDaySessionBlocks } from '../utils/timetable';
import { migrateLessonsData } from '../utils/dataUtils';
import { useLateness } from '../hooks/useLateness';
import { TrendingUp, CircleCheck, TriangleAlert, CalendarDays, Clock, Book, CalendarCheck } from './ui/icons';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from './ui/sheet';

/** Compteur animé : ease-out cubique via requestAnimationFrame. */
const useCountUp = (target: number, durationMs = 800): number => {
    const [display, setDisplay] = useState(0);
    const fromRef = useRef(0);
    const frameRef = useRef<number | null>(null);

    useEffect(() => {
        const from = fromRef.current;
        if (from === target) {
            setDisplay(target);
            return;
        }
        const start = performance.now();
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / durationMs);
            const eased = 1 - Math.pow(1 - t, 3);
            setDisplay(Math.round(from + (target - from) * eased));
            if (t < 1) {
                frameRef.current = requestAnimationFrame(tick);
            } else {
                fromRef.current = target;
            }
        };
        frameRef.current = requestAnimationFrame(tick);
        return () => {
            if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
            fromRef.current = target;
        };
    }, [target, durationMs]);

    return display;
};

const readLessons = (classId: string): LessonsData => {
    try {
        const raw = localStorage.getItem(`classData_v1_${classId}`);
        const parsed = raw ? JSON.parse(raw) : [];
        return migrateLessonsData(Array.isArray(parsed) ? parsed : (parsed.lessonsData ?? []));
    } catch {
        return [];
    }
};

const formatMinutes = (min: number): string =>
    `${String(Math.floor(min / 60)).padStart(2, '0')}h${String(min % 60).padStart(2, '0')}`;

const formatDateCompact = (dateStr: string | null): string => {
    if (!dateStr) return '--';
    try {
        const [y, m, d] = dateStr.split('-').map(Number);
        const date = new Date(Date.UTC(y, m - 1, d));
        return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '');
    } catch {
        return dateStr;
    }
};

type StatKey = 'pending' | 'program' | 'today';

interface StatCardProps {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    value: string | number;
    subtext: string;
    colorTheme: 'indigo' | 'emerald' | 'purple' | 'amber';
    index: number;
    onOpen: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, subtext, colorTheme, index, onOpen }) => {
    const themeClasses = {
        indigo: {
            iconContainer: 'bg-indigo-50/80 text-indigo-600 group-hover:bg-indigo-100',
            borderLeft: 'border-l-indigo-500',
            hoverGlow: 'hover:shadow-indigo-100/40 hover:border-indigo-100/80',
        },
        emerald: {
            iconContainer: 'bg-emerald-50/80 text-emerald-600 group-hover:bg-emerald-100',
            borderLeft: 'border-l-emerald-500',
            hoverGlow: 'hover:shadow-emerald-100/40 hover:border-emerald-100/80',
        },
        purple: {
            iconContainer: 'bg-purple-50/80 text-purple-600 group-hover:bg-purple-100',
            borderLeft: 'border-l-purple-500',
            hoverGlow: 'hover:shadow-purple-100/40 hover:border-purple-100/80',
        },
        amber: {
            iconContainer: 'bg-amber-50/80 text-amber-600 group-hover:bg-amber-100',
            borderLeft: 'border-l-amber-500',
            hoverGlow: 'hover:shadow-amber-100/40 hover:border-amber-100/80',
        }
    };

    const classes = themeClasses[colorTheme];
    const numericValue = typeof value === 'number' ? value : null;
    const displayValue = numericValue !== null ? useCountUp(numericValue) : value;

    return (
        <Card
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
            className={`group flex cursor-pointer flex-row items-center justify-between rounded-2xl border border-l-4 border-border bg-card p-6 opacity-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md animate-slide-in-up ${classes.borderLeft} ${classes.hoverGlow}`}
            style={{ animationDelay: `${index * 55}ms` }}
            aria-label={`${title} : ${value}.`}
        >
            <div className="flex-1 min-w-0 pr-4 text-left">
                <span className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {title}
                </span>
                <h3 className="mt-2.5 truncate text-3xl font-extrabold tracking-tight text-foreground">
                    {displayValue}
                    {colorTheme === 'indigo' && typeof value === 'number' && '%'}
                </h3>
            </div>
            <div className={`p-4 rounded-2xl shrink-0 transition-all duration-300 group-hover:scale-110 ${classes.iconContainer}`}>
                <Icon className="w-7 h-7" />
            </div>
        </Card>
    );
};

/* pastilles de sévérité — mêmes tokens que LatenessBanner (échelle unique) */
const severityDotClass: Record<string, string> = {
    critical: 'bg-destructive',
    warning: 'bg-warning',
    notice: 'bg-warning/60',
    ok: 'bg-success',
};

interface DashboardStatsProps {
    classes: ClassInfo[];
    config: AppConfig;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ classes, config }) => {
    const lateness = useLateness(classes, config);
    const [openSheet, setOpenSheet] = useState<StatKey | null>(null);

    const stats = useMemo(() => {
        let totalItems = 0;
        let plannedCount = 0;
        let sessionsCount = 0;
        let totalChapters = 0;
        let inProgressChapters = 0;
        let lastDate: string | null = null;
        let lastDateClass: string | null = null;

        const perClassProgress = classes.map(classInfo => {
            const lessons = readLessons(classInfo.id);
            const s = computeProgressionStats(lessons);

            totalItems += s.totalItems;
            plannedCount += s.plannedCount;
            sessionsCount += s.sessionsCount;
            totalChapters += lessons.length;

            s.perChapter.forEach(ch => {
                if (ch.planned > 0 && ch.planned < ch.total) {
                    inProgressChapters++;
                }
            });

            if (s.lastDate) {
                if (!lastDate || s.lastDate > lastDate) {
                    lastDate = s.lastDate;
                    lastDateClass = classInfo.name;
                }
            }

            return {
                id: classInfo.id,
                name: classInfo.name,
                planned: s.plannedCount,
                total: s.totalItems,
                completion: s.totalItems === 0 ? 0 : Math.round((s.plannedCount / s.totalItems) * 100),
            };
        });

        const completion = totalItems === 0 ? 0 : Math.round((plannedCount / totalItems) * 100);

        // séances d'AUJOURD'HUI d'après la grille
        const todayBlocks = getDaySessionBlocks(config.timetable, new Date().getDay())
            .filter(block => classes.some(c => c.id === block.classId))
            .sort((a, b) => a.startMin - b.startMin)
            .map(block => ({
                ...block,
                className: classes.find(c => c.id === block.classId)?.name ?? '',
            }));

        return {
            completion,
            planned: plannedCount,
            total: totalItems,
            sessionsCount,
            totalChapters,
            inProgressChapters,
            lastDate,
            lastDateClass,
            perClassProgress,
            todayBlocks,
        };
    }, [classes, config.timetable]);

    if (classes.length === 0) return null;

    const enginePaused = lateness === null;
    const gapTotal = lateness?.perClass.reduce((sum, c) => sum + c.gapSessions, 0) ?? 0;
    const upToDate = !enginePaused && gapTotal === 0;
    const lateClasses = (lateness?.perClass ?? [])
        .filter(c => c.gapSessions > 0)
        .sort((a, b) => b.gapSessions - a.gapSessions);

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
                <StatCard
                    title="Progression"
                    value={stats.completion}
                    subtext={`${stats.planned}/${stats.total}`}
                    icon={TrendingUp}
                    colorTheme="indigo"
                    index={0}
                    onOpen={() => setOpenSheet('program')}
                />
                <StatCard
                    title="Séances"
                    value={stats.sessionsCount}
                    subtext="Total cours"
                    icon={CalendarCheck}
                    colorTheme="emerald"
                    index={1}
                    onOpen={() => setOpenSheet('today')}
                />
                <StatCard
                    title="Chapitres"
                    value={stats.totalChapters}
                    subtext={`${stats.inProgressChapters} actifs`}
                    icon={Book}
                    colorTheme="purple"
                    index={2}
                    onOpen={() => setOpenSheet('program')}
                />
                <StatCard
                    title="Dernière séance"
                    value={stats.lastDate ? formatDateCompact(stats.lastDate) : '--'}
                    subtext={stats.lastDateClass || '--'}
                    icon={Clock}
                    colorTheme="amber"
                    index={3}
                    onOpen={() => setOpenSheet('pending')}
                />
            </div>

            {/* Détails en bottom-sheet */}
            <Sheet open={openSheet !== null} onOpenChange={(open) => { if (!open) setOpenSheet(null); }}>
                <SheetContent
                    side="bottom"
                    className="max-h-[80dvh] overflow-y-auto rounded-t-3xl border-t px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-3 sm:mx-auto sm:max-w-lg sm:rounded-t-3xl"
                >
                    {/* Poignée de préhension */}
                    <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted-foreground/20" aria-hidden />

                    {openSheet === 'pending' && (
                        <>
                            <SheetHeader className="text-left">
                                <SheetTitle className="font-display text-lg font-extrabold">
                                    {enginePaused ? 'Alertes en pause' : upToDate ? 'Tout est à jour' : 'Séances en attente'}
                                </SheetTitle>
                                <SheetDescription className="text-xs font-semibold text-muted-foreground/80">
                                    {enginePaused
                                        ? 'Vacances, jour férié, absence ou emploi du temps non renseigné : le moteur de retard est suspendu.'
                                        : upToDate
                                            ? 'Toutes les séances attendues sont saisies. Continuez comme ça ✨'
                                            : `${gapTotal} séance(s) à saisir, réparties par classe :`}
                                </SheetDescription>
                            </SheetHeader>
                            {!enginePaused && !upToDate && (
                                <div className="mt-4 space-y-2">
                                    {lateClasses.map(c => (
                                        <div key={c.classId} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3">
                                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${severityDotClass[c.severity] ?? 'bg-warning'}`} />
                                            <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{c.className}</span>
                                            <Badge variant="secondary" className="shrink-0 text-[11px] font-extrabold">
                                                {c.gapSessions} séance{c.gapSessions > 1 ? 's' : ''}
                                            </Badge>
                                        </div>
                                    ))}
                                    {lateClasses.length < (lateness?.perClass.length ?? 0) && (
                                        <p className="pt-1 text-center text-[11px] font-semibold text-muted-foreground">
                                            Les autres classes sont à jour <CircleCheck className="inline h-3.5 w-3.5 text-success" />
                                        </p>
                                    )}
                                </div>
                            )}
                            {upToDate && (
                                <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-success/25 bg-success/10 p-5 text-center">
                                    <CircleCheck className="h-8 w-8 text-success" />
                                    <p className="text-sm font-bold text-foreground">Bravo, votre cahier est à jour 🎉</p>
                                </div>
                            )}
                        </>
                    )}

                    {openSheet === 'program' && (
                        <>
                            <SheetHeader className="text-left">
                                <SheetTitle className="font-display text-lg font-extrabold">Avancement du programme</SheetTitle>
                                <SheetDescription className="text-xs font-semibold text-muted-foreground/80">
                                    {stats.planned}/{stats.total} contenus datés — {stats.completion}% au global
                                </SheetDescription>
                            </SheetHeader>
                            <div className="mt-4 space-y-3">
                                {stats.perClassProgress.map(p => (
                                    <div key={p.id} className="rounded-2xl border border-border/60 bg-card p-3">
                                        <div className="mb-2 flex items-center justify-between gap-2">
                                            <span className="min-w-0 truncate text-sm font-bold text-foreground">{p.name}</span>
                                            <span className="shrink-0 text-xs font-black tabular-nums text-muted-foreground">
                                                {p.completion}%
                                                <span className="ml-1 font-bold text-muted-foreground/60">({p.planned}/{p.total})</span>
                                            </span>
                                        </div>
                                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                                            <div
                                                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                                                style={{ width: `${p.completion}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {openSheet === 'today' && (
                        <>
                            <SheetHeader className="text-left">
                                <SheetTitle className="font-display text-lg font-extrabold">Séances d'aujourd'hui</SheetTitle>
                                <SheetDescription className="text-xs font-semibold text-muted-foreground/80">
                                    {stats.todayBlocks.length > 0
                                        ? `${stats.todayBlocks.length} séance(s) d'après votre emploi du temps`
                                        : 'Aucune séance prévue ce jour.'}
                                </SheetDescription>
                            </SheetHeader>
                            {stats.todayBlocks.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {stats.todayBlocks.map((b, i) => (
                                        <div key={`${b.classId}-${i}`} className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-3">
                                            <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] font-bold text-primary">
                                                <Clock className="h-3.5 w-3.5" />
                                                {formatMinutes(b.startMin)}–{formatMinutes(b.endMin)}
                                            </span>
                                            <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{b.className}</span>
                                            <Badge variant="secondary" className="shrink-0 text-[11px] font-extrabold">
                                                {b.hours} h
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </>
    );
};
