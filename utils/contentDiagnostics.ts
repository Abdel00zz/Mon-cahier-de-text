import { TOP_LEVEL_TYPE_CONFIG, TYPE_MAP } from '../constants';
import { prepareImportedLessons, type ImportReport } from './importPipeline';
import { toDisplayText } from './textValue';
import type { LessonsData } from '../types';

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

export type DiagnosticSeverity = 'error' | 'warning' | 'repair';

/** Code stable ; le libellé affiché vit dans les traductions. */
export interface ContentDiagnostic {
  severity: DiagnosticSeverity;
  code: string;
  params: Record<string, string | number>;
  /** Chemin technique du champ : « sections[0] › items[4] › description ». */
  path: string;
  /** Extrait de la ligne fautive (erreur de syntaxe JSON uniquement). */
  excerpt?: string;
}

export interface ContentStats {
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
export const MAX_CONTENT_BYTES = 700_000;
/** Mêmes seuils que le pipeline d'import, pour prévenir AVANT qu'il ne jette. */
export const MAX_TEXT_CHARS = 20_000;
const MAX_DEPTH = 12;
const MAX_NODES = 12_000;
/** Texte long : signalé sans bloquer (lisibilité, poids, impression). */
export const LONG_TEXT_CHARS = 5_000;

const TEXT_FIELDS = ['title', 'name', 'type', 'number', 'page', 'description', 'remark', 'content'] as const;
const CHILD_FIELDS = ['sections', 'subsections', 'subsubsections', 'items'] as const;
const STRUCTURAL_TYPES = new Set(['chapter', 'section', 'subsection', 'subsubsection', 'free']);
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const KEY_FOR_IDENTITY = ['type', 'title', 'name', 'date'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const typeIsKnown = (type: string): boolean =>
  STRUCTURAL_TYPES.has(type) || TYPE_MAP[type] !== undefined || type in TOP_LEVEL_TYPE_CONFIG || type.startsWith('correction_');

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
  const stats: ContentStats = { bytes: source.length, chapters: 0, contents: 0, nodes: 0, depth: 0, longestText: null };
  const result = (ok: boolean, report: ImportReport | null, lessonsData: LessonsData | null): ContentAnalysis =>
    ({ ok: ok && !issues.some(issue => issue.severity === 'error'), issues, stats, report, lessonsData });

  if (!source.trim()) {
    issues.push({ severity: 'error', code: 'empty', params: {}, path: '' });
    return result(false, null, null);
  }

  if (source.length > MAX_CONTENT_BYTES / 4) stats.bytes = new TextEncoder().encode(source).length;
  if (stats.bytes > MAX_CONTENT_BYTES) {
    issues.push({ severity: 'error', code: 'tooLarge', params: { bytes: stats.bytes, maxBytes: MAX_CONTENT_BYTES }, path: '' });
    return result(false, null, null);
  }

  let value: unknown;
  try {
    value = JSON.parse(source);
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

  const identities = new Map<string, string>();
  let stopped = false;

  const inspectText = (record: Record<string, unknown>, field: string, path: string, owner: string): void => {
    const value = record[field];
    if (value === undefined || value === null) return;
    const text = toDisplayText(value);
    if (typeof value !== 'string') {
      issues.push({ severity: 'repair', code: 'textNotText', params: { field, kind: Array.isArray(value) ? 'array' : typeof value, owner }, path });
      return;
    }
    const fieldPath = path ? `${path} › ${field}` : field;
    if (text.length > MAX_TEXT_CHARS) {
      issues.push({ severity: 'error', code: 'textTooLong', params: { field, chars: text.length, max: MAX_TEXT_CHARS, owner }, path: fieldPath });
      return;
    }
    if (text.length > LONG_TEXT_CHARS) {
      issues.push({ severity: 'warning', code: 'textLong', params: { field, chars: text.length, max: LONG_TEXT_CHARS, owner }, path: fieldPath });
    }
    if (!stats.longestText || text.length > stats.longestText.chars) stats.longestText = { path: fieldPath, chars: text.length };
    // Une formule non fermée laisse le texte brut à l'écran : c'est LE défaut
    // invisible des contenus collés depuis un traitement de texte.
    const singleDollars = text.replace(/\$\$/g, '').split('$').length - 1;
    if (singleDollars % 2 === 1) {
      issues.push({ severity: 'warning', code: 'formulaUnclosed', params: { field, owner }, path: fieldPath });
    }
    if (CONTROL_CHARACTERS.test(text)) {
      issues.push({ severity: 'warning', code: 'controlCharacters', params: { field, owner }, path: fieldPath });
    }
  };

  const walk = (node: unknown, path: string, depth: number): void => {
    if (stopped) return;
    stats.nodes += 1;
    if (stats.nodes > MAX_NODES) {
      issues.push({ severity: 'error', code: 'tooManyNodes', params: { max: MAX_NODES }, path });
      stopped = true;
      return;
    }
    if (depth > MAX_DEPTH) {
      issues.push({ severity: 'error', code: 'tooDeep', params: { max: MAX_DEPTH }, path });
      stopped = true;
      return;
    }
    stats.depth = Math.max(stats.depth, depth);

    if (Array.isArray(node)) {
      node.forEach((child, index) => walk(child, `${path}[${index}]`, depth + 1));
      return;
    }
    if (!isRecord(node)) return;

    const owner = toDisplayText(node.title) || toDisplayText(node.name) || path;
    for (const field of TEXT_FIELDS) inspectText(node, field, path, owner);

    if (node.type !== undefined) {
      const type = toDisplayText(node.type);
      if (type && !typeIsKnown(type)) {
        issues.push({ severity: 'warning', code: 'unknownType', params: { type, owner }, path: `${path} › type` });
      }
    }

    // Doublons stricts : même type, même titre, même date dans le même parent.
    const key = KEY_FOR_IDENTITY.map(field => toDisplayText(node[field]).trim().toLowerCase()).join('|');
    if (key.replace(/\|/g, '')) {
      const previous = identities.get(key);
      if (previous && previous !== path) {
        issues.push({ severity: 'warning', code: 'duplicate', params: { owner }, path });
      } else if (!previous) {
        identities.set(key, path);
      }
    }

    for (const field of CHILD_FIELDS) {
      const children = node[field];
      if (children === undefined) continue;
      const childPath = path ? `${path} › ${field}` : field;
      if (!Array.isArray(children)) {
        issues.push({ severity: 'repair', code: 'containerRepaired', params: { field, owner }, path: childPath });
        continue;
      }
      walk(children, childPath, depth + 1);
    }
  };

  walk(value, '', 1);

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
