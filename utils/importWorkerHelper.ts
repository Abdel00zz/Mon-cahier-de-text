import { ImportPreparationResult } from './importPipeline.js';

const workerCode = `
const normalizeDate = (value) => {
  if (value === undefined || value === null || value === '') return { value: '', changed: false };
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const iso = trimmed.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
    if (iso) return { value: trimmed, changed: trimmed !== value };

    const french = trimmed.match(/^(\\d{1,2})[/-](\\d{1,2})[/-](\\d{4})$/);
    if (french) {
      const [, d, m, y] = french;
      return {
        value: \`\${y}-\${m.padStart(2, '0')}-\${d.padStart(2, '0')}\`,
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

const normalizeStringField = (record, key, report) => {
  const value = record[key];
  if (value === undefined || value === null) return;
  const next = String(value).trim();
  if (next !== value) report.trimmedStrings += 1;
  record[key] = next;
};

const normalizeItem = (value, report, depth = 0) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;

  const item = { ...value };
  ['title', 'name', 'type', 'number', 'page', 'description', 'remark', 'content'].forEach(key => {
    normalizeStringField(item, key, report);
  });

  if (Object.prototype.hasOwnProperty.call(item, 'date')) {
    const nextDate = normalizeDate(item.date);
    item.date = nextDate.value;
    if (nextDate.changed) report.normalizedDates += 1;
  }

  if (item.separatorAfter && typeof item.separatorAfter === 'object' && !Array.isArray(item.separatorAfter)) {
    const separator = normalizeItem(item.separatorAfter, report, depth + 1);
    if (separator) item.separatorAfter = separator;
  }

  const nestedKeys = ['sections', 'subsections', 'subsubsections', 'items'];
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
      .filter(child => child !== null);
  });

  if (depth === 0) report.topLevelCount += 1;
  else if (Array.isArray(item.items) || Array.isArray(item.sections) || Array.isArray(item.subsections) || Array.isArray(item.subsubsections)) report.nestedCount += 1;
  else report.itemCount += 1;

  return item;
};

const ensureTopLevelShape = (item) => {
  if (!item.type) item.type = 'chapter';
  if (!item.title && item.name) item.title = String(item.name);
  if (item.type === 'chapter' && !Array.isArray(item.sections)) item.sections = [];
  return item;
};

const migrateLessonsData = (data) => {
  if (!Array.isArray(data)) return [];
  const cloned = JSON.parse(JSON.stringify(data));
  cloned.forEach((item) => {
    if (typeof item !== 'object' || item === null) return;
    if (typeof item.chapter === 'string' && item.title === undefined) {
      item.title = item.chapter;
      delete item.chapter;
    }
    if (item.type === undefined) {
      item.type = 'chapter';
    }
    if (typeof item.title !== 'string') {
      item.title = '';
    }
  });
  return cloned;
};

self.onmessage = function(e) {
  const { action, jsonText } = e.data;
  if (action === 'parseAndNormalize') {
    try {
      const payload = JSON.parse(jsonText);
      const report = {
        topLevelCount: 0,
        nestedCount: 0,
        itemCount: 0,
        normalizedDates: 0,
        trimmedStrings: 0,
        repairedContainers: 0,
      };

      // Extract lessons payload
      let rawLessons = [];
      if (Array.isArray(payload)) {
        rawLessons = payload;
      } else if (payload && typeof payload === 'object') {
        const candidates = [payload.lessonsData, payload.data, payload.lessons, payload.items];
        const found = candidates.find(Array.isArray);
        rawLessons = found ?? [];
      }

      const normalized = rawLessons
        .map(item => normalizeItem(item, report))
        .filter(item => item !== null);

      const lessonsData = migrateLessonsData(normalized).map(ensureTopLevelShape);
      report.topLevelCount = lessonsData.length;

      // Calculate final items count
      report.itemCount = lessonsData.reduce((total, topLevel) => {
        const walk = (node) => {
          const ownItems = Array.isArray(node.items) ? node.items.length : 0;
          const sectionItems = Array.isArray(node.sections) ? node.sections.reduce((sum, section) => sum + walk(section), 0) : 0;
          const subsectionItems = Array.isArray(node.subsections) ? node.subsections.reduce((sum, section) => sum + walk(section), 0) : 0;
          const subsubsectionItems = Array.isArray(node.subsubsections) ? node.subsubsections.reduce((sum, section) => sum + walk(section), 0) : 0;
          return ownItems + sectionItems + subsectionItems + subsubsectionItems;
        };
        return total + walk(topLevel);
      }, 0);

      self.postMessage({ success: true, result: { lessonsData, report } });
    } catch (err) {
      self.postMessage({ success: false, error: err.message });
    }
  } else if (action === 'parseBackup') {
    try {
      const data = JSON.parse(jsonText);
      if (!data.config || !Array.isArray(data.classes)) {
        throw new Error("Fichier de sauvegarde invalide ou corrompu.");
      }
      self.postMessage({ success: true, result: data });
    } catch (err) {
      self.postMessage({ success: false, error: err.message });
    }
  }
};
`;

export const runInWorker = <T>(action: 'parseAndNormalize' | 'parseBackup', jsonText: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const worker = new Worker(url);

    worker.onmessage = (e) => {
      const { success, result, error } = e.data;
      worker.terminate();
      URL.revokeObjectURL(url);
      if (success) {
        resolve(result as T);
      } else {
        reject(new Error(error));
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      URL.revokeObjectURL(url);
      reject(err);
    };

    worker.postMessage({ action, jsonText });
  });
};
