import { TOP_LEVEL_CONTENT_META } from '../../constants/top-level-types';
import { FREE_TYPE } from './freeLineType';
import { TYPE_MAP } from '../../constants/type-keys';
import { prepareImportedLessons, resolveImportPayload, type ImportReport } from './importPipeline';
import { IMPORT_LIMITS } from './importLimits';
import { normalizeContentType } from '../../constants/type-keys';
import { toDisplayText } from '../../lib/text/textValue';
import type { LessonsData } from '../../types';
import { STRUCTURAL_TYPES, textFieldLimit } from './notebookSchema.js';
import { hasControlCharacters, hasUnclosedFormula } from './textSignals.js';
import { walkNotebook } from './notebookTraversal.js';

/**
 * Analyse AVANT IMPORT d'un contenu JSON (cahier, sauvegarde, contenu poussé
 * par l'administration).
 *
 * Objectif : ne plus découvrir un problème APRÈS coup, quand le cahier ne
 * s'ouvre plus ou qu'une classe devient inaccessible. Le moteur ne jette
 * jamais : il rend un rapport exploitable (erreurs bloquantes, avertissements
 * de qualité, réparations automatiques) et les statistiques du contenu, avec
 * le chemin précis du champ fautif.
 */

type DiagnosticSeverity = 'error' | 'warning' | 'repair';

/** Code stable ; le libellé affiché vit dans les traductions. */
interface ContentDiagnostic {
  severity: DiagnosticSeverity;
  code: string;
  params: Record<string, string | number>;
  /** Chemin technique du champ : « sections[0] › items[4] › description ». */
  path: string;
  /** Extrait de la ligne fautive (erreur de syntaxe JSON uniquement). */
  excerpt?: string;
}

interface ContentStats {
  bytes: number;
  chapters: number;
  contents: number;
  nodes: number;
  depth: number;
  longestText: { path: string; chars: number } | null;
}

export interface ContentAnalysis {
  /** Aucune erreur bloquante : l'import peut être proposé. */
  ok: boolean;
  issues: ContentDiagnostic[];
  stats: ContentStats;
  report: ImportReport | null;
  lessonsData: LessonsData | null;
}

/** Budget de synchronisation du dépôt : au-delà, la donnée ne circule plus. */
const MAX_CONTENT_BYTES = IMPORT_LIMITS.bytes;
/** Mêmes seuils que le pipeline d'import, pour prévenir AVANT qu'il ne jette. */
const MAX_DEPTH = IMPORT_LIMITS.depth;
const MAX_NODES = IMPORT_LIMITS.nodes;
/** Texte long : signalé sans bloquer (lisibilité, poids, impression). */
const LONG_TEXT_CHARS = 5_000;

const KEY_FOR_IDENTITY = ['type', 'title', 'name', 'date'] as const;

const typeIsKnown = (type: string): boolean =>
  STRUCTURAL_TYPES.has(type) || type === FREE_TYPE || Object.hasOwn(TYPE_MAP, type)
  || Object.hasOwn(TOP_LEVEL_CONTENT_META, type) || type.startsWith('correction_');

/** Ligne, colonne et extrait d'une erreur de `JSON.parse` (messages V8 variés). */
export function locateJsonError(message: string, source: string): { line: number; column: number; excerpt: string } | null {
  const lines = source.split('\n');
  const excerptOf = (line: number): string => (lines[line - 1] ?? '').trim().slice(0, 160);
  const reported = /line (\d+) column (\d+)/.exec(message);
  if (reported) return { line: Number(reported[1]), column: Number(reported[2]), excerpt: excerptOf(Number(reported[1])) };
  const position = /position (\d+)/.exec(message);
  if (!position) return null;
  const index = Number(position[1]);
  const before = source.slice(0, index);
  const line = before.split('\n').length;
  return { line, column: index - before.lastIndexOf('\n'), excerpt: excerptOf(line) };
}

/**
 * Analyse une chaîne JSON de contenu. Ne jette jamais, quel que soit l'entrée :
 * c'est la porte d'entrée des données extérieures (import, sauvegarde, admin).
 */
export function analyzeContentJson(raw: unknown): ContentAnalysis {
  const source = toDisplayText(raw);
  const issues: ContentDiagnostic[] = [];
  const stats: ContentStats = { bytes: new TextEncoder().encode(source).length, chapters: 0, contents: 0, nodes: 0, depth: 0, longestText: null };
  const result = (ok: boolean, report: ImportReport | null, lessonsData: LessonsData | null): ContentAnalysis =>
    ({ ok: ok && !issues.some(issue => issue.severity === 'error'), issues, stats, report, lessonsData });

  if (!source.trim()) {
    issues.push({ severity: 'error', code: 'empty', params: {}, path: '' });
    return result(false, null, null);
  }

  if (stats.bytes > MAX_CONTENT_BYTES) {
    issues.push({ severity: 'error', code: 'tooLarge', params: { bytes: stats.bytes, maxBytes: MAX_CONTENT_BYTES }, path: '' });
    return result(false, null, null);
  }

  let value: unknown;
  try {
    value = JSON.parse(source.replace(/^\uFEFF/, ''));
  } catch (error) {
    const detail = (error instanceof Error ? error.message : String(error)).replace(/^JSON\.parse: /, '');
    const located = locateJsonError(detail, source);
    issues.push({
      severity: 'error',
      code: 'syntax',
      params: { detail, line: located?.line ?? 0, column: located?.column ?? 0 },
      path: '',
      excerpt: located?.excerpt,
    });
    return result(false, null, null);
  }

  if (typeof value !== 'object' || value === null) {
    issues.push({ severity: 'error', code: 'rootShape', params: { kind: Array.isArray(value) ? 'array' : typeof value }, path: '' });
    return result(false, null, null);
  }

  let lessons: unknown[];
  try { lessons = resolveImportPayload(value).lessons; }
  catch (error) {
    issues.push({ severity: 'error', code: 'preparation', params: { reason: error instanceof Error ? error.message : String(error) }, path: '' });
    return result(false, null, null);
  }

  const identities = new Map<string, string>();
  let stopped = false;

  const ownerOf = (node: Record<string, unknown>, path: string): string =>
    toDisplayText(node.title) || toDisplayText(node.name) || path;

  /*
   * Un seul parcours, celui du moteur partagé. L'ordre des hooks reproduit
   * exactement l'ancienne marche : textes, puis type et doublons, puis enfants.
   * Le diagnostic ne jette jamais : un budget dépassé devient une erreur
   * présentée, jamais une exception.
   */
  const walkStats = walkNotebook(lessons, {
    onText: (context, field) => {
      const value = context.node[field];
      if (value === undefined || value === null) return;
      const text = toDisplayText(value);
      const owner = ownerOf(context.node, context.path);
      if (typeof value !== 'string') {
        issues.push({ severity: 'repair', code: 'textNotText', params: { field, kind: Array.isArray(value) ? 'array' : typeof value, owner }, path: context.path });
        return;
      }
      const fieldPath = context.path ? `${context.path} › ${field}` : field;
      const max = textFieldLimit(field);
      if (text.trim().length > max) {
        issues.push({ severity: 'error', code: 'textTooLong', params: { field, chars: text.trim().length, max, owner }, path: fieldPath });
        return;
      }
      if (text.length > LONG_TEXT_CHARS) {
        issues.push({ severity: 'warning', code: 'textLong', params: { field, chars: text.length, max: LONG_TEXT_CHARS, owner }, path: fieldPath });
      }
      if (!stats.longestText || text.length > stats.longestText.chars) stats.longestText = { path: fieldPath, chars: text.length };
      // Une formule non fermée laisse le texte brut à l'écran : c'est LE défaut
      // invisible des contenus collés depuis un traitement de texte.
      if (hasUnclosedFormula(text)) {
        issues.push({ severity: 'warning', code: 'formulaUnclosed', params: { field, owner }, path: fieldPath });
      }
      if (hasControlCharacters(text)) {
        issues.push({ severity: 'warning', code: 'controlCharacters', params: { field, owner }, path: fieldPath });
      }
    },
    onNode: context => {
      const owner = ownerOf(context.node, context.path);
      if (context.node.type !== undefined) {
        const type = normalizeContentType(toDisplayText(context.node.type));
        if (type && !typeIsKnown(type)) {
          issues.push({ severity: 'warning', code: 'unknownType', params: { type, owner }, path: `${context.path} › type` });
        }
      }
      // Doublons stricts : même type, même titre, même date dans le même parent.
      const identity = KEY_FOR_IDENTITY.map(field => toDisplayText(context.node[field]).trim().toLowerCase());
      const key = JSON.stringify([context.parentPath, ...identity]);
      if (identity.some(Boolean)) {
        const previous = identities.get(key);
        if (previous && previous !== context.path) {
          issues.push({ severity: 'warning', code: 'duplicate', params: { owner }, path: context.path });
        } else if (!previous) {
          identities.set(key, context.path);
        }
      }
    },
    onContainer: (context, key, _value, isArray) => {
      if (!isArray) {
        issues.push({ severity: 'repair', code: 'containerRepaired', params: { field: key, owner: ownerOf(context.node, context.path) }, path: `${context.path} › ${key}` });
      }
    },
    onBudgetExceeded: (reason, context) => {
      stopped = true;
      issues.push(reason === 'depth'
        ? { severity: 'error', code: 'tooDeep', params: { max: MAX_DEPTH }, path: context.path }
        : { severity: 'error', code: 'tooManyNodes', params: { max: MAX_NODES }, path: context.path });
    },
  });
  stats.nodes = walkStats.nodes;
  stats.depth = walkStats.depth;

  let report: ImportReport | null = null;
  let lessonsData: LessonsData | null = null;
  if (!stopped && !issues.some(issue => issue.severity === 'error')) {
    try {
      const prepared = prepareImportedLessons(value);
      report = prepared.report;
      lessonsData = prepared.lessonsData;
      stats.chapters = prepared.lessonsData.length;
      stats.contents = prepared.report.itemCount + prepared.report.nestedCount;
    } catch (error) {
      issues.push({
        severity: 'error',
        code: 'preparation',
        params: { reason: error instanceof Error ? error.message : String(error) },
        path: '',
      });
    }
  }

  if (report) {
    if (report.repairedContainers > 0) issues.push({ severity: 'repair', code: 'containersRepaired', params: { count: report.repairedContainers }, path: '' });
    if (report.repairedTexts > 0) issues.push({ severity: 'repair', code: 'textsRemoved', params: { count: report.repairedTexts }, path: '' });
    if (report.trimmedStrings > 0) issues.push({ severity: 'repair', code: 'textsTrimmed', params: { count: report.trimmedStrings }, path: '' });
    if (report.normalizedDates > 0) issues.push({ severity: 'repair', code: 'datesNormalized', params: { count: report.normalizedDates }, path: '' });
  }

  return result(true, report, lessonsData);
}
