import { useState, useEffect, useCallback, useRef } from 'react';
import { useImmer } from 'use-immer';
import { ClassInfo } from '../types';
import { logger } from '../utils/logger';
import { markClassDirty, markClassDeleted, markClassesListDirty, notifyClassesChanged, subscribe, touchClassSyncMeta } from '../utils/syncBus';
import { normalizeOfficialClassName } from '../constants';
import { captureWorkspaceLease } from '../utils/accountWorkspace';

const STORAGE_KEY  = 'classManager_v1';
const DATA_PREFIX  = 'classData_v1_';
const LAUNCH_FLAG  = 'app_first_launch_v1';

const parseStoredClasses = (storedRaw: string | null): ClassInfo[] => {
    if (!storedRaw) return [];
    try {
        const stored = JSON.parse(storedRaw);
        if (Array.isArray(stored)) {
            return stored.map((classInfo: ClassInfo) => ({
                ...classInfo,
                name: normalizeOfficialClassName(classInfo.name),
                color: '',
            }));
        }
    } catch (e) {
        logger.error('Failed to parse stored classes', e);
    }
    return [];
};

export const useClassManager = () => {
    const [workspaceIsActive] = useState(() => captureWorkspaceLease());
    const [classes, setClasses] = useImmer<ClassInfo[]>(() => {
        if (typeof window !== 'undefined') {
            return parseStoredClasses(localStorage.getItem(STORAGE_KEY));
        }
        return [];
    });
    const [isLoading, setIsLoading] = useState(false);
    // Guard: skip the persistence effect until after the initial load completes
    const [ready, setReady] = useState(true);
    const skipNextPersistRef = useRef(true);
    // Les créations groupées (onboarding) doivent toujours partir de la liste
    // la plus récente, même avant le prochain rendu React.
    const classesRef = useRef<ClassInfo[]>(classes);

    useEffect(() => {
        classesRef.current = classes;
    }, [classes]);

    /**
     * La liste est la source de vérité structurelle : l'écrire avant d'émettre
     * l'évènement de synchro évite qu'un rechargement ou un push immédiat lise
     * encore la liste précédente.
     */
    const persistClassesNow = useCallback((nextClasses: ClassInfo[], markDirty = true) => {
        if (!workspaceIsActive()) return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(nextClasses));
            if (markDirty) markClassesListDirty();
            notifyClassesChanged();
        } catch (err) {
            logger.error('Failed to persist classes', err);
        }
    }, [workspaceIsActive]);

    // ── Initial load ────────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false;

        (() => {
            if (!workspaceIsActive()) return;
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
                        classesRef.current = normalized;
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
                classesRef.current = [];
                setIsLoading(false);
                setReady(true);
            }
        })();

        return () => { cancelled = true; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Persist to localStorage whenever classes mutate (after init) ────────
    // We serialize the *committed state* value, NOT an immer draft proxy,
    // which avoids the proxy-serialisation bug present in the old saveClasses.
    useEffect(() => {
        if (!ready) return;
        if (skipNextPersistRef.current) {
            skipNextPersistRef.current = false;
            return;
        }
        persistClassesNow(classes);
    }, [classes, persistClassesNow, ready]);

    // ── Rechargement quand un pull cloud a réécrit le localStorage ─────────
    useEffect(() => {
        const reload = () => {
            try {
                const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
                if (!Array.isArray(stored)) {
                    throw new Error('Stored classes are not an array');
                }
                skipNextPersistRef.current = true; // ne pas re-marquer dirty ce rechargement
                setClasses(() => stored);
                classesRef.current = stored;
            } catch (err) {
                logger.error('Failed to reload classes after storage change', err);
            }
        };
        const unsubscribePull = subscribe('pull-applied', reload);
        const unsubscribeClasses = subscribe('classes-changed', reload);
        return () => {
            unsubscribePull();
            unsubscribeClasses();
        };
    }, [setClasses]);

    // ── Mutations ───────────────────────────────────────────────────────────
    const addClass = useCallback(
        (details: Omit<ClassInfo, 'id' | 'createdAt' | 'color'>) => {
            if (!workspaceIsActive()) throw new Error('Le compte actif a changé.');
            const newClass: ClassInfo = {
                ...details,
                cycle:     details.cycle ?? 'college',
                id:        crypto.randomUUID(),
                createdAt: new Date().toISOString(),
                color:     '',
            };
            const nextClasses = [...classesRef.current, newClass];
            classesRef.current = nextClasses;
            persistClassesNow(nextClasses);
            skipNextPersistRef.current = true;
            setClasses(() => nextClasses);
            // Conserver l'écran vide « créer / charger ». Le diagnostic est
            // injecté au premier ajout ou au chargement d'un contenu prédéfini.
            localStorage.setItem(`${DATA_PREFIX}${newClass.id}`, JSON.stringify([]));
            touchClassSyncMeta(newClass.id);
            markClassDirty(newClass.id);
            return newClass;
        },
        [persistClassesNow, setClasses, workspaceIsActive],
    );

    const deleteClass = useCallback(
        (classId: string) => {
            if (!workspaceIsActive()) return;
            // La confirmation est portée par la couche UI (ConfirmDialog de la
            // carte), pas de `window.confirm` ici, sinon double confirmation.
            const target = classes.find(c => c.id === classId);
            if (!target) return;
            const nextClasses = classes.filter(c => c.id !== classId);
            classesRef.current = nextClasses;
            persistClassesNow(nextClasses, false);
            skipNextPersistRef.current = true;
            setClasses(() => nextClasses);
            localStorage.removeItem(`${DATA_PREFIX}${classId}`);
            localStorage.removeItem(`editJournal_v1_${classId}`);
            localStorage.removeItem(`printMeta_v1_${classId}`);
            localStorage.removeItem(`editor_actions_ignored_v1_${classId}`);
            markClassDeleted(classId);
        },
        [classes, persistClassesNow, setClasses, workspaceIsActive],
    );

    const updateClass = useCallback(
        (classId: string, updates: Partial<Omit<ClassInfo, 'id'>>) => {
            if (!workspaceIsActive()) return;
            const nextClasses = classes.map(classInfo =>
                classInfo.id === classId ? { ...classInfo, ...updates } : classInfo
            );
            if (nextClasses.every((classInfo, index) => classInfo === classes[index])) return;
            classesRef.current = nextClasses;
            persistClassesNow(nextClasses);
            skipNextPersistRef.current = true;
            setClasses(() => nextClasses);
        },
        [classes, persistClassesNow, setClasses, workspaceIsActive],
    );

    const recordClassOpened = useCallback((classId: string) => {
        if (!workspaceIsActive()) return;
        const current = classesRef.current;
        if (!current.some(item => item.id === classId)) return;
        const lastOpenedAt = new Date().toISOString();
        const next = current.map(item => item.id === classId ? { ...item, lastOpenedAt } : item);
        classesRef.current = next;
        persistClassesNow(next);
        skipNextPersistRef.current = true;
        setClasses(() => next);
    }, [persistClassesNow, setClasses, workspaceIsActive]);

    return { classes, addClass, deleteClass, updateClass, recordClassOpened, isLoading };
};
