import { createNotebookActivityMemory } from '../../domain/assistant/notebookActivity';
import { readSyncMeta } from '../sync/syncBus';
import { WORKSPACE_SCOPE_KEY } from './accountWorkspace';

const memory = createNotebookActivityMemory();

/** Call only after durable storage succeeds. No persistent history, request or content copy. */
export function rememberNotebookActivity(classId: string, operation: string | undefined, historyAction: string): void {
  try {
    const revision = readSyncMeta()[classId]?.localUpdatedAt;
    if (revision) memory.record(localStorage.getItem(WORKSPACE_SCOPE_KEY) ?? 'guest', classId, revision, operation, historyAction, Date.now());
  } catch { /* Optional session context never blocks notebook saving. */ }
}

export function readNotebookActivity(classId: string) {
  try {
    return memory.read(localStorage.getItem(WORKSPACE_SCOPE_KEY) ?? 'guest', classId, readSyncMeta()[classId]?.localUpdatedAt, Date.now());
  } catch { return undefined; }
}
