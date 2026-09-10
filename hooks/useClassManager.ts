import { useState, useEffect, useCallback } from 'react';
import { ClassInfo } from '../types';
import { logger } from '../utils/logger';
import { markClassDirty, markClassDeleted, markClassesListDirty, notifyClassesChanged, subscribe, touchClassSyncMeta } from '../utils/syncBus';
import { captureWorkspaceLease } from '../utils/accountWorkspace';
import { CLASS_STORAGE_KEY, readStoredClasses } from '../utils/localClassStorage';

const DATA_PREFIX = 'classData_v1_';

export const useClassManager = () => {
    const [workspaceIsActive] = useState(() => captureWorkspaceLease());
    const [classes, setClasses] = useState<ClassInfo[]>(() => {
        try { return readStoredClasses(); }
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
            localStorage.setItem('app_first_launch_v1', 'true');
            setClasses(normalized);
        } catch (error) {
            // Un stockage corrompu reste récupérable : ne jamais le remplacer par [].
            logger.error('Local class initialization failed', error);
        }
    }, [workspaceIsActive]);

    const persistClassesNow = useCallback((next: ClassInfo[], markDirty = true) => {
        if (!workspaceIsActive()) return false;
        try {
            localStorage.setItem(CLASS_STORAGE_KEY, JSON.stringify(next));
            setClasses(next);
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

    const addClass = useCallback((details: Omit<ClassInfo, 'id' | 'createdAt' | 'color'>) => {
        if (!workspaceIsActive()) throw new Error('Le compte actif a changé.');
        const newClass: ClassInfo = {
            ...details, cycle: details.cycle ?? 'college', id: crypto.randomUUID(),
            createdAt: new Date().toISOString(), color: '',
        };
        const next = [...readStoredClasses(), newClass];
        // Initialiser le cahier avant d'exposer sa carte et de réveiller le cloud.
        localStorage.setItem(DATA_PREFIX + newClass.id, '[]');
        if (!persistClassesNow(next)) {
            localStorage.removeItem(DATA_PREFIX + newClass.id);
            throw new Error('Impossible de sauvegarder la classe sur cet appareil.');
        }
        touchClassSyncMeta(newClass.id);
        markClassDirty(newClass.id);
        return newClass;
    }, [persistClassesNow, workspaceIsActive]);

    const deleteClass = useCallback((classId: string) => {
        if (!workspaceIsActive()) return;
        const latest = readStoredClasses();
        if (!latest.some(c => c.id === classId)) return;
        if (!persistClassesNow(latest.filter(c => c.id !== classId), false)) return;
        markClassDeleted(classId);
        for (const prefix of [DATA_PREFIX, 'editJournal_v1_', 'printMeta_v1_', 'editor_actions_ignored_v1_']) {
            localStorage.removeItem(prefix + classId);
        }
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
