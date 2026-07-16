import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AppConfig, ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { useUpcomingAssessments } from '@/hooks/useAssessments';
import { getBundledCalendar, todayInMorocco } from '@/utils/calendar';
import { formatHourLabel, getDaySessionBlocks } from '@/utils/timetable';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from '@/components/ui/icons';

export interface TodaySnapshot {
    mood: string;
    classCount: number;
    avgCompletion: number;
    totalSessions: number;
}

interface TodayBriefingProps {
    classes: ClassInfo[];
    config: AppConfig;
    snapshot: TodaySnapshot;
    lastModifiedDates: Record<string, string | null>;
    lateClassCount: number;
    attentionCount?: number;
    onSelectClass: (classInfo: ClassInfo) => void;
    onOpenSettings: () => void;
    onOpenNotifications: () => void;
}

interface ActionContext {
    missingScheduleCount: number;
    focusClass: ClassInfo | null;
    focusLabel: string;
    focusValue: string;
    focusDetail: string;
}

interface TaskItem {
    id: string;
    label: string;
    title: string;
    detail: string;
    actionLabel: string;
    onAction?: () => void;
}

const minutesInTimeZone = (date: Date, timeZone: string): number => {
    try {
        const parts = new Intl.DateTimeFormat('fr-FR', {
            timeZone,
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        }).formatToParts(date);
        const hour = Number(parts.find(part => part.type === 'hour')?.value ?? date.getHours());
        const minute = Number(parts.find(part => part.type === 'minute')?.value ?? date.getMinutes());
        return hour * 60 + minute;
    } catch {
        return date.getHours() * 60 + date.getMinutes();
    }
};

const dateFromISO = (iso: string): Date => {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
};

const formatShortDate = (iso: string): string => {
    try {
        return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(dateFromISO(iso));
    } catch {
        return iso;
    }
};

export const TodayBriefing: React.FC<TodayBriefingProps> = ({
    classes,
    config,
    snapshot,
    lastModifiedDates,
    lateClassCount,
    attentionCount,
    onSelectClass,
    onOpenSettings,
    onOpenNotifications,
}) => {
    const [now, setNow] = useState(() => new Date());
    const [activeTaskIndex, setActiveTaskIndex] = useState(0);
    const [direction, setDirection] = useState<1 | -1>(1);
    const reduceMotion = useReducedMotion();
    const assessments = useUpcomingAssessments(classes, config, 21);
    const priorityCount = attentionCount ?? lateClassCount;

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 60_000);
        return () => window.clearInterval(timer);
    }, []);

    const openPlanning = () => {
        try { sessionStorage.setItem('config_initial_tab_v1', 'emploi'); } catch { /* navigation possible sans stockage */ }
        onOpenSettings();
    };

    const context = useMemo<ActionContext>(() => {
        const calendar = getBundledCalendar();
        const today = todayInMorocco(now, calendar);
        const weekday = dateFromISO(today).getUTCDay();
        const currentMinutes = minutesInTimeZone(now, calendar.fuseau);
        const isPaused = calendar.vacances.some(period => today >= period.debut && today <= period.fin)
            || calendar.joursFeries.some(day => day.date === today)
            || Boolean(config.absences?.some(period => today >= period.debut && today <= period.fin));
        const blocks = isPaused ? [] : getDaySessionBlocks(config.timetable, weekday);
        const currentBlock = blocks.find(block => currentMinutes >= block.startMin && currentMinutes < block.endMin);
        const nextBlock = blocks.find(block => block.startMin > currentMinutes);
        const classById = new Map(classes.map(classInfo => [classInfo.id, classInfo]));
        const currentClass = currentBlock ? classById.get(currentBlock.classId) ?? null : null;
        const nextClass = nextBlock ? classById.get(nextBlock.classId) ?? null : null;

        const scheduledIds = new Set((config.timetable ?? []).map(entry => entry.classId));
        const missingScheduleCount = classes.filter(classInfo => !scheduledIds.has(classInfo.id)).length;
        const urgentAssessment = [...assessments].sort((a, b) => a.inDays - b.inDays)[0];
        const assessmentClass = urgentAssessment ? classById.get(urgentAssessment.classId) ?? null : null;
        const oldestNotebook = [...classes].sort((a, b) => {
            const aDate = lastModifiedDates[a.id];
            const bDate = lastModifiedDates[b.id];
            if (!aDate && bDate) return -1;
            if (aDate && !bDate) return 1;
            return (aDate ?? '').localeCompare(bDate ?? '');
        })[0] ?? null;

        if (currentClass && currentBlock) {
            return {
                missingScheduleCount,
                focusClass: currentClass,
                focusLabel: 'Séance en cours',
                focusValue: formatClassDisplayName(currentClass.name),
                focusDetail: `Jusqu’à ${formatHourLabel(currentBlock.endMin)}`,
            };
        }

        if (nextClass && nextBlock) {
            return {
                missingScheduleCount,
                focusClass: nextClass,
                focusLabel: 'Prochaine séance',
                focusValue: formatClassDisplayName(nextClass.name),
                focusDetail: `Aujourd’hui à ${formatHourLabel(nextBlock.startMin)}`,
            };
        }

        if (urgentAssessment && assessmentClass && urgentAssessment.inDays <= 7) {
            return {
                missingScheduleCount,
                focusClass: assessmentClass,
                focusLabel: 'Évaluation proche',
                focusValue: formatClassDisplayName(assessmentClass.name),
                focusDetail: urgentAssessment.inDays <= 0 ? "Aujourd’hui" : `Dans ${urgentAssessment.inDays} jour${urgentAssessment.inDays > 1 ? 's' : ''}`,
            };
        }

        const focusClass = oldestNotebook ?? assessmentClass;
        const latest = focusClass ? lastModifiedDates[focusClass.id] : null;
        return {
            missingScheduleCount,
            focusClass,
            focusLabel: 'Cahier à reprendre',
            focusValue: focusClass ? formatClassDisplayName(focusClass.name) : 'Aucune classe',
            focusDetail: latest ? `Dernière saisie : ${formatShortDate(latest)}` : 'Commencer la première séance',
        };
    }, [assessments, classes, config.absences, config.timetable, lastModifiedDates, now]);

    const focusClass = context.focusClass;
    const tasks: TaskItem[] = [
        {
            id: 'priorities',
            label: 'Priorités des cahiers',
            title: priorityCount > 0
                ? `${priorityCount} point${priorityCount > 1 ? 's' : ''} à traiter`
                : 'Aucune priorité urgente',
            detail: priorityCount > 0
                ? 'Dates, retards et échéances regroupés au même endroit.'
                : 'Les prochaines échéances restent accessibles.',
            actionLabel: priorityCount > 0 ? 'Traiter' : 'Consulter',
            onAction: onOpenNotifications,
        },
        {
            id: 'planning',
            label: 'Emploi du temps',
            title: context.missingScheduleCount > 0
                ? `${context.missingScheduleCount} classe${context.missingScheduleCount > 1 ? 's' : ''} à planifier`
                : 'Tous les créneaux sont renseignés',
            detail: context.missingScheduleCount > 0
                ? 'Ajoutez les créneaux manquants pour fiabiliser le suivi.'
                : 'Le volume horaire et les prochaines séances sont prêts.',
            actionLabel: context.missingScheduleCount > 0 ? 'Planifier' : 'Vérifier',
            onAction: openPlanning,
        },
        {
            id: 'focus',
            label: context.focusLabel,
            title: `${context.focusLabel} : ${context.focusValue}`,
            detail: context.focusDetail,
            actionLabel: 'Ouvrir',
            onAction: focusClass ? () => onSelectClass(focusClass) : undefined,
        },
    ];

    const currentTask = tasks[activeTaskIndex] ?? tasks[0];
    const navigateTasks = (step: 1 | -1) => {
        setDirection(step);
        setActiveTaskIndex(index => (index + step + tasks.length) % tasks.length);
    };

    return (
        <section className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]" aria-label="Outils du professeur">
            <div className="overflow-hidden rounded-xl border border-[#ffe58f] bg-[#fffbe6] shadow-sm">
                <div className="flex min-h-[68px] items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4">
                    <div className="min-w-0 flex-1 overflow-hidden">
                        <AnimatePresence mode="wait" initial={false} custom={direction}>
                            <motion.div
                                key={currentTask.id}
                                custom={direction}
                                initial={reduceMotion ? false : { opacity: 0, x: direction * 18 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={reduceMotion ? undefined : { opacity: 0, x: direction * -14 }}
                                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                                className="flex min-w-0 items-center gap-2.5"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-extrabold text-[#613400]" title={currentTask.title}>{currentTask.title}</p>
                                </div>
                                {currentTask.onAction && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={currentTask.onAction}
                                        className="h-8 shrink-0 rounded-lg border-[#0056D2] bg-[#0056D2] px-3 text-[10px] font-bold shadow-none hover:bg-[#0048b5]"
                                    >
                                        {currentTask.actionLabel}
                                    </Button>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5 border-l border-[#ffe58f] pl-2 sm:pl-3" aria-label="Naviguer entre les tâches">
                        <button
                            type="button"
                            onClick={() => navigateTasks(-1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#ad8b3a] transition-colors hover:bg-[#fff1b8] hover:text-[#874d00]"
                            aria-label="Tâche précédente"
                        >
                            <ArrowLeft className="h-3 w-3" />
                        </button>
                        <span className="min-w-7 text-center text-[8px] font-black tabular-nums text-[#ad8b3a]">{activeTaskIndex + 1}/{tasks.length}</span>
                        <button
                            type="button"
                            onClick={() => navigateTasks(1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#ad8b3a] transition-colors hover:bg-[#fff1b8] hover:text-[#874d00]"
                            aria-label="Tâche suivante"
                        >
                            <ArrowRight className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                <EssentialStat value={`${snapshot.avgCompletion}%`} label="Progression" />
                <EssentialStat value={snapshot.totalSessions} label="Séances" />
                <EssentialStat value={snapshot.classCount} label="Classes" />
            </div>
        </section>
    );
};

const EssentialStat: React.FC<{ value: string | number; label: string }> = ({ value, label }) => (
    <span className="flex min-w-0 flex-col items-center justify-center px-2 py-2.5 text-center">
        <span className="block text-lg font-black tabular-nums leading-none text-slate-950">{value}</span>
        <span className="mt-1.5 block truncate text-[7px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</span>
    </span>
);
