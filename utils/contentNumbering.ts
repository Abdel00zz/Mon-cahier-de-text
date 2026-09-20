import type { LessonsData } from '../types.js';
import { buildLessonRows, type LessonRow } from './lessonRows.js';
import { normalizeContentType } from '../constants/type-keys.js';

/**
 * Numérotation des contenus pédagogiques : « Définition 1 », « Exemple 2 »,
 * « Application 1 »… Chaque type possède son propre compteur, et le compteur
 * repart de 1 à chaque chapitre, comme dans un manuel scolaire.
 *
 * Le professeur garde toujours le dernier mot : un numéro saisi à la main
 * (`item.number`) prime sur le calcul. Un entier fait avancer le compteur ;
 * une référence libre (« 2bis », « A ») reste affichée telle quelle.
 *
 * Sont exclus :
 *  - les structures (chapitre, section, sous-section, séparateur) ;
 *  - les évaluations (devoir, contrôle, correction, examen), qui numérotent
 *    déjà leur titre via `autoNumber` (voir TYPE_MAP).
 * Tout le reste est numéroté : définitions, propositions, théorèmes, mais
 * aussi exemples, exercices, activités, conclusions… comme dans un manuel.
 */


/** Structures : elles organisent le plan, elles ne reçoivent pas de numéro. */
const STRUCTURAL_TYPES = new Set(['chapter', 'section', 'subsection', 'subsubsection', 'separator']);

/** Évaluations : leur numéro est déjà porté par le titre (« Contrôle continu 2 »). */
const EVALUATION_TYPES = /^(?:evaluation|devoir|controle|correction|examen|diagnostic|assessment|homework|test|exam|dm|ds|cc)(?:_|$)/;

const typeKey = (value: unknown): string => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

const isNumberableRow = (row: LessonRow): boolean =>
    !STRUCTURAL_TYPES.has(row.elementType) && !EVALUATION_TYPES.test(typeKey(rowType(row)));

const rowType = (row: LessonRow): string => String((row.data as { type?: unknown }).type ?? '');

const explicitNumber = (row: LessonRow): string | undefined => {
    const value = (row.data as { number?: unknown }).number;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
};

/**
 * Numéro à afficher pour chaque ligne de contenu, indexé par la clé canonique
 * de ligne (`indicesKey`) — la même que celle du rendu à l'écran et du papier.
 * Les numéros saisis sont conservés ; les alias d'un type partagent le compteur.
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
        const type = normalizeContentType(rowType(row).trim().toLowerCase());
        let counter = counters.get(type) ?? 0;
        const declared = explicitNumber(row);
        if (declared) {
            // Le numéro écrit à la main prime ET fait avancer le compteur, sinon
            // la suite automatique contredirait la saisie.
            numbers.set(row.key, declared);
            const digits = declared.replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) - (digit <= '٩' ? 0x660 : 0x6f0)));
            const parsed = /^\d+$/.test(digits) ? Number(digits) : NaN;
            if (Number.isSafeInteger(parsed) && parsed > counter) counters.set(type, parsed);
            continue;
        }
        counter += 1;
        counters.set(type, counter);
        numbers.set(row.key, String(counter));
    }
    return numbers;
};
