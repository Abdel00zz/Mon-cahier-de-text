import type { LessonsData } from '../../types';

export type NotebookRead = { status: 'read'; lessons: LessonsData } | { status: 'unavailable'; cause: unknown };

/** One read per class per evaluation, shared by diagnostics and suggestions, including failures.
 * Lifetime is one workspace snapshot: no persistent student data or cross-account cache. */
export function createNotebookSnapshot(reader?: (classId: string) => LessonsData) {
  const reads = new Map<string, NotebookRead>();
  const read = reader ? (classId: string): LessonsData => {
    let result = reads.get(classId);
    if (!result) {
      try {
        const lessons = reader(classId);
        if (!Array.isArray(lessons)) throw new Error('Notebook unavailable');
        result = { status: 'read', lessons };
      } catch (cause) { result = { status: 'unavailable', cause }; }
      reads.set(classId, result);
    }
    if (result.status === 'unavailable') throw result.cause;
    return result.lessons;
  } : undefined;
  return { read, reads: reads as ReadonlyMap<string, NotebookRead> };
}
