import { useEffect, useMemo, useState } from 'react';
import { AppConfig, ClassInfo } from '../types';
import { HolidayCalendar, getBundledCalendar, loadHolidayCalendar } from '../domain/calendar/calendar';
import { useMoroccoToday } from './useMoroccoToday';
import {
    PastAssessment,
    PlannedAssessment,
    UpcomingAssessment,
    getFollowUpAssessments,
    getRecentPastAssessments,
    getUpcomingAssessments,
    loadPlanning,
    resolveClassAssessments,
    getAssessmentPlanDetailsForClass,
    type PlanningFile,
    type ClassAssessmentPlanDetails,
} from '../domain/evaluations/assessments';

/** Charge le planning officiel + le calendrier (une fois), puis les expose. */
const useCalendarAndPlanning = () => {
    const [calendar, setCalendar] = useState<HolidayCalendar>(() => getBundledCalendar());
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
        return getUpcomingAssessments(classes, planning ?? { version: 1, plans: [] }, config, calendar, today, horizonDays);
    }, [today, calendar, planning, classes, config.assessmentDates, config.schoolYearStart, config.manualAssessments, config.removedAssessments, config.assessmentOrder, horizonDays]);
};

/** Ensemble des évaluations du suivi pédagogique (« محطات » / Échéances) sur l'année scolaire active. */
export const useFollowUpAssessments = (
    classes: ClassInfo[],
    config: AppConfig,
    derivedHorizonDays = 30
): UpcomingAssessment[] => {
    const { calendar, planning } = useCalendarAndPlanning();
    const today = useMoroccoToday();

    return useMemo(() => {
        return getFollowUpAssessments(classes, planning, config, calendar, today, derivedHorizonDays);
    }, [today, calendar, planning, classes, config, derivedHorizonDays]);
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
        return getRecentPastAssessments(classes, planning ?? { version: 1, plans: [] }, config, calendar, today, lookbackDays);
    }, [today, calendar, planning, classes, config.assessmentDates, config.schoolYearStart, config.manualAssessments, config.removedAssessments, config.assessmentOrder, lookbackDays]);
};

/** Planning complet d'UNE classe (dates officielles + surcharges + devoirs manuels), pour l'onglet Évaluations. */
export const useClassAssessments = (
    classInfo: ClassInfo | null,
    config: AppConfig
): { assessments: PlannedAssessment[]; hasPlan: boolean; planDetails: ClassAssessmentPlanDetails | null; planning: PlanningFile | null; calendar: HolidayCalendar | null } => {
    const { calendar, planning } = useCalendarAndPlanning();
    const today = useMoroccoToday();

    return useMemo(() => {
        if (!classInfo) return { assessments: [], hasPlan: false, planDetails: null, planning: null, calendar };
        const effectivePlanning = planning ?? { version: 1, plans: [] };
        const assessments = resolveClassAssessments(classInfo, effectivePlanning, config, calendar, today);
        const planDetails = planning ? getAssessmentPlanDetailsForClass(classInfo, planning) : null;
        return { assessments, hasPlan: assessments.length > 0, planDetails, planning, calendar };
    }, [today, calendar, planning, classInfo, config.assessmentDates, config.schoolYearStart, config.manualAssessments, config.removedAssessments, config.assessmentOrder]);
};
