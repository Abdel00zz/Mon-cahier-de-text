import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AppConfig, ClassInfo } from '../types';
import { SessionBlock, getDaySessionBlocks } from '../utils/timetable';
import { collectSessionDates } from '../utils/printMeta';
import { isHoliday, isVacation, loadHolidayCalendar, toISODate } from '../utils/calendar';
import { withAbsences } from '../utils/lateness';
import { subscribe } from '../utils/syncBus';
import { showLocalNotification } from '../utils/push';

/**
 * Rappels locaux de fin de séance — client uniquement, temps réel, aucun
 * aller-retour serveur (distinct du cron quotidien `api/notify`).
 *
 * Deux déclencheurs par bloc de séance du jour (blocs fusionnés : une séance
 * de 2 h = un seul rappel, cohérent avec le moteur de retard) :
 *   1. une minute avant la fin réelle de la séance → vibration de rappel ;
 *   2. à la fin de la séance, si aucune date n'a été affectée aujourd'hui
 *      dans le cahier de la classe → vibration d'alerte.
 *
 * Signal unique vibration + toast (pas de double signal), alertes simultanées
 * regroupées en un seul message. Silence total les jours fériés, vacances et
 * absences justifiées. Mécanisme désactivable (Configuration ▸ Notifications),
 * spécifique à l'appareil — jamais synchronisé (comme `pushEnabled`).
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

const readConfig = (): Partial<AppConfig> => {
    try {
        const raw = localStorage.getItem('appConfig_v1');
        return raw ? (JSON.parse(raw) as Partial<AppConfig>) : {};
    } catch {
        return {};
    }
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
        return () => {
            unsubDirty();
            unsubPull();
        };
    }, []);

    useEffect(() => {
        const config = readConfig();
        const notify = config.notificationSettings;
        if (!notify?.enabled || !notify.sessionVibration) return;
        const timetable = config.timetable ?? [];
        if (timetable.length === 0) return;

        let cancelled = false;
        const timers: number[] = [];

        (async () => {
            const calendar = withAbsences(await loadHolidayCalendar(), config.absences);
            if (cancelled) return;

            const now = new Date();
            const todayISO = toISODate(now);
            // jour sans classe (férié, vacances, absence justifiée) : silence total
            if (isHoliday(todayISO, calendar) || isVacation(todayISO, calendar)) return;

            const blocks = getDaySessionBlocks(timetable, now.getDay());
            if (blocks.length === 0) return;

            const classNames = new Map(readClasses().map(c => [c.id, c.name]));
            const nameOf = (classId: string): string => classNames.get(classId) ?? 'votre classe';
            const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

            // blocs partageant la même fin → un seul signal groupé (règle §Q)
            const byEnd = new Map<number, SessionBlock[]>();
            for (const block of blocks) {
                if (!byEnd.has(block.endMin)) byEnd.set(block.endMin, []);
                byEnd.get(block.endMin)!.push(block);
            }

            for (const [endMin, group] of byEnd) {
                const names = group.map(g => nameOf(g.classId)).join(', ');

                // 1) rappel une minute avant la fin réelle de la séance —
                // triple couche : vibration + toast (app ouverte) + notification
                // SYSTÈME (volet du téléphone, app en arrière-plan/écran éteint)
                const reminderDelay = (endMin - 1 - nowMin) * 60_000;
                if (reminderDelay > 0) {
                    timers.push(window.setTimeout(() => {
                        const message = `Fin de séance dans 1 minute (${names}). Pensez à dater le travail effectué.`;
                        vibrate([200, 100, 200]);
                        toast.info(message);
                        void showLocalNotification('Fin de séance imminente', message, `cdt-session-end-${todayISO}-${endMin}`);
                    }, reminderDelay));
                }

                // 2) fin de séance : alerte si aucune date affectée aujourd'hui
                const endDelay = (endMin - nowMin) * 60_000;
                if (endDelay > 0) {
                    timers.push(window.setTimeout(() => {
                        const missing = group
                            .filter(g => !hasDateToday(g.classId, todayISO))
                            .map(g => nameOf(g.classId));
                        if (missing.length === 0) return;
                        const message =
                            missing.length === 1
                                ? `Séance terminée : aucune date affectée aujourd'hui en ${missing[0]}. Vous pouvez la poser quand vous voulez.`
                                : `${missing.length} séances terminées sans date affectée (${missing.join(', ')}).`;
                        vibrate([300, 120, 300, 120, 300]);
                        toast.warning(message);
                        void showLocalNotification('Date de séance à poser', message, `cdt-session-missing-${todayISO}-${endMin}`);
                    }, endDelay));
                }
            }
        })();

        // re-planification au passage de minuit (30 s de marge)
        const nextMidnight = new Date();
        nextMidnight.setHours(24, 0, 30, 0);
        const midnightTimer = window.setTimeout(
            () => setTick(t => t + 1),
            nextMidnight.getTime() - Date.now()
        );

        return () => {
            cancelled = true;
            timers.forEach(id => window.clearTimeout(id));
            window.clearTimeout(midnightTimer);
        };
    }, [tick]);
};
