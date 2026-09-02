import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ClassInfo } from '../types';
import { SessionBlock, getDaySessionBlocks } from '../utils/timetable';
import { collectSessionDates } from '../utils/printMeta';
import { isHoliday, isVacation, loadHolidayCalendar, todayInMorocco } from '../utils/calendar';
import { withAbsences } from '../utils/lateness';
import { readCachedConfig } from '../utils/configStorage';
import { subscribe } from '../utils/syncBus';
import { showLocalNotification } from '../utils/push';
import { translateLocaleMessage } from '../i18n/LocaleProvider';

/**
 * Rappels locaux de fin de séance, client uniquement, temps réel, aucun
 * aller-retour serveur (distinct du cron quotidien `api/notify`).
 *
 * Deux déclencheurs par bloc de séance du jour (blocs fusionnés : une séance
 * de 2 h = un seul rappel, cohérent avec le moteur de retard) :
 *   1. une minute avant la fin réelle de la séance → vibration de rappel ;
 *   2. cinq minutes après la séance, si aucune date n'a été affectée
 *      aujourd'hui dans le cahier de la classe → vibration d'alerte.
 *
 * Les alertes simultanées sont regroupées en un seul message et réclamées par
 * un seul onglet. Les absences justifiées restent silencieuses ; les vacances
 * suivent la préférence du professeur. Mécanisme désactivable (Configuration
 * ▸ Notifications), spécifique à l'appareil, jamais synchronisé (comme
 * `pushEnabled`).
 *
 * Le hook lit la configuration directement depuis le localStorage et se
 * re-planifie sur les événements du syncBus : il reste ainsi à jour quel que
 * soit le composant qui modifie les réglages (les instances de
 * `useConfigManager` ne partagent pas leur état React).
 */

const vibrate = (pattern: number | number[]): void => {
    try {
        navigator.vibrate?.(pattern);
    } catch {
        // API indisponible (desktop, iOS hors PWA) : le toast reste le signal
    }
};

const ALERT_CLAIMS_KEY = 'session_alert_claims_v1';
const ALERT_CLAIM_TTL_MS = 20 * 60_000;
const MISSING_DATE_GRACE_MINUTES = 5;

/**
 * Evite qu'un même rappel fasse vibrer et toaster plusieurs fois lorsque
 * plusieurs onglets de l'application sont ouverts. La notification système
 * est déjà dédupliquée par son `tag`, mais pas les deux signaux de page.
 */
const claimAlert = (tag: string): boolean => {
    try {
        const now = Date.now();
        const stored = JSON.parse(localStorage.getItem(ALERT_CLAIMS_KEY) || '{}') as Record<string, unknown>;
        const claims = Object.fromEntries(
            Object.entries(stored).filter(([, value]) => typeof value === 'number' && now - value < ALERT_CLAIM_TTL_MS)
        ) as Record<string, number>;
        if (claims[tag]) return false;
        claims[tag] = now;
        localStorage.setItem(ALERT_CLAIMS_KEY, JSON.stringify(claims));
        return true;
    } catch {
        // Le stockage peut être indisponible en navigation privée. Mieux vaut
        // conserver le rappel dans l'onglet courant que le perdre totalement.
        return true;
    }
};

const clockMinutesInZone = (now: Date, timeZone: string): number => {
    try {
        const parts = new Intl.DateTimeFormat('fr-FR', {
            timeZone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23',
        }).formatToParts(now);
        const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value ?? 0);
        return value('hour') * 60 + value('minute') + value('second') / 60;
    } catch {
        return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    }
};

const weekdayFromISO = (iso: string): number => {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
};

const readClasses = (): ClassInfo[] => {
    try {
        return JSON.parse(localStorage.getItem('classManager_v1') || '[]') as ClassInfo[];
    } catch {
        return [];
    }
};

/** Une date de séance est-elle déjà posée aujourd'hui dans le cahier de cette classe ? */
const hasDateToday = (classId: string, todayISO: string): boolean => {
    try {
        const raw = localStorage.getItem(`classData_v1_${classId}`);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        const lessons = Array.isArray(parsed) ? parsed : (parsed.lessonsData ?? []);
        return collectSessionDates(lessons).includes(todayISO);
    } catch {
        return false;
    }
};

export const useSessionAlerts = (): void => {
    // re-planification : passage de minuit ou réglages/données modifiés
    const [tick, setTick] = useState(0);

    // les réglages voyagent par le localStorage : on écoute le syncBus pour
    // capter toute modification (ConfigModal, pull cloud), peu importe
    // l'instance de useConfigManager qui l'a écrite
    useEffect(() => {
        const bump = () => setTick(t => t + 1);
        const unsubDirty = subscribe('dirty', bump);
        const unsubPull = subscribe('pull-applied', bump);
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') bump();
        };
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => {
            unsubDirty();
            unsubPull();
            document.removeEventListener('visibilitychange', onVisibilityChange);
        };
    }, []);

    useEffect(() => {
        const config = readCachedConfig();
        const t = (key: string, values: Record<string, string | number> = {}) =>
            translateLocaleMessage(config.applicationLocale ?? 'ar', key, values);
        const notify = config.notificationSettings;
        if (!notify?.enabled || !notify.sessionVibration) return;
        const timetable = config.timetable ?? [];
        if (timetable.length === 0) return;

        let cancelled = false;
        const timers: number[] = [];

        (async () => {
            const schoolCalendar = await loadHolidayCalendar();
            const calendar = withAbsences(schoolCalendar, config.absences);
            if (cancelled) return;

            const now = new Date();
            const todayISO = todayInMorocco(now, calendar);
            const isTeacherAbsent = config.absences?.some(period => todayISO >= period.debut && todayISO <= period.fin) ?? false;
            // Une absence justifiée reste toujours silencieuse. Pour les congés
            // scolaires, le choix explicite de l'enseignant est enfin respecté.
            if (isTeacherAbsent) return;
            if (notify.quietDuringVacations && (isHoliday(todayISO, schoolCalendar) || isVacation(todayISO, schoolCalendar))) return;

            const blocks = getDaySessionBlocks(timetable, weekdayFromISO(todayISO));
            if (blocks.length === 0) return;

            const classNames = new Map(readClasses().map(c => [c.id, c.name]));
            const nameOf = (classId: string): string => classNames.get(classId) ?? t('sessionAlert.classFallback');
            const nowMin = clockMinutesInZone(now, calendar.fuseau);
            const isFresh = (targetMinute: number, lateToleranceMinutes: number): boolean => {
                const firedAt = new Date();
                if (todayInMorocco(firedAt, calendar) !== todayISO) return false;
                const firedMinute = clockMinutesInZone(firedAt, calendar.fuseau);
                return firedMinute >= targetMinute - 0.25 && firedMinute <= targetMinute + lateToleranceMinutes;
            };

            // blocs partageant la même fin → un seul signal groupé (règle §Q)
            const byEnd = new Map<number, SessionBlock[]>();
            for (const block of blocks) {
                if (!byEnd.has(block.endMin)) byEnd.set(block.endMin, []);
                byEnd.get(block.endMin)!.push(block);
            }

            for (const [endMin, group] of byEnd) {
                const names = group.map(g => nameOf(g.classId)).join(', ');

                // 1) rappel une minute avant la fin réelle de la séance -
                // triple couche : vibration + toast (app ouverte) + notification
                // SYSTÈME (volet du téléphone, app en arrière-plan/écran éteint)
                const reminderDelay = (endMin - 1 - nowMin) * 60_000;
                if (reminderDelay > 0) {
                    timers.push(window.setTimeout(() => {
                        const tag = `cdt-session-end-${todayISO}-${endMin}`;
                        // Un onglet gelé peut reprendre plusieurs heures plus
                        // tard : ne jamais émettre alors un rappel périmé.
                        if (!isFresh(endMin - 1, 2) || !claimAlert(tag)) return;
                        const message = t('sessionAlert.endSoonBody', { classes: names });
                        const url = group.length === 1 ? `/#/classe/${encodeURIComponent(group[0].classId)}` : '/';
                        vibrate([200, 100, 200]);
                        toast.info(message);
                        void showLocalNotification(t('sessionAlert.endSoonTitle'), message, tag, url);
                    }, reminderDelay));
                }

                // 2) cinq minutes après la séance : l'enseignant dispose d'un
                // court délai pour dater le contenu avant l'alerte.
                const missingTargetMin = endMin + MISSING_DATE_GRACE_MINUTES;
                const endDelay = (missingTargetMin - nowMin) * 60_000;
                if (endDelay > 0) {
                    timers.push(window.setTimeout(() => {
                        const tag = `cdt-session-missing-${todayISO}-${endMin}`;
                        if (!isFresh(missingTargetMin, 10) || !claimAlert(tag)) return;
                        const missingBlocks = group.filter(g => !hasDateToday(g.classId, todayISO));
                        const missing = missingBlocks.map(g => nameOf(g.classId));
                        if (missing.length === 0) return;
                        const url = missingBlocks.length === 1 ? `/#/classe/${encodeURIComponent(missingBlocks[0].classId)}` : '/';
                        const message = missing.length === 1
                            ? t('sessionAlert.missingDateOne', { className: missing[0] })
                            : t('sessionAlert.missingDateMany', { count: missing.length, classes: missing.join(', ') });
                        vibrate([300, 120, 300, 120, 300]);
                        toast.warning(message);
                        void showLocalNotification(t('sessionAlert.missingDateTitle'), message, tag, url);
                    }, endDelay));
                }
            }
        })();

        // Revalidation légère : suit un changement de jour/fuseau et les
        // ajustements d'heure du Maroc sans dépendre de l'horloge du téléphone.
        const refreshTimer = window.setTimeout(() => setTick(t => t + 1), 30 * 60_000);

        return () => {
            cancelled = true;
            timers.forEach(id => window.clearTimeout(id));
            window.clearTimeout(refreshTimer);
        };
    }, [tick]);
};
