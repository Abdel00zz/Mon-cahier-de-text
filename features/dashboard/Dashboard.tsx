import React, { Suspense, lazy, useState, useCallback, useDeferredValue, useEffect, useMemo, useRef } from 'react';
import { useClassManager } from '@/hooks/useClassManager';
import { defaultNotificationSettings, useConfigManager } from '@/hooks/useConfigManager';
import { useOptimizedLocalStorage } from '@/hooks/useOptimizedLocalStorage';
import { DashboardSkeleton } from '@/components/ui/PageSkeleton';
import { Button } from '@/components/ui/button';
import { ClassCard } from './ClassCard';
import { LatenessBanner } from './LatenessBanner';
import { AssessmentBanner } from './AssessmentBanner';
import { CreateClassModal } from './modals/CreateClassModal';
import { OnboardingModal } from './modals/OnboardingModal';
import { TodayBriefing, TodaySnapshot } from './TodayBriefing';
import { ClassInfo, Cycle } from '@/types';
import { logger } from '@/utils/logger';
import { getBundledCalendar, todayInMorocco } from '@/utils/calendar';
import { withAbsences } from '@/utils/lateness';
import { nextSessionInfoForClass, deriveSchedules } from '@/utils/timetable';
import { CircleHelp, Plus, Search, Settings, X, ArrowRight } from '@/components/ui/icons';
import { migrateLessonsData } from '@/utils/dataUtils';
import { getTeachingResume, normalizeNotebookSearch, searchNotebook } from '@/utils/notebookIntelligence';
import { formatClassDisplayName } from '@/constants';
import { computeProgressionStats } from '@/utils/progression';
import { useLateness } from '@/hooks/useLateness';
import { activateNativeNotifications } from '@/utils/push';

const GuideModal = lazy(() => import('@/features/guide/GuideModal').then(module => ({ default: module.GuideModal })));

interface DashboardProps {
    onSelectClass: (classInfo: ClassInfo) => void;
    onOpenSettings: () => void;
}

/** Salutation selon l'heure — petite touche vivante, esprit app mobile. */
const getGreeting = (): string => {
    const hour = new Date().getHours();
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
    return (
        <button
            onClick={onClick}
            data-guide="create-class"
            className="group relative flex h-full w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 text-center shadow-[0_2px_8px_rgba(30,37,72,0.035)] transition-[border-color,background-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/45 hover:shadow-[0_10px_28px_rgba(30,37,72,0.08)] focus:outline-none focus:ring-[3px] focus:ring-primary/20"
        >
            <div className="relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground shadow-sm transition-all duration-300 group-hover:border-primary/20 group-hover:bg-accent group-hover:text-primary">
                <Plus className="w-5 h-5" />
            </div>
            <div className="relative z-10">
                <span className="block text-base font-bold text-foreground transition-colors group-hover:text-primary font-display">Nouveau cahier</span>
                <span className="mt-1 block text-xs font-semibold text-muted-foreground">Créer un cahier de textes</span>
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
    const { classes, addClass, deleteClass, updateClass, isLoading: isClassesLoading } = useClassManager();
    const { config, updateConfig, isLoading: isConfigLoading } = useConfigManager();
    const latenessSummary = useLateness(classes, config);
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
    const [isGuideOpen, setGuideOpen] = useState(false);
    const [isOnboardingOpen, setOnboardingOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [isSearchOpen, setSearchOpen] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const deferredSearch = useDeferredValue(search);
    const [lastModifiedDates, setLastModifiedDates] = useState<Record<string, string | null>>({});
    const { value: selectedCycle, setValue: setSelectedCycle } = useOptimizedLocalStorage<Cycle>('selected_cycle_v1', 'college', 100);

    const isLoading = isClassesLoading || isConfigLoading;

    useEffect(() => {
        if (!isSearchOpen) return;
        const frame = window.requestAnimationFrame(() => searchInputRef.current?.focus());
        return () => window.cancelAnimationFrame(frame);
    }, [isSearchOpen]);

    const classSearchResults = useMemo(() => {
        const query = normalizeNotebookSearch(deferredSearch);
        if (!query) return [];
        return classes
            .map(classInfo => {
                const lessons = readLessons(classInfo.id);
                const metadataMatch = normalizeNotebookSearch(`${classInfo.name} ${classInfo.subject}`).includes(query);
                const matches = searchNotebook(lessons, query, 3);
                if (!metadataMatch && matches.length === 0) return null;
                return { classInfo, matches, resume: getTeachingResume(lessons), metadataMatch };
            })
            .filter((result): result is NonNullable<typeof result> => result !== null)
            .sort((a, b) => Number(b.metadataMatch) - Number(a.metadataMatch));
    }, [classes, deferredSearch, lastModifiedDates]);

    const classesTodaySnapshot = useMemo<TodaySnapshot>(() => {
        const stats = classes.map(classInfo => computeProgressionStats(readLessons(classInfo.id)));
        const measurable = stats.filter(item => item.totalItems > 0);
        const avgCompletion = measurable.length > 0
            ? Math.round(measurable.reduce((sum, item) => sum + item.completionRate, 0) / measurable.length)
            : 0;
        const totalSessions = stats.reduce((sum, item) => sum + item.sessionsCount, 0);
        const totalPlanned = stats.reduce((sum, item) => sum + item.plannedCount, 0);
        const lateClasses = latenessSummary?.perClass.filter(item => item.gapSessions > 0).length ?? 0;

        let mood = 'Vos cahiers sont prêts — datez une première séance pour lancer le suivi.';
        if (totalPlanned > 0 && latenessSummary?.severity === 'ok') {
            mood = 'Cahiers à jour sur toute la ligne. Excellent rythme !';
        } else if (totalPlanned > 0 && lateClasses === 1) {
            mood = 'Une classe demande une petite mise à jour.';
        } else if (totalPlanned > 0 && lateClasses > 1) {
            mood = `${lateClasses} classes demandent une mise à jour ciblée.`;
        } else if (totalPlanned > 0) {
            mood = 'Vos cahiers avancent — le suivi se précise à chaque séance.';
        }

        return { mood, classCount: classes.length, avgCompletion, totalSessions };
    }, [classes, lastModifiedDates, latenessSummary]);

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

    const completeOnboarding = useCallback(async () => {
        const activation = await activateNativeNotifications();
        const current = { ...defaultNotificationSettings, ...(config.notificationSettings ?? {}) };
        updateConfig({
            hasCompletedWelcome: true,
            notificationSettings: {
                ...current,
                enabled: true,
                // Le même choix active le circuit local vibration + notification.
                sessionVibration: true,
                // Une permission locale accordée ne prétend pas être un push serveur.
                pushEnabled: current.pushEnabled || activation.subscribed,
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
        .filter(c => !normalizeNotebookSearch(deferredSearch) || classSearchResults.some(result => result.classInfo.id === c.id))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const openSearchResult = (classInfo: ClassInfo, continueInNotebook: boolean) => {
        if (continueInNotebook) {
            try {
                sessionStorage.setItem('dashboard_search_handoff_v1', JSON.stringify({ classId: classInfo.id, query: search.trim() }));
            } catch { /* navigation possible même sans stockage */ }
        }
        onSelectClass(classInfo);
    };

    // overflow-x-clip : masque le débordement horizontal (lucioles) sans créer
    // de conteneur de scroll — `hidden` forcerait overflow-y:auto et casserait
    // tout `position: sticky` descendant (même piège que corrigé dans App).
    return (
        <div className="min-h-screen bg-background text-foreground antialiased" data-dashboard-root>
            <div className="relative min-w-0 overflow-x-clip" data-dashboard-main>
                <div className="relative z-10 mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-6 lg:px-6 lg:py-8">
                    <header className="mb-6 space-y-4 sm:mb-8" id="dashboard-header">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                                <h1 className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                                    {teacherName ? (
                                        <>
                                            <span>{getGreeting()},</span>
                                            <span className="text-primary">{teacherName}</span>
                                        </>
                                    ) : (
                                        <span>Mes classes</span>
                                    )}
                                </h1>
                                <p className="mt-1.5 text-xs font-semibold text-muted-foreground sm:text-sm">
                                    {formattedDate} · Vos cahiers de classes, prêts à ouvrir.
                                </p>
                            </div>

                            <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 self-end lg:w-auto lg:flex-nowrap lg:self-start" aria-label="Aide, réglages et recherche">
                                <Button type="button" variant="outline" size="sm" onClick={() => setGuideOpen(true)} className="h-10 px-3 text-xs">
                                    <CircleHelp className="h-4 w-4 text-primary" />
                                    Guide
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={onOpenSettings} className="h-10 px-3 text-xs">
                                    <Settings className="h-4 w-4 text-primary" />
                                    Paramètres
                                </Button>
                                {classes.length > 0 && (
                                    <div className={`relative order-last h-10 overflow-hidden transition-[width,margin] duration-300 ease-out ${
                                        isSearchOpen ? 'mt-2 w-full sm:mt-0 sm:w-72 lg:w-80' : 'w-10'
                                    }`}>
                                        {isSearchOpen ? (
                                            <div id="dashboard-search" className="relative h-10 w-full animate-fade-in" role="search">
                                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                                                <input
                                                    ref={searchInputRef}
                                                    type="search"
                                                    value={search}
                                                    onChange={event => setSearch(event.target.value)}
                                                    onKeyDown={event => {
                                                        if (event.key !== 'Escape') return;
                                                        setSearch('');
                                                        setSearchOpen(false);
                                                    }}
                                                    placeholder="Classe, chapitre, contenu…"
                                                    className="h-10 w-full rounded-lg border border-primary/30 bg-background/95 pl-9 pr-10 text-sm font-semibold text-foreground shadow-[0_4px_14px_rgba(29,155,240,0.09)] outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:border-primary focus:ring-[3px] focus:ring-primary/15"
                                                    aria-label="Rechercher dans toutes les classes et tous les cahiers"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSearch('');
                                                        setSearchOpen(false);
                                                    }}
                                                    className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                                                    aria-label="Fermer la recherche"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={() => setSearchOpen(true)}
                                                className={`h-10 w-10 border-primary/25 text-primary ${search ? 'bg-primary text-primary-foreground' : 'bg-primary/5 hover:border-primary/40 hover:bg-primary/10 hover:text-primary'}`}
                                                aria-label="Rechercher dans les cahiers"
                                                aria-expanded="false"
                                                aria-controls="dashboard-search"
                                            >
                                                <Search className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    <main>
                        {/* Installation PWA : AUCUNE bannière applicative — beforeinstallprompt
                            n'est pas intercepté, le navigateur affiche sa propre invite native. */}

                        {classes.length > 0 && !search.trim() && (
                            <TodayBriefing
                                classes={classes}
                                config={config}
                                snapshot={classesTodaySnapshot}
                                lastModifiedDates={lastModifiedDates}
                                lateClassCount={latenessSummary?.perClass.filter(item => item.gapSessions > 0).length ?? 0}
                            />
                        )}

                        {/* Alertes intelligentes : retard + devoirs proches (snooze quotidien) */}
                        <LatenessBanner classes={classes} config={config} />
                        <AssessmentBanner classes={classes} config={config} />

                        <section className="mt-6 w-full" aria-labelledby="classes-heading">
                            <div className="mb-4 flex flex-wrap items-center gap-3 sm:mb-5">
                                <h2 id="classes-heading" className="font-display text-[1.75rem] font-bold leading-none tracking-tight text-foreground sm:text-[2rem]">
                                    Mes classes
                                </h2>
                                {classes.length > 0 && (
                                    <span className="shrink-0 rounded-md border border-primary/15 bg-primary/5 px-2.5 py-1 text-xs font-bold text-primary">
                                        {classes.length} classe{classes.length > 1 ? 's' : ''}
                                    </span>
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
                                ) : visibleClasses.length === 0 ? (
                                    <p className="rounded-md border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-xs font-semibold text-slate-400">
                                        Aucun résultat pour « {search} » dans les classes, chapitres, contenus ou remarques.
                                    </p>
                                ) : search.trim() ? (
                                    <div className="space-y-3" aria-label="Résultats de recherche dans les cahiers">
                                        {classSearchResults.map(({ classInfo, matches, resume }) => (
                                            <button
                                                key={classInfo.id}
                                                type="button"
                                                onClick={() => openSearchResult(classInfo, matches.length > 0)}
                                                className="group block w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-primary/10 sm:p-5"
                                            >
                                                <span className="flex items-start justify-between gap-3">
                                                    <span className="min-w-0">
                                                        <span
                                                            className="block text-sm font-extrabold leading-snug text-foreground group-hover:text-primary sm:text-base"
                                                            title={formatClassDisplayName(classInfo.name)}
                                                        >
                                                            {formatClassDisplayName(classInfo.name)}
                                                        </span>
                                                        <span className="mt-0.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">{classInfo.subject}</span>
                                                    </span>
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary transition-transform group-hover:translate-x-0.5">
                                                        <ArrowRight className="h-4 w-4" />
                                                    </span>
                                                </span>
                                                {matches.length > 0 ? (
                                                    <span className="mt-3 grid gap-2 sm:grid-cols-2">
                                                        {matches.slice(0, 2).map((match, index) => (
                                                            <span key={`${match.breadcrumb}-${index}`} className="min-w-0 rounded-xl bg-muted/60 px-3 py-2.5">
                                                                <span className="block truncate text-[11px] font-extrabold text-foreground">{match.title}</span>
                                                                {match.breadcrumb && <span className="mt-0.5 block truncate text-[10px] font-semibold text-primary">{match.breadcrumb}</span>}
                                                                <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-muted-foreground">{match.snippet}</span>
                                                            </span>
                                                        ))}
                                                    </span>
                                                ) : resume.next ? (
                                                    <span className="mt-3 block rounded-xl bg-accent px-3 py-2 text-xs text-accent-foreground">
                                                        <strong className="text-primary">À reprendre :</strong> {resume.next.title}
                                                    </span>
                                                ) : null}
                                                <span className="mt-3 block text-[11px] font-bold text-primary">
                                                    {matches.length > 0 ? 'Ouvrir le cahier avec cette recherche' : 'Ouvrir ce cahier'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                                            className="hidden h-full sm:block animate-slide-in-up opacity-0"
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
            <Button
                onClick={() => setCreateModalOpen(true)}
                size="icon"
                className="fab-safe fixed right-4 z-50 h-14 w-14 rounded-full shadow-xl shadow-primary/30 transition-transform active:scale-90 sm:hidden print:hidden"
                aria-label="Créer une nouvelle classe"
                data-guide="create-class-fab"
            >
                <Plus className="h-6 w-6" />
            </Button>

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
