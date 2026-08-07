import { useState, useEffect, useCallback, useRef } from 'react';
import { useImmer } from 'use-immer';
import { ClassInfo } from '../types';
import { logger } from '../utils/logger';
import { markClassDirty, markClassDeleted, markClassesListDirty, subscribe, touchClassSyncMeta } from '../utils/syncBus';
import { normalizeOfficialClassName } from '../constants';

const STORAGE_KEY  = 'classManager_v1';
const DATA_PREFIX  = 'classData_v1_';
const LAUNCH_FLAG  = 'app_first_launch_v1';

export const useClassManager = () => {
    const [classes, setClasses] = useImmer<ClassInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // Guard: skip the persistence effect until after the initial load completes
    const [ready, setReady] = useState(false);

    // ── Initial load ────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        (() => {
            const storedRaw   = localStorage.getItem(STORAGE_KEY);
            const hadLaunched = !!localStorage.getItem(LAUNCH_FLAG);

            // ① Normal case: classes already stored and non-empty
            if (hadLaunched && storedRaw) {
                try {
                    const stored = JSON.parse(storedRaw);
                    if (!Array.isArray(stored)) {
                        throw new Error('Stored classes are not an array');
                    }
                    const normalized = stored.map((classInfo: ClassInfo) => ({
                        ...classInfo,
                        name: normalizeOfficialClassName(classInfo.name),
                        color: '',
                    }));
                    const changed = normalized.some((classInfo, index) => (
                        classInfo.name !== stored[index]?.name ||
                        stored[index]?.color !== ''
                    ));
                    if (changed) {
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
                        markClassesListDirty();
                    }
                    if (!cancelled) {
                        setClasses(normalized);
                        setIsLoading(false);
                        setReady(true);
                    }
                    return;
                } catch { /* fall through to clean init */ }
            }

            // ② First launch OR empty/corrupt storage → load clean empty list
            localStorage.setItem(LAUNCH_FLAG, 'true');

            if (!cancelled) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
                setClasses([]);
                setIsLoading(false);
                setReady(true);
            }
        })();

        return () => { cancelled = true; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Persist to localStorage whenever classes mutate (after init) ────────
    // We serialize the *committed state* value, NOT an immer draft proxy,
    // which avoids the proxy-serialisation bug present in the old saveClasses.
    const skipFirstPersistRef = useRef(true);
    useEffect(() => {
        if (!ready) return;
        if (skipFirstPersistRef.current) {
            skipFirstPersistRef.current = false;
            return;
        }
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(classes));
            markClassesListDirty();
        } catch (err) {
            logger.error('Failed to persist classes', err);
        }
    }, [classes, ready]);

    // ── Rechargement quand un pull cloud a réécrit le localStorage ─────────
    useEffect(() => {
        return subscribe('pull-applied', () => {
            try {
                const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                if (!Array.isArray(stored)) {
                    throw new Error('Stored classes are not an array');
                }
                skipFirstPersistRef.current = true; // ne pas re-marquer dirty ce rechargement
                setClasses(() => stored);
            } catch (err) {
                logger.error('Failed to reload classes after cloud pull', err);
            }
        });
    }, [setClasses]);

    // ── Mutations ───────────────────────────────────────────────────────────
    const addClass = useCallback(
        (details: Omit<ClassInfo, 'id' | 'createdAt' | 'color'>) => {
            const newClass: ClassInfo = {
                ...details,
                cycle:     details.cycle ?? 'college',
                id:        crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                color:     '',
            };
            setClasses(d => { d.push(newClass); });
            localStorage.setItem(`${DATA_PREFIX}${newClass.id}`, JSON.stringify([]));
            touchClassSyncMeta(newClass.id);
            markClassDirty(newClass.id);
            return newClass;
        },
        [setClasses],
    );

    const deleteClass = useCallback(
        (classId: string) => {
            // La confirmation est portée par la couche UI (ConfirmDialog de la
            // carte) — pas de `window.confirm` ici, sinon double confirmation.
            const target = classes.find(c => c.id === classId);
            if (!target) return;
            setClasses(d => {
                const i = d.findIndex(c => c.id === classId);
                if (i !== -1) d.splice(i, 1);
            });
            localStorage.removeItem(`${DATA_PREFIX}${classId}`);
            markClassDeleted(classId);
        },
        [classes, setClasses],
    );

    const updateClass = useCallback(
        (classId: string, updates: Partial<Omit<ClassInfo, 'id'>>) => {
            setClasses(d => {
                const c = d.find(x => x.id === classId);
                if (c) Object.assign(c, updates);
            });
        },
        [setClasses],
    );

    return { classes, addClass, deleteClass, updateClass, isLoading };
};
