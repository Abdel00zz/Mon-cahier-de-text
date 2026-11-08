import type { AbsencePeriod, ClassSchedule, TimetableClockPolicy, TimetableEntry } from '../../types';
import { getDaySessionBlocks, getDayTeachingBlocks, getTimetableDisplayRange } from './timetable';
import { deviceClockMinutes, deviceTodayISO, getBundledCalendar, getEffectiveSchoolYear, isHoliday, isVacation, isWeeklyRestDay, todayInMorocco, type HolidayCalendar } from './calendar';
import { moroccoClockMinutes } from '../notifications/sessionAlertEngine';

type SessionScheduleState =
    | 'in_progress'
    | 'paused'
    | 'starting_soon'
    | 'today_later'
    | 'upcoming'
    | 'none';

export interface SessionScheduleStatus {
    state: SessionScheduleState;
    /** Libellé descriptif complet (ex: "Séance en cours · reste 44 min avant la fin", "Prochaine séance : Lundi à 10h00") */
    label: string;
    /** Libellé court pour badges et repères compacts (ex: "En cours · 44 min", "Lundi à 10h00") */
    shortLabel: string;
    remainingMinutes?: number;
    /** Temps restant exact en secondes jusqu'à la fin de la séance ou de la pause en cours. */
    remainingSeconds?: number;
    /** Délai en millisecondes avant la prochaine bascule d'état (fin à la dernière seconde, reprise ou début). */
    nextTransitionMs?: number;
    startMin?: number;
    endMin?: number;
    startTimeLabel?: string;
    endTimeLabel?: string;
    dayLabel?: string;
    dayOffset?: number;
    /** Durée totale du bloc de séance fusionné (ex: 2 pour une séance de 2h consécutives). */
    sessionHours?: number;
    /** Date effective de la prochaine séance, après exclusion des jours non travaillés. */
    date?: string;
}

const formatHourMinute = (minutes: number, locale = 'fr'): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (locale === 'ar') {
        return `${pad(hours)}:${pad(mins)}`;
    }
    return `${pad(hours)}h${mins === 0 ? '00' : pad(mins)}`;
};

const DAY_NAMES: Record<'fr' | 'ar' | 'en', Record<number, string>> = {
    fr: { 0: 'Dimanche', 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi' },
    ar: { 0: 'الأحد', 1: 'الإثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت' },
    en: { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' },
};

export interface SessionScheduleOptions {
    now?: Date;
    calendar?: HolidayCalendar;
    /** Fuseau horaire explicite ('local' par défaut pour suivre l'horloge du téléphone/PC). */
    timeZone?: string;
    locale?: string;
    absences?: AbsencePeriod[];
    schedules?: ClassSchedule[];
    schoolYearStart?: string;
}

/**
 * Analyse dynamique et intelligente de l'emploi du temps pour une classe donnée.
 * Détermine si la séance est en cours (active jusqu'à la dernière seconde de la séance),
 * commence bientôt, aura lieu plus tard aujourd'hui, ou planifiée plus tard dans la semaine.
 */
export function computeClassSessionSchedule(
    timetable: TimetableEntry[] | undefined,
    clock: Pick<TimetableClockPolicy, 'offsetMinutes'> | number | null | undefined,
    classId: string,
    options: SessionScheduleOptions = {},
): SessionScheduleStatus {
    if (!classId) {
        return { state: 'none', label: '', shortLabel: '' };
    }

    // Legacy schedules have no times: do not invent slots.
    const effectiveTimetable: TimetableEntry[] = timetable ?? [];

    if (effectiveTimetable.length === 0) {
        return { state: 'none', label: '', shortLabel: '' };
    }

    const hasClassSlots = effectiveTimetable.some(entry => entry.classId === classId);
    if (!hasClassSlots) {
        return { state: 'none', label: '', shortLabel: '' };
    }

    const calendar = options.calendar ?? getBundledCalendar();
    const now = options.now ?? new Date();
    const effectiveZone = options.timeZone ?? (options.calendar?.fuseau || (options.now ? calendar.fuseau : 'local'));
    const todayIso = effectiveZone === 'local'
        ? deviceTodayISO(now)
        : todayInMorocco(now, { ...calendar, fuseau: effectiveZone });
    const currentMinute = effectiveZone === 'local'
        ? deviceClockMinutes(now)
        : moroccoClockMinutes(now, effectiveZone);
    const schoolYear = getEffectiveSchoolYear(calendar, options.schoolYearStart, todayIso);
    const currentDayOfWeek = new Date(`${todayIso}T12:00:00Z`).getUTCDay();
    const rawLocale = options.locale ?? 'fr';
    const lang: 'fr' | 'ar' | 'en' = rawLocale.startsWith('ar') ? 'ar' : rawLocale.startsWith('en') ? 'en' : 'fr';

    const isDayBlocked = (isoDate: string): boolean => {
        if (isoDate < schoolYear.debut || isoDate > schoolYear.fin || isWeeklyRestDay(isoDate)) return true;
        if (isHoliday(isoDate, calendar) || isVacation(isoDate, calendar)) return true;
        if (options.absences?.some(period => isoDate >= period.debut && isoDate <= period.fin)) return true;
        return false;
    };

    const todayBlocked = isDayBlocked(todayIso);

    // 1. Analyse des créneaux d'aujourd'hui
    if (!todayBlocked) {
        const todayBlocks = getDayTeachingBlocks(effectiveTimetable, currentDayOfWeek, clock)
            .filter(b => b.classId === classId)
            .sort((a, b) => a.startMin - b.startMin);
        const todaySessionBlocks = getDaySessionBlocks(effectiveTimetable, currentDayOfWeek, clock)
            .filter(b => b.classId === classId)
            .sort((a, b) => a.startMin - b.startMin);

        // A. Séance en cours (active jusqu'à la toute dernière seconde avant endMin) ?
        const activeBlock = todayBlocks.find(b => currentMinute >= b.startMin && currentMinute < b.endMin);
        if (activeBlock) {
            const parentSession = todaySessionBlocks.find(
                b => activeBlock.startMin >= b.startMin && activeBlock.endMin <= b.endMin,
            );
            const remainingSeconds = Math.max(1, Math.ceil((activeBlock.endMin - currentMinute) * 60));
            const remaining = Math.max(1, Math.ceil(activeBlock.endMin - currentMinute));
            const nextTransitionMs = Math.max(50, Math.ceil((activeBlock.endMin - currentMinute) * 60_000) + 25);
            const display = getTimetableDisplayRange(activeBlock.startMin, activeBlock.endMin, clock);
            const startLabel = formatHourMinute(display.startMin, lang);
            const endLabel = formatHourMinute(display.endMin, lang);

            const label = lang === 'ar'
                ? `حصة جارية · متبقي ${remaining} دقيقة قبل النهاية`
                : lang === 'en'
                  ? `Current session · ${remaining} min left before end`
                  : `Séance en cours · reste ${remaining} min avant la fin`;

            const shortLabel = lang === 'ar'
                ? `جارية · ${remaining} د`
                : lang === 'en'
                  ? `In progress · ${remaining}m`
                  : `En cours · ${remaining} min`;

            return {
                state: 'in_progress',
                label,
                shortLabel,
                remainingMinutes: remaining,
                remainingSeconds,
                nextTransitionMs,
                startMin: activeBlock.startMin,
                endMin: activeBlock.endMin,
                startTimeLabel: startLabel,
                endTimeLabel: endLabel,
                dayLabel: lang === 'ar' ? 'اليوم' : lang === 'en' ? 'Today' : 'Aujourd’hui',
                dayOffset: 0,
                sessionHours: parentSession?.hours ?? activeBlock.hours,
                date: todayIso,
            };
        }

        // B. Séance aujourd'hui qui commence bientôt ou plus tard (suivant les horaires internes) ?
        const upcomingToday = todayBlocks.filter(b => b.startMin > currentMinute);
        if (upcomingToday.length > 0) {
            const nextBlock = upcomingToday[0];
            const parentSession = todaySessionBlocks.find(
                b => nextBlock.startMin >= b.startMin && nextBlock.endMin <= b.endMin,
            );
            const sessionHours = parentSession?.hours ?? nextBlock.hours;
            const remainingSeconds = Math.max(1, Math.ceil((nextBlock.startMin - currentMinute) * 60));
            const diffMin = Math.max(1, Math.ceil(nextBlock.startMin - currentMinute));
            const nextTransitionMs = Math.max(50, Math.ceil((nextBlock.startMin - currentMinute) * 60_000) + 25);
            const display = getTimetableDisplayRange(nextBlock.startMin, nextBlock.endMin, clock);
            const startLabel = formatHourMinute(display.startMin, lang);
            const endLabel = formatHourMinute(display.endMin, lang);

            const pausedSession = todaySessionBlocks
                .find(b => currentMinute >= b.startMin && currentMinute < b.endMin);
            if (pausedSession) {
                const resumeLabel = formatHourMinute(nextBlock.startMin, lang);
                const label = lang === 'ar' ? `استراحة · استئناف الحصة على الساعة ${resumeLabel}`
                    : lang === 'en' ? `Break · resumes at ${resumeLabel}` : `Pause · reprise à ${resumeLabel}`;
                return {
                    state: 'paused',
                    label,
                    shortLabel: label,
                    remainingMinutes: diffMin,
                    remainingSeconds,
                    nextTransitionMs,
                    startMin: nextBlock.startMin,
                    endMin: nextBlock.endMin,
                    startTimeLabel: startLabel,
                    endTimeLabel: endLabel,
                    dayLabel: lang === 'ar' ? 'اليوم' : lang === 'en' ? 'Today' : 'Aujourd’hui',
                    dayOffset: 0,
                    sessionHours: pausedSession.hours,
                    date: todayIso,
                };
            }

            if (diffMin <= 60) {
                const label = lang === 'ar'
                    ? `الحصة تبدأ خلال ${diffMin} دقيقة`
                    : lang === 'en'
                      ? `Starts in ${diffMin} min`
                      : `Séance dans ${diffMin} min`;

                const shortLabel = lang === 'ar'
                    ? `خلال ${diffMin} د`
                    : lang === 'en'
                      ? `In ${diffMin}m`
                      : `Dans ${diffMin} min`;

                return {
                    state: 'starting_soon',
                    label,
                    shortLabel,
                    remainingMinutes: diffMin,
                    remainingSeconds,
                    nextTransitionMs,
                    startMin: nextBlock.startMin,
                    endMin: nextBlock.endMin,
                    startTimeLabel: startLabel,
                    endTimeLabel: endLabel,
                    dayLabel: lang === 'ar' ? 'اليوم' : lang === 'en' ? 'Today' : 'Aujourd’hui',
                    dayOffset: 0,
                    sessionHours,
                    date: todayIso,
                };
            }

            const untilSoonMs = Math.max(50, Math.ceil((nextBlock.startMin - 60 - currentMinute) * 60_000) + 25);
            const label = lang === 'ar'
                ? `حصة اليوم على الساعة ${startLabel}`
                : lang === 'en'
                  ? `Session today at ${startLabel}`
                  : `Séance aujourd’hui à ${startLabel}`;

            const shortLabel = lang === 'ar'
                ? `اليوم ${startLabel}`
                : lang === 'en'
                  ? `Today at ${startLabel}`
                  : `Aujourd’hui à ${startLabel}`;

            return {
                state: 'today_later',
                label,
                shortLabel,
                remainingMinutes: diffMin,
                remainingSeconds,
                nextTransitionMs: Math.min(nextTransitionMs, untilSoonMs),
                startMin: nextBlock.startMin,
                endMin: nextBlock.endMin,
                startTimeLabel: startLabel,
                endTimeLabel: endLabel,
                dayLabel: lang === 'ar' ? 'اليوم' : lang === 'en' ? 'Today' : 'Aujourd’hui',
                dayOffset: 0,
                sessionHours,
                date: todayIso,
            };
        }
    }

    const buildUpcomingStatus = (offset: number, targetDayOfWeek: number, startMin: number, endMin: number, sessionHours?: number): SessionScheduleStatus => {
        const display = getTimetableDisplayRange(startMin, endMin, clock);
        const startLabel = formatHourMinute(display.startMin, lang);
        const endLabel = formatHourMinute(display.endMin, lang);
        const isTomorrow = offset === 1;
        const dayName = DAY_NAMES[lang][targetDayOfWeek] ?? 'Lundi';

        const label = isTomorrow
            ? lang === 'ar'
                ? `الحصة القادمة: غداً على الساعة ${startLabel}`
                : lang === 'en'
                  ? `Next session: Tomorrow at ${startLabel}`
                  : `Prochaine séance : Demain à ${startLabel}`
            : lang === 'ar'
              ? `الحصة القادمة: ${dayName} على الساعة ${startLabel}`
              : lang === 'en'
                ? `Next session: ${dayName} at ${startLabel}`
                : `Prochaine séance : ${dayName} à ${startLabel}`;

        const shortLabel = isTomorrow
            ? lang === 'ar'
                ? `غداً ${startLabel}`
                : lang === 'en'
                  ? `Tomorrow at ${startLabel}`
                  : `Demain à ${startLabel}`
            : lang === 'ar'
              ? `${dayName} ${startLabel}`
              : lang === 'en'
                ? `${dayName} at ${startLabel}`
                : `${dayName} à ${startLabel}`;

        return {
            state: 'upcoming',
            label,
            shortLabel,
            startMin,
            endMin,
            startTimeLabel: startLabel,
            endTimeLabel: endLabel,
            dayLabel: isTomorrow ? (lang === 'ar' ? 'غدا' : lang === 'en' ? 'Tomorrow' : 'Demain') : dayName,
            dayOffset: offset,
            sessionHours,
        };
    };

    // 2. Recherche de la prochaine séance valide dans l’année scolaire.
    const [y, m, d] = todayIso.split('-').map(Number);

    for (let offset = 1; offset <= 370; offset++) {
        const targetDate = new Date(Date.UTC(y, m - 1, d + offset, 12, 0, 0));
        const targetIso = targetDate.toISOString().slice(0, 10);
        if (targetIso > schoolYear.fin) break;
        if (isDayBlocked(targetIso)) continue;

        const targetDayOfWeek = targetDate.getUTCDay();
        const targetBlocks = getDaySessionBlocks(effectiveTimetable, targetDayOfWeek, clock)
            .filter(b => b.classId === classId)
            .sort((a, b) => a.startMin - b.startMin);

        if (targetBlocks.length > 0) {
            const nextBlock = targetBlocks[0];
            return { ...buildUpcomingStatus(offset, targetDayOfWeek, nextBlock.startMin, nextBlock.endMin, nextBlock.hours), date: targetIso };
        }
    }

    return { state: 'none', label: '', shortLabel: '' };
}

