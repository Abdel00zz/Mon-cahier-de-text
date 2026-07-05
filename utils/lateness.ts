import { AbsencePeriod, NotificationSettings, ScheduleSlot } from '../types';
import {
    HolidayCalendar,
    countExpectedSessions,
    countSchoolDaysBetween,
    getSchoolYearStart,
    todayInMorocco,
} from './calendar';

/**
 * Les absences justifiées (certificat de maladie, congé) sont traitées comme
 * des « vacances personnelles » : fusionnées dans le calendrier, elles sont
 * automatiquement exclues des séances attendues ET des jours d'inactivité.
 */
export const withAbsences = (calendar: HolidayCalendar, absences?: AbsencePeriod[]): HolidayCalendar => {
    if (!absences || absences.length === 0) return calendar;
    return {
        ...calendar,
        vacances: [
            ...calendar.vacances,
            ...absences
                .filter(a => a.debut && a.fin && a.debut <= a.fin)
                .map(a => ({ nom: a.motif || 'Absence justifiée', debut: a.debut, fin: a.fin })),
        ],
    };
};

export type LatenessSeverity = 'ok' | 'notice' | 'warning' | 'critical';

export interface LatenessInput {
    slots: ScheduleSlot[];
    calendar: HolidayCalendar;
    sessionsCount: number;
    lastDate?: string | null;
    from?: string;
    today?: string;
    settings?: Pick<NotificationSettings, 'gapThreshold' | 'inactivityThresholdDays'>;
    /** certificats de maladie / congés : exclus des séances attendues */
    absences?: AbsencePeriod[];
}

export interface LatenessResult {
    expectedSessions: number;
    actualSessions: number;
    gapSessions: number;
    daysSinceLastEntry: number | null;
    severity: LatenessSeverity;
}

const DEFAULT_GAP_THRESHOLD = 2;
const DEFAULT_INACTIVITY_DAYS = 5;

export const computeLateness = (input: LatenessInput): LatenessResult => {
    const { slots, sessionsCount } = input;
    // Le calendrier effectif intègre les absences justifiées de l'enseignant.
    const calendar = withAbsences(input.calendar, input.absences);
    const gapThreshold = input.settings?.gapThreshold ?? DEFAULT_GAP_THRESHOLD;
    const inactivityThreshold = input.settings?.inactivityThresholdDays ?? DEFAULT_INACTIVITY_DAYS;

    const today = input.today ?? todayInMorocco(new Date(), calendar);
    const from = input.from ?? getSchoolYearStart(calendar, today);

    if (!slots.length) {
        return { expectedSessions: 0, actualSessions: sessionsCount, gapSessions: 0, daysSinceLastEntry: null, severity: 'ok' };
    }

    const expectedSessions = countExpectedSessions(from, today, slots, calendar);
    const gapSessions = Math.max(0, expectedSessions - sessionsCount);

    const weekdays = slots.map(slot => slot.weekday);
    let daysSinceLastEntry: number | null = null;
    if (input.lastDate) {
        // jours de classe écoulés depuis le lendemain de la dernière saisie
        const dayAfter = input.lastDate < today ? input.lastDate : today;
        daysSinceLastEntry = countSchoolDaysBetween(dayAfter, today, weekdays, calendar);
        if (input.lastDate < today && daysSinceLastEntry > 0) daysSinceLastEntry -= 1; // exclure le jour de la saisie
        daysSinceLastEntry = Math.max(0, daysSinceLastEntry);
    }

    let severity: LatenessSeverity = 'ok';
    if (gapSessions >= gapThreshold * 3) severity = 'critical';
    else if (gapSessions >= gapThreshold * 2 || (daysSinceLastEntry !== null && daysSinceLastEntry >= inactivityThreshold)) severity = 'warning';
    else if (gapSessions >= gapThreshold) severity = 'notice';

    return { expectedSessions, actualSessions: sessionsCount, gapSessions, daysSinceLastEntry, severity };
};

export const formatLatenessMessage = (result: LatenessResult, className: string): string => {
    if (result.severity === 'critical') {
        return `${className} a besoin de vous : environ ${result.gapSessions} séances de retard depuis la dernière mise à jour.`;
    }
    if (result.severity === 'warning') {
        if (result.daysSinceLastEntry !== null && result.daysSinceLastEntry >= 1) {
            return `Dernière saisie il y a ${result.daysSinceLastEntry} jour(s) de classe en ${className}. Un petit rattrapage ?`;
        }
        return `Attention : environ ${result.gapSessions} séances de retard en ${className}.`;
    }
    if (result.severity === 'notice') {
        return `Pensez à mettre à jour votre cahier : environ ${result.gapSessions} séance(s) de retard en ${className}.`;
    }
    return `${className} est à jour. Continuez ainsi !`;
};

export interface ClassLateness extends LatenessResult {
    classId: string;
    className: string;
}

const SEVERITY_RANK: Record<LatenessSeverity, number> = { ok: 0, notice: 1, warning: 2, critical: 3 };

export const worstSeverity = (results: ClassLateness[]): LatenessSeverity =>
    results.reduce<LatenessSeverity>((worst, r) => (SEVERITY_RANK[r.severity] > SEVERITY_RANK[worst] ? r.severity : worst), 'ok');

export const summarizeForTeacher = (results: ClassLateness[]): { title: string; body: string; severity: LatenessSeverity } | null => {
    const flagged = results.filter(r => r.severity !== 'ok');
    if (flagged.length === 0) return null;

    flagged.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.gapSessions - a.gapSessions);
    const severity = flagged[0].severity;

    if (flagged.length === 1) {
        return { title: 'Cahier de textes', body: formatLatenessMessage(flagged[0], flagged[0].className), severity };
    }
    const names = flagged.slice(0, 3).map(r => r.className).join(', ');
    return {
        title: `${flagged.length} classes à mettre à jour`,
        body: `${names}${flagged.length > 3 ? '…' : ''} ont besoin d'une mise à jour de leur cahier.`,
        severity,
    };
};
