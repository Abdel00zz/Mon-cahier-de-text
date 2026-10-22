import type { NotebookContentOrigin } from '../../types';
import { updateClassMetadata } from '../../domain/classes/classMetadata';
import { CLASS_STORAGE_KEY, readStoredClasses } from './localClassStorage';
import { markClassesListDirty, notifyClassesChanged } from '../sync/syncBus';
import { logger } from '../../lib/logger';

/** Record only an explicit teacher choice. Uses the existing class metadata sync, without a new request. */
export function recordNotebookOrigin(classId: string, origin: NotebookContentOrigin, isActive: () => boolean): void {
  if (!isActive()) return;
  try {
    const classes = readStoredClasses();
    const current = classes.find(item => item.id === classId);
    if (!current || current.notebookContentOrigin === origin) return;
    localStorage.setItem(CLASS_STORAGE_KEY, JSON.stringify(classes.map(item => item.id === classId
      ? updateClassMetadata(item, { notebookContentOrigin: origin }) : item)));
    markClassesListDirty();
    notifyClassesChanged();
  } catch (error) {
    // Optional guidance metadata must never discard or block the teacher's notebook.
    logger.warn('Notebook origin could not be recorded', error);
  }
}
