/**
 * Envoi cloud des réglages structurants (emploi du temps).
 *
 * Le professeur règle sa grille case par case : la modification doit partir tout
 * de suite — l'ouverture automatique d'une séance, les rappels et le repère
 * « séance en cours » s'appuient dessus. Mais une rafale d'édition doit rester
 * coalescente : une grille de trente cases ne doit pas produire trente requêtes.
 *
 * D'où deux bornes : réactif (300 ms) sur un changement isolé, et jamais deux
 * envois à moins de deux secondes d'écart quand les modifications s'enchaînent.
 */
export const SETTINGS_PUSH_DELAY_MS = 300;
export const SETTINGS_PUSH_MIN_INTERVAL_MS = 2_000;

/** Clés dont la modification déclenche l'envoi immédiat. */
const IMMEDIATE_SETTINGS_KEYS: ReadonlySet<string> = new Set(['timetable', 'schedules']);

export const touchesImmediateSettings = (keys: readonly string[] | undefined): boolean =>
    Boolean(keys?.some(key => IMMEDIATE_SETTINGS_KEYS.has(key)));

/** Délai du prochain envoi, `lastScheduledAt` étant l'échéance déjà programmée. */
export const settingsPushDelay = (now: number, lastScheduledAt: number): number =>
    Math.max(SETTINGS_PUSH_DELAY_MS, lastScheduledAt + SETTINGS_PUSH_MIN_INTERVAL_MS - now);
