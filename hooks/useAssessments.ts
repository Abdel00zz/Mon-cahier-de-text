import { useEffect, useMemo, useState } from 'react';
import { AppConfig, ClassInfo } from '../types';
import { HolidayCalendar, loadHolidayCalendar, todayInMorocco } from '../utils/calendar';
import {
    PastAssessment,
    PlannedAssessment,
    UpcomingAssessment,
    getRecentPastAssessments,
    getUpcomingAssessments,
    loadPlanning,
    resolveClassAssessments,
    type PlanningFile,
} from '../utils/assessments';

/** Charge le planning officiel + le calendrier (une fois), puis les expose. */
const useCalendarAndPlanning = () => {
    const [calendar, setCalendar] = useState<HolidayCalendar | null>(null);
    const [planning, setPlanning] = useState<PlanningFile | null>(null);

    useEffect(() => {
        let cancelled = false;
        Promise.all([loadHolidayCalendar(), loadPlanning()]).then(([cal, plan]) => {
            if (cancelled) return;
            setCalendar(cal);
            setPlanning(plan);
        });
        return () => { cancelled = true; };
    }, []);

    return { calendar, planning };
};

/** Devoirs proches (≤ horizon jours) sur toutes les classes, pour la bannière du dashboard. */
export const useUpcomingAssessments = (
    classes: ClassInfo[],
    config: AppConfig,
    horizonDays = 14
): UpcomingAssessment[] => {
    const { calendar, planning } = useCalendarAndPlanning();

    return useMemo(() => {
        if (!calendar || !planning) return [];
        const today = todayInMorocco(new Date(), calendar);
        return getUpcomingAssessments(classes, planning, config, calendar, today, horizonDays);
    }, [calendar, planning, classes, config.assessmentDates, config.schoolYearStart, config.manualAssessments, config.removedAssessments, config.assessmentOrder, horizonDays]);
};

/** Devoirs récemment passés (≤ lookback jours), rappel « absents à consigner » du centre de notifications. */
export const useRecentPastAssessments = (
    classes: ClassInfo[],
    config: AppConfig,
    lookbackDays = 10
): PastAssessment[] => {
    const { calendar, planning } = useCalendarAndPlanning();

    return useMemo(() => {
        if (!calendar || !planning) return [];
        const today = todayInMorocco(new Date(), calendar);
        return getRecentPastAssessments(classes, planning, config, calendar, today, lookbackDays);
    }, [calendar, planning, classes, config.assessmentDates, config.schoolYearStart, config.manualAssessments, config.removedAssessments, config.assessmentOrder, lookbackDays]);
};

/** Planning complet d'UNE classe (dates officielles + surcharges + devoirs manuels), pour l'onglet Évaluations. */
export const useClassAssessments = (
    classInfo: ClassInfo | null,
    config: AppConfig
): { assessments: PlannedAssessment[]; hasPlan: boolean } => {
    const { calendar, planning } = useCalendarAndPlanning();

    return useMemo(() => {
        if (!calendar || !planning || !classInfo) return { assessments: [], hasPlan: false };
        const today = todayInMorocco(new Date(), calendar);

        const assessments = resolveClassAssessments(classInfo, planning, config, calendar, today);
        return { assessments, hasPlan: assessments.length > 0 };
    }, [calendar, planning, classInfo, config.assessmentDates, config.schoolYearStart, config.manualAssessments, config.removedAssessments, config.assessmentOrder]);
};
