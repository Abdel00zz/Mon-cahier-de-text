import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AppConfig, ClassInfo } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { useUpcomingAssessments } from '@/hooks/useAssessments';
import { useUpcomingOfficialStudentEvents } from '@/hooks/useOfficialStudentEvents';
import {
    getBundledCalendar,
    getSchoolYearFor,
    HolidayCalendar,
    loadHolidayCalendar,
    todayInMorocco,
} from '@/utils/calendar';
import { addDaysISO, daysBetweenISO } from '@/utils/assessments';
import { formatHourLabel, getDaySessionBlocks } from '@/utils/timetable';

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
}

type BriefingTone = 'blue' | 'emerald' | 'amber' | 'violet' | 'slate';
type BriefingIcon =
    | 'calendar'
    | 'clock'
    | 'official'
    | 'assessment'
    | 'progress'
    | 'notebook'
    | 'school'
    | 'sun'
    | 'check'
    | 'alert';

interface BriefingItem {
    id: string;
    eyebrow: string;
    title: string;
    detail: string;
    icon: BriefingIcon;
    tone: BriefingTone;
    priority: number;
}

const dateFromISO = (iso: string): Date => {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12));
};

const formatDate = (iso: string, options: Intl.DateTimeFormatOptions): string => {
    try {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
        return new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...options }).format(dateFromISO(iso));
    } catch {
        return iso;
    }
};

const formatDelay = (days: number): string => {
    if (days <= 0) return "aujourd'hui";
    if (days === 1) return 'demain';
    return `dans ${days} jours`;
};

const getMoroccoClock = (now: Date, timeZone: string): { minutes: number; label: string } => {
    try {
        const parts = new Intl.DateTimeFormat('fr-FR', {
            timeZone,
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        }).formatToParts(now);
        const hour = Number(parts.find(part => part.type === 'hour')?.value ?? now.getHours());
        const minute = Number(parts.find(part => part.type === 'minute')?.value ?? now.getMinutes());
        return { minutes: hour * 60 + minute, label: formatHourLabel(hour * 60 + minute) };
    } catch {
        const minutes = now.getHours() * 60 + now.getMinutes();
        return { minutes, label: formatHourLabel(minutes) };
    }
};

const classList = (names: string[], max = 3): string => {
    const unique = [...new Set(names.map(formatClassDisplayName))];
    const visible = unique.slice(0, max).join(', ');
    return unique.length > max ? `${visible} +${unique.length - max}` : visible;
};

/**
 * Briefing contextuel unique : calendrier, emploi du temps, évaluations,
 * bulletin officiel et état réel des cahiers sont hiérarchisés dans le même
 * circuit. La carte principale tourne lentement ; le détail reste à la demande.
 */
export const TodayBriefing: React.FC<TodayBriefingProps> = ({
    classes,
    config,
    snapshot,
    lastModifiedDates,
    lateClassCount,
}) => {
    const [now, setNow] = useState(() => new Date());
    const [calendar, setCalendar] = useState<HolidayCalendar>(() => getBundledCalendar());
    const [activeIndex, setActiveIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const reduceMotion = useReducedMotion();
    const assessments = useUpcomingAssessments(classes, config, 21);
    const officialEvents = useUpcomingOfficialStudentEvents(classes, 90);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(new Date()), 30_000);
        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        let active = true;
        loadHolidayCalendar().then(value => { if (active) setCalendar(value); });
        return () => { active = false; };
    }, []);

    const briefing = useMemo(() => {
        const today = todayInMorocco(now, calendar);
        const todayDate = dateFromISO(today);
        const weekday = todayDate.getUTCDay();
        const weekdayName = formatDate(today, { weekday: 'long' });
        const clock = getMoroccoClock(now, calendar.fuseau);
        const vacation = calendar.vacances.find(item => today >= item.debut && today <= item.fin);
        const holiday = calendar.joursFeries.find(item => item.date === today);
        const absence = config.absences?.find(item => today >= item.debut && today <= item.fin);
        const schoolYear = getSchoolYearFor(calendar, today);
        const weekStart = addDaysISO(today, weekday === 0 ? -6 : 1 - weekday);
        const weekEnd = addDaysISO(weekStart, 6);
        const items: BriefingItem[] = [];
        const add = (item: BriefingItem) => items.push(item);

        if (vacation) {
            const daysBeforeResume = Math.max(0, daysBetweenISO(today, addDaysISO(vacation.fin, 1)));
            const resume = vacation.fin < schoolYear.debut ? schoolYear.debut : addDaysISO(vacation.fin, 1);
            const resumeDelay = Math.max(0, daysBetweenISO(today, resume));
            add({
                id: `vacation-${vacation.debut}`,
                eyebrow: 'Calendrier scolaire · en direct',
                title: `${vacation.nom} en cours`,
                detail: `Aucune séance attendue · reprise ${formatDate(resume, { weekday: 'long', day: 'numeric', month: 'long' })} (${resumeDelay || daysBeforeResume} j)`,
                icon: 'sun',
                tone: 'blue',
                priority: 100,
            });
        } else if (holiday) {
            add({
                id: `holiday-${holiday.date}`,
                eyebrow: 'Jour férié · calendrier officiel',
                title: holiday.nom,
                detail: 'Les séances et les rappels de retard sont automatiquement suspendus.',
                icon: 'calendar',
                tone: 'blue',
                priority: 100,
            });
        } else if (absence) {
            add({
                id: `absence-${absence.debut}`,
                eyebrow: 'Absence justifiée',
                title: absence.motif || 'Période d’absence enregistrée',
                detail: `Suivi suspendu jusqu’au ${formatDate(absence.fin, { day: 'numeric', month: 'long' })}.`,
                icon: 'calendar',
                tone: 'blue',
                priority: 100,
            });
        }

        const classById = new Map(classes.map(classInfo => [classInfo.id, classInfo]));
        const dayBlocks = vacation || holiday || absence ? [] : getDaySessionBlocks(config.timetable, weekday);
        const currentBlock = dayBlocks.find(block => clock.minutes >= block.startMin && clock.minutes < block.endMin);
        const nextBlock = dayBlocks.find(block => block.startMin > clock.minutes);
        const todayClassNames = dayBlocks
            .map(block => classById.get(block.classId)?.name)
            .filter((name): name is string => Boolean(name));

        if (vacation || holiday || absence) {
            add({
                id: 'today-paused',
                eyebrow: `${weekdayName} · ${clock.label}`,
                title: `Aucune classe attendue aujourd’hui`,
                detail: vacation ? 'L’emploi du temps reste en pause pendant les vacances.' : 'Le moteur respecte automatiquement le calendrier.',
                icon: 'clock',
                tone: 'slate',
                priority: 92,
            });
        } else if (weekday === 0) {
            add({
                id: 'sunday',
                eyebrow: `Aujourd’hui · ${clock.label}`,
                title: 'Dimanche : aucune classe programmée',
                detail: 'Le prochain jour d’enseignement sera calculé depuis votre emploi du temps.',
                icon: 'sun',
                tone: 'blue',
                priority: 96,
            });
        } else if (currentBlock) {
            const classInfo = classById.get(currentBlock.classId);
            add({
                id: `current-${currentBlock.classId}-${currentBlock.startMin}`,
                eyebrow: `Maintenant · jusqu’à ${formatHourLabel(currentBlock.endMin)}`,
                title: classInfo ? `Vous enseignez à ${formatClassDisplayName(classInfo.name)}` : 'Séance en cours',
                detail: `${currentBlock.hours} h prévue${currentBlock.hours > 1 ? 's' : ''}${nextBlock ? ` · puis ${formatClassDisplayName(classById.get(nextBlock.classId)?.name ?? '')} à ${formatHourLabel(nextBlock.startMin)}` : ''}`,
                icon: 'clock',
                tone: 'emerald',
                priority: 99,
            });
        } else if (dayBlocks.length > 0) {
            add({
                id: 'today-classes',
                eyebrow: `${weekdayName} · ${dayBlocks.length} séance${dayBlocks.length > 1 ? 's' : ''}`,
                title: `Aujourd’hui : ${classList(todayClassNames)}`,
                detail: nextBlock
                    ? `Prochaine séance à ${formatHourLabel(nextBlock.startMin)} · fin prévue à ${formatHourLabel(dayBlocks[dayBlocks.length - 1].endMin)}`
                    : 'Toutes les séances prévues aujourd’hui sont terminées.',
                icon: 'clock',
                tone: nextBlock ? 'blue' : 'emerald',
                priority: 95,
            });
        } else {
            add({
                id: 'today-empty',
                eyebrow: `${weekdayName} · ${clock.label}`,
                title: 'Aucune classe prévue aujourd’hui',
                detail: 'Votre emploi du temps ne contient aucun créneau pour cette journée.',
                icon: 'calendar',
                tone: 'slate',
                priority: 90,
            });
        }

        const officialThisWeek = officialEvents.filter(({ event }) => {
            const end = event.end ?? event.start;
            return event.start <= weekEnd && end >= weekStart;
        });
        officialThisWeek.slice(0, 2).forEach(({ event, classNames }) => {
            add({
                id: `official-week-${event.id}`,
                eyebrow: 'Cette semaine · bulletin officiel',
                title: event.title,
                detail: `${event.studentAction} · ${classList(classNames)}`,
                icon: 'official',
                tone: event.category === 'assessment' || event.category === 'exam' ? 'amber' : 'violet',
                priority: event.category === 'exam' ? 94 : 88,
            });
        });

        const assessmentsThisWeek = assessments.filter(item => item.dateISO >= weekStart && item.dateISO <= weekEnd);
        if (assessmentsThisWeek.length > 0) {
            add({
                id: 'assessment-week',
                eyebrow: 'Planning pédagogique · cette semaine',
                title: `${assessmentsThisWeek.length} devoir${assessmentsThisWeek.length > 1 ? 's' : ''} surveillé${assessmentsThisWeek.length > 1 ? 's' : ''} à préparer`,
                detail: classList(assessmentsThisWeek.map(item => item.className), 4),
                icon: 'assessment',
                tone: 'amber',
                priority: 91,
            });
        }

        assessments.slice(0, 3).forEach(item => {
            add({
                id: `assessment-${item.classId}-${item.id}`,
                eyebrow: `Évaluation · ${formatDelay(item.inDays)}`,
                title: `${formatClassDisplayName(item.className)} · ${item.label.split(' — ')[0]}`,
                detail: `Date indicative : ${formatDate(item.dateISO, { weekday: 'long', day: 'numeric', month: 'long' })}`,
                icon: 'assessment',
                tone: item.inDays <= 3 ? 'amber' : 'blue',
                priority: item.inDays <= 3 ? 89 : 70,
            });
        });

        officialEvents
            .filter(({ event }) => !officialThisWeek.some(current => current.event.id === event.id))
            .slice(0, 3)
            .forEach(({ event, classNames, inDays }) => {
                add({
                    id: `official-${event.id}`,
                    eyebrow: `Bulletin officiel · ${formatDelay(inDays)}`,
                    title: event.title,
                    detail: `${formatDate(event.start, { day: 'numeric', month: 'long' })} · ${classList(classNames)}`,
                    icon: 'official',
                    tone: 'violet',
                    priority: inDays <= 14 ? 86 : 64,
                });
            });

        const pedagogicalEvents = Object.entries(config.pedagogicalEvents ?? {})
            .flatMap(([classId, events]) => events.map(event => ({ event, classId })))
            .filter(({ event }) => event.status === 'planned' && daysBetweenISO(today, event.date) >= 0 && daysBetweenISO(today, event.date) <= 21)
            .sort((a, b) => a.event.date.localeCompare(b.event.date));
        pedagogicalEvents.slice(0, 3).forEach(({ event, classId }) => {
            const classInfo = classById.get(classId);
            add({
                id: `pedagogical-${event.id}`,
                eyebrow: `Activité pédagogique · ${formatDelay(daysBetweenISO(today, event.date))}`,
                title: event.title,
                detail: `${classInfo ? formatClassDisplayName(classInfo.name) : 'Classe'} · ${formatDate(event.date, { day: 'numeric', month: 'long' })}`,
                icon: 'school',
                tone: 'violet',
                priority: 68,
            });
        });

        const scheduledIds = new Set((config.timetable ?? []).map(entry => entry.classId));
        const missingSchedule = classes.filter(classInfo => !scheduledIds.has(classInfo.id));
        if (missingSchedule.length > 0) {
            add({
                id: 'missing-schedule',
                eyebrow: 'Emploi du temps · à compléter',
                title: `${missingSchedule.length} classe${missingSchedule.length > 1 ? 's' : ''} sans créneau`,
                detail: classList(missingSchedule.map(classInfo => classInfo.name), 4),
                icon: 'calendar',
                tone: 'amber',
                priority: 76,
            });
        } else if (classes.length > 0) {
            add({
                id: 'schedule-ready',
                eyebrow: 'Emploi du temps',
                title: 'Toutes les classes sont reliées au planning',
                detail: 'Les prochaines séances et les alertes peuvent être calculées automatiquement.',
                icon: 'check',
                tone: 'emerald',
                priority: 52,
            });
        }

        const weeklyBlocks = [1, 2, 3, 4, 5, 6].flatMap(day => getDaySessionBlocks(config.timetable, day));
        const weeklyHours = weeklyBlocks.reduce((sum, block) => sum + block.hours, 0);
        add({
            id: 'weekly-load',
            eyebrow: 'Rythme hebdomadaire',
            title: weeklyBlocks.length > 0
                ? `${weeklyBlocks.length} séance${weeklyBlocks.length > 1 ? 's' : ''} · ${weeklyHours} h planifiées par semaine`
                : 'Volume hebdomadaire à construire',
            detail: weeklyBlocks.length > 0
                ? 'Les créneaux consécutifs sont regroupés en une seule séance pédagogique.'
                : 'Ajoutez l’emploi du temps pour activer le briefing horaire.',
            icon: 'clock',
            tone: weeklyBlocks.length > 0 ? 'blue' : 'slate',
            priority: 51,
        });

        const collegeCount = classes.filter(classInfo => classInfo.cycle === 'college').length;
        const lyceeCount = classes.filter(classInfo => classInfo.cycle === 'lycee').length;
        add({
            id: 'portfolio',
            eyebrow: 'Portefeuille de classes',
            title: `${classes.length} classe${classes.length > 1 ? 's' : ''} suivie${classes.length > 1 ? 's' : ''}`,
            detail: [
                collegeCount ? `${collegeCount} collège` : '',
                lyceeCount ? `${lyceeCount} lycée qualifiant` : '',
            ].filter(Boolean).join(' · ') || 'Niveaux synchronisés avec vos cahiers.',
            icon: 'school',
            tone: 'slate',
            priority: 50,
        });

        if (officialEvents.length > 0) {
            add({
                id: 'official-feed',
                eyebrow: 'Connexion administrative',
                title: `${officialEvents.length} jalon${officialEvents.length > 1 ? 's' : ''} officiel${officialEvents.length > 1 ? 's' : ''} relié${officialEvents.length > 1 ? 's' : ''} à vos classes`,
                detail: 'Le bulletin publié par l’administration est filtré selon le collège et le lycée qualifiant.',
                icon: 'official',
                tone: 'violet',
                priority: 53,
            });
        }

        const nextHoliday = calendar.joursFeries
            .filter(item => item.date > today)
            .sort((a, b) => a.date.localeCompare(b.date))[0];
        if (nextHoliday) {
            add({
                id: `next-holiday-${nextHoliday.date}`,
                eyebrow: 'Prochain repère du calendrier',
                title: nextHoliday.nom,
                detail: `${formatDate(nextHoliday.date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${formatDelay(daysBetweenISO(today, nextHoliday.date))}`,
                icon: 'calendar',
                tone: 'slate',
                priority: 46,
            });
        }

        classes.slice(0, 4).forEach(classInfo => {
            const latest = lastModifiedDates[classInfo.id];
            add({
                id: `notebook-${classInfo.id}`,
                eyebrow: `${formatClassDisplayName(classInfo.name)} · dernier point daté`,
                title: latest
                    ? formatDate(latest, { weekday: 'long', day: 'numeric', month: 'long' })
                    : 'Aucune séance datée pour le moment',
                detail: latest
                    ? `Le cahier contient un repère pédagogique jusqu’au ${formatDate(latest, { day: 'numeric', month: 'long' })}.`
                    : 'Ouvrez le cahier pour poser le premier repère de progression.',
                icon: 'notebook',
                tone: latest ? 'emerald' : 'slate',
                priority: latest ? 44 : 42,
            });
        });

        const datedNotebooks = Object.values(lastModifiedDates).filter(Boolean).length;
        add({
            id: 'notebooks',
            eyebrow: 'Cahiers de textes',
            title: `${datedNotebooks}/${snapshot.classCount} cahier${snapshot.classCount > 1 ? 's' : ''} contiennent des séances datées`,
            detail: snapshot.mood,
            icon: 'notebook',
            tone: datedNotebooks === snapshot.classCount ? 'emerald' : 'blue',
            priority: 58,
        });

        add({
            id: 'progress',
            eyebrow: 'Progression consolidée',
            title: `${snapshot.avgCompletion}% du programme renseigné`,
            detail: `${snapshot.totalSessions} séance${snapshot.totalSessions > 1 ? 's' : ''} enregistrée${snapshot.totalSessions > 1 ? 's' : ''} dans ${snapshot.classCount} classe${snapshot.classCount > 1 ? 's' : ''}.`,
            icon: 'progress',
            tone: 'blue',
            priority: 54,
        });

        if (lateClassCount > 0 && !vacation && !holiday && !absence) {
            add({
                id: 'late-classes',
                eyebrow: 'Suivi pédagogique',
                title: `${lateClassCount} classe${lateClassCount > 1 ? 's' : ''} demande${lateClassCount > 1 ? 'nt' : ''} une mise à jour`,
                detail: 'Le retard est estimé depuis l’emploi du temps et les dates réellement consignées.',
                icon: 'alert',
                tone: 'amber',
                priority: 84,
            });
        }

        add({
            id: 'school-year',
            eyebrow: 'Repère annuel',
            title: `Année scolaire ${schoolYear.libelle}`,
            detail: today < schoolYear.debut
                ? `Rentrée des classes le ${formatDate(schoolYear.debut, { weekday: 'long', day: 'numeric', month: 'long' })}.`
                : `Calendrier suivi jusqu’au ${formatDate(schoolYear.fin, { day: 'numeric', month: 'long', year: 'numeric' })}.`,
            icon: 'school',
            tone: 'slate',
            priority: 40,
        });

        const deduplicated = [...new Map(items.map(item => [item.id, item])).values()]
            .sort((a, b) => b.priority - a.priority || a.title.localeCompare(b.title))
            .slice(0, 4);

        return {
            items: deduplicated,
        };
    }, [now, calendar, classes, config.absences, config.timetable, config.pedagogicalEvents, assessments, officialEvents, snapshot, lastModifiedDates, lateClassCount]);

    useEffect(() => {
        setActiveIndex(index => Math.min(index, Math.max(0, briefing.items.length - 1)));
    }, [briefing.items.length]);

    useEffect(() => {
        if (paused || reduceMotion || briefing.items.length < 2) return;
        const timer = window.setInterval(() => {
            setActiveIndex(index => (index + 1) % briefing.items.length);
        }, 7_000);
        return () => window.clearInterval(timer);
    }, [paused, reduceMotion, briefing.items.length]);

    const current = briefing.items[activeIndex] ?? briefing.items[0];
    if (!current) return null;
    return (
        <section
            className="relative mb-4 overflow-hidden rounded-2xl border border-blue-200/75 bg-[linear-gradient(110deg,rgba(239,246,255,.96),rgba(255,255,255,.98)_48%,rgba(248,250,252,.98))] shadow-[0_8px_30px_rgba(37,99,235,0.07)]"
            aria-label="Briefing pédagogique du jour"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-blue-100/60 blur-3xl" />
            <div className="relative flex min-h-[76px] flex-col gap-2.5 px-3.5 py-2.5 sm:flex-row sm:items-center sm:px-4">
                <div className="flex min-w-0 flex-1 items-center">
                    <div className="min-w-0 flex-1">
                        <AnimatePresence mode="wait" initial={false}>
                            <motion.div
                                key={current.id}
                                initial={reduceMotion ? false : { opacity: 0, y: 7, filter: 'blur(3px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                exit={reduceMotion ? undefined : { opacity: 0, y: -6, filter: 'blur(2px)' }}
                                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <p className="truncate text-sm font-black leading-snug tracking-tight text-slate-950" title={current.title}>
                                    {current.title}
                                </p>
                                <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-relaxed text-slate-500 sm:text-[11px]">
                                    <span className="font-extrabold text-slate-400">{current.eyebrow}</span> · {current.detail}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                <div className="grid shrink-0 grid-cols-3 divide-x divide-slate-200/90 overflow-hidden rounded-xl border border-slate-200/90 bg-white/90 shadow-sm sm:min-w-[250px]">
                    <EssentialStat value={`${snapshot.avgCompletion}%`} label="Progression" />
                    <EssentialStat value={lateClassCount} label="À traiter" />
                    <EssentialStat value={snapshot.totalSessions} label="Séances" />
                </div>
            </div>
        </section>
    );
};

const EssentialStat: React.FC<{ value: string | number; label: string }> = ({ value, label }) => (
    <span className="min-w-0 px-2 py-2 text-center">
        <span className="block text-sm font-black tabular-nums leading-none text-slate-950">{value}</span>
        <span className="mt-1 block truncate text-[7px] font-black uppercase tracking-[0.08em] text-slate-400">{label}</span>
    </span>
);
