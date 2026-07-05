import { useEffect, useMemo, useState } from 'react';
import { AppConfig, ClassInfo } from '../types';
import { HolidayCalendar, loadHolidayCalendar, todayInMorocco } from '../utils/calendar';
import {
    PlannedAssessment,
    UpcomingAssessment,
    applyOverrides,
    computeAssessmentDates,
    findPlanFor,
    getUpcomingAssessments,
    loadPlanning,
} from '../utils/assessments';

interface PlanningFileLike {
    version: number;
    matiere: string;
    plans: { niveaux: string[]; libelle: string; semestres: any[] }[];
}

/** Charge le planning officiel + le calendrier (une fois), puis les expose. */
const useCalendarAndPlanning = () => {
    const [calendar, setCalendar] = useState<HolidayCalendar | null>(null);
    const [planning, setPlanning] = useState<PlanningFileLike | null>(null);

    useEffect(() => {
        let cancelled = false;
        Promise.all([loadHolidayCalendar(), loadPlanning()]).then(([cal, plan]) => {
            if (cancelled) return;
            setCalendar(cal);
            setPlanning(plan as PlanningFileLike | null);
        });
        return () => { cancelled = true; };
    }, []);

    return { calendar, planning };
};

/** Devoirs proches (≤ horizon jours) sur toutes les classes — pour la bannière du dashboard. */
export const useUpcomingAssessments = (
    classes: ClassInfo[],
    config: AppConfig,
    horizonDays = 14
): UpcomingAssessment[] => {
    const { calendar, planning } = useCalendarAndPlanning();

    return useMemo(() => {
        if (!calendar || !planning) return [];
        const today = todayInMorocco(new Date(), calendar);
        return getUpcomingAssessments(classes, planning as any, config, calendar, today, horizonDays);
    }, [calendar, planning, classes, config.assessmentDates, horizonDays]);
};

/** Planning complet d'UNE classe (dates officielles + surcharges du prof) — pour l'onglet Emploi du temps. */
export const useClassAssessments = (
    classInfo: ClassInfo | null,
    config: AppConfig
): { assessments: PlannedAssessment[]; hasPlan: boolean } => {
    const { calendar, planning } = useCalendarAndPlanning();

    return useMemo(() => {
        if (!calendar || !planning || !classInfo) return { assessments: [], hasPlan: false };
        const plan = findPlanFor(planning as any, classInfo);
        if (!plan) return { assessments: [], hasPlan: false };
        const today = todayInMorocco(new Date(), calendar);
        const base = computeAssessmentDates(plan as any, calendar, today);
        const withOverrides = applyOverrides(base, config.assessmentDates?.[classInfo.id]);
        return { assessments: withOverrides, hasPlan: true };
    }, [calendar, planning, classInfo, config.assessmentDates]);
};
