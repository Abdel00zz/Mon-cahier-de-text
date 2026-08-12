import type { LessonsData, TopLevelItem } from '../types.js';
import { logger } from './logger.js';
import { detectContentDirection, isContentDirection } from './contentDirection.js';
import type { ContentDirectionDetection } from './contentDirection.js';
import { normalizeContentType } from '../constants/type-keys.js';

interface ImportReport {
  topLevelCount: number;
  nestedCount: number;
  itemCount: number;
  normalizedDates: number;
  trimmedStrings: number;
  repairedContainers: number;
}

interface ImportPreparationResult {
  lessonsData: LessonsData;
  report: ImportReport;
  direction: ContentDirectionDetection;
}

type JsonRecord = Record<string, unknown>;

// L'import accepte les anciens formats, mais reste borné pour ne jamais
// bloquer l'interface ou une fonction cloud sur un JSON volontairement
// récursif / anormalement fragmenté.
const MAX_IMPORT_DEPTH = 12;
const MAX_IMPORT_NODES = 12_000;

interface ImportBudget {
  nodes: number;
}

const EMPTY_REPORT: ImportReport = {
  topLevelCount: 0,
  nestedCount: 0,
  itemCount: 0,
  normalizedDates: 0,
  trimmedStrings: 0,
  repairedContainers: 0,
};

const cloneReport = (): ImportReport => ({ ...EMPTY_REPORT });

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const selectImportPayload = (payload: unknown): unknown => {
  if (!isRecord(payload)) return payload;

  // Un export de synchronisation contient plusieurs cahiers. Le prendre pour
  // un tableau de chapitres fabriquerait silencieusement de faux contenus.
  if (Array.isArray(payload.lessons) && payload.lessons.some(entry =>
    isRecord(entry) && typeof entry.classId === 'string' && Array.isArray(entry.lessonsData)
  )) {
    throw new Error('Ce JSON contient plusieurs cahiers de synchronisation. Exportez une seule classe.');
  }

  // Une sauvegarde complète mono-classe reste pratique. Au-delà d'une classe,
  // la cible source doit être choisie explicitement : l'import ne devine jamais.
  if (Array.isArray(payload.classes) && payload.classes.every(entry =>
    isRecord(entry) && Array.isArray(entry.lessonsData)
  )) {
    if (payload.classes.length === 0) {
      throw new Error('Cette sauvegarde ne contient aucune classe à importer.');
    }
    if (payload.classes.length > 1) {
      throw new Error('Cette sauvegarde contient plusieurs classes. Fournissez le JSON d’une seule classe.');
    }
    return payload.classes[0];
  }

  return payload;
};

const extractLessonsPayload = (payload: unknown): unknown => {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  const candidates = [payload.lessonsData, payload.data, payload.lessons, payload.items];
  return candidates.find(Array.isArray) ?? [];
};

const normalizeDate = (value: unknown): { value: string; changed: boolean } => {
  if (value === undefined || value === null || value === '') return { value: '', changed: false };

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) {
      const [, y, m, d] = iso;
      const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
      if (
        date.getUTCFullYear() !== Number(y)
        || date.getUTCMonth() + 1 !== Number(m)
        || date.getUTCDate() !== Number(d)
      ) {
        throw new Error(`Date invalide : ${trimmed}.`);
      }
      return { value: trimmed, changed: trimmed !== value };
    }

    const french = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (french) {
      const [, d, m, y] = french;
      const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
      if (
        date.getUTCFullYear() !== Number(y)
        || date.getUTCMonth() + 1 !== Number(m)
        || date.getUTCDate() !== Number(d)
      ) {
        throw new Error(`Date invalide : ${trimmed}.`);
      }
      return {
        value: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`,
        changed: true,
      };
    }

    return { value: trimmed, changed: trimmed !== value };
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return { value: date.toISOString().slice(0, 10), changed: true };
    }
  }

  return { value: '', changed: true };
};

const normalizeStringField = (record: JsonRecord, key: string, report: ImportReport) => {
  const value = record[key];
  if (value === undefined || value === null) return;
  const next = String(value).trim();
  const maxLength = key === 'description' || key === 'remark' || key === 'content' ? 20_000 : 500;
  if (next.length > maxLength) throw new Error(`Champ « ${key} » trop long (maximum ${maxLength} caractères).`);
  if (next !== value) report.trimmedStrings += 1;
  record[key] = next;
};

const normalizeItem = (
  value: unknown,
  report: ImportReport,
  budget: ImportBudget,
  depth = 0,
): JsonRecord | null => {
  if (!isRecord(value)) return null;
  if (depth > MAX_IMPORT_DEPTH) {
    throw new Error(`Structure JSON trop profonde (maximum ${MAX_IMPORT_DEPTH} niveaux).`);
  }
  budget.nodes += 1;
  if (budget.nodes > MAX_IMPORT_NODES) {
    throw new Error(`Structure JSON trop volumineuse (maximum ${MAX_IMPORT_NODES} éléments).`);
  }

  const item: JsonRecord = { ...value };
  ['title', 'name', 'type', 'number', 'page', 'description', 'remark', 'content'].forEach(key => {
    normalizeStringField(item, key, report);
  });

  // Normalise le type de contenu vers la clé canonique (accents, alias
  // FR/EN). Les types de structure (chapter, section, devoir…) ne figurent
  // pas dans TYPE_MAP et restent inchangés.
  if (typeof item.type === 'string' && item.type) {
    item.type = normalizeContentType(item.type);
  }

  if (Object.prototype.hasOwnProperty.call(item, 'date')) {
    const nextDate = normalizeDate(item.date);
    item.date = nextDate.value;
    if (nextDate.changed) report.normalizedDates += 1;
  }

  if (isRecord(item.separatorAfter)) {
    const separator = normalizeItem(item.separatorAfter, report, budget, depth + 1);
    if (separator) item.separatorAfter = separator;
  }

  const nestedKeys = ['sections', 'subsections', 'subsubsections', 'items'] as const;
  nestedKeys.forEach(key => {
    const nested = item[key];
    if (nested === undefined) return;
    if (!Array.isArray(nested)) {
      item[key] = [];
      report.repairedContainers += 1;
      return;
    }

    item[key] = nested
      .map(child => normalizeItem(child, report, budget, depth + 1))
      .filter((child): child is JsonRecord => child !== null);
  });

  if (depth === 0) report.topLevelCount += 1;
  else if (Array.isArray(item.items) || Array.isArray(item.sections) || Array.isArray(item.subsections) || Array.isArray(item.subsubsections)) report.nestedCount += 1;
  else report.itemCount += 1;

  return item;
};

const ensureTopLevelShape = (item: TopLevelItem): TopLevelItem => {
  if (!item.type) item.type = 'chapter';
  if (!item.title && (item as any).name) item.title = String((item as any).name);
  if (item.type === 'chapter' && !Array.isArray(item.sections)) item.sections = [];
  return item;
};

const migrateImportedLessons = (items: JsonRecord[]): LessonsData => items.map(record => {
  const item = { ...record };
  if (typeof item.chapter === 'string' && item.title === undefined) {
    item.title = item.chapter;
    delete item.chapter;
  }
  if (typeof item.type !== 'string' || !item.type) item.type = 'chapter';
  if (typeof item.title !== 'string') item.title = '';
  return item as unknown as TopLevelItem;
});

interface ImportedProgressionStats {
  totalItems: number;
  plannedCount: number;
  completionRate: number;
  sessionsCount: number;
  lastDate: string | null;
}

/** Projection légère et sans dépendance React, utilisable dans les Functions. */
export const summarizeImportedLessons = (lessonsData: LessonsData): ImportedProgressionStats => {
  const containerTypes = new Set(['chapter', 'section', 'subsection', 'subsubsection']);
  let totalItems = 0;
  let plannedCount = 0;
  const sessionDates = new Set<string>();

  const visit = (node: unknown, elementType: string): void => {
    if (!isRecord(node)) return;
    if (!containerTypes.has(elementType) && !containerTypes.has(String(node.type ?? ''))) {
      totalItems += 1;
      if (typeof node.date === 'string' && node.date) {
        plannedCount += 1;
        sessionDates.add(node.date);
      }
    }
    if (isRecord(node.separatorAfter) && typeof node.separatorAfter.date === 'string' && node.separatorAfter.date) {
      sessionDates.add(node.separatorAfter.date);
    }
    for (const [key, type] of [
      ['sections', 'section'],
      ['subsections', 'subsection'],
      ['subsubsections', 'subsubsection'],
    ] as const) {
      if (Array.isArray(node[key])) node[key].forEach(child => visit(child, type));
    }
    if (Array.isArray(node.items)) {
      node.items.forEach(child => visit(child, isRecord(child) && child.type === 'chapter' ? 'chapter' : 'item'));
    }
  };

  lessonsData.forEach(item => visit(item, item.type || 'chapter'));
  const lastDate = Array.from(sessionDates).sort().at(-1) ?? null;
  return {
    totalItems,
    plannedCount,
    completionRate: totalItems === 0 ? 0 : Math.round((plannedCount / totalItems) * 100),
    sessionsCount: sessionDates.size,
    lastDate,
  };
};

export const prepareImportedLessons = (payload: unknown): ImportPreparationResult => {
  const report = cloneReport();
  const budget: ImportBudget = { nodes: 0 };
  const selectedPayload = selectImportPayload(payload);
  const rawLessons = extractLessonsPayload(selectedPayload);
  const savedDirection = isRecord(selectedPayload) && isContentDirection(selectedPayload.contentDirection)
    ? selectedPayload.contentDirection
    : 'ltr';

  if (!Array.isArray(rawLessons)) {
    logger.warn('Import ignored: payload does not contain an array of lessons.', payload);
    return {
      lessonsData: [],
      report,
      direction: detectContentDirection([], savedDirection),
    };
  }

  const normalized = rawLessons
    .map(item => normalizeItem(item, report, budget))
    .filter((item): item is JsonRecord => item !== null);

  const lessonsData = migrateImportedLessons(normalized).map(ensureTopLevelShape);
  report.topLevelCount = lessonsData.length;
  report.itemCount = lessonsData.reduce((total, topLevel) => {
    const walk = (node: any): number => {
      const ownItems = Array.isArray(node.items) ? node.items.length : 0;
      const sectionItems = Array.isArray(node.sections) ? node.sections.reduce((sum: number, section: any) => sum + walk(section), 0) : 0;
      const subsectionItems = Array.isArray(node.subsections) ? node.subsections.reduce((sum: number, section: any) => sum + walk(section), 0) : 0;
      const subsubsectionItems = Array.isArray(node.subsubsections) ? node.subsubsections.reduce((sum: number, section: any) => sum + walk(section), 0) : 0;
      return ownItems + sectionItems + subsectionItems + subsubsectionItems;
    };
    return total + walk(topLevel);
  }, 0);

  const direction = detectContentDirection(lessonsData, savedDirection);
  logger.info('Import preparation completed', { ...report, direction });
  return { lessonsData, report, direction };
};

export type { ImportPreparationResult };
