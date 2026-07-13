import { LessonsData, TopLevelItem } from '../types.js';
import { migrateLessonsData } from './dataUtils.js';
import { logger } from './logger.js';

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
}

type JsonRecord = Record<string, unknown>;

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
    if (iso) return { value: trimmed, changed: trimmed !== value };

    const french = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (french) {
      const [, d, m, y] = french;
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
  if (next !== value) report.trimmedStrings += 1;
  record[key] = next;
};

const normalizeItem = (value: unknown, report: ImportReport, depth = 0): JsonRecord | null => {
  if (!isRecord(value)) return null;

  const item: JsonRecord = { ...value };
  ['title', 'name', 'type', 'number', 'page', 'description', 'remark', 'content'].forEach(key => {
    normalizeStringField(item, key, report);
  });

  if (Object.prototype.hasOwnProperty.call(item, 'date')) {
    const nextDate = normalizeDate(item.date);
    item.date = nextDate.value;
    if (nextDate.changed) report.normalizedDates += 1;
  }

  if (isRecord(item.separatorAfter)) {
    const separator = normalizeItem(item.separatorAfter, report, depth + 1);
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
      .map(child => normalizeItem(child, report, depth + 1))
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

export const prepareImportedLessons = (payload: unknown): ImportPreparationResult => {
  const report = cloneReport();
  const rawLessons = extractLessonsPayload(payload);

  if (!Array.isArray(rawLessons)) {
    logger.warn('Import ignored: payload does not contain an array of lessons.', payload);
    return { lessonsData: [], report };
  }

  const normalized = rawLessons
    .map(item => normalizeItem(item, report))
    .filter((item): item is JsonRecord => item !== null);

  const lessonsData = migrateLessonsData(normalized).map(ensureTopLevelShape);
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

  logger.info('Import preparation completed', report);
  return { lessonsData, report };
};

export type { ImportPreparationResult };
