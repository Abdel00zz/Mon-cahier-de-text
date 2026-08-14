import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { AppConfig, ClassInfo, Cycle } from '@/types';
import { normalizeGroupNumber, sanitizeGroupNumberInput } from '@/utils/classGroup';
import { defaultLevelForCycle } from './content';
import { createClassDraft, validateClassDraft } from './classDraft';
import type { ClassDraft, ClassDraftValidation, OnboardingCopy } from './types';

interface UseOnboardingClassDraftOptions {
    cycle: Cycle;
    subject: string;
    classes: ClassInfo[];
    copy: OnboardingCopy;
    onConfigChange: (patch: Partial<AppConfig>) => void;
    onCreateClass: (details: { name: string; subject: string; cycle?: Cycle }) => ClassInfo;
}

export interface OnboardingClassDraftController {
    draft: ClassDraft;
    validation: ClassDraftValidation;
    showValidation: boolean;
    isAdding: boolean;
    setLevel: (level: string) => void;
    setGroup: (group: string) => void;
    normalizeGroup: () => void;
    setLabel: (label: string) => void;
    toggleMode: () => void;
    resetForCycle: (cycle: Cycle) => void;
    add: () => void;
}

/**
 * Transaction locale de création d'une classe : elle valide, persiste les
 * choix pédagogiques et crée la classe dans le même circuit parent.
 */
export const useOnboardingClassDraft = ({
    cycle,
    subject,
    classes,
    copy,
    onConfigChange,
    onCreateClass,
}: UseOnboardingClassDraftOptions): OnboardingClassDraftController => {
    const defaultLevel = defaultLevelForCycle(cycle);
    const [draft, setDraft] = useState<ClassDraft>(() => createClassDraft(defaultLevel));
    const [showValidation, setShowValidation] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const creationLockRef = useRef(false);
    const cycleRef = useRef(cycle);

    const validation = useMemo(() => validateClassDraft(draft, classes), [classes, draft]);
    const isReady = Boolean(subject && validation.name && !validation.issue);

    const setLevel = useCallback((level: string) => {
        setDraft(current => ({ ...current, level }));
    }, []);

    const setGroup = useCallback((group: string) => {
        setDraft(current => ({ ...current, group: sanitizeGroupNumberInput(group) }));
    }, []);

    const normalizeGroup = useCallback(() => {
        setDraft(current => {
            const normalized = normalizeGroupNumber(current.group);
            return normalized ? { ...current, group: normalized } : current;
        });
    }, []);

    const setLabel = useCallback((label: string) => {
        setDraft(current => ({ ...current, label }));
    }, []);

    const toggleMode = useCallback(() => {
        setDraft(current => ({
            ...current,
            mode: current.mode === 'catalog' ? 'manual' : 'catalog',
        }));
        setShowValidation(false);
    }, []);

    const resetForCycle = useCallback((nextCycle: Cycle) => {
        cycleRef.current = nextCycle;
        const nextDefaultLevel = defaultLevelForCycle(nextCycle);
        setDraft(current => current.mode === 'catalog'
            ? { ...current, level: nextDefaultLevel, group: '' }
            : current,
        );
        setShowValidation(false);
    }, []);

    // Un pull cloud ou un changement de cycle extérieur à cette étape garde le
    // brouillon cohérent avec les niveaux réellement disponibles.
    useEffect(() => {
        if (cycleRef.current !== cycle) resetForCycle(cycle);
    }, [cycle, resetForCycle]);

    const add = useCallback(() => {
        if (creationLockRef.current || isAdding) return;
        if (!isReady || !validation.name) {
            setShowValidation(true);
            return;
        }

        creationLockRef.current = true;
        setIsAdding(true);
        try {
            // La préférence et la classe sont écrites dans l'ordre : le parent
            // persiste et synchronise toujours un ensemble cohérent.
            onConfigChange({
                selectedCycles: [cycle],
                showAllCycles: false,
            });
            onCreateClass({ name: validation.name, subject, cycle });
            toast.success(copy.classAdded);
            setDraft(createClassDraft(defaultLevel));
            setShowValidation(false);
        } catch {
            toast.error(copy.classCreationError);
        } finally {
            window.setTimeout(() => {
                creationLockRef.current = false;
                setIsAdding(false);
            }, 0);
        }
    }, [copy, cycle, defaultLevel, isAdding, isReady, onConfigChange, onCreateClass, subject, validation]);

    return useMemo(() => ({
        draft,
        validation,
        showValidation,
        isAdding,
        setLevel,
        setGroup,
        normalizeGroup,
        setLabel,
        toggleMode,
        resetForCycle,
        add,
    }), [
        add,
        draft,
        isAdding,
        normalizeGroup,
        resetForCycle,
        setGroup,
        setLabel,
        setLevel,
        showValidation,
        toggleMode,
        validation,
    ]);
};
