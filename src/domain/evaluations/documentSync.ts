import type { AppConfig, ContentDocument } from '../../types.js';

type DocumentSettings = Pick<Partial<AppConfig>, 'assessmentDocuments' | 'pedagogicalEvents' | 'removedAssessments'>;
const stamp = (document?: ContentDocument) => document ? Date.parse(document.updatedAt) || 0 : -1;
/** Empty source is an explicit, timestamped deletion, not a missing field. */
const latestDocument = (preferred?: ContentDocument, other?: ContentDocument) =>
  stamp(other) > stamp(preferred) ? other : preferred;

/** Settings keep their own revision; written content has a revision per document.
 * Older clients may omit documents. Only tombstones or removal of their owner
 * may delete them. Events absent from the preferred snapshot stay deleted. */
export function mergePedagogicalDocuments<T extends DocumentSettings>(preferred: T, other: DocumentSettings): T {
  const merged = { ...preferred };
  if (preferred.assessmentDocuments !== undefined || other.assessmentDocuments !== undefined) {
    const documents: NonNullable<AppConfig['assessmentDocuments']> = {};
    const classes = new Set([...Object.keys(preferred.assessmentDocuments ?? {}), ...Object.keys(other.assessmentDocuments ?? {})]);
    for (const classId of classes) {
      const first = preferred.assessmentDocuments?.[classId] ?? {};
      const second = other.assessmentDocuments?.[classId] ?? {};
      const removed = new Set(preferred.removedAssessments?.[classId]);
      const values: Record<string, ContentDocument> = {};
      for (const id of new Set([...Object.keys(first), ...Object.keys(second)])) {
        if (removed.has(id)) continue;
        const document = latestDocument(first[id], second[id]);
        if (document) values[id] = document;
      }
      documents[classId] = values;
    }
    merged.assessmentDocuments = documents;
  }
  if (preferred.pedagogicalEvents) {
    merged.pedagogicalEvents = Object.fromEntries(Object.entries(preferred.pedagogicalEvents).map(([classId, events]) => {
      const previous = new Map((other.pedagogicalEvents?.[classId] ?? []).map(event => [event.id, event.document]));
      return [classId, events.map(event => {
        const document = latestDocument(event.document, previous.get(event.id));
        return document === event.document ? event : { ...event, document };
      })];
    }));
  }
  return merged;
}

/** Compare only written content, independently of dates, statuses or roster edits. */
export function pedagogicalDocumentsEqual(left: DocumentSettings, right: DocumentSettings): boolean {
  const project = (settings: DocumentSettings) => {
    const records: Array<[string, string, string, string, string]> = [];
    for (const [classId, documents] of Object.entries(settings.assessmentDocuments ?? {})) {
      for (const [id, document] of Object.entries(documents)) records.push(['assessment', classId, id, document.source, document.updatedAt]);
    }
    for (const [classId, events] of Object.entries(settings.pedagogicalEvents ?? {})) {
      for (const event of events) if (event.document) records.push(['event', classId, event.id, event.document.source, event.document.updatedAt]);
    }
    return JSON.stringify(records.sort((a, b) => JSON.stringify(a.slice(0, 3)).localeCompare(JSON.stringify(b.slice(0, 3)))));
  };
  return project(left) === project(right);
}
