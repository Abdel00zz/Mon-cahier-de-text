import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppConfig, ClassInfo, LessonsData } from '../types';
import { computeProgressionStats } from '../utils/progression';
import { getDaySessionBlocks } from '../utils/timetable';
import { migrateLessonsData } from '../utils/dataUtils';
import { useLateness } from '../hooks/useLateness';
import { TrendingUp, CircleCheck, TriangleAlert, CalendarDays, Clock } from './ui/icons';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from './ui/sheet';

/**
 * Bandeau statistique du tableau de bord — esprit app mobile : trois cartes
 * MINIMALES (icône + valeur + libellé), les réponses détaillées s'ouvrent au
 * tap dans une bottom-sheet. Les trois questions, dans l'ordre où le
 * professeur se les pose :
 *   1. « Suis-je à jour ? »        → séances en attente (moteur de retard)
 *   2. « Où en suis-je ? »         → complétion pondérée du programme
 *   3. « Qu'est-ce qui m'attend ? » → séances d'aujourd'hui (grille fusionnée)
 * Mêmes modules purs que la bannière d'alerte, l'admin et le cron.
 */

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

type StatKey = 'pending' | 'program' | 'today';

interface StatCardProps {
    icon: React.ComponentType<{ className?: string }>;
    toneClass: string;
    bgClass: string;
    value: number;
    suffix?: string;
    label: string;
    /** rang d'apparition pour l'entrée en cascade */
    index: number;
    onOpen: () => void;
}

/** Carte ultra-compacte : icône + valeur + libellé sur une ligne. Détail au tap. */
const StatCard: React.FC<StatCardProps> = ({ icon: Icon, toneClass, bgClass, value, suffix, label, index, onOpen }) => {
    const animated = useCountUp(value);

    return (
        <Card
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
            className="group cursor-pointer select-none overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-border hover:shadow-md active:scale-[0.95] animate-slide-in-up opacity-0"
            style={{ animationDelay: `${index * 60}ms` }}
            aria-label={`${label} : voir le détail`}
        >
            <CardContent className="flex items-center gap-2 px-2.5 py-2 sm:gap-2.5 sm:px-3 sm:py-2.5">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${bgClass} ${toneClass} transition-transform duration-300 group-hover:scale-110 group-active:scale-90 sm:h-8 sm:w-8`}>
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <span className="min-w-0 flex flex-col leading-none">
                    <span className="flex items-baseline gap-0.5">
                        <span className="text-lg font-black tabular-nums text-foreground font-display tracking-tight sm:text-xl">{animated}</span>
                        {suffix && <span className="text-[10px] font-black text-muted-foreground">{suffix}</span>}
                    </span>
                    <span className="truncate text-[8.5px] font-extrabold uppercase tracking-normal text-muted-foreground/80 font-mono mt-0.5">
                        {label}
                    </span>
                </span>
            </CardContent>
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
    // même moteur que LatenessBanner : sévérité, séances en attente par classe
    const lateness = useLateness(classes, config);
    const [openSheet, setOpenSheet] = useState<StatKey | null>(null);

    const stats = useMemo(() => {
        const perClassProgress = classes.map(classInfo => {
            const s = computeProgressionStats(readLessons(classInfo.id));
            return {
                id: classInfo.id,
                name: classInfo.name,
                color: classInfo.color || 'hsl(var(--primary))',
                planned: s.plannedCount,
                total: s.totalItems,
                completion: s.totalItems === 0 ? 0 : Math.round((s.plannedCount / s.totalItems) * 100),
            };
        });
        const planned = perClassProgress.reduce((sum, p) => sum + p.planned, 0);
        const total = perClassProgress.reduce((sum, p) => sum + p.total, 0);
        const completion = total === 0 ? 0 : Math.round((planned / total) * 100);

        // séances d'AUJOURD'HUI d'après la grille (blocs fusionnés : 2 h = 1 séance)
        const todayBlocks = getDaySessionBlocks(config.timetable, new Date().getDay())
            .filter(block => classes.some(c => c.id === block.classId))
            .sort((a, b) => a.startMin - b.startMin)
            .map(block => ({
                ...block,
                className: classes.find(c => c.id === block.classId)?.name ?? '',
            }));

        return { completion, planned, total, perClassProgress, todayBlocks };
    }, [classes, config.timetable]);

    if (classes.length === 0) return null;

    /*
     * « Suis-je à jour ? » — trois états distincts :
     *   lateness === null  → moteur en pause (vacances, férié, absence, pas
     *                        d'emploi du temps) : ne JAMAIS afficher « à jour » ;
     *   gapTotal === 0     → réellement à jour ;
     *   sinon              → séances en attente, détail par classe dans la sheet.
     */
    const enginePaused = lateness === null;
    const gapTotal = lateness?.perClass.reduce((sum, c) => sum + c.gapSessions, 0) ?? 0;
    const upToDate = !enginePaused && gapTotal === 0;
    const lateClasses = (lateness?.perClass ?? [])
        .filter(c => c.gapSessions > 0)
        .sort((a, b) => b.gapSessions - a.gapSessions);

    return (
        <>
            <div className="mx-auto mb-5 grid max-w-5xl grid-cols-3 gap-1.5 px-3 sm:gap-2.5 sm:px-4">
                <StatCard
                    icon={upToDate ? CircleCheck : enginePaused ? CalendarDays : TriangleAlert}
                    toneClass={upToDate ? 'text-success' : enginePaused ? 'text-muted-foreground' : 'text-warning'}
                    bgClass={upToDate ? 'bg-success/15' : enginePaused ? 'bg-secondary' : 'bg-warning/15'}
                    value={gapTotal}
                    label={enginePaused ? 'pause' : upToDate ? 'à jour' : 'attente'}
                    index={0}
                    onOpen={() => setOpenSheet('pending')}
                />
                <StatCard
                    icon={TrendingUp}
                    toneClass="text-primary"
                    bgClass="bg-primary/10"
                    value={stats.completion}
                    suffix="%"
                    label="programme"
                    index={1}
                    onOpen={() => setOpenSheet('program')}
                />
                <StatCard
                    icon={CalendarDays}
                    toneClass="text-primary"
                    bgClass="bg-primary/10"
                    value={stats.todayBlocks.length}
                    label="ce jour"
                    index={2}
                    onOpen={() => setOpenSheet('today')}
                />
            </div>

            {/* Détails en bottom-sheet — pattern app mobile : info minimale en
                surface, précision complète à la demande. */}
            <Sheet open={openSheet !== null} onOpenChange={(open) => { if (!open) setOpenSheet(null); }}>
                <SheetContent
                    side="bottom"
                    className="max-h-[80dvh] overflow-y-auto rounded-t-[28px] border-t px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] pt-3 sm:mx-auto sm:max-w-lg sm:rounded-t-[28px]"
                >
                    {/* Poignée de préhension */}
                    <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted-foreground/20" aria-hidden />

                    {openSheet === 'pending' && (
                        <>
                            <SheetHeader className="text-left">
                                <SheetTitle className="font-display text-lg font-extrabold">
                                    {enginePaused ? 'Alertes en pause' : upToDate ? 'Tout est à jour' : 'Séances en attente'}
                                </SheetTitle>
                                <SheetDescription className="text-xs font-semibold">
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
                                            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${severityDotClass[c.severity] ?? 'bg-amber-500'}`} />
                                            <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">{c.className}</span>
                                            <Badge variant="secondary" className="shrink-0 text-[11px] font-extrabold">
                                                {c.gapSessions} séance{c.gapSessions > 1 ? 's' : ''}
                                            </Badge>
                                        </div>
                                    ))}
                                    {lateClasses.length < (lateness?.perClass.length ?? 0) && (
                                        <p className="pt-1 text-center text-[11px] font-semibold text-muted-foreground">
                                            Les autres classes sont à jour <CircleCheck className="inline h-3.5 w-3.5 text-emerald-600" />
                                        </p>
                                    )}
                                </div>
                            )}
                            {upToDate && (
                                <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-success/25 bg-success/10 p-5 text-center">
                                    <CircleCheck className="h-8 w-8 text-emerald-600" />
                                    <p className="text-sm font-bold text-foreground">Bravo, votre cahier est à jour 🎉</p>
                                </div>
                            )}
                        </>
                    )}

                    {openSheet === 'program' && (
                        <>
                            <SheetHeader className="text-left">
                                <SheetTitle className="font-display text-lg font-extrabold">Avancement du programme</SheetTitle>
                                <SheetDescription className="text-xs font-semibold">
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
                                                className="h-full rounded-full transition-[width] duration-700 ease-out"
                                                style={{ width: `${p.completion}%`, backgroundColor: p.color }}
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
                                <SheetDescription className="text-xs font-semibold">
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
