import type { ContentDirection, LessonsData } from '../../types';
import { markClassDirty, touchClassSyncMeta } from '../sync/syncBus';
import { readStoredNotebook } from './notebookStorage';
import { LocalSyncDataError } from './localJson';
import { quarantineRaw, writeDurably } from './safeStorage';

type NotebookStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
const lastWritten = new Map<string, string>();

/**
 * Queue only a durable notebook: a quota failure must never announce a successful import.
 * An unreadable stored notebook is quarantined before being replaced, never silently lost.
 */
export function saveNotebook(classId: string, lessonsData: LessonsData, contentDirection: ContentDirection,
    storage: NotebookStorage = localStorage): void {
    const key = `classData_v1_${classId}`;
    const previous = storage.getItem(key);
    // Skip re-validating what this session just wrote (avoids a full parse per autosave).
    if (previous !== null && lastWritten.get(key) !== previous) {
        try {
            readStoredNotebook(classId, storage);
        } catch (error) {
            if (!(error instanceof LocalSyncDataError)) throw error;
            // Fails (and aborts the save) if even the recovery copy cannot be stored.
            quarantineRaw(classId, previous, storage);
        }
    }
    const serialized = JSON.stringify({ lessonsData, contentDirection });
    writeDurably(key, serialized, storage);
    lastWritten.set(key, serialized);
    if (lastWritten.size > 24) lastWritten.delete(lastWritten.keys().next().value!);
    touchClassSyncMeta(classId);
    markClassDirty(classId);
}
