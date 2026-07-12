import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppConfig, ClassInfo, LessonsData } from '../types';
import { computeProgressionStats } from '../utils/progression';
import { getDaySessionBlocks, nextSessionInfoForClass, NextSessionInfo, formatHourLabel } from '../utils/timetable';
import { migrateLessonsData } from '../utils/dataUtils';
import { useLateness } from '../hooks/useLateness';
import { getBundledCalendar, isHoliday, isVacation, todayInMorocco } from '../utils/calendar';
import { withAbsences } from '../utils/lateness';
import { TrendingUp, CircleCheck, Clock, Book, CalendarCheck, Bell } from './ui/icons';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
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
    subtext?: string;
    isPercent?: boolean;
    index: number;
    iconBgColor: string;
    shapeBgColor: string;
    textColor: string;
    valueColor: string;
    onOpen: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
    icon: Icon,
    title,
    value,
    subtext,
    isPercent = false,
    index,
    iconBgColor,
    shapeBgColor,
    textColor,
    valueColor,
    onOpen
}) => {
    // Hook toujours appelé (jamais conditionnellement) — respecte les règles des hooks.
    const numericValue = typeof value === 'number' ? value : null;
    const animatedValue = useCountUp(numericValue ?? 0);
    const displayValue = numericValue !== null ? animatedValue : value;

    return (
        <Card
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
            className={`group flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300 animate-slide-in-up relative overflow-hidden`}
            style={{ animationDelay: `${index * 55}ms` }}
            aria-label={`${title} : ${value}.`}
        >
            <div className="flex justify-between items-start mb-4 relative z-10">
                <span className={`text-[11px] font-bold ${textColor} uppercase tracking-wider`}>
                    {title}
                </span>
                <div className={`p-1.5 rounded-lg ${iconBgColor} ${textColor} transition-colors duration-200`}>
                    <Icon className="w-4.5 h-4.5" />
                </div>
            </div>
            
            <div className="relative z-10">
                <h3 className={`truncate text-3xl sm:text-4xl font-extrabold tracking-tight ${valueColor} leading-none`}>
                    {displayValue}
                    {isPercent && typeof value === 'number' && '%'}
                </h3>
                {subtext && (
                    <span className="mt-2.5 block truncate text-[11px] font-bold text-slate-400">
                        {subtext}
                    </span>
                )}
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

        /*
         * Séances d'AUJOURD'HUI — harmonie des timings : « aujourd'hui » est la
         * date au Maroc (pas celle de l'appareil), et un jour férié, de vacances
         * ou d'absence justifiée n'attend AUCUNE séance (même règle que le
         * moteur de retard et les rappels de fin de séance).
         */
        const calendar = withAbsences(getBundledCalendar(), config.absences);
        const todayISO = todayInMorocco(new Date(), calendar);
        const isOffDay = isHoliday(todayISO, calendar) || isVacation(todayISO, calendar);
        const [ty, tm, td] = todayISO.split('-').map(Number);
        const moroccoWeekday = new Date(Date.UTC(ty, tm - 1, td)).getUTCDay();
        const todayBlocks = isOffDay ? [] : getDaySessionBlocks(config.timetable, moroccoWeekday)
            .filter(block => classes.some(c => c.id === block.classId))
            .sort((a, b) => a.startMin - b.startMin)
            .map(block => ({
                ...block,
                className: classes.find(c => c.id === block.classId)?.name ?? '',
            }));

        /*
         * Séance PROCHE-PROCHAINE (toutes classes confondues) — la carte de
         * tête : d'abord la réalité du jour (séance en cours ou suivante,
         * d'après l'heure), sinon la plus imminente des « prochaines séances »
         * par classe (mêmes règles que les cartes : fériés/vacances/absences).
         */
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        let nextUp: { className: string; info: NextSessionInfo } | null = null;
        const activeBlock = todayBlocks.find(b => nowMin >= b.startMin && nowMin < b.endMin);
        const upcomingBlock = todayBlocks.find(b => b.startMin > nowMin);
        if (activeBlock) {
            nextUp = { className: activeBlock.className, info: { kind: 'now', label: `en cours · fin ${formatHourLabel(activeBlock.endMin)}` } };
        } else if (upcomingBlock) {
            nextUp = { className: upcomingBlock.className, info: { kind: 'today', label: `aujourd'hui · ${formatHourLabel(upcomingBlock.startMin)}` } };
        } else {
            const kindPriority: Record<NextSessionInfo['kind'], number> = {
                now: 0, today: 1, tomorrow: 2, weekday: 3, date: 4, 'season-end': 5,
            };
            for (const classInfo of classes) {
                const info = nextSessionInfoForClass(
                    classInfo.id,
                    config.timetable,
                    config.schedules?.find(s => s.classId === classInfo.id)?.slots.map(s => s.weekday) ?? [],
                    calendar,
                    now,
                );
                if (!info) continue;
                if (!nextUp || kindPriority[info.kind] < kindPriority[nextUp.info.kind]) {
                    nextUp = { className: classInfo.name, info };
                }
            }
        }

        return {
            isOffDay,
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
            nextUp,
        };
    }, [classes, config.timetable, config.schedules, config.absences]);

    if (classes.length === 0) return null;

    const enginePaused = lateness === null;
    const gapTotal = lateness?.perClass.reduce((sum, c) => sum + c.gapSessions, 0) ?? 0;
    const upToDate = !enginePaused && gapTotal === 0;
    const lateClasses = (lateness?.perClass ?? [])
        .filter(c => c.gapSessions > 0)
        .sort((a, b) => b.gapSessions - a.gapSessions);

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {/* Carte de TÊTE — toujours en premier, style volontairement
                    DISTINCT (fond plein sombre) : la séance en cours ou la plus
                    proche, toutes classes confondues. */}
                <Card
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpenSheet('today')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenSheet('today'); } }}
                    className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-slate-900 bg-slate-900 p-5 text-white shadow-sm transition-all duration-200 hover:bg-slate-800 hover:shadow-md animate-slide-in-up"
                    aria-label={`Prochaine séance : ${stats.nextUp ? `${stats.nextUp.className}, ${stats.nextUp.info.label}` : 'aucune'}.`}
                >
                    <div className="absolute top-0 right-0 h-20 w-20 rounded-bl-full bg-white/5 transition-transform group-hover:scale-110" />
                    <div className="relative z-10 mb-4 flex items-start justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            {stats.nextUp?.info.kind === 'now' ? 'Séance en cours' : 'Prochaine séance'}
                        </span>
                        <div className="rounded-lg bg-white/10 p-1.5 text-white transition-colors duration-200">
                            {stats.nextUp?.info.kind === 'now'
                                ? (
                                    <span className="relative flex h-5 w-5 items-center justify-center">
                                        <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-amber-400 opacity-75" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                                    </span>
                                )
                                : <Bell className="h-4.5 w-4.5" />}
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="truncate text-xl sm:text-2xl font-extrabold leading-tight tracking-tight">
                            {stats.nextUp
                                ? stats.nextUp.info.kind === 'season-end' ? 'Année terminée' : stats.nextUp.className
                                : 'Aucune séance'}
                        </h3>
                        <span className="mt-2 block truncate text-[11px] font-bold text-slate-300">
                            {stats.nextUp
                                ? stats.nextUp.info.kind === 'season-end' ? 'Rendez-vous à la rentrée 🌱' : stats.nextUp.info.label
                                : (config.timetable?.length ?? 0) === 0
                                    ? 'Renseignez votre emploi du temps'
                                    : 'Rien de planifié'}
                        </span>
                    </div>
                </Card>
                <StatCard
                    title="Progression"
                    value={stats.completion}
                    subtext={`${stats.planned}/${stats.total} contenus datés`}
                    icon={TrendingUp}
                    isPercent
                    index={1}
                    shapeBgColor="bg-blue-500"
                    iconBgColor="bg-blue-50"
                    textColor="text-blue-600"
                    valueColor="text-slate-900"
                    onOpen={() => setOpenSheet('program')}
                />
                <StatCard
                    title="Séances"
                    value={stats.sessionsCount}
                    subtext={stats.lastDate ? `Dernière : ${formatDateCompact(stats.lastDate)} (${stats.lastDateClass})` : 'Séances enregistrées'}
                    icon={CalendarCheck}
                    index={2}
                    shapeBgColor="bg-primary/20"
                    iconBgColor="bg-primary/10"
                    textColor="text-primary"
                    valueColor="text-slate-900"
                    onOpen={() => setOpenSheet('pending')}
                />
                <StatCard
                    title="Chapitres"
                    value={stats.totalChapters}
                    subtext={`${stats.inProgressChapters} actifs`}
                    icon={Book}
                    index={3}
                    shapeBgColor="bg-amber-500"
                    iconBgColor="bg-amber-50"
                    textColor="text-amber-600"
                    valueColor="text-slate-900"
                    onOpen={() => setOpenSheet('program')}
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
                                        <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-primary to-success/80 transition-[width] duration-700 ease-out"
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
                                        : stats.isOffDay
                                            ? 'Vacances, jour férié ou absence justifiée — aucune séance attendue aujourd\'hui.'
                                            : 'Aucune séance prévue ce jour.'}
                                </SheetDescription>
                            </SheetHeader>
                            {stats.todayBlocks.length > 0 ? (
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
                            ) : (
                                <div className="mt-5 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border p-6 text-center bg-muted/20">
                                    <span className="text-2xl">🍃</span>
                                    <p className="text-sm font-bold text-foreground">Aucun cours aujourd'hui !</p>
                                    <p className="text-xs text-muted-foreground/80 font-medium">Profitez de ce moment calme pour vous ressourcer.</p>
                                </div>
                            )}
                        </>
                    )}
                    <div className="mt-5 flex justify-end">
                        <Button type="button" variant="secondary" className="h-11 w-full rounded-xl sm:w-auto" onClick={() => setOpenSheet(null)}>
                            Fermer
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
};
