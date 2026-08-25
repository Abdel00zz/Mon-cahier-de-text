import { AppConfig } from '../types.js';

const CONFIG_STORAGE_KEY = 'appConfig_v1';

interface CachedConfig {
    raw: string | null;
    config: Partial<AppConfig>;
}

let cached: CachedConfig | null = null;

/**
 * Lecture partagée des réglages locaux, pendant de `readCachedLessons` pour la
 * plus grosse valeur du stockage (emploi du temps, devoirs, absences,
 * évènements, masquages…).
 *
 * L'invalidation repose sur la chaîne JSON elle-même, pas sur un évènement :
 * toute écriture — `useConfigManager`, pull cloud, import de sauvegarde,
 * masquage d'alerte — change le texte stocké, donc le prochain appel reparse
 * sans qu'aucun écrivain n'ait à se déclarer. Un cache à invalidation explicite
 * aurait ajouté une règle que chaque nouvel écrivain pourrait oublier.
 *
 * L'objet renvoyé est PARTAGÉ : il est destiné à la lecture seule. Les chemins
 * qui réécrivent la configuration (SyncContext, AuthContext) gardent leur
 * propre parse pour pouvoir muter librement leur copie.
 */
export const readCachedConfig = (): Partial<AppConfig> => {
    try {
        const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
        if (cached?.raw === raw) return cached.config;
        const parsed = raw ? (JSON.parse(raw) as Partial<AppConfig>) : {};
        const config = parsed && typeof parsed === 'object' ? parsed : {};
        cached = { raw, config };
        return config;
    } catch {
        return {};
    }
};
