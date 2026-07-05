import { useEffect, useMemo, useState } from 'react';
import { AppConfig, ClassInfo, LessonsData } from '../types';
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
            perClass.push({ ...result, classId: classInfo.id, className: classInfo.name });
        }

        const summary = summarizeForTeacher(perClass);
        if (!summary) return null;
        return { ...summary, perClass };
    }, [calendar, classes, config.schedules, config.notificationSettings, config.schoolYearStart, config.absences]);
};
