import React, { lazy, Suspense, useState, useCallback, useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useClassManager } from '@/hooks/useClassManager';
import { useConfigManager } from '@/hooks/useConfigManager';
import { useOptimizedLocalStorage } from '@/hooks/useOptimizedLocalStorage';
import { useDevice } from '@/hooks/useDevice';
import { DashboardSkeleton } from '@/components/ui/PageSkeleton';
import { DeferredMount } from '@/components/ui/DeferredMount';
import { Button } from '@/components/cahier/Button';
import { ClassCard } from './ClassCard';
import { ClassDisplayToggle } from './ClassDisplayToggle';
import { isClassDisplayMode, type ClassDisplayMode } from './classDisplayMode';
import { ClassListItem } from './ClassListItem';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CreateClassModal } from './modals/CreateClassModal';
import { OnboardingPage } from './OnboardingPage';
import { hasCompletedOnboarding } from '../../domain/auth/onboardingCompletion';
import { ClassInfo, ClassIdentityDraft, ClassEvaluationEntry, Cycle } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { classTitleStyle } from '@/constants/classTitleTypography';
import { deriveSchedules } from '@/domain/calendar/timetable';
import { collectTeacherSubjects, subjectKey } from '@/domain/classes/subjectScope';
import { Plus } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/contexts/AuthContext';
import { prioritizeActiveClasses, resolveDashboardClassOrder } from '@/domain/classes/classOrder';
import { DASHBOARD_CANVAS_STYLE } from './dashboardCanvas';
import './dashboardCanvas.css';
import { ClassroomWelcomeIllustration, LessonSearchIllustration } from '@/components/ui/DynamicIllustration';

const ClassEvaluationsSheet = lazy(() => import('@/features/evaluations/ClassEvaluationsSheet').then(module => ({ default: module.ClassEvaluationsSheet })));

interface DashboardProps {
    onSelectClass: (classInfo: ClassInfo) => void;
    onEvaluationVisibilityChange?: (visible: boolean) => void;
    activeSessionClassIds?: string[];
    accountTeacherName?: string;
    onOnboardingVisibilityChange?: (visible: boolean) => void;
}

const CLASS_MOVE_TRANSITION = { type: 'spring', stiffness: 310, damping: 32, mass: 0.85 } as const;

export const Dashboard: React.FC<DashboardProps> = ({
    onSelectClass,
    onEvaluationVisibilityChange,
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
    const [evaluationTarget, setEvaluationTarget] = useState<{ classId: string; entry: ClassEvaluationEntry; open: boolean } | null>(null);
    const evaluationClass = classes.find(item => item.id === evaluationTarget?.classId);
    const evaluationOpen = !!evaluationClass && !!evaluationTarget?.open;
    const onOpenEvaluations = (classInfo: ClassInfo, entry: ClassEvaluationEntry) => setEvaluationTarget({ classId: classInfo.id, entry, open: true });
    useEffect(() => {
        onEvaluationVisibilityChange?.(evaluationOpen);
        return () => onEvaluationVisibilityChange?.(false);
    }, [evaluationOpen, onEvaluationVisibilityChange]);
    /** Classe dont la suppression est demandée depuis le menu d'une carte. */
    const [classPendingDelete, setClassPendingDelete] = useState<ClassInfo | null>(null);
    const [isOnboardingOpen, setOnboardingOpen] = useState(false);
    const { type: deviceType } = useDevice();
    const isMobile = deviceType === 'phone';
    const defaultDisplayMode: ClassDisplayMode = isMobile ? 'single' : 'double';
    const { value: selectedCycle, setValue: setSelectedCycle, isLoading: isCycleLoading } = useOptimizedLocalStorage<Cycle>('selected_cycle_v1', 'college', 100);
    const { value: classDisplayMode, setValue: setClassDisplayMode, isLoading: isDisplayModeLoading } = useOptimizedLocalStorage<ClassDisplayMode>('dashboard_class_display_v1', defaultDisplayMode, 100);
    const [subjectFilter, setSubjectFilter] = useState<string>('all');
    const teacherName = (config.defaultTeacherName || accountTeacherName).trim();
    const welcomeCompleted = hasCompletedOnboarding(config, accountUser);

    // Si le cloud sait que l'accueil est terminé (config.hasCompletedWelcome) mais que
    // le profil Redis/Local ne l'est pas (vieux compte), on répare l'état Redis.
    useEffect(() => {
        if (welcomeCompleted && accountUser && !accountUser.hasCompletedWelcome) {
            void completeWelcome().catch(() => {});
        }
    }, [welcomeCompleted, accountUser, completeWelcome]);

    useEffect(() => {
        if (!isClassDisplayMode(classDisplayMode)) {
            setClassDisplayMode('double');
        }
    }, [classDisplayMode, setClassDisplayMode]);

    // Les cartes ne sont révélées qu'avec leur cycle et leur disposition réels,
    // ce qui évite un flash dans le mauvais filtre ou le mauvais nombre de colonnes.
    const isLoading = isClassesLoading || isConfigLoading || isCycleLoading || isDisplayModeLoading;

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
        
        // Le pull cloud (SyncContext) démarre juste après le montage initial.
        // On retarde légèrement l'affichage pour éviter un flash de l'onboarding
        // avant que l'écran de chargement global (AppBootSkeleton) ne prenne le relais.
        const timer = setTimeout(() => {
            setOnboardingOpen(true);
        }, 50);
        return () => clearTimeout(timer);
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

    const createClass = useCallback((details: ClassIdentityDraft): ClassInfo => {
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

    const handleCreateClass = (details: ClassIdentityDraft) => {
        createClass(details);
        setCreateModalOpen(false);
    };

    const handleDeleteClass = useCallback((classId: string) => {
        deleteClass(classId);
        const patch: Partial<typeof config> = {};
        if (config.assessmentDocuments?.[classId]) {
            const next = { ...config.assessmentDocuments }; delete next[classId]; patch.assessmentDocuments = next;
        }
        if (config.assessmentParticipants?.[classId]) {
            const next = { ...config.assessmentParticipants }; delete next[classId]; patch.assessmentParticipants = next;
        }
        if (config.classRosters?.[classId]) {
            const next = { ...config.classRosters }; delete next[classId]; patch.classRosters = next;
        }
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
    }, [deleteClass, config.assessmentDocuments, config.assessmentParticipants, config.classRosters, config.assessmentDates, config.assessmentAbsences, config.pedagogicalEvents, config.manualAssessments, config.removedAssessments, config.assessmentOrder, config.notificationDismissals, config.timetable, config.dashboardClassOrder, updateConfig]);

    /*
     * Matières réellement portées par les classes de cet enseignant : elles
     * décident du filtre affiché, et de la visibilité des libellés de matière
     * dans le reste de l'application (`teachesSeveralSubjects`).
     */
    const taughtSubjects = useMemo(
        () => collectTeacherSubjects(classes, teacherName),
        [classes, teacherName],
    );
    // Le filtre ne propose que les matières déclarées par l'enseignant ; une
    // configuration devenue obsolète ne doit jamais masquer tous les cahiers.
    const teacherSubjects = useMemo(() => {
        const configured = new Set(
            (config.selectedSubjects ?? [])
                .filter((subject): subject is string => Boolean(subject?.trim()))
                .map(subjectKey),
        );
        const declared = configured.size === 0
            ? taughtSubjects
            : taughtSubjects.filter(subject => configured.has(subjectKey(subject)));
        return declared.length > 0 ? declared : taughtSubjects;
    }, [taughtSubjects, config.selectedSubjects]);
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
    const classLayoutKey = useMemo(
        () => JSON.stringify([classDisplayMode, filteredClasses.map(c => [c.id, activeSessionIds.has(c.id)])]),
        [classDisplayMode, filteredClasses, activeSessionIds],
    );

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    const currentDisplay = isClassDisplayMode(classDisplayMode) ? classDisplayMode : 'double';
    const classGridClass = currentDisplay === 'single'
        ? 'grid-cols-1 max-w-[500px] mx-auto auto-rows-fr items-stretch'
        : 'grid-cols-1 sm:grid-cols-2 auto-rows-fr items-stretch justify-start';

    /*
     * Suppression d'une classe : même garde-fou que depuis la fenêtre de
     * réglages (saisie du nom), car l'action emporte tout le cahier.
     */
    const pendingDeleteName = classPendingDelete
        ? formatLocalizedClassDisplayName(classPendingDelete.name, locale)
        : '';

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
            /* Fond du tableau de bord : les valeurs vivent dans
               `dashboardCanvas.ts`, la structure dans `dashboardCanvas.css`. */
            style={DASHBOARD_CANVAS_STYLE}
            className="keep-dashboard-canvas min-h-dvh bg-transparent text-foreground font-sans antialiased pb-6 sm:pb-8 pt-3 sm:pt-6"
            data-dashboard-root
        >
            <div className="relative min-w-0 overflow-x-clip" data-dashboard-main>
                <div className="relative z-10 mx-auto max-w-5xl px-4 pt-1 pb-6 sm:px-6 lg:px-8 pl-safe pr-safe">

                    {classes.length > 0 && (
                        <div className="mb-4 sm:mb-6">
                            <div className="dashboard-heading flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
                                <div className="max-w-xl">
                                    {/* Titre éditorial : Roboto Slab, posée par `constants/classTitleTypography.ts` (rôle « page »). */}
                                    <h1
                                        id="classes-heading"
                                        style={classTitleStyle(isRtl, 'page')}
                                        className="text-2xl sm:text-3xl lg:text-4xl text-stone-900 dark:text-stone-100 leading-[1.18] tracking-tight"
                                    >
                                        {t('dashboard.classes')}
                                    </h1>
                                </div>

                                <div className="dashboard-actions flex flex-wrap items-center gap-2 min-w-0 self-start sm:self-end">
                                    {/* Disposition : UN SEUL bouton, qui avance d'un cran à chaque
                                        appui (deux colonnes → une colonne → liste → deux colonnes).
                                        Plus de menu, donc plus d'aller-retour : l'icône se
                                        métamorphose et le libellé se fond, à hauteur des autres
                                        commandes de la rangée. */}
                                    <ClassDisplayToggle
                                        mode={currentDisplay}
                                        onChange={setClassDisplayMode}
                                        className="relative z-10"
                                    />

                                    {/* Création : action principale à contraste élevé. */}
                                    <Button
                                        onClick={() => setCreateModalOpen(true)}
                                        aria-label={t('dashboard.addClass')}
                                        title={t('dashboard.addClass')}
                                        className="dashboard-add-class h-11 min-h-11 gap-1.5 rounded-md px-3 text-sm"
                                    >
                                        <Plus className="h-5 w-5 stroke-[1.8]" aria-hidden="true" />
                                        <span>{locale === 'ar' ? 'قسم' : locale === 'en' ? 'Class' : 'Classe'}</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                    <main>
                        <section className="w-full" aria-labelledby="classes-heading">
                                {classes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center px-4 py-10 text-center sm:px-8 sm:py-14 md:py-16">
                                        <ClassroomWelcomeIllustration size={168} className="mb-4 sm:mb-5" />

                                        <div className="max-w-md space-y-1.5 px-2">
                                            <h3 id="classes-heading" className="font-serif font-bold text-xl sm:text-2xl text-foreground text-balance">
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
                                                <Plus className="h-4.5 w-4.5 stroke-[2.2]" />
                                                <span>{t('dashboard.addClass')}</span>
                                            </Button>
                                        </div>
                                    </div>
                                ) : filteredClasses.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card/90 backdrop-blur-md px-4 py-12 text-center shadow-xs">
                                        <LessonSearchIllustration size={110} className="mb-2" />
                                        <h3 className="font-serif font-bold text-lg text-foreground mt-2">
                                            {locale === 'ar' ? 'لا توجد أقسام مطابقة' : 'Aucune classe correspondante'}
                                        </h3>
                                        <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                                            {locale === 'ar' ? 'اعرض جميع المواد أو أضف قسماً جديداً' : 'Affichez toutes les matières ou créez une classe.'}
                                        </p>
                                        <motion.button
                                            type="button"
                                            whileHover={reduceMotion ? undefined : { y: -2 }}
                                            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                                            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                                            onClick={() => setSubjectFilter('all')}
                                            className="mt-4 inline-flex min-h-11 items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:brightness-110 active:brightness-95 transition-colors cursor-pointer shadow-xs"
                                        >
                                            {locale === 'ar' ? 'جميع الأقسام' : 'Toutes les classes'}
                                        </motion.button>
                                    </div>
                                ) : currentDisplay === 'list' ? (
                                    <div className="overflow-hidden rounded-[var(--radius-xl,0.875rem)] border border-border bg-card shadow-none" role="list" aria-label={t('dashboard.classList')}>
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
                                                    onOpenEvaluations={entry => onOpenEvaluations(classInfo, entry)}
                                                    onDelete={() => setClassPendingDelete(classInfo)}
                                                    isActiveSession={isActiveSession}
                                                />
                                            </motion.div>
                                        )})}
                                    </div>
                                ) : (
                                    <div className={`grid ${classGridClass} w-full gap-3 sm:gap-4 lg:gap-5`}>
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
                                                    onOpenEvaluations={entry => onOpenEvaluations(classInfo, entry)}
                                                    onDelete={() => setClassPendingDelete(classInfo)}
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

            <ConfirmDialog
                open={Boolean(classPendingDelete)}
                onOpenChange={(open) => { if (!open) setClassPendingDelete(null); }}
                title={t('dashboard.deleteNotebookTitle', { name: pendingDeleteName })}
                description={t('dashboard.deleteNotebookDescription')}
                confirmLabel={t('dashboard.delete')}
                confirmationPhrase={pendingDeleteName || undefined}
                confirmationHint={t('dashboard.deleteNotebookConfirmHint', { name: pendingDeleteName })}
                onConfirm={() => {
                    if (!classPendingDelete) return;
                    handleDeleteClass(classPendingDelete.id);
                    setClassPendingDelete(null);
                }}
            />

            <DeferredMount active={evaluationOpen}>
                {evaluationClass && evaluationTarget && <Suspense fallback={<div className="py-4 text-center text-sm text-muted-foreground" role="status">{t('common.loading')}</div>}>
                    <ClassEvaluationsSheet key={`${evaluationClass.id}-${evaluationTarget.entry}`} open={evaluationOpen}
                        onOpenChange={open => setEvaluationTarget(previous => previous ? { ...previous, open } : null)}
                        classInfo={evaluationClass} entry={evaluationTarget.entry} config={config} onConfigChange={updateConfig}/>
                </Suspense>}
            </DeferredMount>
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
                    if (!updateClass(classId, updates)) throw new Error(t('common.error'));
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
