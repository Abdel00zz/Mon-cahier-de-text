import { useEffect, useMemo, useState } from 'react';
import { AppConfig, ClassInfo } from '../types';
import { HolidayCalendar, getBundledCalendar, loadHolidayCalendar } from '../domain/calendar/calendar';
import { loadOfficialStudentEvents } from '../domain/evaluations/officialStudentEvents';
import { useMoroccoToday } from './useMoroccoToday';
import {
    PlannedAssessment,
    loadPlanning,
    resolveClassAssessments,
    getAssessmentPlanDetailsForClass,
    type PlanningFile,
    type ClassAssessmentPlanDetails,
} from '../domain/evaluations/assessments';

/** Charge le planning officiel + le calendrier (une fois), puis les expose avec gestion d'erreur indépendante. */
const useCalendarAndPlanning = () => {
    const [calendar, setCalendar] = useState<HolidayCalendar>(() => getBundledCalendar());
    const [planning, setPlanning] = useState<PlanningFile | null>(null);

    useEffect(() => {
        let cancelled = false;

        // Préchauffage du cache des événements officiels élèves (non bloquant)
        void loadOfficialStudentEvents().catch(() => {});

        void loadHolidayCalendar()
            .then(cal => {
                if (!cancelled) setCalendar(cal);
            })
            .catch(() => {});

        void loadPlanning()
            .then(plan => {
                if (!cancelled) setPlanning(plan);
            })
            .catch(() => {});

        return () => { cancelled = true; };
    }, []);

    return { calendar, planning };
};

/** Planning complet d'UNE classe (dates officielles + surcharges + devoirs manuels), pour l'onglet Évaluations. */
export const useClassAssessments = (
    classInfo: ClassInfo | null,
    config: AppConfig
): {
    assessments: PlannedAssessment[];
    hasPlan: boolean;
    planDetails: ClassAssessmentPlanDetails | null;
    planning: PlanningFile | null;
    calendar: HolidayCalendar;
} => {
    const { calendar, planning } = useCalendarAndPlanning();
    const today = useMoroccoToday();

    const classId = classInfo?.id;
    const assessmentDates = classId ? config.assessmentDates?.[classId] : undefined;
    const manualAssessments = classId ? config.manualAssessments?.[classId] : undefined;
    const removedAssessments = classId ? config.removedAssessments?.[classId] : undefined;
    const assessmentOrder = classId ? config.assessmentOrder?.[classId] : undefined;
    const schoolYearStart = config.schoolYearStart;

    return useMemo(() => {
        if (!classInfo) return { assessments: [], hasPlan: false, planDetails: null, planning: null, calendar };
        const effectivePlanning = planning ?? { version: 1, plans: [] };
        const assessments = resolveClassAssessments(classInfo, effectivePlanning, config, calendar, today);
        const planDetails = planning ? getAssessmentPlanDetailsForClass(classInfo, planning) : null;
        return { assessments, hasPlan: assessments.length > 0, planDetails, planning, calendar };
    }, [today, calendar, planning, classInfo, assessmentDates, schoolYearStart, manualAssessments, removedAssessments, assessmentOrder, config]);
};
