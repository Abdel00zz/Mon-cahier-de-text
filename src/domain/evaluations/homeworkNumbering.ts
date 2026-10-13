import type { LessonsData } from '../../types';
import { buildLessonRows } from '../notebook/lessonRows';
import { normalizeActivityText } from './pedagogicalActivities';

/**
 * Normalise les chiffres arabes orientaux (٠-٩ / ۰-۹) en chiffres latins standards (0-9).
 */
export function normalizeDigits(str: string): string {
  return (str ?? '').replace(/[٠-٩۰-۹]/g, digit =>
    String(digit.charCodeAt(0) - (digit >= '۰' ? 0x6F0 : 0x660))
  );
}

/**
 * Détecte si un texte contient une mention d'attribution ou de présence de devoir maison.
 */
/**
 * Les deux écritures françaises du même devoir : « devoir maison » (saisie libre, bloc du cahier) et
 * « devoir à la maison » (le texte que l'application écrit elle-même : `remark.devoirMaisonGiven`).
 * L'accent peut être aplati (« a la maison ») après `normalizeActivityText`. Sans cette seconde forme,
 * la remarque posée par la pastille n'était plus reconnue : ni sélection, ni numéro, ni retrait.
 */
const FRENCH_HOMEWORK = String.raw`devoirs?\s+(?:[àa]\s+la\s+)?maison`;
export function hasHomeworkMention(text: string | undefined): boolean {
  if (!text) return false;
  const normalized = normalizeDigits(text);
  return new RegExp(`(?:تم\\s+إعطاء\\s+الفرض\\s+المنزلي|الفرض\\s+المنزلي|فرض\\s+منزلي|${FRENCH_HOMEWORK}|\\bdm\\b|homework)`, 'i').test(normalized);
}

/*
 * DEUX TEMPS D'UN DEVOIR MAISON.
 *
 * La séance où le devoir est DONNÉ (les élèves l'emportent chez eux) et la
 * séance où il est CORRIGÉ sont deux moments distincts du cahier. La ligne
 * « Correction devoir maison 2 » parle du même devoir que « Devoir maison 2
 * donné » : tout ce qui classe une ligne de remarque — attribution, numéro,
 * retrait — doit savoir les distinguer, sinon la correction serait prise pour
 * une seconde attribution et fausserait la numérotation chronologique.
 */

/** Préfixes de correction reconnus en tête de ligne ; `normalizeActivityText`
 * a déjà aplati les accents et les diacritiques (« Corrigée » → « corrigee »). */
const CORRECTION_LINE_PREFIX = /^(?:corrections?|corrigee?s?|تصحيح|حل)(?:\s|$)/;
/** Anglais : le texte de l'application est « Homework 2 correction » (le numéro précède le mot). */
const ENGLISH_CORRECTION_LINE = /^(?:homework|hw)\s*(?:#|no\.?\s*)?\d*\s*corrections?(?:\s|$)/;

/**
 * Vrai pour une ligne de correction : elle COMMENCE par un marqueur de
 * correction ET cite le devoir maison. La détection est stricte (début de
 * ligne) : « nous corrigeons le devoir maison » au fil d'une phrase reste une
 * note libre, pas une séance de correction.
 */
export function isHomeworkCorrectionLine(text: string | undefined): boolean {
  if (!text) return false;
  const normalized = normalizeActivityText(text);
  return (CORRECTION_LINE_PREFIX.test(normalized) || ENGLISH_CORRECTION_LINE.test(normalized)) && hasHomeworkMention(normalized);
}

/** Vrai si AU MOINS une ligne annonce l'ATTRIBUTION du devoir (correction exclue). */
export function hasHomeworkAssignmentMention(text: string | undefined): boolean {
  if (!text) return false;
  return text.split('\n').some(line => hasHomeworkMention(line) && !isHomeworkCorrectionLine(line));
}

/** Numéro du devoir ANNONCÉ dans la remarque : première ligne d'attribution
 *  numérotée, en ignorant les lignes de correction. */
export function extractHomeworkAssignmentNumber(text: string | undefined): number | null {
  if (!text) return null;
  for (const line of text.split('\n')) {
    if (hasHomeworkMention(line) && !isHomeworkCorrectionLine(line)) {
      const num = extractHomeworkNumber(line);
      if (num !== null) return num;
    }
  }
  return null;
}

/** Numéro du devoir CORRIGÉ dans la remarque (première ligne de correction numérotée). */
export function extractCorrectionNumber(text: string | undefined): number | null {
  if (!text) return null;
  for (const line of text.split('\n')) {
    if (isHomeworkCorrectionLine(line)) {
      const num = extractHomeworkNumber(line);
      if (num !== null) return num;
    }
  }
  return null;
}

/**
 * Extrait le numéro ordinal d'un devoir maison à partir d'un texte quelconque
 * (titre de bloc, ligne de remarque, annotation).
 *
 * Exemples gérés :
 *   - "تم إعطاء الفرض المنزلي رقم 2" -> 2
 *   - "تم إعطاء الفرض المنزلي رقم ٢" -> 2
 *   - "تم إعطاء الفرض المنزلي 3" -> 3
 *   - "الفرض المنزلي رقم 1" -> 1
 *   - "Devoir maison 1 donné" -> 1
 *   - "Devoir maison n° 2" -> 2
 *   - "DM 4" -> 4
 *   - "Homework 2 assigned" -> 2
 */
export function extractHomeworkNumber(text: string | undefined): number | null {
  if (!text) return null;
  const normalized = normalizeDigits(text.trim());

  // 1. Motifs arabes explicites ("الفرض المنزلي رقم X" ou "الفرض المنزلي X")
  const arabicMatch = normalized.match(/(?:الفرض\s+المنزلي|فرض\s+منزلي)(?:\s*(?:رقم\s*|n[°o.]?\s*|#\s*)|\s+)(\d+)/i);
  if (arabicMatch) return parseInt(arabicMatch[1], 10);

  // 2. Motifs français explicites ("Devoir maison X donné", "Devoir maison n° X", "DM X")
  const frenchMatch = normalized.match(new RegExp(`(?:${FRENCH_HOMEWORK}|\\bdm\\b)(?:\\s*(?:n[°o.]?\\s*|#\\s*|رقم\\s*)|\\s+)(\\d+)`, 'i'));
  if (frenchMatch) return parseInt(frenchMatch[1], 10);

  // 3. Motif anglais ("Homework X assigned", "Homework #X")
  const englishMatch = normalized.match(/(?:homework)(?:\s*(?:#|no\.?\s*|n[°o.]?\s*)|\s+)(\d+)/i);
  if (englishMatch) return parseInt(englishMatch[1], 10);

  // 4. Si le texte parle de devoir maison et se termine par un numéro
  if (hasHomeworkMention(normalized)) {
    const trailingMatch = normalized.match(/(\d+)\s*$/);
    if (trailingMatch) return parseInt(trailingMatch[1], 10);
  }

  return null;
}

export interface HomeworkScanOptions {
  lessons?: LessonsData | unknown;
  manualAssessments?: Array<{ id: string; type: string; num?: number; dateISO?: string }>;
  assessmentDates?: Record<string, string>;
}

/**
 * Collecte tous les numéros de devoirs maison existants dans le cahier et la configuration
 * (dans les remarques de séances, les blocs de devoirs maison, les corrections, et le planning).
 */
export function collectKnownHomeworkNumbers(options: HomeworkScanOptions): Set<number> {
  const result = new Set<number>();
  const lessons = Array.isArray(options.lessons) ? (options.lessons as LessonsData) : undefined;

  if (lessons && lessons.length > 0) {
    try {
      const rows = buildLessonRows(lessons);
      for (const row of rows) {
        // A. Vérifier les remarques de chaque séance
        const rawRemark = (row.data as { remark?: string }).remark;
        if (rawRemark) {
          const num = extractHomeworkNumber(rawRemark);
          if (num !== null && num > 0) result.add(num);
        }

        // B. Vérifier les blocs/items de type devoir_maison, maison, ou correction_devoir_maison
        const type = String(('type' in row.data ? row.data.type : row.elementType) ?? '');
        if (type === 'devoir_maison' || type === 'maison' || type === 'correction_devoir_maison') {
          const title = (row.data as { title?: string }).title;
          const num = extractHomeworkNumber(title);
          if (num !== null && num > 0) {
            result.add(num);
          } else {
            const declared = (row.data as { declaredNum?: number; num?: number; number?: string }).declaredNum
              ?? (row.data as { num?: number }).num;
            if (typeof declared === 'number' && declared > 0) result.add(declared);
          }
        }
      }
    } catch {
      // Ignorer les erreurs d'analyse de structure corrompue
    }
  }

  // C. Évaluations manuelles de type 'maison'
  if (Array.isArray(options.manualAssessments)) {
    for (const assessment of options.manualAssessments) {
      if (assessment.type === 'maison' && typeof assessment.num === 'number' && assessment.num > 0) {
        result.add(assessment.num);
      }
    }
  }

  // D. Dates d'évaluations planifiées (clés s1-maison1, s2-maison2...)
  if (options.assessmentDates) {
    for (const key of Object.keys(options.assessmentDates)) {
      const match = key.match(/maison-?(\d+)/i);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (parsed > 0) result.add(parsed);
      }
    }
  }

  return result;
}

/**
 * Calcule le prochain numéro ordinal synchronisé pour un nouveau devoir maison.
 * Si la remarque courante contient déjà un devoir maison, son numéro est conservé.
 */
export function getNextHomeworkNumber(options: HomeworkScanOptions & { currentRemark?: string }): number {
  if (options.currentRemark) {
    const existing = extractHomeworkNumber(options.currentRemark);
    if (existing !== null && existing > 0) return existing;
  }

  const known = collectKnownHomeworkNumbers(options);
  if (known.size === 0) return 1;

  let max = 0;
  for (const n of known) {
    if (n > max) max = n;
  }
  return max + 1;
}

/**
 * Insère ou met à jour la mention du devoir maison dans une remarque existante.
 * Si une mention précédente est déjà présente (avec ou sans numéro), elle est remplacée
 * proprement sans doubler la ligne. Sinon, elle est insérée au début de la remarque.
 */
export function replaceOrInsertHomeworkInRemark(currentRemark: string, newHomeworkText: string): string {
  const lines = (currentRemark ?? '').split('\n');
  // La ligne de CORRECTION cite aussi « devoir maison » : seule une ligne
  // d'ATTRIBUTION peut être remplacée par la pastille « donné ».
  const homeworkLineIndex = lines.findIndex(line => hasHomeworkMention(line) && !isHomeworkCorrectionLine(line));

  if (homeworkLineIndex >= 0) {
    lines[homeworkLineIndex] = newHomeworkText;
    return lines.filter(line => line.trim().length > 0).join('\n');
  }

  const trimmed = currentRemark.trim();
  if (!trimmed) return newHomeworkText;
  return `${newHomeworkText}\n${trimmed}`;
}

/**
 * Insère ou met à jour la ligne de CORRECTION du devoir maison. La correction
 * est le SECOND temps d'un même devoir : elle se pose juste après la ligne
 * d'attribution quand elle existe, jamais avant elle.
 */
export function replaceOrInsertCorrectionInRemark(currentRemark: string, newCorrectionText: string): string {
  const lines = (currentRemark ?? '').split('\n');
  const correctionIndex = lines.findIndex(line => isHomeworkCorrectionLine(line));
  if (correctionIndex >= 0) {
    lines[correctionIndex] = newCorrectionText;
    return lines.filter(line => line.trim().length > 0).join('\n');
  }
  const assignmentIndex = lines.findIndex(line => hasHomeworkMention(line) && !isHomeworkCorrectionLine(line));
  if (assignmentIndex >= 0) {
    lines.splice(assignmentIndex + 1, 0, newCorrectionText);
    return lines.filter(line => line.trim().length > 0).join('\n');
  }
  const trimmed = currentRemark.trim();
  return trimmed ? `${newCorrectionText}\n${trimmed}` : newCorrectionText;
}

/** Supprime la ligne de correction ; l'attribution et les notes libres restent. */
export function removeCorrectionFromRemark(currentRemark: string): string {
  const lines = (currentRemark ?? '').split('\n');
  return lines.filter(line => !isHomeworkCorrectionLine(line)).join('\n').trim();
}

/**
 * Décompose une remarque en sa mention de devoir maison (si présente)
 * et le reste des notes libres de l'enseignant.
 */
export function splitRemarkContent(remark: string | undefined): {
  homeworkLine: string | null;
  homeworkNum: number | null;
  otherRemark: string | null;
} {
  if (!remark || !remark.trim()) {
    return { homeworkLine: null, homeworkNum: null, otherRemark: null };
  }

  const lines = remark.split('\n');
  const hwIndex = lines.findIndex(line => hasHomeworkMention(line) && !isHomeworkCorrectionLine(line));

  if (hwIndex === -1) {
    return { homeworkLine: null, homeworkNum: null, otherRemark: remark.trim() };
  }

  const homeworkLine = lines[hwIndex].trim();
  const homeworkNum = extractHomeworkNumber(homeworkLine);
  const otherLines = lines.filter((_, idx) => idx !== hwIndex).map(l => l.trim()).filter(Boolean);
  const otherRemark = otherLines.length > 0 ? otherLines.join('\n') : null;

  return { homeworkLine, homeworkNum, otherRemark };
}

/**
 * Calcule intelligemment le numéro chronologique d'un devoir maison
 * en fonction de la date de la séance cible par rapport aux autres devoirs du cahier.
 */
export function getChronologicalHomeworkNumber(options: HomeworkScanOptions & { targetDate?: string; currentRemark?: string }): number {
  if (options.currentRemark) {
    const existing = extractHomeworkNumber(options.currentRemark);
    if (existing !== null && existing > 0) return existing;
  }

  const targetDate = options.targetDate?.trim();
  const lessons = Array.isArray(options.lessons) ? (options.lessons as LessonsData) : undefined;

  if (targetDate && lessons && lessons.length > 0) {
    const homeworkDates: string[] = [];
    const seenDates = new Set<string>();
    const addDate = (raw?: string) => {
      const match = String(raw ?? '').match(/\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{4}/);
      if (!match || seenDates.has(match[0])) return;
      seenDates.add(match[0]);
      homeworkDates.push(match[0]);
    };
    try {
      const rows = buildLessonRows(lessons);

      for (const row of rows) {
        const rawRemark = (row.data as { remark?: string }).remark;
        const type = String(('type' in row.data ? row.data.type : row.elementType) ?? '');
        // Seule une ATTRIBUTION compte comme jalon de numérotation : la
        // séance de correction parle du même devoir et ne crée pas un rang.
        const isHw = (rawRemark && hasHomeworkAssignmentMention(rawRemark)) || type === 'devoir_maison' || type === 'maison';

        if (isHw) addDate(typeof row.data.date === 'string' ? row.data.date : '');
      }
    } catch {
      // repli en cas d'erreur de parsing
    }

    /*
     * La feuille d'évaluations est l'AUTRE source des devoirs : depuis que la
     * mention de séance est un badge (et non plus une ligne de texte dans la
     * remarque), le cahier peut ne plus porter le jalon du tout. Sans ces
     * sources, chaque nouveau devoir recevrait le numéro 1.
     */
    for (const assessment of options.manualAssessments ?? []) {
      if (assessment.type === 'maison') addDate(assessment.dateISO);
    }
    for (const [key, date] of Object.entries(options.assessmentDates ?? {})) {
      if (/maison-?\d+/i.test(key)) addDate(date);
    }

    // Nombre de devoirs placés chronologiquement avant la date cible
    const priorCount = homeworkDates.filter(d => d < targetDate).length;
    return priorCount + 1;
  }

  return getNextHomeworkNumber(options);
}

/**
 * Supprime la mention du devoir maison dans une remarque existante.
 */
export function removeHomeworkFromRemark(currentRemark: string): string {
  const lines = (currentRemark ?? '').split('\n');
  // La ligne de correction est un autre moment du devoir : elle survit au
  // retrait de l'attribution, comme le devoir lui-même reste dans la feuille.
  const filtered = lines.filter(line => !(hasHomeworkMention(line) && !isHomeworkCorrectionLine(line)));
  return filtered.join('\n').trim();
}

