import type { LessonsData } from '../types.js';
import { isNonCourseActivity } from './chapterLifecycle.js';
import { buildLessonRows, type LessonRow } from './lessonRows.js';

/**
 * Numérotation des contenus pédagogiques : « Définition 1 », « Exemple 2 »,
 * « Application 1 »… Chaque type possède son propre compteur, et le compteur
 * repart de 1 à chaque chapitre, comme dans un manuel scolaire.
 *
 * Le professeur garde toujours le dernier mot : un numéro saisi à la main
 * (`item.number`) prime sur le calcul, et fait repartir le compteur juste après
 * lui — sans quoi la suite automatique contredirait la saisie.
 *
 * Sont exclus :
 *  - les structures (chapitre, section, sous-section, séparateur) ;
 *  - les activités non pédagogiques (évaluations, devoirs, corrections), qui
 *    portent déjà leur numéro dans leur titre (voir `autoNumber` dans TYPE_MAP).
 */


const isNumberableRow = (row: LessonRow): boolean =>
    row.elementType === 'item' && !isNonCourseActivity((row.data as { type?: unknown }).type);

const rowType = (row: LessonRow): string => String((row.data as { type?: unknown }).type ?? '');

const explicitNumber = (row: LessonRow): string | undefined => {
    const value = (row.data as { number?: unknown }).number;
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
};

/**
 * Numéro à afficher pour chaque ligne de contenu, indexé par la clé canonique
 * de ligne (`indicesKey`) — la même que celle du rendu à l'écran et du papier.
 * Un numéro saisi à la main n'apparaît pas dans la carte : l'appelant garde la
 * priorité sur la saisie.
 */
export const buildContentNumbers = (lessons: LessonsData, enabled = true): Map<string, string> => {
    const numbers = new Map<string, string>();
    if (!enabled) return numbers;
    const counters = new Map<string, number>();
    let chapterIndex = -1;
    for (const row of buildLessonRows(lessons)) {
        if (!isNumberableRow(row)) continue;
        if (row.indices.chapterIndex !== chapterIndex) {
            chapterIndex = row.indices.chapterIndex ?? -1;
            counters.clear();
        }
        const type = rowType(row);
        let counter = counters.get(type) ?? 0;
        const declared = explicitNumber(row);
        if (declared) {
            const parsed = Number.parseInt(declared, 10);
            if (Number.isFinite(parsed) && parsed > counter) counters.set(type, parsed);
            continue;
        }
        counter += 1;
        counters.set(type, counter);
        numbers.set(row.key, String(counter));
    }
    return numbers;
};
