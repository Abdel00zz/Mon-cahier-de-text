import { useEffect, useMemo, useState } from 'react';
import { AppConfig, ClassInfo, LessonsData } from '../types';
import { formatClassDisplayName } from '../constants';
import {
    HolidayCalendar,
    isHoliday,
    isVacation,
    loadHolidayCalendar,
    todayInMorocco,
} from '../utils/calendar';
import { computeProgressionStats } from '../utils/progression';
import { ClassLateness, computeLateness, summarizeForTeacher } from '../utils/lateness';
import { migrateLessonsData } from '../utils/dataUtils';

const readLessons = (classId: string): LessonsData => {
    try {
        const raw = localStorage.getItem(`classData_v1_${classId}`);
        const parsed = raw ? JSON.parse(raw) : [];
        const lessons = Array.isArray(parsed) ? parsed : (parsed.lessonsData ?? []);
        return migrateLessonsData(lessons);
    } catch {
        return [];
    }
};

export interface LatenessSummary {
    title: string;
    body: string;
    severity: ClassLateness['severity'];
    perClass: ClassLateness[];
}

export const useLateness = (classes: ClassInfo[], config: AppConfig): LatenessSummary | null => {
    const [calendar, setCalendar] = useState<HolidayCalendar | null>(null);

    useEffect(() => {
        let cancelled = false;
        loadHolidayCalendar().then(cal => {
            if (!cancelled) setCalendar(cal);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    return useMemo(() => {
        if (!calendar) return null;
        const settings = config.notificationSettings;
        if (settings && !settings.enabled) return null;

        const today = todayInMorocco(new Date(), calendar);
        if (settings?.quietDuringVacations !== false && (isHoliday(today, calendar) || isVacation(today, calendar))) {
            return null;
        }
        // Absence justifiée en cours (certificat) : aucune alerte.
        if (config.absences?.some(a => today >= a.debut && today <= a.fin)) {
            return null;
        }

        const schedules = config.schedules ?? [];
        const perClass: ClassLateness[] = [];

        for (const classInfo of classes) {
            const schedule = schedules.find(s => s.classId === classInfo.id);
            if (!schedule || schedule.slots.length === 0) continue; // sans emploi du temps, pas d'attendu calculable

            const stats = computeProgressionStats(readLessons(classInfo.id));
            const result = computeLateness({
                slots: schedule.slots,
                calendar,
                sessionsCount: stats.sessionsCount,
                lastDate: stats.lastDate,
                today,
                from: config.schoolYearStart,
                absences: config.absences,
                settings: settings
                    ? { gapThreshold: settings.gapThreshold, inactivityThresholdDays: settings.inactivityThresholdDays }
                    : undefined,
            });
            perClass.push({ ...result, classId: classInfo.id, className: formatClassDisplayName(classInfo.name) });
        }

        if (perClass.length === 0) return null;

        /*
         * Contrat : null = moteur muet (vacances, férié, absence, désactivé,
         * aucun emploi du temps). Sinon le détail perClass est TOUJOURS
         * retourné, même quand tout est à jour (severity 'ok') — les cartes
         * statistiques distinguent ainsi « à jour » de « moteur en pause ».
         * La bannière, elle, ne s'affiche que si severity ≠ 'ok'.
         */
        const summary = summarizeForTeacher(perClass);
        if (!summary) return { title: '', body: '', severity: 'ok' as const, perClass };
        return { ...summary, perClass };
    }, [calendar, classes, config.schedules, config.notificationSettings, config.schoolYearStart, config.absences]);
};
