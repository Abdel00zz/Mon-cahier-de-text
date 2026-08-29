import { memo, useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { classNameForLevelAndGroup, isSameClassGroup, normalizeGroupNumber, sanitizeGroupNumberInput } from '@/utils/classGroup';
import { LEVEL_GROUPS, ONBOARDING_CYCLES } from '../content';
import { cn } from '@/lib/utils';
import { Plus, X, Check, School, GraduationCap, FlaskConical, Layers } from '@/components/ui/icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { ClassInfo, Cycle } from '@/types';
import type { ModalLang, OnboardingCopy } from '../types';
import type { OnboardingClassDraftController } from '../useOnboardingClassDraft';

interface ClassesStepProps {
    classes: ClassInfo[];
    cycle: Cycle;
    cycles?: Cycle[];
    lang: ModalLang;
    copy: OnboardingCopy;
    selectedSubjects?: string[];
    controller?: OnboardingClassDraftController;
    onCreateClass?: (details: { name: string; subject: string; cycle?: Cycle }) => ClassInfo;
    onRemove: (classInfo: ClassInfo) => void;
    onConfigChange?: (patch: Partial<any>) => void;
    onCycleChange?: (cycle: Cycle) => void;
}

const DEFAULT_QUICK_GROUPS = ['1', '2', '3', '4'];

export const ClassesStep = memo<ClassesStepProps>(({
    classes,
    cycle,
    cycles = [cycle],
    lang,
    copy,
    selectedSubjects = [],
    onCreateClass,
    onRemove,
    onCycleChange,
}) => {
    // Liste des paliers pédagogiques pour ce cycle (ex: Tronc commun, 1re Bac, 2e Bac pour le Lycée)
    const levelGroups = useMemo(() => LEVEL_GROUPS[cycle] ?? [], [cycle]);
    const [activeGroupKey, setActiveGroupKey] = useState<string>(() => levelGroups[0]?.key ?? 'common');

    // Matière active pour la création
    const availableSubjects = selectedSubjects.length > 0 ? selectedSubjects : ['Général'];
    const [activeSubject, setActiveSubject] = useState<string>(availableSubjects[0] ?? 'Général');

    // État pour l'ajout d'une classe personnalisée (nom libre)
    const [isCustomOpen, setIsCustomOpen] = useState(false);
    const [customName, setCustomName] = useState('');
    const [customError, setCustomError] = useState<string | null>(null);

    // État pour la saisie d'un autre numéro de groupe (ex: groupe 5, 6...)
    const [otherGroupLevel, setOtherGroupLevel] = useState<string | null>(null);
    const [otherGroupValue, setOtherGroupValue] = useState('');

    useEffect(() => {
        setActiveGroupKey(levelGroups[0]?.key ?? 'common');
        setOtherGroupLevel(null);
    }, [cycle, levelGroups]);

    // Palier sélectionné
    const currentLevelGroup = useMemo(() => {
        return levelGroups.find(g => g.key === activeGroupKey) ?? levelGroups[0];
    }, [levelGroups, activeGroupKey]);

    // Action d'ajout de classe unifiée
    const handleAddClass = useCallback((name: string, subject: string) => {
        if (onCreateClass) {
            return onCreateClass({ name, subject, cycle });
        }
    }, [onCreateClass, cycle]);

    // Basculer un groupe pour un niveau donné
    const handleToggleGroup = useCallback((level: string, groupNumber: string) => {
        const existing = classes.find(c => isSameClassGroup(c.name, level, groupNumber));
        if (existing) {
            onRemove(existing);
        } else {
            const fullName = classNameForLevelAndGroup(level, groupNumber);
            handleAddClass(fullName, activeSubject);
        }
    }, [classes, onRemove, handleAddClass, activeSubject]);

    // Clic sur l'en-tête du niveau : active le groupe 1 s'il n'y a aucun groupe
    const handleToggleLevelDefault = useCallback((level: string) => {
        const existingForLevel = classes.filter(c => isSameClassGroup(c.name, level, '1') || c.name.startsWith(level));
        if (existingForLevel.length === 0) {
            const fullName = classNameForLevelAndGroup(level, '1');
            handleAddClass(fullName, activeSubject);
        }
    }, [classes, handleAddClass, activeSubject]);

    // Validation et ajout de classe personnalisée
    const handleAddCustomClass = useCallback((e?: React.FormEvent) => {
        e?.preventDefault();
        const trimmed = customName.trim();
        if (!trimmed) {
            setCustomError(copy.missingLabel);
            return;
        }
        if (classes.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
            setCustomError(copy.existingClass);
            return;
        }
        setCustomError(null);
        handleAddClass(trimmed, activeSubject);
        setCustomName('');
        setIsCustomOpen(false);
    }, [customName, copy, classes, handleAddClass, activeSubject]);

    // Validation et ajout d'un autre numéro de groupe
    const handleAddOtherGroup = useCallback((level: string) => {
        const normalized = normalizeGroupNumber(otherGroupValue);
        if (!normalized) return;
        const fullName = classNameForLevelAndGroup(level, normalized);
        if (!classes.some(c => c.name.toLowerCase() === fullName.toLowerCase())) {
            handleAddClass(fullName, activeSubject);
        }
        setOtherGroupValue('');
        setOtherGroupLevel(null);
    }, [otherGroupValue, classes, handleAddClass, activeSubject]);

    const iconForCycle = (value?: Cycle) => value === 'college' ? School : value === 'prepa' ? FlaskConical : GraduationCap;

    return (
        <div className="mx-auto max-w-2xl space-y-5 animate-fade-in duration-500">
            {cycles.length > 1 && (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {ONBOARDING_CYCLES.filter(option => cycles.includes(option.key)).map(option => {
                        const active = option.key === cycle;
                        const Icon = option.icon;
                        return (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => onCycleChange?.(option.key)}
                                aria-pressed={active}
                                className={cn(
                                    'flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 px-3 text-center text-xs font-bold transition-all',
                                    active
                                        ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-[0_4px_14px_rgba(37,99,235,0.10)]'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50',
                                )}
                            >
                                <Icon className={cn('h-4 w-4', active ? 'text-indigo-600' : 'text-slate-400')} />
                                <span>{copy.cycleLabels[option.key]}</span>
                            </button>
                        );
                    })}
                </div>
            )}
            {/* ── ZONE 1 : Barre unifiée des classes sélectionnées (Live preview) ── */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 p-4 shadow-xs sm:p-5">

                <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                    <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-[0_2px_8px_rgba(37,99,235,0.22)]">
                            <Layers className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-xs font-black tracking-wider uppercase text-slate-600">
                            {copy.sectionClasses}
                        </span>
                    </div>

                    <span className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all',
                        classes.length > 0
                            ? 'bg-blue-600 text-white shadow-[0_2px_10px_rgba(37,99,235,0.22)]'
                            : 'bg-slate-200/80 text-slate-600'
                    )}>
                        {classes.length > 0
                            ? copy.configuredClassesCount(classes.length)
                            : copy.noClassSelectedYet
                        }
                    </span>
                </div>

                {/* Liste fluide des badges de classes configurées */}
                <div className="min-h-[40px] pt-1">
                    {classes.length === 0 ? (
                        <p className="text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">
                            {copy.selectBranchesHint}
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            <AnimatePresence>
                                {classes.map(classInfo => (
                                    <motion.div
                                        key={classInfo.id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.85 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.85 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                        className="group inline-flex items-center gap-1.5 rounded-xl border border-indigo-200/80 bg-white/95 px-3 py-1.5 text-xs font-bold text-indigo-950 shadow-[0_2px_8px_rgba(99,102,241,0.08)] transition-all hover:border-indigo-300 sm:text-sm"
                                    >
                                        {(() => {
                                            const ClassCycleIcon = iconForCycle(classInfo.cycle);
                                            return <ClassCycleIcon className="h-3.5 w-3.5 shrink-0 text-indigo-600" />;
                                        })()}
                                        <span className="max-w-[220px] truncate sm:max-w-xs">
                                            {formatLocalizedClassDisplayName(classInfo.name, lang)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => onRemove(classInfo)}
                                            aria-label={copy.removeCreatedClass}
                                            className="ml-0.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>
            </div>

            {/* ── SÉLECTEUR DE MATIÈRE RAPIDE (si le professeur a plusieurs matières) ── */}
            {availableSubjects.length > 1 && (
                <div className="flex flex-wrap items-center gap-2 px-1">
                    <span className="text-xs font-bold text-slate-600">
                        {copy.assignedSubject} :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                        {availableSubjects.map(subj => {
                            const isSelected = activeSubject === subj;
                            return (
                                <button
                                    key={subj}
                                    type="button"
                                    onClick={() => setActiveSubject(subj)}
                                    className={cn(
                                        'cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition-all',
                                        isSelected
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'border border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted/50'
                                    )}
                                >
                                    {formatLocalizedSubjectDisplayName(subj, lang)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── ONGLETS DES PALIERS (Tronc commun / 1re Bac / 2e Bac...) ── */}
            {levelGroups.length > 1 && (
                <div className="flex rounded-xl border border-border bg-muted/70 p-1.5">
                    {levelGroups.map(group => {
                        const isActive = (activeGroupKey || levelGroups[0]?.key) === group.key;
                        const label = copy.levelGroupLabels[group.key] ?? group.key;
                        // Compte les classes déjà créées dans ce palier
                        const countInThisGroup = classes.filter(c =>
                            group.levels.some(lvl => isSameClassGroup(c.name, lvl, '1') || c.name.startsWith(lvl))
                        ).length;

                        return (
                            <button
                                key={group.key}
                                type="button"
                                onClick={() => {
                                    setActiveGroupKey(group.key);
                                    setOtherGroupLevel(null);
                                }}
                                className={cn(
                                    'relative flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all sm:text-sm',
                                        isActive
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:bg-card hover:text-foreground'
                                )}
                            >
                                <span>{label}</span>
                                {countInThisGroup > 0 && (
                                    <span className={cn(
                                        'flex h-4 min-w-4 items-center justify-center rounded-full px-1.5 text-[10px] font-black',
                                        isActive ? 'bg-card text-primary shadow-xs' : 'bg-muted text-muted-foreground'
                                    )}>
                                        {countInThisGroup}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {cycle === 'prepa' && (
                <p className="rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-start text-xs font-semibold leading-relaxed text-blue-900">
                    {copy.prepaPathHint}
                </p>
            )}

            {/* ── ZONE 2 : CARTES DE CHOIX DES FILIÈRES & GROUPES (Progressive & Instantanée) ── */}
            <div className="space-y-2.5">
                {currentLevelGroup?.levels.map(level => {
                    // Vérifier quels groupes existent pour cette filière
                    const existingClassesForLevel = classes.filter(c =>
                        isSameClassGroup(c.name, level, '1') || c.name.startsWith(level)
                    );
                    const isAnyGroupSelected = existingClassesForLevel.length > 0;

                    // Liste de tous les groupes à afficher (1, 2, 3, 4 + les groupes personnalisés existants)
                    const extraExistingGroups = existingClassesForLevel
                        .map(c => {
                            const normC = c.name.trim();
                            const normL = level.trim();
                            if (normC === normL) return '1';
                            return normC.slice(normL.length).trim();
                        })
                        .filter(g => g && !DEFAULT_QUICK_GROUPS.includes(g));

                    const displayGroups = Array.from(new Set([...DEFAULT_QUICK_GROUPS, ...extraExistingGroups]));
                    const isShowingOtherInput = otherGroupLevel === level;

                    return (
                        <div
                            key={level}
                            className={cn(
                                'relative rounded-2xl border p-3.5 transition-all duration-200 sm:p-4',
                                isAnyGroupSelected
                                    ? 'border-primary/35 bg-primary/[0.045] shadow-xs'
                                    : 'border-border bg-card hover:border-primary/25 hover:bg-muted/25 hover:shadow-2xs'
                            )}
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                {/* Nom de la filière avec coche d'activation */}
                                <button
                                    type="button"
                                    onClick={() => handleToggleLevelDefault(level)}
                                    className="group flex cursor-pointer items-center gap-2.5 text-start focus-visible:outline-none"
                                >
                                    <div className={cn(
                                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all duration-200',
                                        isAnyGroupSelected
                                            ? 'border-transparent bg-primary text-primary-foreground shadow-xs'
                                            : 'border-border bg-card group-hover:border-primary/50'
                                    )}>
                                        {isAnyGroupSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                    </div>
                                    <span className={cn(
                                        'text-sm font-bold transition-colors sm:text-base',
                                        isAnyGroupSelected ? 'text-foreground' : 'text-foreground group-hover:text-primary'
                                    )}>
                                        {formatLocalizedClassDisplayName(level, lang, { includeClassPrefix: false })}
                                    </span>
                                </button>

                                {/* Sélecteur direct des numéros de groupes */}
                                <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-auto">
                                    <span className="text-[11px] font-bold text-slate-400 sm:hidden">
                                        {copy.groupsLabel}
                                    </span>
                                    {displayGroups.map(groupNum => {
                                        const isGroupActive = classes.some(c => isSameClassGroup(c.name, level, groupNum));
                                        return (
                                            <button
                                                key={groupNum}
                                                type="button"
                                                onClick={() => handleToggleGroup(level, groupNum)}
                                                className={cn(
                                                    'flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-lg px-2.5 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-95',
                                                    isGroupActive
                                                        ? 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90'
                                                        : 'border border-border bg-card text-foreground hover:border-primary/30 hover:bg-muted/60'
                                                )}
                                                title={`${level} ${groupNum}`}
                                            >
                                                {copy.groupPrefix} {groupNum}
                                            </button>
                                        );
                                    })}

                                    {/* Bouton pour ajouter un autre numéro (ex: 5, 6...) */}
                                    {!isShowingOtherInput ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOtherGroupLevel(level);
                                                setOtherGroupValue('');
                                            }}
                                            className="flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-dashed border-border bg-muted/40 px-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:bg-muted hover:text-primary focus-visible:outline-none"
                                            title={copy.otherGroupNumber}
                                        >
                                            <Plus className="h-3 w-3" />
                                            <span className="text-[11px] font-semibold">{copy.otherGroupNumber}</span>
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            <Input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                autoFocus
                                                value={otherGroupValue}
                                                onChange={e => setOtherGroupValue(sanitizeGroupNumberInput(e.target.value))}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') handleAddOtherGroup(level);
                                                    if (e.key === 'Escape') setOtherGroupLevel(null);
                                                }}
                                                placeholder="N°"
                                                className="h-8 w-12 rounded-lg border-primary/50 px-1.5 text-center text-xs font-bold"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleAddOtherGroup(level)}
                                                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                                            >
                                                <Check className="h-3.5 w-3.5 stroke-[3]" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setOtherGroupLevel(null)}
                                                className="flex h-8 w-6 cursor-pointer items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── ZONE 3 : CLASSE PERSONNALISÉE (Nom libre pour soutien, club, etc.) ── */}
            <div className="pt-1">
                {!isCustomOpen ? (
                    <button
                        type="button"
                        onClick={() => setIsCustomOpen(true)}
                        className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none sm:text-sm"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{copy.customClassPrompt}</span>
                    </button>
                ) : (
                    <motion.form
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        onSubmit={handleAddCustomClass}
                        className="space-y-2.5 rounded-xl border border-border bg-muted/35 p-3.5 sm:p-4"
                    >
                        <div className="flex items-center justify-between">
                            <label htmlFor="custom-class-input" className="text-xs font-bold text-slate-700">
                                {copy.customClassName}
                            </label>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsCustomOpen(false);
                                    setCustomError(null);
                                }}
                                className="cursor-pointer text-xs font-semibold text-slate-400 hover:text-slate-600"
                            >
                                {copy.back}
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <Input
                                id="custom-class-input"
                                type="text"
                                autoFocus
                                value={customName}
                                onChange={e => {
                                    setCustomName(e.target.value);
                                    setCustomError(null);
                                }}
                                placeholder={copy.customClassNamePlaceholder}
                                className="h-11 flex-1 rounded-xl border-border bg-card px-3 text-sm shadow-2xs focus-visible:border-primary focus-visible:ring-primary/20"
                            />
                            <Button
                                type="submit"
                                className="h-11 cursor-pointer px-5 text-xs font-bold shadow-sm active:scale-95"
                            >
                                <Plus className="mr-1 h-3.5 w-3.5" />
                                {copy.addClass}
                            </Button>
                        </div>
                        {customError && (
                            <p className="text-xs font-semibold text-red-600">{customError}</p>
                        )}
                    </motion.form>
                )}
            </div>
        </div>
    );
});

ClassesStep.displayName = 'ClassesStep';
