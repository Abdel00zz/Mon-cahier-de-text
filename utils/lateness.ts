import { AbsencePeriod, AppLocale, NotificationSettings, ScheduleSlot } from '../types.js';
import { scheduleClassLabel } from './classAbbreviation.js';
import { classIdentityFor } from './classIdentity.js';
import { conciseNotificationText } from './notificationPresentation.js';
import {
    HolidayCalendar,
    countExpectedSessions,
    countSchoolDaysBetween,
    getSchoolYearStart,
    todayInMorocco,
} from './calendar.js';

/**
 * Les absences justifiées (certificat de maladie, congé) sont traitées comme
 * des « vacances personnelles » : fusionnées dans le calendrier, elles sont
 * automatiquement exclues des séances attendues ET des jours d'inactivité.
 */
const withAbsences = (calendar: HolidayCalendar, absences?: AbsencePeriod[]): HolidayCalendar => {
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

export interface ClassLateness extends LatenessResult {
    classId: string;
    className: string;
}

const SEVERITY_RANK: Record<LatenessSeverity, number> = { ok: 0, notice: 1, warning: 2, critical: 3 };

export const worstSeverity = (results: ClassLateness[]): LatenessSeverity =>
    results.reduce<LatenessSeverity>((worst, r) => (SEVERITY_RANK[r.severity] > SEVERITY_RANK[worst] ? r.severity : worst), 'ok');

export const summarizeForTeacher = (
    results: ClassLateness[],
    locale: AppLocale = 'fr',
): { title: string; body: string; severity: LatenessSeverity; url: string } | null => {
    const flagged = results.filter(r => r.severity !== 'ok');
    if (flagged.length === 0) return null;

    flagged.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.gapSessions - a.gapSessions);
    const severity = flagged[0].severity;
    const label = (item: ClassLateness) => conciseNotificationText(scheduleClassLabel(classIdentityFor(item.className, locale), locale, true), 38);

    if (flagged.length === 1) {
        const item = flagged[0];
        const title = `${label(item)} — ${locale === 'ar' ? 'مراجعة الدفتر' : locale === 'en' ? 'Check notebook' : 'Cahier à vérifier'}`;
        const gap = item.gapSessions;
        const body = gap > 0
            ? locale === 'ar' ? `نحو ${gap} حصص قد تحتاج إلى التدوين. افتح الدفتر للتحقق.`
                : locale === 'en' ? `About ${gap} session(s) may need entering. Open the notebook to check.`
                : `Environ ${gap} séance${gap > 1 ? 's' : ''} à renseigner. Ouvrez le cahier pour vérifier.`
            : locale === 'ar' ? 'لم يُسجَّل تدوين حديث. افتح الدفتر للتحقق.'
                : locale === 'en' ? 'No recent entry. Open the notebook to check.'
                : 'Aucune saisie récente. Ouvrez le cahier pour vérifier.';
        return { title, body, severity, url: `/#/classe/${encodeURIComponent(item.classId)}` };
    }
    const names = flagged.slice(0, 2).map(label).join(locale === 'ar' ? '، ' : ', ');
    const suffix = flagged.length > 2 ? ` (+${flagged.length - 2})` : '';
    const url = '/#/notifications';
    if (locale === 'ar') {
        return {
            title: `${flagged.length} أقسام تحتاج إلى التحيين`,
            body: `${names}${suffix}. افتح القائمة لمراجعة الحصص.`,
            severity,
            url,
        };
    }
    if (locale === 'en') {
        return {
            title: `${flagged.length} classes need updating`,
            body: `${names}${suffix}. Open the list to review sessions.`,
            severity,
            url,
        };
    }
    return {
        title: `${flagged.length} classes à compléter`,
        body: `${names}${suffix}. Consultez les séances à vérifier.`,
        severity,
        url,
    };
};
