import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { AppLocale, LessonsData } from '@/types';
import { readStoredNotebook } from '@/infrastructure/storage/notebookStorage';
import { saveNotebook } from '@/infrastructure/storage/saveNotebook';
import { subscribe } from '@/infrastructure/sync/syncBus';
import { defaultContentDirection } from '@/domain/notebook/contentDirection';
import { toast } from 'sonner';
import { translateLocaleMessage } from '@/i18n/messages';
import { logger } from '@/lib/logger';
const EMPTY_LESSONS: LessonsData = [];

export function commitEvaluationChange(before: LessonsData, next: LessonsData,
    writeNotebook: (lessons: LessonsData) => void, writeSettings: () => void): void {
    if (next === before) { writeSettings(); return; }
    writeNotebook(next);
    try { writeSettings(); }
    catch (error) {
        try { writeNotebook(before); }
        catch (rollbackError) { throw new AggregateError([error, rollbackError], 'Evaluation change and rollback failed'); }
        throw error;
    }
}

/** Dashboard and editor use the same durable notebook and refresh on cloud pull. */
export function useEvaluationNotebook(classId: string, locale: AppLocale, supplied?: LessonsData,
    onChange?: (lessons: LessonsData) => void) {
    const listen = useCallback((listener: () => void) => {
        if (supplied) return () => {};
        const off = [subscribe('dirty', listener), subscribe('pull-applied', listener)];
        window.addEventListener('storage', listener);
        return () => { off.forEach(stop => stop()); window.removeEventListener('storage', listener); };
    }, [supplied]);
    const snapshot = useCallback(() => supplied ? null : localStorage.getItem(`classData_v1_${classId}`), [classId, supplied]);
    const raw = useSyncExternalStore(listen, snapshot, () => null);
    const stored = useMemo(() => {
        if (supplied) return null;
        try { return readStoredNotebook(classId); } catch { return null; }
    }, [classId, supplied, raw]);
    const lessons = supplied ?? stored?.lessonsData ?? EMPTY_LESSONS;
    const persist = (next: LessonsData) => {
        if (onChange) onChange(next);
        else {
            // Rendering can be empty during hydration; writes must never replace
            // an unreadable notebook with that fallback.
            const current = readStoredNotebook(classId);
            saveNotebook(classId, next, current.contentDirection ?? defaultContentDirection(locale));
        }
    };
    const commit = (next: LessonsData, changeSettings: () => void): boolean => {
        try {
            commitEvaluationChange(lessons, next, persist, changeSettings);
            return true;
        } catch (error) {
            logger.error('Evaluation change was not saved', error);
            toast.error(translateLocaleMessage(locale, 'editorNotice.saveError'));
            return false;
        }
    };
    return { lessons, commit };
}
