import { AppConfig, AppLocale, ClassInfo } from '../types.js';
import { formatLocalizedClassDisplayName } from '../constants.js';
import {
    HolidayCalendar,
    getEffectiveSchoolYear,
    getBundledCalendar,
    isWithinKnownSchoolYear,
    localizeCalendarName,
} from './calendar.js';
import { translateLocaleMessage } from '../i18n/LocaleProvider.js';

/**
 * Moteur de validation intelligente des dates de séance.
 *
 * Quand le prof affecte une date à un contenu, on croise cette date avec :
 *  1. son EMPLOI DU TEMPS  → enseigne-t-il cette classe ce jour-là ?
 *  2. les JOURS FÉRIÉS     → « c'est l'Aïd al-Fitr ce jour-là »
 *  3. les VACANCES         → « c'est les vacances de printemps »
 *  4. ses ABSENCES         → « vous étiez en congé maladie à cette date »
 *  5. l'ANNÉE SCOLAIRE     → date hors année scolaire
 *
 * Les avertissements sont NON bloquants : le prof reste maître (rattrapage,
 * séance exceptionnelle...), mais il est prévenu immédiatement.
 */

type DateWarningType = 'invalid' | 'not-scheduled' | 'holiday' | 'vacation' | 'absence' | 'out-of-year';

export interface DateWarning {
    type: DateWarningType;
    message: string;
}

const getWeekday = (iso: string): number => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

export const validateSessionDate = (
    date: string,
    classInfo: Pick<ClassInfo, 'id' | 'name'>,
    config: Pick<AppConfig, 'schedules' | 'absences' | 'schoolYearStart'>,
    locale: AppLocale = 'fr',
    calendar: HolidayCalendar = getBundledCalendar()
): DateWarning[] => {
    const t = (key: string, values?: Record<string, string | number>) => translateLocaleMessage(locale, key, values);
    const localeCode = locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA';
    const warnings: DateWarning[] = [];
    const iso = (date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return warnings;
    const [year, month, day] = iso.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
        return [{ type: 'invalid', message: t('dateWarning.invalid') }];
    }

    // 1. Emploi du temps : le prof enseigne-t-il cette classe ce jour-là ?
    const schedule = config.schedules?.find(s => s.classId === classInfo.id);
    if (schedule && schedule.slots.length > 0) {
        const weekday = getWeekday(iso);
        if (!schedule.slots.some(slot => slot.weekday === weekday)) {
            warnings.push({
                type: 'not-scheduled',
                message: t('dateWarning.notScheduled', {
                    className: formatLocalizedClassDisplayName(classInfo.name, locale),
                    weekday: new Intl.DateTimeFormat(localeCode, { weekday: 'long', timeZone: 'UTC' }).format(parsed),
                }),
            });
        }
    }

    // 2. Jour férié
    const ferie = calendar.joursFeries.find(f => f.date === iso);
    if (ferie) {
        warnings.push({
            type: 'holiday',
            message: t('dateWarning.holiday', {
                name: localizeCalendarName(ferie.nom, locale),
                estimate: ferie.approximatif ? t('dateWarning.estimated') : '',
            }),
        });
    }

    // 3. Vacances scolaires
    const vacance = calendar.vacances.find(v => iso >= v.debut && iso <= v.fin);
    if (vacance) {
        warnings.push({
            type: 'vacation',
            message: t('dateWarning.vacation', { name: localizeCalendarName(vacance.nom, locale) }),
        });
    }

    // 4. Absence justifiée (certificat de maladie, congé...)
    const absence = config.absences?.find(a => iso >= a.debut && iso <= a.fin);
    if (absence) {
        warnings.push({
            type: 'absence',
            message: t('dateWarning.absence', { reason: absence.motif ? ` (${absence.motif})` : '' }),
        });
    }

    // 5. Si le professeur a choisi sa rentrée, elle devient la référence
    // stricte. Sinon, on conserve la validation multi-années du calendrier.
    const selectedYear = config.schoolYearStart
        ? getEffectiveSchoolYear(calendar, config.schoolYearStart, iso)
        : null;
    const isInSchoolYear = selectedYear
        ? iso >= selectedYear.debut && iso <= selectedYear.fin
        : isWithinKnownSchoolYear(calendar, iso);
    if (!isInSchoolYear) {
        warnings.push({
            type: 'out-of-year',
            message: selectedYear
                ? t('dateWarning.outOfYear', { year: selectedYear.libelle })
                : t('dateWarning.outOfKnownYears'),
        });
    }

    return warnings;
};
