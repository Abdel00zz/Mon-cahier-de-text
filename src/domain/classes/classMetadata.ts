import type { ClassInfo } from '../../types.js';
import { withCurriculumSettings } from './classCurriculumSettings.js';

const timestamp = (value?: string): number => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
const FIELDS: readonly (keyof ClassInfo)[] = ['name', 'teacherName', 'subject', 'cycle', 'level', 'branch', 'group', 'courseStartDate', 'curriculumSourceId', 'curriculumChapterMatches', 'notebookContentOrigin'];

/** Opening a card must never make its stale identity newer than another device's edit. */
export function updateClassMetadata(current: ClassInfo, patch: Partial<ClassInfo>, now = Date.now()): ClassInfo {
    const next = { ...current, ...patch, id: current.id, metadataUpdatedAt: current.metadataUpdatedAt };
    if (FIELDS.some(field => JSON.stringify(current[field]) !== JSON.stringify(next[field]))) {
        next.metadataUpdatedAt = new Date(Math.max(now, timestamp(current.metadataUpdatedAt) + 1)).toISOString();
    }
    return next;
}

/** Identity and notebook content have independent clocks. Undated legacy pushes cannot undo a dated edit. */
export function mergeClassMetadata(current: ClassInfo | undefined, incoming: ClassInfo, admin?: ClassInfo, authority: 'current' | 'incoming' = 'current'): ClassInfo {
    const currentTime = timestamp(current?.metadataUpdatedAt);
    const incomingTime = timestamp(incoming.metadataUpdatedAt);
    // The persisted server version breaks ties, both during upload and download.
    const winner = current && currentTime > 0
        && (currentTime > incomingTime || (currentTime === incomingTime && authority === 'current')) ? current : incoming;
    if (admin && (!winner.metadataUpdatedAt || timestamp(winner.metadataUpdatedAt) <= timestamp(admin.metadataUpdatedAt))) {
        return withCurriculumSettings(admin, winner);
    }
    return winner;
}
