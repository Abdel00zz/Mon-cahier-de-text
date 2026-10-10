import type { ContentNumbering, LessonsData } from '../../types.js';
import { buildLessonRows, type LessonRow } from './lessonRows.js';
import { isFreeContent } from './freeLineType.js';

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
 *  - les lignes libres, qui n'appartiennent pas au plan du cours ;
 *  - les évaluations (devoir, contrôle, correction, examen), qui numérotent
 *    déjà leur titre via `autoNumber` (voir TYPE_MAP).
 * Tout le reste est numéroté : définitions, propositions, théorèmes, mais
 * aussi exemples, exercices, activités, conclusions… comme dans un manuel.
 */


/** Structures : elles organisent le plan, elles ne reçoivent pas de numéro. */
const STRUCTURAL_TYPES = new Set(['chapter', 'section', 'subsection', 'subsubsection']);

/** Évaluations : leur numéro est déjà porté par le titre (« Contrôle continu 2 »). */
export const EVALUATION_TYPES = /^(?:evaluation|devoir|controle|correction|examen|diagnostic|assessment|homework|test|exam|dm|ds|cc)(?:_|$)/;

const typeKey = (value: unknown): string => String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
    .replace(/^(?:exo|exercise)$/, 'exercice');

const isNumberableRow = (row: LessonRow): boolean =>
    !isFreeContent(row.data) && !STRUCTURAL_TYPES.has(row.elementType) && !EVALUATION_TYPES.test(typeKey(rowType(row)));

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
export function romanNumber(value: number): string {
    if (!Number.isInteger(value) || value < 1 || value > 3999) return String(value);
    let result = '';
    for (const [number, symbol] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']] as const) {
        while (value >= number) { result += symbol; value -= number; }
    }
    return result;
}

export const buildContentNumbers = (lessons: LessonsData, options: boolean | ContentNumbering = true): Map<string, string> => {
    const settings = typeof options === 'boolean' ? { enabled: options } : options;
    const numbers = new Map<string, string>();
    if (!settings.enabled) return numbers;
    const counters = new Map<string, number>();
    const chapterOrdinals = new Map<number, number>();
    let chapter = 0;
    lessons.forEach((item, index) => { if (item.type === 'chapter') chapterOrdinals.set(index, ++chapter); });
    for (const row of buildLessonRows(lessons)) {
        const indices = row.indices;
        const chapterNumber = chapterOrdinals.get(indices.chapterIndex) ?? 1;
        const path = [chapterNumber, indices.sectionIndex, indices.subsectionIndex, indices.subsubsectionIndex]
            .filter((value): value is number => value !== undefined).map((value, index) => index === 0 ? value : value + 1);
        if (STRUCTURAL_TYPES.has(row.elementType) && settings.structureStyle && settings.structureStyle !== 'legacy') {
            numbers.set(row.key, explicitNumber(row) ?? path.map((value, index) => index === 0 && settings.structureStyle === 'roman' ? romanNumber(value) : String(value)).join('.'));
        }
        if (!isNumberableRow(row)) continue;
        const scope = settings.scope === 'document' ? 'document' : settings.scope === 'section'
            ? `${indices.chapterIndex}:${indices.sectionIndex ?? 'root'}` : String(indices.chapterIndex);
        const type = `${scope}:${typeKey(rowType(row))}`;
        let counter = counters.get(type) ?? 0;
        const declared = explicitNumber(row);
        if (declared) {
            // Le numéro écrit à la main prime ET fait avancer le compteur, sinon
            // la suite automatique contredirait la saisie.
            numbers.set(row.key, declared);
            const parsed = Number.parseInt(declared.split('.').at(-1) ?? '', 10);
            if (Number.isFinite(parsed) && parsed > counter) counters.set(type, parsed);
            continue;
        }
        counter += 1;
        counters.set(type, counter);
        const prefix = settings.scope === 'document' ? [] : settings.scope === 'section' ? path.slice(0, 2) : [chapterNumber];
        numbers.set(row.key, settings.badgeStyle === 'roman' ? romanNumber(counter)
            : settings.badgeStyle === 'hierarchical' ? [...prefix, counter].join('.') : String(counter));
    }
    return numbers;
};
