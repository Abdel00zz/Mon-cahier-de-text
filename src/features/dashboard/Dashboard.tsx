import { classRosterPatch, historicalStudentNames } from '@/domain/evaluations/classRosterSync';
import React, { lazy, Suspense, useState, useCallback, useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useClassManager } from '@/hooks/useClassManager';
import { useConfigManager } from '@/hooks/useConfigManager';
import { useOptimizedLocalStorage } from '@/hooks/useOptimizedLocalStorage';
import { useDevice } from '@/hooks/useDevice';
import { Plus } from 'lucide-react';
import { DashboardSkeleton } from '@/components/ui/PageSkeleton';
import { DeferredMount } from '@/components/ui/DeferredMount';
import { ClassCard } from './ClassCard';
import { AddClassCard } from './AddClassCard';
import { DashboardActions } from './DashboardActions';
import { isClassDisplayMode, type ClassDisplayMode } from './classDisplayMode';
import { pickDepartmentPalette, type PaletteKey } from './departmentPalette';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { CreateClassModal } from './modals/CreateClassModal';
import { OnboardingPage } from './OnboardingPage';
import { hasCompletedOnboarding } from '../../domain/auth/onboardingCompletion';
import { ClassInfo, ClassIdentityDraft, ClassEvaluationEntry, Cycle } from '@/types';
import { formatLocalizedClassDisplayName } from '@/constants';
import { dashboardTitleStyle } from '@/constants/classTitleTypography';
import { deriveSchedules } from '@/domain/calendar/timetable';
import { collectTeacherSubjects, subjectKey } from '@/domain/classes/subjectScope';
import { useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/contexts/AuthContext';
import { prioritizeActiveClasses, resolveDashboardClassOrder } from '@/domain/classes/classOrder';
import './dashboardCanvas.css';
import { ClassroomWelcomeIllustration, LessonSearchIllustration } from '@/components/ui/DynamicIllustration';
import { getBundledCalendar, loadHolidayCalendar, type HolidayCalendar } from '@/domain/calendar/calendar';
import { computeClassSessionSchedule, type SessionScheduleStatus } from '@/domain/calendar/sessionScheduleStatus';
import { subscribe as subscribeSyncBus } from '@/infrastructure/sync/syncBus';
import { ClassAssistant } from '@/features/assistant/ClassAssistant';
import { readStoredNotebook } from '@/infrastructure/storage/notebookStorage';

const ClassEvaluationsSheet = lazy(() => import('@/features/evaluations/ClassEvaluationsSheet').then(module => ({ default: module.ClassEvaluationsSheet })));

interface DashboardProps {
    onSelectClass: (classInfo: ClassInfo) => void;
    onEvaluationVisibilityChange?: (visible: boolean) => void;
    activeSessionClassIds?: string[];
    accountTeacherName?: string;
    onOnboardingVisibilityChange?: (visible: boolean) => void;
    onOpenSchedule?: () => void;
    onOpenNotifications?: () => void;
}

const NO_ACTIVE_SESSION_IDS: string[] = [];
const CLASS_MOVE_TRANSITION = { type: 'spring', stiffness: 310, damping: 32, mass: 0.85 } as const;
const readAssistantLessons = (classId: string) => readStoredNotebook(classId).lessonsData;

export const Dashboard: React.FC<DashboardProps> = ({
    onSelectClass,
    onEvaluationVisibilityChange,
    activeSessionClassIds: sessionBoundaryIds = NO_ACTIVE_SESSION_IDS,
    accountTeacherName = '',
    onOnboardingVisibilityChange,
    onOpenSchedule,
    onOpenNotifications,
}) => {
    const { locale, t } = useLocale();
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
    const { isPhone, isNative } = useDevice();
    const isMobile = isPhone || isNative;
    const defaultDisplayMode: ClassDisplayMode = isMobile ? 'double' : 'triple';
    const { value: selectedCycle, setValue: setSelectedCycle, isLoading: isCycleLoading } = useOptimizedLocalStorage<Cycle>('selected_cycle_v1', 'college', 100);
    const { value: classDisplayMode, setValue: setClassDisplayMode, isLoading: isDisplayModeLoading } = useOptimizedLocalStorage<ClassDisplayMode>('dashboard_class_display_v1', defaultDisplayMode, 100);
    const [subjectFilter, setSubjectFilter] = useState<string>('all');
    const teacherName = (config.defaultTeacherName || accountTeacherName).trim();
    const welcomeCompleted = hasCompletedOnboarding(config, accountUser);
    const [calendar, setCalendar] = useState<HolidayCalendar>(() => getBundledCalendar());
    const [scheduleClockNow, setScheduleClockNow] = useState(() => new Date());
    useEffect(() => {
        let active = true;
        void loadHolidayCalendar().then(loaded => {
            if (active) setCalendar(loaded);
        });
        let timer: ReturnType<typeof setTimeout> | undefined;
        const refreshClock = () => {
            clearTimeout(timer);
            if (typeof document === 'undefined' || document.visibilityState === 'visible') {
                setScheduleClockNow(new Date());
                timer = setTimeout(refreshClock, 60000 - Date.now() % 60000 + 20);
            }
        };
        refreshClock();
        const offPull = subscribeSyncBus('pull-applied', refreshClock);
        const offConfig = subscribeSyncBus('config-changed', refreshClock);
        const offClasses = subscribeSyncBus('classes-changed', refreshClock);
        document.addEventListener('visibilitychange', refreshClock);
        window.addEventListener('focus', refreshClock);
        return () => {
            active = false;
            clearTimeout(timer);
            offPull();
            offConfig();
            offClasses();
            document.removeEventListener('visibilitychange', refreshClock);
            window.removeEventListener('focus', refreshClock);
        };
    }, []);

    const scheduleStatusByClassId = useMemo(() => {
        const map = new Map<string, SessionScheduleStatus>();
        for (const classInfo of classes) {
            map.set(
                classInfo.id,
                computeClassSessionSchedule(
                    config.timetable,
                    config.timetableClock,
                    classInfo.id,
                    {
                        now: scheduleClockNow,
                        calendar,
                        locale,
                        absences: config.absences,
                        schedules: config.schedules,
                        schoolYearStart: config.schoolYearStart,
                    }
                )
            );
        }
        return map;
    }, [classes, config.timetable, config.schedules, config.timetableClock, config.absences, config.schoolYearStart, calendar, locale, scheduleClockNow]);

    useEffect(() => { setScheduleClockNow(new Date()); }, [sessionBoundaryIds]);

    // Card, grouping and companion consume the same timestamp and calendar.
    const activeSessionClassIds = useMemo(() => [...scheduleStatusByClassId]
        .filter(([, status]) => status.state === 'in_progress').map(([id]) => id), [scheduleStatusByClassId]);
    const preferredClassId = activeSessionClassIds.length === 1 ? activeSessionClassIds[0] : undefined;

    // Si le cloud sait que l'accueil est terminé (config.hasCompletedWelcome) mais que
    // le profil Redis/Local ne l'est pas (vieux compte), on répare l'état Redis.
    useEffect(() => {
        if (welcomeCompleted && accountUser && !accountUser.hasCompletedWelcome) {
            void completeWelcome().catch(() => {});
        }
    }, [welcomeCompleted, accountUser, completeWelcome]);

    useEffect(() => {
        if (!isClassDisplayMode(classDisplayMode)) {
            setClassDisplayMode(defaultDisplayMode);
        }
    }, [classDisplayMode, defaultDisplayMode, setClassDisplayMode]);

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

    const isPreviewOnboarding = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('onboarding');

    // Le shell applicatif ne doit pas réafficher sa navigation au premier
    // ajout de classe : le parcours reste visuellement ouvert jusqu'à sa fin.
    useEffect(() => {
        const visible = (isOnboardingOpen && !welcomeCompleted) || isPreviewOnboarding;
        onOnboardingVisibilityChange?.(visible);
        return () => onOnboardingVisibilityChange?.(false);
    }, [isOnboardingOpen, isPreviewOnboarding, onOnboardingVisibilityChange, welcomeCompleted]);

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
            .filter(classInfo => activeSessionIds.has(classInfo.id) || subjectFilter === 'all' || classInfo.subject === subjectFilter),
        activeSessionIds,
    ), [persistedClassOrder, classById, subjectFilter, activeSessionIds]);
    const assistantVisibleClassIds = useMemo(() => filteredClasses.map(item => item.id), [filteredClasses]);
    // Measure only when order, session title or display mode changes, not on
    // unrelated sync/config renders. Position-only animation keeps text crisp.
    const classLayoutKey = useMemo(
        () => JSON.stringify([classDisplayMode, filteredClasses.map(c => [c.id, activeSessionIds.has(c.id)])]),
        [classDisplayMode, filteredClasses, activeSessionIds],
    );

    // Assign palette before temporal sorting so a session never changes a class's color.
    const paletteByClassId = useMemo(() => {
        let previousKey: PaletteKey | undefined;
        const map = new Map<string, ReturnType<typeof pickDepartmentPalette>['palette']>();
        persistedClassOrder.forEach((id, index) => {
            const item = classById.get(id);
            if (!item) return;
            const { key, palette } = pickDepartmentPalette(item.color, item.subject, index, previousKey);
            previousKey = key;
            map.set(id, palette);
        });
        return map;
    }, [persistedClassOrder, classById]);

    const groupedClasses = useMemo(() => {
        const groupsMap = new Map<string, { label: string; order: number; rawItems: Array<{ classInfo: ClassInfo; startMin: number; active: boolean }> }>();

        for (const classInfo of filteredClasses) {
            const schedule = scheduleStatusByClassId.get(classInfo.id);
            let groupKey = 'other';
            let groupLabel = locale === 'ar' ? 'أقسام أخرى' : (locale === 'en' ? 'Other classes' : 'Autres classes');
            let groupOrder = 999;
            let startMin = 9999;

            if (schedule && (schedule.state !== 'none' || schedule.hadSessionToday)) {
                const offset = schedule.hadSessionToday ? 0 : schedule.dayOffset ?? 0;
                startMin = schedule.hadSessionToday ? 9999 : schedule.startMin ?? 9999;
                if (offset === 0) {
                    groupKey = 'day-0';
                    groupLabel = locale === 'ar' ? 'اليوم' : (locale === 'en' ? 'Today' : 'Aujourd’hui');
                    groupOrder = 0;
                } else if (offset === 1) {
                    groupKey = 'day-1';
                    groupLabel = locale === 'ar' ? 'غدا' : (locale === 'en' ? 'Tomorrow' : 'Demain');
                    groupOrder = 1;
                } else {
                    const label = schedule.dayLabel ?? (locale === 'ar' ? 'أيام قادمة' : 'Jours à venir');
                    groupKey = `day-${label}`;
                    groupLabel = label;
                    groupOrder = offset;
                }
            }

            if (!groupsMap.has(groupKey)) {
                groupsMap.set(groupKey, { label: groupLabel, order: groupOrder, rawItems: [] });
            } else {
                const existing = groupsMap.get(groupKey)!;
                existing.order = Math.min(existing.order, groupOrder);
            }
            groupsMap.get(groupKey)!.rawItems.push({ classInfo, startMin, active: activeSessionIds.has(classInfo.id) });
        }

        const sortedGroups = Array.from(groupsMap.values()).sort((a, b) => a.order - b.order);

        for (const group of sortedGroups) {
            group.rawItems.sort((a, b) => Number(b.active) - Number(a.active) || a.startMin - b.startMin);
        }

        return sortedGroups.map(group => {
            const items = group.rawItems.map(item => {
                const palette = paletteByClassId.get(item.classInfo.id);
                return {
                    classInfo: item.classInfo,
                    startMin: item.startMin,
                    palette,
                };
            });

            const showTitle = !(sortedGroups.length === 1 && group.order === 999);

            return {
                key: group.label,
                label: group.label,
                order: group.order,
                showTitle,
                items,
            };
        });
    }, [filteredClasses, scheduleStatusByClassId, locale, activeSessionIds, paletteByClassId]);

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    const currentDisplay = isClassDisplayMode(classDisplayMode) ? classDisplayMode : defaultDisplayMode;

    /*
     * Suppression d'une classe : même garde-fou que depuis la fenêtre de
     * réglages (saisie du nom), car l'action emporte tout le cahier.
     */
    const pendingDeleteName = classPendingDelete
        ? formatLocalizedClassDisplayName(classPendingDelete.name, locale)
        : '';

    // Page de démarrage immersive (première connexion, aucun cahier ou prévisualisation via ?onboarding)
    if ((isOnboardingOpen && !welcomeCompleted) || isPreviewOnboarding) {
        return (
            <OnboardingPage
                config={config}
                onConfigChange={updateConfig}
                classes={classes}
                onCreateClass={createOnboardingClass}
                onDeleteClass={handleDeleteClass}
                onComplete={() => {
                    if (isPreviewOnboarding) {
                        const url = new URL(window.location.href);
                        url.searchParams.delete('onboarding');
                        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
                        window.location.reload();
                        return;
                    }
                    closeOnboarding();
                }}
                onSkip={() => {
                    if (isPreviewOnboarding) {
                        const url = new URL(window.location.href);
                        url.searchParams.delete('onboarding');
                        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
                        window.location.reload();
                        return;
                    }
                    closeOnboarding();
                }}
            />
        );
    }

    return (
        <div
            style={{ backgroundColor: '#F6F3EE', paddingBottom: '110px' }}
            className="keep-dashboard-canvas min-h-dvh text-foreground font-sans antialiased pt-3 sm:pt-6"
            data-dashboard-root
        >
            <div className="relative min-w-0 overflow-x-clip" data-dashboard-main>
                <div className="relative z-10 mx-auto max-w-5xl px-4 pt-1 sm:px-6 lg:px-8 pl-safe pr-safe">
                    {/* En-tête : Titre à droite (26px, gras, #1F1A16), Robot à gauche (44x44px) en RTL */}
                    <header className="dashboard-top-header mb-4 pt-1" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                        <DashboardActions
                            mode={currentDisplay}
                            onModeChange={setClassDisplayMode}
                            showDisplayModes={false}
                        >
                            <ClassAssistant
                                locale={locale}
                                classes={classes}
                                config={config}
                                preferredClassId={preferredClassId}
                                visibleClassIds={assistantVisibleClassIds}
                                activeSessionClassIds={activeSessionClassIds}
                                scheduleStatusByClassId={scheduleStatusByClassId}
                                readLessons={readAssistantLessons}
                                onCreateClass={() => setCreateModalOpen(true)}
                                onOpenSchedule={onOpenSchedule}
                                onOpenNotifications={onOpenNotifications}
                                onUpdateConfig={updateConfig}
                                onOpenClass={openNotebook}
                                onOpenEvaluations={(classInfo, entry) => onOpenEvaluations(classInfo, entry ?? 'all')}
                                onConfigureClass={classInfo => setEditingClass(classInfo)}
                            />
                        </DashboardActions>
                        <h1
                            id="classes-heading"
                            tabIndex={-1}
                            style={dashboardTitleStyle(locale)}
                            className="dashboard-header-title"
                        >
                            <span>{t('dashboard.classes')}</span>
                            <span aria-hidden="true">{locale === 'fr' ? '\u00A0:' : ':'}</span>
                        </h1>
                    </header>

                    <main data-assistant-flow>
                        <section className="dashboard-class-section w-full" aria-labelledby="classes-heading">
                            {classes.length === 0 ? (
                                <div className="dashboard-empty flex flex-col items-center justify-center px-4 py-10 text-center sm:px-8 sm:py-14 md:py-16">
                                    <ClassroomWelcomeIllustration size={168} className="mb-4 sm:mb-5" />

                                    <div className="max-w-md space-y-1.5 px-2">
                                        <h3 id="classes-heading" tabIndex={-1} className="font-serif font-bold text-xl sm:text-2xl text-foreground text-balance">
                                            {t('dashboard.emptyTitle')}
                                        </h3>
                                        <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground font-sans sm:text-sm text-pretty">
                                            {t('dashboard.emptyDescription')}
                                        </p>
                                    </div>

                                    <div className="mt-5 sm:mt-6 w-full max-w-xs">
                                        <AddClassCard
                                            onCreate={() => {
                                                if (welcomeCompleted) {
                                                    setCreateModalOpen(true);
                                                } else {
                                                    setOnboardingOpen(true);
                                                }
                                            }}
                                        />
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
                            ) : (
                                <div className="dashboard-classes-container flex flex-col w-full" role="list" aria-label={t('dashboard.classList')}>
                                    {groupedClasses.map((group, groupIndex) => (
                                        <section
                                            key={group.key}
                                            className="dashboard-day-group w-full"
                                            style={{
                                                marginTop: groupIndex === 0 ? '16px' : '24px',
                                            }}
                                        >
                                            {/* Titre de groupe par jour (« غدا : », « الإثنين : ») */}
                                            {group.showTitle && (
                                                <h2 className="dashboard-day-group__title">
                                                    <span>{group.label}</span>
                                                    <span aria-hidden="true">{locale === 'fr' ? '\u00A0:' : ':'}</span>
                                                </h2>
                                            )}
                                            <div className="dashboard-day-group__cards flex flex-col gap-[12px] w-full">
                                                {group.items.map((item, itemIdx) => {
                                                    const isActiveSession = activeSessionIds.has(item.classInfo.id);
                                                    return (
                                                        <motion.div
                                                            key={item.classInfo.id}
                                                            role="listitem"
                                                            layout={reduceMotion ? false : 'position'}
                                                            layoutDependency={classLayoutKey}
                                                            initial={false}
                                                            transition={{ layout: CLASS_MOVE_TRANSITION }}
                                                            className="relative w-full"
                                                            style={{ zIndex: isActiveSession ? 2 : 0 }}
                                                        >
                                                            <ClassCard
                                                                classInfo={item.classInfo}
                                                                onSelect={() => openNotebook(item.classInfo)}
                                                                onConfigure={() => setEditingClass(item.classInfo)}
                                                                onOpenEvaluations={entry => onOpenEvaluations(item.classInfo, entry)}
                                                                onDelete={() => setClassPendingDelete(item.classInfo)}
                                                                index={itemIdx}
                                                                isActiveSession={isActiveSession}
                                                                palette={item.palette}
                                                            />
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    ))}
                                </div>
                            )}
                        </section>
                    </main>
                </div>
            </div>

            {/* Bouton flottant « + » (ajout d'un département) : 56x56px, border-radius 18px, fond #6B4F3F */}
            <motion.button
                type="button"
                whileHover={reduceMotion ? undefined : { scale: 1.05 }}
                whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                onClick={() => setCreateModalOpen(true)}
                className="dashboard-floating-add-btn"
                aria-label={locale === 'ar' ? 'إضافة قسم جديد' : 'Ajouter une classe'}
                title={locale === 'ar' ? 'إضافة قسم جديد' : 'Ajouter une classe'}
            >
                <Plus size={26} strokeWidth={2} color="#FFFFFF" aria-hidden="true" />
            </motion.button>

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
                roster={editingClass ? config.classRosters?.[editingClass.id] : undefined}
                suggestedStudentNames={editingClass ? historicalStudentNames(config, editingClass.id) : undefined}
                onRosterSave={editingClass ? (base, names) => updateConfig(classRosterPatch(config, editingClass.id, base, names)) : undefined}
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
