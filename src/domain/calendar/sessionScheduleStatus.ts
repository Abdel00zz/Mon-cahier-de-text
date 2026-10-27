import type { AbsencePeriod, ClassSchedule, TimetableClockPolicy, TimetableEntry } from '../../types';
import { getDaySessionBlocks } from './timetable';
import { getBundledCalendar, isHoliday, isVacation, isWeeklyRestDay, todayInMorocco, type HolidayCalendar } from './calendar';
import { moroccoClockMinutes } from '../notifications/sessionAlertEngine';

type SessionScheduleState =
    | 'in_progress'
    | 'starting_soon'
    | 'today_later'
    | 'today_ended'
    | 'upcoming'
    | 'none';

export interface SessionScheduleStatus {
    state: SessionScheduleState;
    /** Libellé descriptif complet (ex: "Séance en cours · reste 44 min avant la fin", "Prochaine séance : Lundi à 10h00") */
    label: string;
    /** Libellé court pour badges et repères compacts (ex: "En cours · 44 min", "Lundi à 10h00") */
    shortLabel: string;
    remainingMinutes?: number;
    startMin?: number;
    endMin?: number;
    startTimeLabel?: string;
    endTimeLabel?: string;
    dayLabel?: string;
    dayOffset?: number;
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
    locale?: string;
    absences?: AbsencePeriod[];
    schedules?: ClassSchedule[];
}

/**
 * Analyse dynamique et intelligente de l'emploi du temps pour une classe donnée.
 * Détermine si la séance est en cours (avec calcul du temps restant en minutes),
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

    const effectiveTimetable: TimetableEntry[] =
        timetable && timetable.length > 0
            ? timetable
            : timetable === undefined && options.schedules && options.schedules.length > 0
              ? options.schedules.flatMap(sched =>
                    sched.slots.map((slot, idx) => ({
                        day: slot.weekday,
                        slot: idx % 8,
                        classId: sched.classId,
                    })),
                )
              : [];

    if (effectiveTimetable.length === 0) {
        return { state: 'none', label: '', shortLabel: '' };
    }

    const hasClassSlots = effectiveTimetable.some(entry => entry.classId === classId);
    if (!hasClassSlots) {
        return { state: 'none', label: '', shortLabel: '' };
    }

    const calendar = options.calendar ?? getBundledCalendar();
    const now = options.now ?? new Date();
    const todayIso = todayInMorocco(now, calendar);
    const currentMinute = moroccoClockMinutes(now, calendar.fuseau);
    const currentDayOfWeek = new Date(`${todayIso}T12:00:00Z`).getUTCDay();
    const rawLocale = options.locale ?? 'fr';
    const lang: 'fr' | 'ar' | 'en' = rawLocale.startsWith('ar') ? 'ar' : rawLocale.startsWith('en') ? 'en' : 'fr';

    const isDayBlocked = (isoDate: string): boolean => {
        if (isWeeklyRestDay(isoDate)) return true;
        if (isHoliday(isoDate, calendar) || isVacation(isoDate, calendar)) return true;
        if (options.absences?.some(period => isoDate >= period.debut && isoDate <= period.fin)) return true;
        return false;
    };

    const todayBlocked = isDayBlocked(todayIso);

    // 1. Analyse des créneaux d'aujourd'hui
    if (!todayBlocked) {
        const todayBlocks = getDaySessionBlocks(effectiveTimetable, currentDayOfWeek, clock)
            .filter(b => b.classId === classId)
            .sort((a, b) => a.startMin - b.startMin);

        // A. Séance en cours ?
        const activeBlock = todayBlocks.find(b => currentMinute >= b.startMin && currentMinute < b.endMin);
        if (activeBlock) {
            const remaining = Math.max(1, Math.ceil(activeBlock.endMin - currentMinute));
            const startLabel = formatHourMinute(activeBlock.startMin, lang);
            const endLabel = formatHourMinute(activeBlock.endMin, lang);

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
                startMin: activeBlock.startMin,
                endMin: activeBlock.endMin,
                startTimeLabel: startLabel,
                endTimeLabel: endLabel,
                dayLabel: lang === 'ar' ? 'اليوم' : lang === 'en' ? 'Today' : 'Aujourd’hui',
                dayOffset: 0,
            };
        }

        // B. Séance aujourd'hui qui commence bientôt ou plus tard ?
        const upcomingToday = todayBlocks.filter(b => b.startMin > currentMinute);
        if (upcomingToday.length > 0) {
            const nextBlock = upcomingToday[0];
            const diffMin = Math.ceil(nextBlock.startMin - currentMinute);
            const startLabel = formatHourMinute(nextBlock.startMin, lang);
            const endLabel = formatHourMinute(nextBlock.endMin, lang);

            if (diffMin <= 60) {
                const label = lang === 'ar'
                    ? `الحصة تبدأ خلال ${diffMin} دقيقة (${startLabel})`
                    : lang === 'en'
                      ? `Starts in ${diffMin} min (${startLabel})`
                      : `Séance dans ${diffMin} min (${startLabel})`;

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
                    startMin: nextBlock.startMin,
                    endMin: nextBlock.endMin,
                    startTimeLabel: startLabel,
                    endTimeLabel: endLabel,
                    dayLabel: lang === 'ar' ? 'اليوم' : lang === 'en' ? 'Today' : 'Aujourd’hui',
                    dayOffset: 0,
                };
            }

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
                startMin: nextBlock.startMin,
                endMin: nextBlock.endMin,
                startTimeLabel: startLabel,
                endTimeLabel: endLabel,
                dayLabel: lang === 'ar' ? 'اليوم' : lang === 'en' ? 'Today' : 'Aujourd’hui',
                dayOffset: 0,
            };
        }
    }

    const buildUpcomingStatus = (offset: number, targetDayOfWeek: number, startMin: number, endMin: number): SessionScheduleStatus => {
        const startLabel = formatHourMinute(startMin, lang);
        const endLabel = formatHourMinute(endMin, lang);
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
        };
    };

    // 2. Recherche de la prochaine séance dans les jours ouvrés à venir (1 à 21 jours)
    const [y, m, d] = todayIso.split('-').map(Number);

    for (let offset = 1; offset <= 21; offset++) {
        const targetDate = new Date(Date.UTC(y, m - 1, d + offset, 12, 0, 0));
        const targetIso = targetDate.toISOString().slice(0, 10);
        if (isDayBlocked(targetIso)) continue;

        const targetDayOfWeek = targetDate.getUTCDay();
        const targetBlocks = getDaySessionBlocks(effectiveTimetable, targetDayOfWeek, clock)
            .filter(b => b.classId === classId)
            .sort((a, b) => a.startMin - b.startMin);

        if (targetBlocks.length > 0) {
            const nextBlock = targetBlocks[0];
            return buildUpcomingStatus(offset, targetDayOfWeek, nextBlock.startMin, nextBlock.endMin);
        }
    }

    // 3. Repli hebdomadaire : si une période de vacances prolonge l'arrêt au-delà de 21 jours,
    // on conserve le rattachement au jour hebdomadaire de l'emploi du temps du professeur.
    for (let offset = 1; offset <= 7; offset++) {
        const targetDate = new Date(Date.UTC(y, m - 1, d + offset, 12, 0, 0));
        const targetDayOfWeek = targetDate.getUTCDay();
        const targetBlocks = getDaySessionBlocks(effectiveTimetable, targetDayOfWeek, clock)
            .filter(b => b.classId === classId)
            .sort((a, b) => a.startMin - b.startMin);

        if (targetBlocks.length > 0) {
            const nextBlock = targetBlocks[0];
            return buildUpcomingStatus(offset, targetDayOfWeek, nextBlock.startMin, nextBlock.endMin);
        }
    }

    return { state: 'none', label: '', shortLabel: '' };
}

