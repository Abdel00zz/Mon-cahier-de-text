import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppConfig, ClassInfo, LessonsData } from '../types';
import { computeProgressionStats } from '../utils/progression';
import { getDaySessionBlocks } from '../utils/timetable';
import { getBundledCalendar, isHoliday, isVacation, todayInMorocco } from '../utils/calendar';
import { migrateLessonsData } from '../utils/dataUtils';
import { useLateness } from '../hooks/useLateness';
import { TrendingUp, CircleCheck, TriangleAlert, CalendarDays } from './ui/icons';

interface ClassLatenessLike {
    className: string;
    gapSessions: number;
}

/**
 * Bandeau statistique du tableau de bord — trois réponses directes, dans
 * l'ordre où le professeur se les pose (esprit tableau de bord de direction) :
 *   1. « Suis-je à jour ? »      → séances en attente (moteur de retard)
 *   2. « Où en suis-je ? »       → complétion pondérée du programme
 *   3. « Qu'est-ce qui m'attend ? » → séances d'aujourd'hui (grille fusionnée)
 * Mêmes modules purs que la bannière d'alerte, l'admin et le cron.
 */

const GOLD = '#B8935A';

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

interface StatCardProps {
    icon: React.ComponentType<{ className?: string }>;
    /** couleur d'accent de l'icône (état) */
    tone: string;
    value: number;
    suffix?: string;
    label: string;
    detail: string;
}

/** Carte compacte : une ligne, icône + valeur + libellé, ~56 px de haut. */
const StatCard: React.FC<StatCardProps> = ({ icon: Icon, tone, value, suffix, label, detail }) => {
    const animated = useCountUp(value);
    return (
        <div className="flex items-center gap-2.5 rounded-xl border border-[#E4D3AC]/70 bg-[#FFFDF7]/95 px-2.5 py-2 shadow-sm sm:gap-3 sm:px-3.5">
            <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${tone}1A`, color: tone }}
            >
                <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
                <div className="flex items-baseline gap-1 leading-none">
                    <span className="text-lg font-black tabular-nums text-[#2B241D] font-display">{animated}</span>
                    {suffix && <span className="text-[11px] font-bold text-[#69604F]">{suffix}</span>}
                    <span className="ml-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-[#A79C87] font-mono">
                        {label}
                    </span>
                </div>
                <div className="mt-0.5 truncate text-[10px] font-semibold text-[#69604F]/80 font-sans">{detail}</div>
            </div>
        </div>
    );
};

interface DashboardStatsProps {
    classes: ClassInfo[];
    config: AppConfig;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ classes, config }) => {
    // même moteur que LatenessBanner : sévérité, séances en attente par classe
    const lateness = useLateness(classes, config);

    const stats = useMemo(() => {
        let planned = 0;
        let total = 0;
        for (const classInfo of classes) {
            const s = computeProgressionStats(readLessons(classInfo.id));
            planned += s.plannedCount;
            total += s.totalItems;
        }
        const completion = total === 0 ? 0 : Math.round((planned / total) * 100);

        // séances d'AUJOURD'HUI d'après la grille (blocs fusionnés : 2 h = 1 séance)
        const todayBlocks = getDaySessionBlocks(config.timetable, new Date().getDay()).filter(block =>
            classes.some(c => c.id === block.classId)
        );
        const nameOf = (id: string) => classes.find(c => c.id === id)?.name ?? '';
        const todayNames = Array.from(new Set(todayBlocks.map(b => nameOf(b.classId)))).filter(Boolean);

        return { completion, planned, total, todayCount: todayBlocks.length, todayNames };
    }, [classes, config.timetable]);

    if (classes.length === 0) return null;

    /*
     * « Suis-je à jour ? » — trois états distincts :
     *   lateness === null  → moteur en pause (vacances, férié, absence, pas
     *                        d'emploi du temps) : ne JAMAIS afficher « à jour » ;
     *   gapTotal === 0     → réellement à jour ;
     *   sinon              → séances en attente + classe la plus en retard.
     */
    const enginePaused = lateness === null;
    const gapTotal = lateness?.perClass.reduce((sum, c) => sum + c.gapSessions, 0) ?? 0;
    const worst = lateness?.perClass.reduce<ClassLatenessLike | null>(
        (acc, c) => (c.gapSessions > (acc?.gapSessions ?? 0) ? c : acc),
        null
    );
    const upToDate = !enginePaused && gapTotal === 0;

    return (
        <div className="mx-auto mb-4 grid max-w-5xl grid-cols-1 gap-2 px-3 sm:grid-cols-3 sm:px-4">
            <StatCard
                icon={upToDate ? CircleCheck : enginePaused ? CalendarDays : TriangleAlert}
                tone={upToDate ? '#2E7D32' : enginePaused ? '#A79C87' : '#D97706'}
                value={gapTotal}
                label={enginePaused ? 'en pause' : upToDate ? 'à jour' : 'en attente'}
                detail={
                    enginePaused
                        ? 'vacances / hors emploi du temps — alertes suspendues'
                        : upToDate
                            ? 'toutes les séances sont saisies'
                            : `surtout ${worst?.className ?? ''} (${worst?.gapSessions ?? 0} séance(s))`
                }
            />
            <StatCard
                icon={TrendingUp}
                tone={GOLD}
                value={stats.completion}
                suffix="%"
                label="programme"
                detail={`${stats.planned}/${stats.total} contenus datés`}
            />
            <StatCard
                icon={CalendarDays}
                tone="#1565C0"
                value={stats.todayCount}
                label="aujourd'hui"
                detail={
                    stats.todayCount > 0
                        ? stats.todayNames.slice(0, 3).join(', ')
                        : 'aucune séance prévue ce jour'
                }
            />
        </div>
    );
};
