import type { AbsencePeriod, TimetableClockPolicy, TimetableEntry } from '../../types';
import { getDaySessionBlocks, type SessionBlock } from './timetable';
import { getBundledCalendar, isHoliday, isVacation, isWeeklyRestDay, todayInMorocco, type HolidayCalendar } from './calendar';
import { moroccoClockMinutes } from '../notifications/sessionAlertEngine';

export type SessionScheduleState =
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

export const formatHourMinute = (minutes: number, locale = 'fr'): string => {
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
    if (!timetable || timetable.length === 0 || !classId) {
        return { state: 'none', label: '', shortLabel: '' };
    }

    const hasClassSlots = timetable.some(entry => entry.classId === classId);
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
        const todayBlocks = getDaySessionBlocks(timetable, currentDayOfWeek, clock)
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
                dayOffset: 0,
            };
        }
    }

    // 2. Recherche de la prochaine séance dans les jours à venir (1 à 7 jours)
    const [y, m, d] = todayIso.split('-').map(Number);

    for (let offset = 1; offset <= 7; offset++) {
        const targetDate = new Date(Date.UTC(y, m - 1, d + offset, 12, 0, 0));
        const targetIso = targetDate.toISOString().slice(0, 10);
        if (isDayBlocked(targetIso)) continue;

        const targetDayOfWeek = targetDate.getUTCDay();
        const targetBlocks = getDaySessionBlocks(timetable, targetDayOfWeek, clock)
            .filter(b => b.classId === classId)
            .sort((a, b) => a.startMin - b.startMin);

        if (targetBlocks.length > 0) {
            const nextBlock = targetBlocks[0];
            const startLabel = formatHourMinute(nextBlock.startMin, lang);
            const endLabel = formatHourMinute(nextBlock.endMin, lang);
            const isTomorrow = offset === 1;
            const dayName = DAY_NAMES[lang][targetDayOfWeek] ?? 'Lundi';

            let label: string;
            let shortLabel: string;

            if (isTomorrow) {
                label = lang === 'ar'
                    ? `الحصة القادمة: غداً على الساعة ${startLabel}`
                    : lang === 'en'
                      ? `Next session: Tomorrow at ${startLabel}`
                      : `Prochaine séance : Demain à ${startLabel}`;

                shortLabel = lang === 'ar'
                    ? `غداً ${startLabel}`
                    : lang === 'en'
                      ? `Tomorrow at ${startLabel}`
                      : `Demain à ${startLabel}`;
            } else {
                label = lang === 'ar'
                    ? `الحصة القادمة: ${dayName} على الساعة ${startLabel}`
                    : lang === 'en'
                      ? `Next session: ${dayName} at ${startLabel}`
                      : `Prochaine séance : ${dayName} à ${startLabel}`;

                shortLabel = lang === 'ar'
                    ? `${dayName} ${startLabel}`
                    : lang === 'en'
                      ? `${dayName} at ${startLabel}`
                      : `${dayName} à ${startLabel}`;
            }

            return {
                state: 'upcoming',
                label,
                shortLabel,
                startMin: nextBlock.startMin,
                endMin: nextBlock.endMin,
                startTimeLabel: startLabel,
                endTimeLabel: endLabel,
                dayLabel: isTomorrow ? (lang === 'ar' ? 'غداً' : lang === 'en' ? 'Tomorrow' : 'Demain') : dayName,
                dayOffset: offset,
            };
        }
    }

    return { state: 'none', label: '', shortLabel: '' };
}
