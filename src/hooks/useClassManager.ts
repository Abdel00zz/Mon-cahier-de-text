import { useState, useEffect, useCallback } from 'react';
import { ClassDraft, ClassInfo } from '../types';
import { logger } from '../lib/logger';
import { markClassDirty, markClassDeleted, markClassesListDirty, notifyClassesChanged, subscribe, touchClassSyncMeta } from '../infrastructure/sync/syncBus';
import { captureWorkspaceLease } from '../infrastructure/storage/accountWorkspace';
import { CLASS_STORAGE_KEY, readStoredClasses } from '../infrastructure/storage/localClassStorage';
import { assignClassColors } from '../domain/classes/classColors';
import { removeQuarantine } from '../infrastructure/storage/safeStorage';

const DATA_PREFIX = 'classData_v1_';

export const useClassManager = () => {
    const [workspaceIsActive] = useState(() => captureWorkspaceLease());
    const [classes, setClasses] = useState<ClassInfo[]>(() => {
        try {
            return readStoredClasses();
        }
        catch (error) { logger.error('Failed to read local classes', error); return []; }
    });

    // Le marqueur d'onboarding n'a aucune autorité sur les classes déjà stockées.
    // Lecture immédiate, sans spinner réseau ni réécriture à chaque rendu.
    useEffect(() => {
        if (!workspaceIsActive()) return;
        try {
            const normalized = readStoredClasses();
            const raw = localStorage.getItem(CLASS_STORAGE_KEY);
            if (raw !== null && raw !== JSON.stringify(normalized)) {
                localStorage.setItem(CLASS_STORAGE_KEY, JSON.stringify(normalized));
                markClassesListDirty();
            }
            setClasses(normalized);
        } catch (error) {
            // Un stockage corrompu reste récupérable : ne jamais le remplacer par [].
            logger.error('Local class initialization failed', error);
        }
    }, [workspaceIsActive]);

    const persistClassesNow = useCallback((next: ClassInfo[], markDirty = true) => {
        if (!workspaceIsActive()) return false;
        try {
            const colored = assignClassColors(next);
            localStorage.setItem(CLASS_STORAGE_KEY, JSON.stringify(colored));
            setClasses(colored);
            if (markDirty) markClassesListDirty();
            notifyClassesChanged();
            return true;
        } catch (error) {
            logger.error('Failed to persist classes', error);
            return false;
        }
    }, [workspaceIsActive]);

    useEffect(() => {
        const reload = () => {
            if (!workspaceIsActive()) return;
            try { setClasses(readStoredClasses()); }
            catch (error) { logger.error('Failed to reload classes', error); }
        };
        const onStorage = (event: StorageEvent) => {
            if (event.key === CLASS_STORAGE_KEY) reload();
        };
        const offPull = subscribe('pull-applied', reload);
        const offClasses = subscribe('classes-changed', reload);
        window.addEventListener('storage', onStorage);
        return () => { offPull(); offClasses(); window.removeEventListener('storage', onStorage); };
    }, [workspaceIsActive]);

    const addClass = useCallback((details: ClassDraft) => {
        if (!workspaceIsActive()) throw new Error('Le compte actif a changé.');
        const newClass: ClassInfo = {
            ...details, cycle: details.cycle ?? 'college', id: crypto.randomUUID(),
            createdAt: new Date().toISOString(), color: '',
        };
        const next = assignClassColors([...readStoredClasses(), newClass]);
        // Initialiser le cahier avant d'exposer sa carte et de réveiller le cloud.
        localStorage.setItem(DATA_PREFIX + newClass.id, '[]');
        if (!persistClassesNow(next)) {
            localStorage.removeItem(DATA_PREFIX + newClass.id);
            throw new Error('Impossible de sauvegarder la classe sur cet appareil.');
        }
        touchClassSyncMeta(newClass.id);
        markClassDirty(newClass.id);
        return next.find(item => item.id === newClass.id)!;
    }, [persistClassesNow, workspaceIsActive]);

    const deleteClass = useCallback((classId: string) => {
        if (!workspaceIsActive()) throw new Error('Le compte actif a changé.');
        const latest = readStoredClasses();
        if (!latest.some(c => c.id === classId)) return;
        if (!persistClassesNow(latest.filter(c => c.id !== classId), false)) throw new Error('Impossible de supprimer la classe sur cet appareil.');
        markClassDeleted(classId);
        for (const prefix of [DATA_PREFIX, 'editJournal_v1_', 'printMeta_v1_', 'editor_actions_ignored_v1_']) {
            localStorage.removeItem(prefix + classId);
        }
        removeQuarantine(classId);
    }, [persistClassesNow, workspaceIsActive]);

    const updateClass = useCallback((classId: string, updates: Partial<Omit<ClassInfo, 'id'>>) => {
        if (!workspaceIsActive()) return false;
        try {
            const latest = readStoredClasses();
            if (!latest.some(c => c.id === classId)) return false;
            return persistClassesNow(latest.map(c => c.id === classId ? { ...c, ...updates } : c));
        } catch (error) { logger.error('Failed to update local class', error); return false; }
    }, [persistClassesNow, workspaceIsActive]);

    return { classes, addClass, deleteClass, updateClass, isLoading: false };
};
