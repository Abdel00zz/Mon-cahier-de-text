import type { ContentDirection, LessonsData } from '../../types';
import { markClassDirty, touchClassSyncMeta } from '../sync/syncBus';

/** Queue only a durable notebook: a quota failure must never announce a successful import. */
export function saveNotebook(classId: string, lessonsData: LessonsData, contentDirection: ContentDirection,
    storage: Pick<Storage, 'setItem'> = localStorage): void {
    storage.setItem(`classData_v1_${classId}`, JSON.stringify({ lessonsData, contentDirection }));
    touchClassSyncMeta(classId);
    markClassDirty(classId);
}
