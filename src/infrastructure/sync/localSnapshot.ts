import type { AppConfig, ContentDirection, LessonsData } from '../../types';
import { readStoredClasses } from '../storage/localClassStorage';
import { LocalSyncDataError, readLocalJson } from '../storage/localJson';
import { readStoredNotebook } from '../storage/notebookStorage';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Validate the whole local snapshot before any cloud send or pull overwrite. */
export function readLocalSyncSnapshot(storage: Pick<Storage, 'getItem'> = localStorage, options: { includeNotebooks?: boolean } = {}) {
  const classes = readStoredClasses(storage);
  const config = readLocalJson('appConfig_v1', {}, storage);
  if (!isRecord(config)) throw new LocalSyncDataError('appConfig_v1');
  const notebooks = new Map<string, { lessonsData: LessonsData; contentDirection?: ContentDirection }>();
  for (const classInfo of options.includeNotebooks === false ? [] : classes) {
    notebooks.set(classInfo.id, readStoredNotebook(classInfo.id, storage));
  }
  return { classes, config: config as Partial<AppConfig>, notebooks };
}
