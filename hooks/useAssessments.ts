import { useEffect, useMemo, useState } from 'react';
import { AppConfig, ClassInfo } from '../types';
import { HolidayCalendar, loadHolidayCalendar } from '../utils/calendar';
import { useMoroccoToday } from './useMoroccoToday';
import {
    PastAssessment,
    PlannedAssessment,
    UpcomingAssessment,
    getRecentPastAssessments,
    getUpcomingAssessments,
    loadPlanning,
    resolveClassAssessments,
    getAssessmentPlanDetailsForClass,
    type PlanningFile,
    type ClassAssessmentPlanDetails,
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
    const today = useMoroccoToday();

    return useMemo(() => {
        if (!calendar || !planning) return [];
        return getUpcomingAssessments(classes, planning, config, calendar, today, horizonDays);
    }, [today, calendar, planning, classes, config.assessmentDates, config.schoolYearStart, config.manualAssessments, config.removedAssessments, config.assessmentOrder, horizonDays]);
};

/** Devoirs récemment passés (≤ lookback jours), rappel « absents à consigner » du centre de notifications. */
export const useRecentPastAssessments = (
    classes: ClassInfo[],
    config: AppConfig,
    lookbackDays = 10
): PastAssessment[] => {
    const { calendar, planning } = useCalendarAndPlanning();
    const today = useMoroccoToday();

    return useMemo(() => {
        if (!calendar || !planning) return [];
        return getRecentPastAssessments(classes, planning, config, calendar, today, lookbackDays);
    }, [today, calendar, planning, classes, config.assessmentDates, config.schoolYearStart, config.manualAssessments, config.removedAssessments, config.assessmentOrder, lookbackDays]);
};

/** Planning complet d'UNE classe (dates officielles + surcharges + devoirs manuels), pour l'onglet Évaluations. */
export const useClassAssessments = (
    classInfo: ClassInfo | null,
    config: AppConfig
): { assessments: PlannedAssessment[]; hasPlan: boolean; planDetails: ClassAssessmentPlanDetails | null; planning: PlanningFile | null } => {
    const { calendar, planning } = useCalendarAndPlanning();
    const today = useMoroccoToday();

    return useMemo(() => {
        if (!calendar || !planning || !classInfo) return { assessments: [], hasPlan: false, planDetails: null, planning: null };

        const assessments = resolveClassAssessments(classInfo, planning, config, calendar, today);
        const planDetails = getAssessmentPlanDetailsForClass(classInfo, planning);
        return { assessments, hasPlan: assessments.length > 0, planDetails, planning };
    }, [today, calendar, planning, classInfo, config.assessmentDates, config.schoolYearStart, config.manualAssessments, config.removedAssessments, config.assessmentOrder]);
};
