import React, { Suspense, lazy, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useClassManager } from '@/hooks/useClassManager';
import { defaultNotificationSettings, useConfigManager } from '@/hooks/useConfigManager';
import { useOptimizedLocalStorage } from '@/hooks/useOptimizedLocalStorage';
import { DashboardSkeleton } from '@/components/ui/PageSkeleton';
import { Button } from '@/components/ui/button';
import { ClassCard } from './ClassCard';
import { ClassListItem } from './ClassListItem';
import { NotificationCenter, useNotificationFeed } from './NotificationCenter';
import { CreateClassModal } from './modals/CreateClassModal';
import { OnboardingModal } from './modals/OnboardingModal';
import { DashboardMetrics, DashboardMetricsBar } from './DashboardMetricsBar';
import { ClassInfo, Cycle } from '@/types';
import { logger } from '@/utils/logger';
import { getBundledCalendar, todayInMorocco } from '@/utils/calendar';
import { withAbsences } from '@/utils/lateness';
import { nextSessionInfoForClass, deriveSchedules } from '@/utils/timetable';
import { ChevronDown, Plus } from '@/components/ui/icons';
import { CircleHelp, Settings } from 'lucide-react';
import { migrateLessonsData } from '@/utils/dataUtils';
import { computeProgressionStats } from '@/utils/progression';
import { useLocale } from '@/i18n/LocaleProvider';

const GuideModal = lazy(() => import('@/features/guide/GuideModal').then(module => ({ default: module.GuideModal })));

interface DashboardProps {
    onSelectClass: (classInfo: ClassInfo) => void;
    onOpenSettings: () => void;
}

type ClassDisplayMode = 'list' | 'single' | 'double' | 'triple';

const CLASS_DISPLAY_OPTIONS: Array<{ value: ClassDisplayMode; label: string; description: string }> = [
    { value: 'list', label: 'Liste', description: 'Sans cartes' },
    { value: 'single', label: '1 par ligne', description: 'Confort' },
    { value: 'double', label: '2 par ligne', description: 'Compact' },
    { value: 'triple', label: '3 par ligne', description: 'Large écran' },
];

/** Salutation selon l'heure — petite touche vivante, esprit app mobile. */
const getGreeting = (locale: 'fr' | 'en' | 'ar'): string => {
    const hour = new Date().getHours();
    if (locale === 'en') {
        if (hour < 5) return 'Good evening';
        if (hour < 13) return 'Good morning';
        if (hour < 18) return 'Good afternoon';
        return 'Good evening';
    }
    if (locale === 'ar') {
        return hour < 13 ? 'صباح الخير' : 'مساء الخير';
    }
    if (hour < 5) return 'Bonsoir';
    if (hour < 13) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
};

const readLessons = (classId: string) => {
    try {
        const raw = localStorage.getItem(`classData_v1_${classId}`);
        const parsed = raw ? JSON.parse(raw) : [];
        return migrateLessonsData(Array.isArray(parsed) ? parsed : (parsed.lessonsData ?? []));
    } catch {
        return [];
    }
};

const AddClassCard: React.FC<{ onClick: () => void }> = ({ onClick }) => {
    const { t } = useLocale();
    return (
        <button
            onClick={onClick}
            data-guide="create-class"
            className="group relative flex h-full w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-zinc-200 bg-zinc-50/40 p-6 text-center shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:bg-zinc-50/70 hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
            <Plus size={13} className="relative z-10 mb-3 text-zinc-400 transition-colors duration-200 group-hover:text-primary" />
            <div className="relative z-10">
                <span className="block text-sm font-bold text-zinc-800 transition-colors group-hover:text-primary font-display">{t('dashboard.newNotebook')}</span>
                <span className="mt-1 block text-xs font-semibold text-zinc-400">Créer un cahier de textes</span>
            </div>
        </button>
    );
};

const findLatestDate = (data: any): string | null => {
    let latestDate: string | null = null;

    const findDate = (obj: any) => {
        if (typeof obj !== 'object' || obj === null) return;

        if (obj.date && typeof obj.date === 'string') {
            if (!latestDate || obj.date > latestDate) {
                latestDate = obj.date;
            }
        }

        Object.values(obj).forEach(value => {
            if (Array.isArray(value)) {
                value.forEach(findDate);
            } else if (typeof value === 'object') {
                findDate(value);
            }
        });
    };

    if (Array.isArray(data)) {
        data.forEach(findDate);
    } else {
        findDate(data);
    }

    return latestDate;
};

export const Dashboard: React.FC<DashboardProps> = ({ onSelectClass, onOpenSettings }) => {
    const { locale, t } = useLocale();
    const { classes, addClass, deleteClass, updateClass, isLoading: isClassesLoading } = useClassManager();
    const { config, updateConfig, isLoading: isConfigLoading } = useConfigManager();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
    const [isGuideOpen, setGuideOpen] = useState(false);
    const [isOnboardingOpen, setOnboardingOpen] = useState(false);
    const [lastModifiedDates, setLastModifiedDates] = useState<Record<string, string | null>>({});
    const { value: selectedCycle, setValue: setSelectedCycle } = useOptimizedLocalStorage<Cycle>('selected_cycle_v1', 'college', 100);
    const { value: classDisplayMode, setValue: setClassDisplayMode } = useOptimizedLocalStorage<ClassDisplayMode>('dashboard_class_display_v1', 'double', 100);
    const [isDisplayMenuOpen, setDisplayMenuOpen] = useState(false);
    const displayMenuRef = useRef<HTMLDivElement>(null);
    // Centre de notifications : version incrémentée après « Ignorer/Réactiver »
    // ou à l'ouverture du panneau pour relire les signaux depuis le stockage.
    const [notificationVersion, setNotificationVersion] = useState(0);
    const [isNotificationCenterOpen, setNotificationCenterOpen] = useState(false);
    const notificationFeed = useNotificationFeed(classes, config, notificationVersion);

    const isLoading = isClassesLoading || isConfigLoading;

    const dashboardMetrics = useMemo<DashboardMetrics>(() => {
        const stats = classes.map(classInfo => computeProgressionStats(readLessons(classInfo.id)));
        const measurable = stats.filter(item => item.totalItems > 0);
        const avgCompletion = measurable.length > 0
            ? Math.round(measurable.reduce((sum, item) => sum + item.completionRate, 0) / measurable.length)
            : 0;
        const totalSessions = stats.reduce((sum, item) => sum + item.sessionsCount, 0);

        return { progression: avgCompletion, sessions: totalSessions, classes: classes.length };
    }, [classes, lastModifiedDates]);

    useEffect(() => {
        if (isClassesLoading) return;

        const dates: Record<string, string | null> = {};
        classes.forEach(classInfo => {
            try {
                const lessonsDataRaw = localStorage.getItem(`classData_v1_${classInfo.id}`);
                if (lessonsDataRaw) {
                    const lessonsData = JSON.parse(lessonsDataRaw);
                    dates[classInfo.id] = findLatestDate(lessonsData);
                } else {
                    dates[classInfo.id] = null;
                }
            } catch (e) {
                logger.error(`Failed to parse data for class ${classInfo.id}`, e);
                dates[classInfo.id] = null;
            }
        });
        setLastModifiedDates(dates);
    }, [classes, isClassesLoading]);

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

    // Synchroniser l'onglet actif avec le cycle configuré (au chargement + quand config change)
    useEffect(() => {
        if (isConfigLoading) return;
        const preferred = config.selectedCycles?.[0] as Cycle | undefined;
        // Si le selectedCycle actuel n'est pas dans la liste des cycles configurés, on force
        if (preferred && !config.selectedCycles?.includes(selectedCycle)) {
            setSelectedCycle(preferred);
        }
    }, [isConfigLoading, config.selectedCycles, selectedCycle, setSelectedCycle]);

    /*
     * Accueil FUSIONNÉ (profil → classes par lot → emploi du temps) : s'ouvre
     * de lui-même tant que le démarrage n'est pas fait (aucune classe OU
     * accueil jamais terminé), une seule fois par session — jamais bloquant.
     */
    useEffect(() => {
        if (isLoading) return;
        if (classes.length > 0 && config.hasCompletedWelcome) return;
        try {
            if (sessionStorage.getItem('onboarding_seen_v1')) return;
        } catch { /* stockage indisponible */ }
        const timer = window.setTimeout(() => setOnboardingOpen(true), 600);
        return () => window.clearTimeout(timer);
    }, [isLoading, classes.length, config.hasCompletedWelcome]);

    const closeOnboarding = useCallback(() => {
        try { sessionStorage.setItem('onboarding_seen_v1', '1'); } catch { /* stockage indisponible */ }
        if (!config.hasCompletedWelcome) updateConfig({ hasCompletedWelcome: true });
        setOnboardingOpen(false);
    }, [config.hasCompletedWelcome, updateConfig]);

    const completeOnboarding = useCallback(() => {
        const current = { ...defaultNotificationSettings, ...(config.notificationSettings ?? {}) };
        updateConfig({
            hasCompletedWelcome: true,
            notificationSettings: {
                ...current,
                // On active seulement les couches qui NE demandent AUCUNE
                // permission système (alertes in-app + vibration locale).
                enabled: true,
                sessionVibration: true,
                // Le push n'est plus demandé automatiquement ici : un refus de
                // permission navigateur est collant. L'enseignant l'active
                // explicitement depuis Paramètres ▸ Notifications (vrai geste).
            },
        });
    }, [config.notificationSettings, updateConfig]);

    /** création unitaire OU depuis l'onboarding/grille : renvoie la classe créée */
    const createClass = useCallback((details: { name: string; subject: string; cycle?: Cycle }): ClassInfo => {
        const created = addClass({
            ...details,
            cycle: details.cycle ?? selectedCycle,
            teacherName: config.defaultTeacherName || 'Enseignant',
        });
        if (details.cycle && details.cycle !== selectedCycle) {
            setSelectedCycle(details.cycle);
        }
        return created;
    }, [addClass, config.defaultTeacherName, selectedCycle, setSelectedCycle]);

    const handleCreateClass = (details: { name: string; subject: string; cycle?: Cycle }) => {
        createClass(details);
        setCreateModalOpen(false);
    };

    /*
     * Suppression d'une classe : on retire aussi ses données de configuration
     * rattachées (dates de devoirs, absents, créneaux) — sinon des clés
     * orphelines resteraient dans le blob synchronisé. Cohérence des mécanismes.
     */
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
        if (config.timetable?.some(e => e.classId === classId)) {
            const nextTimetable = config.timetable.filter(e => e.classId !== classId);
            patch.timetable = nextTimetable;
            patch.schedules = deriveSchedules(nextTimetable); // source de vérité re-dérivée
        }
        if (Object.keys(patch).length > 0) updateConfig(patch);
    }, [deleteClass, config.assessmentDates, config.assessmentAbsences, config.pedagogicalEvents, config.timetable, updateConfig]);

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    const teacherName = (config.defaultTeacherName || '').trim();

    const calendar = getBundledCalendar();
    const today = todayInMorocco();
    const formattedDate = (() => {
        try {
            const [y, m, d] = today.split('-').map(Number);
            const date = new Date(Date.UTC(y, m - 1, d));
            return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        } catch {
            return '';
        }
    })();

    /*
     * Prochaine séance par classe — moteur intelligent : respecte fériés,
     * vacances et absences, tient compte de l'heure (séance en cours, plus
     * tard aujourd'hui, toutes passées) et donne un horizon réel (demain,
     * jour de semaine, ou date exacte au retour des vacances).
     */
    const calendarWithAbsences = withAbsences(calendar, config.absences);
    const nextSession = (classId: string) =>
        nextSessionInfoForClass(
            classId,
            config.timetable,
            config.schedules?.find(s => s.classId === classId)?.slots.map(s => s.weekday) ?? [],
            calendarWithAbsences,
        );

    const visibleClasses = [...classes]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const currentDisplay = CLASS_DISPLAY_OPTIONS.find(option => option.value === classDisplayMode) ?? CLASS_DISPLAY_OPTIONS[2];
    const classGridClass = classDisplayMode === 'single'
        ? 'grid-cols-1'
        : classDisplayMode === 'triple'
            ? 'grid-cols-2 md:grid-cols-3'
            : 'grid-cols-2';
    const displayCopy = (value: ClassDisplayMode) => {
        const keys: Record<ClassDisplayMode, [string, string]> = {
            list: ['dashboard.display.list', 'dashboard.display.listDescription'],
            single: ['dashboard.display.single', 'dashboard.display.singleDescription'],
            double: ['dashboard.display.double', 'dashboard.display.doubleDescription'],
            triple: ['dashboard.display.triple', 'dashboard.display.tripleDescription'],
        };
        const [labelKey, descriptionKey] = keys[value];
        return { label: t(labelKey), description: t(descriptionKey) };
    };

    // overflow-x-clip : masque le débordement horizontal (lucioles) sans créer
    // de conteneur de scroll — `hidden` forcerait overflow-y:auto et casserait
    // tout `position: sticky` descendant (même piège que corrigé dans App).
    return (
        <div className="min-h-screen bg-background text-foreground antialiased" data-dashboard-root>
            <div className="relative min-w-0 overflow-x-clip" data-dashboard-main>
                <div className="relative z-10 mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6 lg:px-6 lg:py-8">
                    <header className="mb-6 space-y-4 sm:mb-8" id="dashboard-header">
                        <div className="relative flex min-h-9 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="dashboard-header-copy min-w-0 flex-1 pr-[8.25rem] sm:pr-[9.75rem] lg:pr-0">
                                <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 font-display text-[1.65rem] font-extrabold tracking-tight text-foreground sm:text-3xl">
                                    {teacherName ? (
                                        <>
                                            <span>{getGreeting(locale)},</span>
                                            <span className="text-primary">{teacherName}</span>
                                        </>
                                    ) : (
                                        <span>{t('dashboard.classes')}</span>
                                    )}
                                </h1>
                                <p className="mt-1.5 text-xs font-semibold text-muted-foreground sm:text-sm">
                                    {formattedDate} — Vos cahiers prêts à ouvrir.
                                </p>
                            </div>

                            <div className="dashboard-header-actions absolute right-0 top-0 flex shrink-0 items-center gap-3 lg:static sm:gap-4" aria-label="Aide, réglages et notifications">
                                <NotificationCenter
                                    classes={classes}
                                    config={config}
                                    feed={notificationFeed}
                                    onSelectClass={onSelectClass}
                                    onOpenSettings={onOpenSettings}
                                    isOpen={isNotificationCenterOpen}
                                    onOpenChange={setNotificationCenterOpen}
                                    onMutate={() => setNotificationVersion(version => version + 1)}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setGuideOpen(true)}
                                    className="group h-8 w-8 rounded-full border-0 bg-zinc-100/90 text-zinc-500 shadow-none ring-1 ring-inset ring-zinc-200/70 transition-all duration-200 hover:-translate-y-px hover:bg-zinc-200/80 hover:text-zinc-800 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-zinc-400/30 [&_svg]:!size-4 sm:h-9 sm:w-9"
                                    aria-label="Aide"
                                    data-tippy-content="Aide"
                                >
                                    <CircleHelp strokeWidth={2} className="transition-transform duration-200 group-hover:scale-105" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={onOpenSettings}
                                    className="group h-8 w-8 rounded-full border-0 bg-zinc-100/90 text-zinc-500 shadow-none ring-1 ring-inset ring-zinc-200/70 transition-all duration-200 hover:-translate-y-px hover:bg-zinc-200/80 hover:text-zinc-800 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-zinc-400/30 [&_svg]:!size-4 sm:h-9 sm:w-9"
                                    aria-label="Paramètres"
                                    data-tippy-content="Paramètres"
                                >
                                    <Settings strokeWidth={2} className="transition-transform duration-200 group-hover:rotate-12 group-hover:scale-105" />
                                </Button>
                            </div>
                        </div>
                    </header>

                    <main>
                        {/* Installation PWA : AUCUNE bannière ni invite applicative.
                            `beforeinstallprompt` n'est pas intercepté → Chrome/Edge
                            affichent leur invite native ; sur Safari/iOS l'ajout se
                            fait via Partager ▸ « Sur l'écran d'accueil » (pas d'API). */}

                        {classes.length > 0 && (
                            <div className="mb-4 flex w-full justify-end">
                                <DashboardMetricsBar metrics={dashboardMetrics} />
                            </div>
                        )}

                        {/* Retards et échéances : fusionnés dans le centre de
                            notifications (cloche de l'en-tête) — plus de bannières. */}

                        <section className="mt-6 w-full" aria-labelledby="classes-heading">
                            <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
                                <div className="flex min-w-0 items-baseline gap-2.5">
                                    <h2 id="classes-heading" className="font-display text-[1.75rem] font-bold leading-none tracking-tight text-foreground sm:text-[2rem]">
                                        {t('dashboard.classes')}
                                    </h2>
                                    {classes.length > 0 && (
                                        <span className="shrink-0 pb-0.5 text-[13px] font-semibold text-zinc-400 sm:text-sm">
                                            {t('dashboard.classCount', { count: classes.length, plural: locale === 'ar' || classes.length < 2 ? '' : 's' })}
                                        </span>
                                    )}
                                </div>
                                {classes.length > 0 && (
                                    <div ref={displayMenuRef} className="relative shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => setDisplayMenuOpen(open => !open)}
                                            aria-haspopup="menu"
                                            aria-expanded={isDisplayMenuOpen}
                                            className="flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-[11px] font-semibold text-zinc-600 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:border-zinc-300 hover:text-zinc-900 active:scale-[0.98] sm:h-9 sm:px-3 sm:text-xs"
                                        >
                                            <span className="hidden text-zinc-400 sm:inline">{t('dashboard.display')}</span>
                                            <span>{displayCopy(currentDisplay.value).label}</span>
                                            <ChevronDown className={`h-2.5 w-2.5 text-zinc-400 transition-transform ${isDisplayMenuOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isDisplayMenuOpen && (
                                            <div
                                                role="menu"
                                                className="absolute right-0 top-[calc(100%+0.4rem)] z-30 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white p-1.5 shadow-[0_14px_32px_rgba(24,24,27,0.14)]"
                                            >
                                                {CLASS_DISPLAY_OPTIONS.map(option => {
                                                    const isActive = option.value === classDisplayMode;
                                                    return (
                                                        <button
                                                            key={option.value}
                                                            type="button"
                                                            role="menuitemradio"
                                                            aria-checked={isActive}
                                                            onClick={() => {
                                                                setClassDisplayMode(option.value);
                                                                setDisplayMenuOpen(false);
                                                            }}
                                                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors ${isActive ? 'bg-primary/8 text-primary' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900'}`}
                                                        >
                                                            <span className="text-[11px] font-semibold">{displayCopy(option.value).label}</span>
                                                            <span className={`text-[9px] font-medium ${isActive ? 'text-primary/75' : 'text-zinc-400'}`}>{displayCopy(option.value).description}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                                {classes.length === 0 ? (
                                    /* État vide motivant : premier pas guidé (accueil fusionné) */
                                    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center animate-slide-in-up">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                                            <Plus className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold font-display text-slate-900">Créez vos classes</h3>
                                            <p className="mt-1 text-xs font-medium text-slate-400">
                                                Trois étapes guidées : profil, classes, emploi du temps.
                                            </p>
                                        </div>
                                        <Button onClick={() => setOnboardingOpen(true)} data-guide="create-class" className="mt-2 h-9 rounded-md px-4 font-semibold shadow-sm">
                                            Commencer
                                        </Button>
                                    </div>
                                ) : classDisplayMode === 'list' ? (
                                    <div className="space-y-2" role="list" aria-label="Liste des cahiers">
                                        {visibleClasses.map((classInfo, index) => (
                                            <div
                                                key={classInfo.id}
                                                role="listitem"
                                                className="animate-slide-in-up opacity-0"
                                                style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
                                            >
                                                <ClassListItem
                                                    classInfo={classInfo}
                                                    lastModified={lastModifiedDates[classInfo.id]}
                                                    nextSession={nextSession(classInfo.id)}
                                                    onSelect={() => onSelectClass(classInfo)}
                                                    onDelete={() => handleDeleteClass(classInfo.id)}
                                                    onConfigure={() => setEditingClass(classInfo)}
                                                />
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => setCreateModalOpen(true)}
                                            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 px-3 text-[11px] font-semibold text-zinc-500 transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-primary sm:min-h-16 sm:text-xs"
                                        >
                                            <Plus className="h-3 w-3" />
                                            {t('dashboard.newNotebook')}
                                        </button>
                                    </div>
                                ) : (
                                    <div className={`grid ${classGridClass} gap-2.5 sm:gap-4`}>
                                        {/* Entrée en cascade : les cartes montent l'une après l'autre */}
                                        {visibleClasses.map((classInfo, index) => (
                                            <div
                                                key={classInfo.id}
                                                className="h-full animate-slide-in-up opacity-0"
                                                style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                                            >
                                                <ClassCard
                                                    classInfo={classInfo}
                                                    lastModified={lastModifiedDates[classInfo.id]}
                                                    nextSession={nextSession(classInfo.id)}
                                                    onSelect={() => onSelectClass(classInfo)}
                                                    onDelete={() => handleDeleteClass(classInfo.id)}
                                                    onConfigure={() => setEditingClass(classInfo)}
                                                />
                                            </div>
                                        ))}
                                        {/* Carte « nouvelle classe » : desktop/tablette ; sur mobile le FAB prend le relais */}
                                        <div
                                            className="h-full animate-slide-in-up opacity-0"
                                            style={{ animationDelay: `${Math.min(visibleClasses.length, 9) * 45}ms` }}
                                        >
                                            <AddClassCard onClick={() => setCreateModalOpen(true)} />
                                        </div>
                                    </div>
                                )}
                        </section>
                    </main>
                </div>
            </div>

            {/* FAB mobile — geste app native : créer une classe depuis le pouce */}
            <CreateClassModal
                isOpen={isCreateModalOpen || !!editingClass}
                onClose={() => {
                    setCreateModalOpen(false);
                    setEditingClass(null);
                }}
                onCreate={handleCreateClass}
                defaultTeacherName={config.defaultTeacherName}
                defaultCycle={selectedCycle}
                teacherSubjects={config.selectedSubjects}
                teacherCycles={config.showAllCycles ? undefined : (config.selectedCycles as Cycle[] | undefined)}
                editingClass={editingClass}
                onUpdate={(classId, updates) => {
                    updateClass(classId, updates);
                    setEditingClass(null);
                }}
            />
            {isGuideOpen && (
                <Suspense fallback={null}>
                    <GuideModal isOpen onClose={() => setGuideOpen(false)} />
                </Suspense>
            )}
            {/* Accueil fusionné (ex-Welcome + ex-« Bien démarrer ») : profil →
                classes PAR LOT → emploi du temps — l'ordre logique des données. */}
            <OnboardingModal
                isOpen={isOnboardingOpen}
                onClose={closeOnboarding}
                onComplete={completeOnboarding}
                config={config}
                onConfigChange={updateConfig}
                classes={classes}
                onCreateClass={createClass}
                onOpenNotebook={onSelectClass}
            />
        </div>
    );
};
