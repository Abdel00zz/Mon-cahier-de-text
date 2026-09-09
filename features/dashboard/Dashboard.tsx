import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useClassManager } from '@/hooks/useClassManager';
import { useConfigManager } from '@/hooks/useConfigManager';
import { useOptimizedLocalStorage } from '@/hooks/useOptimizedLocalStorage';
import { useDevice } from '@/hooks/useDevice';
import { DashboardSkeleton } from '@/components/ui/PageSkeleton';
import { Button } from '@/components/cahier/Button';
import { SectionHeader } from '@/components/cahier/SectionHeader';
import { ClassCard } from './ClassCard';
import { ClassListItem } from './ClassListItem';
import { CreateClassModal } from './modals/CreateClassModal';
import { OnboardingPage } from './OnboardingPage';
import { ClassInfo, Cycle } from '@/types';
import { formatLocalizedSubjectDisplayName } from '@/constants';
import { deriveSchedules } from '@/utils/timetable';
import { ChevronDown, Plus } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useOrientation } from '@/hooks/useOrientation';
import { prioritizeActiveClasses, resolveDashboardClassOrder } from '@/utils/classOrder';

interface DashboardProps {
    onSelectClass: (classInfo: ClassInfo) => void;
    activeSessionClassIds?: string[];
    accountTeacherName?: string;
    onOnboardingVisibilityChange?: (visible: boolean) => void;
}

type ClassDisplayMode = 'list' | 'single' | 'double';

const CLASS_DISPLAY_OPTIONS: ClassDisplayMode[] = ['list', 'single', 'double'];
const CLASS_MOVE_TRANSITION = { type: 'spring', stiffness: 310, damping: 32, mass: 0.85 } as const;

const subjectKey = (value: string) => value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');

const teacherKey = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr');

export const Dashboard: React.FC<DashboardProps> = ({
    onSelectClass,
    activeSessionClassIds = [],
    accountTeacherName = '',
    onOnboardingVisibilityChange,
}) => {
    const { locale, t, isRtl } = useLocale();
    const reduceMotion = useReducedMotion();
    const { user: accountUser, completeWelcome } = useAuth();
    const { classes, addClass, deleteClass, updateClass, isLoading: isClassesLoading } = useClassManager();
    const { config, updateConfig, isLoading: isConfigLoading } = useConfigManager();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
    const [isOnboardingOpen, setOnboardingOpen] = useState(false);
    const { type: deviceType } = useDevice();
    const isMobile = deviceType === 'phone';
    const defaultDisplayMode: ClassDisplayMode = isMobile ? 'single' : 'double';
    const { value: selectedCycle, setValue: setSelectedCycle } = useOptimizedLocalStorage<Cycle>('selected_cycle_v1', 'college', 100);
    const { isLandscape } = useOrientation();
    const { value: classDisplayMode, setValue: setClassDisplayMode } = useOptimizedLocalStorage<ClassDisplayMode>('dashboard_class_display_v1', defaultDisplayMode, 100);
    const [subjectFilter, setSubjectFilter] = useState<string>('all');
    const [isDisplayMenuOpen, setDisplayMenuOpen] = useState(false);
    const displayMenuRef = useRef<HTMLDivElement>(null);
    const teacherName = (config.defaultTeacherName || accountTeacherName).trim();
    const welcomeCompleted = config.hasCompletedWelcome === true || accountUser?.hasCompletedWelcome === true;

    useEffect(() => {
        if (!CLASS_DISPLAY_OPTIONS.includes(classDisplayMode)) {
            setClassDisplayMode('double');
        }
    }, [classDisplayMode, setClassDisplayMode]);

    const isLoading = isClassesLoading || isConfigLoading;
    useEffect(() => {
        if (!isDisplayMenuOpen) return;
        const closeMenu = (event: PointerEvent) => {
            if (!displayMenuRef.current?.contains(event.target as Node)) setDisplayMenuOpen(false);
        };
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setDisplayMenuOpen(false);
        };
        window.addEventListener('pointerdown', closeMenu);
        window.addEventListener('keydown', closeOnEscape);
        return () => {
            window.removeEventListener('pointerdown', closeMenu);
            window.removeEventListener('keydown', closeOnEscape);
        };
    }, [isDisplayMenuOpen]);

    useEffect(() => {
        if (isConfigLoading) return;
        const preferred = config.selectedCycles?.[0] as Cycle | undefined;
        if (preferred && !config.selectedCycles?.includes(selectedCycle)) {
            setSelectedCycle(preferred);
        }
    }, [isConfigLoading, config.selectedCycles, selectedCycle, setSelectedCycle]);

    useEffect(() => {
        if (isLoading) return;
        // Le flag de fin est la seule source de vérité : une classe peut être
        // ajoutée pendant l'onboarding, puis l'utilisateur peut actualiser ou
        // fermer l'onglet avant l'étape finale. Dans ce cas le parcours doit
        // reprendre, sans exposer le tableau de bord prématurément.
        if (welcomeCompleted) return;
        setOnboardingOpen(true);
    }, [isLoading, welcomeCompleted]);

    // Le shell applicatif ne doit pas réafficher sa navigation au premier
    // ajout de classe : le parcours reste visuellement ouvert jusqu'à sa fin.
    useEffect(() => {
        const visible = isOnboardingOpen && !welcomeCompleted;
        onOnboardingVisibilityChange?.(visible);
        return () => onOnboardingVisibilityChange?.(false);
    }, [isOnboardingOpen, onOnboardingVisibilityChange, welcomeCompleted]);

    const closeOnboarding = useCallback(async () => {
        // Le stockage local ferme la page immédiatement ; le compte et la
        // synchronisation conservent ensuite ce choix sur les autres appareils.
        if (!welcomeCompleted) updateConfig({ hasCompletedWelcome: true });
        setOnboardingOpen(false);
        void completeWelcome().catch(() => {
            // Hors ligne : hasCompletedWelcome est déjà stocké localement et
            // sera envoyé via la synchronisation dès le retour du réseau.
        });
    }, [completeWelcome, updateConfig, welcomeCompleted]);

    const openNotebook = useCallback((classInfo: ClassInfo) => {
        onSelectClass(classInfo);
    }, [onSelectClass]);

    const createClass = useCallback((details: { name: string; subject: string; cycle?: Cycle }): ClassInfo => {
        const created = addClass({
            ...details,
            cycle: details.cycle ?? selectedCycle,
            teacherName: teacherName || t('settings.defaultTeacherName'),
        });
        if (details.cycle && details.cycle !== selectedCycle) {
            setSelectedCycle(details.cycle);
        }
        return created;
    }, [addClass, selectedCycle, setSelectedCycle, t, teacherName]);

    // L'onboarding ne pilote pas l'état d'interface du tableau de bord. Il
    // ajoute seulement ses classes avec les paramètres qu'il vient de persister.
    const createOnboardingClass = useCallback((details: { name: string; subject: string; cycle?: Cycle }): ClassInfo => (
        addClass({
            ...details,
            cycle: details.cycle ?? (config.selectedCycles?.[0] as Cycle) ?? 'lycee',
            teacherName: teacherName || t('settings.defaultTeacherName'),
        })
    ), [addClass, config.selectedCycles, t, teacherName]);

    const handleCreateClass = (details: { name: string; subject: string; cycle?: Cycle }) => {
        createClass(details);
        setCreateModalOpen(false);
    };

    const handleDeleteClass = useCallback((classId: string) => {
        deleteClass(classId);
        const patch: Partial<typeof config> = {};
        if (config.assessmentDates?.[classId]) {
            const next = { ...config.assessmentDates }; delete next[classId]; patch.assessmentDates = next;
        }
        if (config.assessmentAbsences?.[classId]) {
            const next = { ...config.assessmentAbsences }; delete next[classId]; patch.assessmentAbsences = next;
        }
        if (config.pedagogicalEvents?.[classId]) {
            const next = { ...config.pedagogicalEvents }; delete next[classId]; patch.pedagogicalEvents = next;
        }
        if (config.manualAssessments?.[classId]) {
            const next = { ...config.manualAssessments }; delete next[classId]; patch.manualAssessments = next;
        }
        if (config.removedAssessments?.[classId]) {
            const next = { ...config.removedAssessments }; delete next[classId]; patch.removedAssessments = next;
        }
        if (config.assessmentOrder?.[classId]) {
            const next = { ...config.assessmentOrder }; delete next[classId]; patch.assessmentOrder = next;
        }
        if (config.notificationDismissals?.[classId]) {
            const next = { ...config.notificationDismissals }; delete next[classId]; patch.notificationDismissals = next;
        }
        if (config.timetable?.some(e => e.classId === classId)) {
            const nextTimetable = config.timetable.filter(e => e.classId !== classId);
            patch.timetable = nextTimetable;
            patch.schedules = deriveSchedules(nextTimetable);
        }
        if (config.dashboardClassOrder?.includes(classId)) {
            patch.dashboardClassOrder = config.dashboardClassOrder.filter(id => id !== classId);
        }
        if (Object.keys(patch).length > 0) updateConfig(patch);
    }, [deleteClass, config.assessmentDates, config.assessmentAbsences, config.pedagogicalEvents, config.manualAssessments, config.removedAssessments, config.assessmentOrder, config.notificationDismissals, config.timetable, config.dashboardClassOrder, updateConfig]);

    const teacherSubjects = useMemo(() => {
        const currentTeacher = teacherKey(teacherName);
        const matchingClasses = currentTeacher
            ? classes.filter(classInfo => teacherKey(classInfo.teacherName) === currentTeacher)
            : [];
        // Les anciennes classes sans nom d'enseignant restent visibles : elles
        // constituent le repli, sans faire apparaître de filtre fantôme.
        const currentClasses = matchingClasses.length > 0 ? matchingClasses : classes;
        const activeSubjects = new Map<string, string>();
        currentClasses.forEach(classInfo => {
            if (classInfo.subject?.trim()) activeSubjects.set(subjectKey(classInfo.subject), classInfo.subject.trim());
        });
        const configuredSubjects = new Set(
            (config.selectedSubjects ?? [])
                .filter((subject): subject is string => Boolean(subject?.trim()))
                .map(subjectKey),
        );
        const subjects = Array.from(activeSubjects.entries())
            .filter(([key]) => configuredSubjects.size === 0 || configuredSubjects.has(key))
            .map(([, subject]) => subject);
        // Une configuration devenue obsolète ne doit pas masquer toutes les
        // matières réellement présentes dans les cahiers actifs.
        return (subjects.length > 0 ? subjects : Array.from(activeSubjects.values()))
            .sort((a, b) => a.localeCompare(b, 'fr'));
    }, [classes, config.selectedSubjects, teacherName]);
    const shouldShowSubjectBadge = teacherSubjects.length > 1;

    // Un filtre devenu invisible (après le passage à une seule matière) ne
    // doit jamais laisser le tableau de bord vide.
    useEffect(() => {
        if (!shouldShowSubjectBadge || (subjectFilter !== 'all' && !teacherSubjects.includes(subjectFilter))) {
            setSubjectFilter('all');
        }
    }, [shouldShowSubjectBadge, subjectFilter, teacherSubjects]);

    const classById = useMemo(() => new Map(classes.map(classInfo => [classInfo.id, classInfo])), [classes]);
    const persistedClassOrder = useMemo(
        () => resolveDashboardClassOrder(classes, config.dashboardClassOrder),
        [classes, config.dashboardClassOrder],
    );
    const activeSessionIds = useMemo(() => new Set(activeSessionClassIds), [activeSessionClassIds]);
    const filteredClasses = useMemo(() => prioritizeActiveClasses(
        persistedClassOrder
            .map(id => classById.get(id))
            .filter((classInfo): classInfo is ClassInfo => Boolean(classInfo))
            .filter(classInfo => subjectFilter === 'all' || classInfo.subject === subjectFilter),
        activeSessionIds,
    ), [persistedClassOrder, classById, subjectFilter, activeSessionIds]);
    // Measure only when order, session title or display mode changes, not on
    // unrelated sync/config renders. Position-only animation keeps text crisp.
    const classLayoutKey = JSON.stringify([classDisplayMode, filteredClasses.map(c => [c.id, activeSessionIds.has(c.id)])]);

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    const currentDisplay = CLASS_DISPLAY_OPTIONS.includes(classDisplayMode) ? classDisplayMode : 'double';
    const classGridClass = currentDisplay === 'single'
        ? 'grid-cols-1 max-w-[430px] mx-auto auto-rows-fr items-stretch'
        : 'grid-cols-[repeat(auto-fill,minmax(280px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(310px,1fr))] lg:grid-cols-[repeat(auto-fill,minmax(330px,1fr))] auto-rows-fr items-stretch justify-start';

    const displayCopy = (value: ClassDisplayMode) => {
        const keys: Record<ClassDisplayMode, [string, string]> = {
            list: ['dashboard.display.list', 'dashboard.display.listDescription'],
            single: ['dashboard.display.single', 'dashboard.display.singleDescription'],
            double: ['dashboard.display.double', 'dashboard.display.doubleDescription'],
        };
        const [labelKey, descriptionKey] = keys[value];
        return { label: t(labelKey), description: t(descriptionKey) };
    };

    // Page de démarrage immersive (première connexion, aucun cahier)
    if (isOnboardingOpen && !welcomeCompleted) {
        return (
            <OnboardingPage
                config={config}
                onConfigChange={updateConfig}
                classes={classes}
                onCreateClass={createOnboardingClass}
                onDeleteClass={handleDeleteClass}
                onComplete={closeOnboarding}
                onSkip={closeOnboarding}
            />
        );
    }

    return (
        <div
            className="min-h-screen bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] font-sans antialiased pb-20 sm:pb-8"
            data-dashboard-root
        >
            <div className="relative min-w-0 overflow-x-clip" data-dashboard-main>
                <div className="relative z-10 mx-auto max-w-5xl px-3.5 pt-4 pb-3 sm:px-6 lg:px-8 pl-safe pr-safe">
                    {classes.length > 0 && (
                        <div className="mb-4">
                            <SectionHeader
                                title={t('dashboard.classes')}
                                isArabic={isRtl}
                                actions={
                                    <div className="flex items-center gap-2">
                                        {shouldShowSubjectBadge ? (
                                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar" aria-label={t('dashboard.filterAll')}>
                                                <button
                                                    type="button"
                                                    onClick={() => setSubjectFilter('all')}
                                                    className={`h-8 shrink-0 rounded-lg px-3 text-xs font-medium font-sans transition-all cursor-pointer active:scale-95 ${
                                                        subjectFilter === 'all'
                                                            ? 'bg-primary/10 text-primary font-bold shadow-xs'
                                                            : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                                                    }`}
                                                >
                                                    {t('dashboard.filterAll')}
                                                </button>
                                                {teacherSubjects.map(subject => {
                                                    const isActive = subjectFilter === subject;
                                                    return (
                                                        <button
                                                            key={subject}
                                                            type="button"
                                                            onClick={() => setSubjectFilter(isActive ? 'all' : subject)}
                                                            className={`h-8 shrink-0 rounded-lg px-3 text-xs font-medium font-sans transition-all cursor-pointer active:scale-95 ${
                                                                isActive
                                                                    ? 'bg-primary/10 text-primary font-bold shadow-xs'
                                                                    : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
                                                            }`}
                                                        >
                                                            {formatLocalizedSubjectDisplayName(subject, locale)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : null}

                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => setCreateModalOpen(true)}
                                            aria-label={t('dashboard.addClass')}
                                            title={t('dashboard.addClass')}
                                        >
                                            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                                            <span>{t('dashboard.classShort')}</span>
                                        </Button>

                                        {isLandscape && (
                                            <div ref={displayMenuRef} className="relative hidden shrink-0 sm:block">
                                                <button
                                                    type="button"
                                                    onClick={() => setDisplayMenuOpen(open => !open)}
                                                    aria-haspopup="menu"
                                                    aria-expanded={isDisplayMenuOpen}
                                                    className="flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground shadow-2xs hover:bg-muted cursor-pointer"
                                                >
                                                    <span>{displayCopy(currentDisplay).label}</span>
                                                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isDisplayMenuOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                {isDisplayMenuOpen && (
                                                    <div
                                                        role="menu"
                                                        className="absolute top-[calc(100%+0.35rem)] end-0 z-30 w-40 overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg"
                                                    >
                                                        {CLASS_DISPLAY_OPTIONS.map(option => {
                                                            const isActive = option === currentDisplay;
                                                            return (
                                                                <button
                                                                    key={option}
                                                                    type="button"
                                                                    role="menuitemradio"
                                                                    aria-checked={isActive}
                                                                    onClick={() => {
                                                                        setClassDisplayMode(option);
                                                                        setDisplayMenuOpen(false);
                                                                    }}
                                                                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-start text-xs font-sans cursor-pointer ${isActive ? 'bg-muted text-foreground font-bold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
                                                                >
                                                                    <span>{displayCopy(option).label}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                }
                            />
                        </div>
                    )}
                    <main>
                        <section className="w-full" aria-labelledby="classes-heading">
                                {classes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-4 py-10 text-center shadow-xs sm:px-8 sm:py-14 md:py-16">
                                        <div className="mb-5 flex max-w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40 p-2 sm:mb-6 sm:p-2.5">
                                            <img
                                                src="/dashboard.png"
                                                alt="Illustration tableau de bord"
                                                className="w-60 sm:w-72 md:w-[360px] lg:w-[420px] max-w-full h-auto object-contain rounded-lg select-none pointer-events-none"
                                                referrerPolicy="no-referrer"
                                                loading="eager"
                                            />
                                        </div>

                                        <div className="max-w-md space-y-1.5 px-2">
                                            <h3 className="font-sans font-bold text-xl sm:text-2xl text-foreground text-balance">
                                                {t('dashboard.emptyTitle')}
                                            </h3>
                                            <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground font-sans sm:text-sm text-pretty">
                                                {t('dashboard.emptyDescription')}
                                            </p>
                                        </div>

                                        <div className="mt-5 sm:mt-6">
                                            <Button
                                                variant="primary"
                                                onClick={() => {
                                                    if (welcomeCompleted) {
                                                        setCreateModalOpen(true);
                                                    } else {
                                                        setOnboardingOpen(true);
                                                    }
                                                }}
                                                className="h-10 px-6 text-sm font-semibold"
                                            >
                                                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                                                <span>{t('dashboard.addClass')}</span>
                                            </Button>
                                        </div>
                                    </div>
                                ) : currentDisplay === 'list' ? (
                                    <div className="space-y-3" role="list" aria-label={t('dashboard.classList')}>
                                        {filteredClasses.map((classInfo) => {
                                            const isActiveSession = activeSessionIds.has(classInfo.id);
                                            return (
                                            <motion.div
                                                key={classInfo.id}
                                                role="listitem"
                                                layout={reduceMotion ? false : 'position'}
                                                layoutDependency={classLayoutKey}
                                                initial={false}
                                                transition={{ layout: CLASS_MOVE_TRANSITION }}
                                                className="relative"
                                                style={{ zIndex: isActiveSession ? 2 : 0 }}
                                            >
                                                <ClassListItem
                                                    classInfo={classInfo}
                                                    onSelect={() => openNotebook(classInfo)}
                                                    onConfigure={() => setEditingClass(classInfo)}
                                                    isActiveSession={isActiveSession}
                                                />
                                            </motion.div>
                                        )})}
                                    </div>
                                ) : (
                                    <div className={`grid ${classGridClass} w-full gap-x-4 gap-y-7 pt-1 sm:gap-x-5 sm:gap-y-8 sm:pt-2 lg:gap-x-6 lg:gap-y-8`}>
                                        {filteredClasses.map((classInfo, index) => {
                                            const isActiveSession = activeSessionIds.has(classInfo.id);
                                            return (
                                            <motion.div
                                                key={classInfo.id}
                                                layout={reduceMotion ? false : 'position'}
                                                layoutDependency={classLayoutKey}
                                                initial={false}
                                                transition={{ layout: CLASS_MOVE_TRANSITION }}
                                                className="relative h-full w-full flex flex-col"
                                                style={{ zIndex: isActiveSession ? 2 : 0 }}
                                            >
                                                <ClassCard
                                                    classInfo={classInfo}
                                                    onSelect={() => openNotebook(classInfo)}
                                                    onConfigure={() => setEditingClass(classInfo)}
                                                    showSubjectBadge={shouldShowSubjectBadge}
                                                    allClasses={classes}
                                                    index={index}
                                                    isActiveSession={isActiveSession}
                                                />
                                            </motion.div>
                                        )})}
                                </div>
                            )}
                        </section>
                    </main>
                </div>
            </div>

            <CreateClassModal
                isOpen={isCreateModalOpen || !!editingClass}
                onClose={() => {
                    setCreateModalOpen(false);
                    setEditingClass(null);
                }}
                onCreate={handleCreateClass}
                defaultCycle={selectedCycle}
                teacherSubjects={config.selectedSubjects}
                teacherCycles={config.selectedCycles}
                existingClasses={classes}
                editingClass={editingClass}
                onUpdate={(classId, updates) => {
                    updateClass(classId, updates);
                    setEditingClass(null);
                }}
                onDelete={editingClass ? () => {
                    handleDeleteClass(editingClass.id);
                    setEditingClass(null);
                } : undefined}
            />
        </div>
    );
};
