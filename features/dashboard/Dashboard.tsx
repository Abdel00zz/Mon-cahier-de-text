import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
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
import { getBundledCalendar } from '@/utils/calendar';
import { formatLocalizedSubjectDisplayName } from '@/constants';
import { withAbsences } from '@/utils/lateness';
import { nextSessionInfoForClass, deriveSchedules } from '@/utils/timetable';
import { ChevronDown, Plus } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useOrientation } from '@/hooks/useOrientation';
import { Radio, Clock, ArrowRight, ArrowLeft } from 'lucide-react';

interface DashboardProps {
    onSelectClass: (classInfo: ClassInfo) => void;
    accountTeacherName?: string;
    onOnboardingVisibilityChange?: (visible: boolean) => void;
}

type ClassDisplayMode = 'list' | 'single' | 'double';

const CLASS_DISPLAY_OPTIONS: ClassDisplayMode[] = ['list', 'single', 'double'];

const subjectKey = (value: string) => value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');

const teacherKey = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr');

export const Dashboard: React.FC<DashboardProps> = ({
    onSelectClass,
    accountTeacherName = '',
    onOnboardingVisibilityChange,
}) => {
    const { locale, t, isRtl } = useLocale();
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
    const [now, setNow] = useState(() => new Date());
    const teacherName = (config.defaultTeacherName || accountTeacherName).trim();
    const welcomeCompleted = config.hasCompletedWelcome === true || accountUser?.hasCompletedWelcome === true;

    useEffect(() => {
        if (!CLASS_DISPLAY_OPTIONS.includes(classDisplayMode)) {
            setClassDisplayMode('double');
        }
    }, [classDisplayMode, setClassDisplayMode]);

    useEffect(() => {
        const refreshClock = () => setNow(new Date());
        const timer = window.setInterval(refreshClock, 15_000);
        const refreshWhenVisible = () => {
            if (document.visibilityState === 'visible') refreshClock();
        };
        document.addEventListener('visibilitychange', refreshWhenVisible);
        return () => {
            window.clearInterval(timer);
            document.removeEventListener('visibilitychange', refreshWhenVisible);
        };
    }, []);

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
        if (Object.keys(patch).length > 0) updateConfig(patch);
    }, [deleteClass, config.assessmentDates, config.assessmentAbsences, config.pedagogicalEvents, config.manualAssessments, config.removedAssessments, config.assessmentOrder, config.notificationDismissals, config.timetable, updateConfig]);

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

    const calendar = getBundledCalendar();
    const calendarWithAbsences = withAbsences(calendar, config.absences);
    const nextSession = (classId: string) =>
        nextSessionInfoForClass(
            classId,
            config.timetable,
            config.schedules?.find(s => s.classId === classId)?.slots.map(s => s.weekday) ?? [],
            calendarWithAbsences,
            locale,
            now,
            config.schoolYearStart,
        );

    const visibleClasses = [...classes]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const filteredClasses = visibleClasses.filter(c => {
        if (subjectFilter !== 'all' && c.subject !== subjectFilter) return false;
        return true;
    });

    const spotlightInfo = useMemo(() => {
        if (classes.length === 0) return null;
        for (const cls of classes) {
            const info = nextSession(cls.id);
            if (info?.kind === 'now') {
                return { classInfo: cls, info, isActiveNow: true };
            }
        }
        for (const cls of classes) {
            const info = nextSession(cls.id);
            if (info?.kind === 'today') {
                return { classInfo: cls, info, isActiveNow: false };
            }
        }
        return null;
    }, [classes, nextSession]);

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

    const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

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
                    {/* Spotlight Intelligent: Séance active ou prochaine du jour */}
                    {spotlightInfo && (
                        <button
                            type="button"
                            onClick={() => openNotebook(spotlightInfo.classInfo)}
                            className="mb-5 flex min-h-16 w-full items-center rounded-2xl border border-border bg-card p-4 text-start shadow-sm outline-none transition-all hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.99] group"
                        >
                            <div className="flex w-full items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-xs ${spotlightInfo.isActiveNow ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-primary'}`}>
                                        {spotlightInfo.isActiveNow ? (
                                            <Radio className="h-5 w-5 animate-pulse stroke-[2.2]" />
                                        ) : (
                                            <Clock className="h-5 w-5 stroke-[2.2]" />
                                        )}
                                        {spotlightInfo.isActiveNow && (
                                            <span className="absolute -top-1 -end-1 flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${spotlightInfo.isActiveNow ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                                                {spotlightInfo.isActiveNow ? (locale === 'ar' ? 'الآن · حصة جارية' : 'En ce moment · En direct') : (locale === 'ar' ? 'اليوم · الحصة القادمة' : 'Aujourd’hui · Séance à venir')}
                                            </span>
                                            <span className="text-xs text-muted-foreground hidden sm:inline">
                                                {spotlightInfo.info.label}
                                            </span>
                                        </div>
                                        <h3 className="text-sm sm:text-base font-bold text-foreground truncate mt-0.5 font-sans group-hover:text-primary transition-colors">
                                            {spotlightInfo.classInfo.name}
                                            {spotlightInfo.classInfo.subject && (
                                                <span className="text-xs font-normal text-muted-foreground font-sans ms-1.5">
                                                    ({formatLocalizedSubjectDisplayName(spotlightInfo.classInfo.subject, locale)})
                                                </span>
                                            )}
                                        </h3>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs font-semibold text-primary hidden md:inline group-hover:underline">
                                        {locale === 'ar' ? 'فتح دفتر النصوص' : 'Ouvrir le cahier'}
                                    </span>
                                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-muted text-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                        <ArrowIcon className="h-4 w-4 stroke-[2.2]" />
                                    </div>
                                </div>
                            </div>
                        </button>
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
                                        {filteredClasses.map((classInfo, index) => {
                                            const isActiveSession = spotlightInfo?.isActiveNow && spotlightInfo.classInfo.id === classInfo.id;
                                            return (
                                            <div
                                                key={classInfo.id}
                                                role="listitem"
                                                className="animate-in slide-in-from-bottom-4 fade-in duration-200"
                                                style={{ animationDelay: `${Math.min(index, 8) * 35}ms`, animationFillMode: 'backwards' }}
                                            >
                                                <ClassListItem
                                                    classInfo={classInfo}
                                                    onSelect={() => openNotebook(classInfo)}
                                                    onConfigure={() => setEditingClass(classInfo)}
                                                    isActiveSession={isActiveSession}
                                                />
                                            </div>
                                        )})}
                                    </div>
                                ) : (
                                    <div className={`grid ${classGridClass} w-full gap-x-4 gap-y-7 sm:gap-x-5 sm:gap-y-8 lg:gap-x-6 lg:gap-y-8 pt-4`}>
                                        {filteredClasses.map((classInfo, index) => {
                                            const isActiveSession = spotlightInfo?.isActiveNow && spotlightInfo.classInfo.id === classInfo.id;
                                            return (
                                            <div
                                                key={classInfo.id}
                                                className="h-full w-full flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200"
                                                style={{ animationDelay: `${Math.min(index, 8) * 45}ms`, animationFillMode: 'backwards' }}
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
                                            </div>
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
