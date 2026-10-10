import type { LessonsData } from '../../types';
import { buildLessonRows } from '../notebook/lessonRows';

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
export function hasHomeworkMention(text: string | undefined): boolean {
  if (!text) return false;
  const normalized = normalizeDigits(text);
  return /(?:تم\s+إعطاء\s+الفرض\s+المنزلي|الفرض\s+المنزلي|فرض\s+منزلي|devoir\s+maison|\bdm\b|homework)/i.test(normalized);
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
  const frenchMatch = normalized.match(/(?:devoir\s+maison|\bdm\b)(?:\s*(?:n[°o.]?\s*|#\s*|رقم\s*)|\s+)(\d+)/i);
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
  manualAssessments?: Array<{ id: string; type: string; num?: number }>;
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
  const homeworkLineIndex = lines.findIndex(line => hasHomeworkMention(line));

  if (homeworkLineIndex >= 0) {
    lines[homeworkLineIndex] = newHomeworkText;
    return lines.filter(line => line.trim().length > 0).join('\n');
  }

  const trimmed = currentRemark.trim();
  if (!trimmed) return newHomeworkText;
  return `${newHomeworkText}\n${trimmed}`;
}

/**
 * Supprime la mention du devoir maison dans une remarque existante.
 */
export function removeHomeworkFromRemark(currentRemark: string): string {
  const lines = (currentRemark ?? '').split('\n');
  const filtered = lines.filter(line => !hasHomeworkMention(line));
  return filtered.join('\n').trim();
}
