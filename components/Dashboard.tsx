import React, { Suspense, lazy, useState, useCallback, useDeferredValue, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useClassManager } from '../hooks/useClassManager';
import { useConfigManager } from '../hooks/useConfigManager';
import { useOptimizedLocalStorage } from '../hooks/useOptimizedLocalStorage';
import { DashboardSkeleton } from './ui/PageSkeleton';
import { Button } from './ui/button';
import { ClassCard } from './ClassCard';
import { AnalystView } from './AnalystView';
import { LatenessBanner } from './LatenessBanner';
import { AssessmentBanner } from './AssessmentBanner';
import { AppSidebar, HubView } from './AppSidebar';
import { DevoirsView } from './devoirs/DevoirsView';
import { CreateClassModal } from './modals/CreateClassModal';
import { ImportPlatformModal } from './modals/ImportPlatformModal';
import { OnboardingModal } from './modals/OnboardingModal';
import { ClassInfo, Cycle } from '../types';
import { logger } from '../utils/logger';
import { getBundledCalendar, getSchoolYearFor, todayInMorocco } from '../utils/calendar';
import { withAbsences } from '../utils/lateness';
import { nextSessionInfoForClass, deriveSchedules } from '../utils/timetable';
import { Plus, Search, Menu, X, ArrowRight } from './ui/icons';
import { restoreBackup } from '../utils/backup';
import { migrateLessonsData } from '../utils/dataUtils';
import { getTeachingResume, normalizeNotebookSearch, searchNotebook } from '../utils/notebookIntelligence';

const GuideModal = lazy(() => import('./modals/GuideModal').then(module => ({ default: module.GuideModal })));

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
            className="group relative flex h-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl bg-slate-50/50 p-6 transition-all duration-200 border border-dashed border-slate-300 hover:border-slate-400 hover:bg-slate-50 hover:shadow-md w-full focus:outline-none focus:ring-2 focus:ring-primary/20 text-center"
        >
            <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-lg bg-white text-slate-500 transition-all duration-200 group-hover:bg-primary/5 group-hover:text-primary border border-slate-200 shadow-sm mb-4">
                <Plus className="w-5 h-5" />
            </div>
            <div className="relative z-10">
                <span className="block text-base font-bold text-slate-800 transition-colors group-hover:text-primary font-display">Nouveau cahier</span>
                <span className="block text-xs font-semibold text-slate-400 mt-1">Créer un cahier de textes</span>
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

/* Titres de vue : mots CIBLÉS, une intention par entrée de la sidebar. */
const VIEW_HEADERS: Record<HubView, { title: (year: string) => string; subtitle: string }> = {
    classes: { title: () => 'Mes classes', subtitle: 'Vos cahiers de textes, prêts à ouvrir.' },
    suivi: { title: () => 'Tableau de bord', subtitle: 'Prochaine séance, progression et alertes en un coup d\'œil.' },
    devoirs: { title: () => 'Calendrier des devoirs', subtitle: 'Surveillés & maison — relié à vos cahiers de textes.' },
};

export const Dashboard: React.FC<DashboardProps> = ({ onSelectClass, onOpenSettings }) => {
    const { classes, addClass, deleteClass, updateClass, isLoading: isClassesLoading } = useClassManager();
    const { config, updateConfig, isLoading: isConfigLoading } = useConfigManager();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [isGuideOpen, setGuideOpen] = useState(false);
    const [isOnboardingOpen, setOnboardingOpen] = useState(false);
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [search, setSearch] = useState('');
    const deferredSearch = useDeferredValue(search);
    const [lastModifiedDates, setLastModifiedDates] = useState<Record<string, string | null>>({});
    const { value: selectedCycle, setValue: setSelectedCycle } = useOptimizedLocalStorage<Cycle>('selected_cycle_v1', 'college', 100);
    // vue courante du hub, mémorisée pour la session (retour de l'éditeur inclus)
    const { value: view, setValue: setView } = useOptimizedLocalStorage<HubView>('hub_view_v1', 'classes', 100);
    const { value: sidebarCollapsed, setValue: setSidebarCollapsed } = useOptimizedLocalStorage<boolean>('sidebar_collapsed_v1', false, 100);

    const isLoading = isClassesLoading || isConfigLoading;

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
        if (config.timetable?.some(e => e.classId === classId)) {
            const nextTimetable = config.timetable.filter(e => e.classId !== classId);
            patch.timetable = nextTimetable;
            patch.schedules = deriveSchedules(nextTimetable); // source de vérité re-dérivée
        }
        if (Object.keys(patch).length > 0) updateConfig(patch);
    }, [deleteClass, config.assessmentDates, config.assessmentAbsences, config.timetable, updateConfig]);

    const handleImportPlatform = useCallback((fileContent: string) => {
        try {
            const count = restoreBackup(JSON.parse(fileContent));
            toast.success(`Importation réussie (${count} classe(s)) — rechargement…`);
            window.setTimeout(() => window.location.reload(), 900);
        } catch (error) {
            logger.error("Import failed", error);
            const message = error instanceof Error ? error.message : 'Erreur inconnue';
            toast.error(`L'importation a échoué : ${message}`);
        }
        setImportModalOpen(false);
    }, []);

    const openAccount = useCallback(() => {
        try { sessionStorage.setItem('config_initial_tab_v1', 'compte'); } catch { /* stockage indisponible */ }
        onOpenSettings();
    }, [onOpenSettings]);

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    const teacherName = (config.defaultTeacherName || '').trim();

    const calendar = getBundledCalendar();
    const today = todayInMorocco();
    const yearLabel = getSchoolYearFor(calendar, today).libelle;
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

    const header = VIEW_HEADERS[view];

    // overflow-x-clip : masque le débordement horizontal (lucioles) sans créer
    // de conteneur de scroll — `hidden` forcerait overflow-y:auto et casserait
    // tout `position: sticky` descendant (même piège que corrigé dans App).
    return (
        <div className="flex min-h-screen bg-background text-foreground antialiased" data-dashboard-root>
            {/* Sidebar : navigation du hub (fixe ≥ lg, drawer sinon) */}
            <AppSidebar
                view={view}
                onViewChange={setView}
                onOpenSettings={onOpenSettings}
                onOpenAccount={openAccount}
                onOpenGuide={() => setGuideOpen(true)}
                teacherName={teacherName}
                yearLabel={yearLabel}
                mobileOpen={isSidebarOpen}
                onMobileClose={() => setSidebarOpen(false)}
                collapsed={sidebarCollapsed}
                onCollapsedChange={setSidebarCollapsed}
            />

            <div className="relative min-w-0 flex-1 overflow-x-clip">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 relative z-10">
                    <header className="mb-6 flex flex-col gap-4 sm:mb-8 md:flex-row md:items-center md:justify-between" id="dashboard-header">
                        <div className="flex min-w-0 flex-1 items-start gap-2.5">
                            {/* Hamburger : uniquement quand la sidebar est en drawer */}
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(true)}
                                className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm lg:hidden hover:bg-slate-50"
                                aria-label="Ouvrir le menu"
                            >
                                <Menu className="h-4.5 w-4.5" />
                            </button>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                    {view === 'classes' && teacherName ? (
                                        <>
                                            <span className="text-slate-900">{getGreeting()},</span>
                                            <span className="text-primary">{teacherName}</span>
                                        </>
                                    ) : (
                                        <>
                                            {header.title(yearLabel)}
                                            {view === 'classes' && visibleClasses.length > 0 && (
                                                <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs sm:text-sm font-semibold text-slate-700 animate-fade-in">
                                                    {visibleClasses.length}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </h1>
                                <div className="mt-2 h-0.5 w-12 bg-primary" aria-hidden />
                                {view === 'classes' && teacherName ? (
                                    <p className="mt-2 text-xs sm:text-sm font-semibold text-slate-400">
                                        {formattedDate} · Vos cahiers de classes, prêts à ouvrir.
                                    </p>
                                ) : (
                                    <p className="mt-2 text-xs sm:text-sm font-medium text-slate-500">
                                        {header.subtitle}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Recherche et Filtres : vue classes uniquement */}
                        {view === 'classes' && classes.length > 0 && (
                            <div className="flex w-full md:w-auto items-center gap-3 self-end md:self-auto shrink-0">
                                <div className="relative w-full md:w-80" role="search">
                                    <Search className="pointer-events-none absolute left-3 top-[22px] h-4 w-4 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="search"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Classe, chapitre, contenu, remarque…"
                                        className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-sm font-medium text-slate-800 shadow-sm transition-all placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                                        aria-label="Rechercher dans toutes les classes et tous les cahiers"
                                    />
                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => setSearch('')}
                                            className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                            aria-label="Effacer la recherche"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    )}
                                    {search.trim() && (
                                        <p className="mt-1.5 px-1 text-[11px] font-semibold text-slate-500" aria-live="polite">
                                            {classSearchResults.length} cahier{classSearchResults.length > 1 ? 's' : ''} trouvé{classSearchResults.length > 1 ? 's' : ''} · recherche dans tout le contenu
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </header>

                    <main>
                        {/* Installation PWA : AUCUNE bannière applicative — beforeinstallprompt
                            n'est pas intercepté, le navigateur affiche sa propre invite native. */}

                        {/* Alertes intelligentes : retard + devoirs proches (snooze quotidien) */}
                        {view !== 'devoirs' && (
                            <>
                                <LatenessBanner classes={classes} config={config} />
                                <AssessmentBanner classes={classes} config={config} />
                            </>
                        )}

                        {view === 'suivi' && (
                            classes.length === 0 ? (
                                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center">
                                    <p className="text-sm font-bold text-slate-800">Aucune donnée à analyser</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-400">
                                        Créez vos classes et datez vos séances : l'analyste s'activera aussitôt.
                                    </p>
                                </div>
                            ) : (
                                <AnalystView classes={classes} config={config} onSelectClass={onSelectClass} />
                            )
                        )}

                        {view === 'devoirs' && (
                            <DevoirsView
                                classes={classes}
                                config={config}
                                onConfigChange={updateConfig}
                                onOpenNotebook={onSelectClass}
                            />
                        )}

                        {view === 'classes' && (
                            <div className="w-full">
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
                                                className="group block w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-primary/10 sm:p-5"
                                            >
                                                <span className="flex items-start justify-between gap-3">
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-base font-extrabold text-slate-900 group-hover:text-primary">{classInfo.name}</span>
                                                        <span className="mt-0.5 block text-xs font-bold uppercase tracking-wide text-slate-400">{classInfo.subject}</span>
                                                    </span>
                                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary transition-transform group-hover:translate-x-0.5">
                                                        <ArrowRight className="h-4 w-4" />
                                                    </span>
                                                </span>
                                                {matches.length > 0 ? (
                                                    <span className="mt-3 grid gap-2 sm:grid-cols-2">
                                                        {matches.slice(0, 2).map((match, index) => (
                                                            <span key={`${match.breadcrumb}-${index}`} className="min-w-0 rounded-xl bg-slate-50 px-3 py-2.5">
                                                                <span className="block truncate text-[11px] font-extrabold text-slate-800">{match.title}</span>
                                                                {match.breadcrumb && <span className="mt-0.5 block truncate text-[10px] font-semibold text-primary">{match.breadcrumb}</span>}
                                                                <span className="mt-1 block line-clamp-2 text-xs leading-relaxed text-slate-500">{match.snippet}</span>
                                                            </span>
                                                        ))}
                                                    </span>
                                                ) : resume.next ? (
                                                    <span className="mt-3 block rounded-xl bg-primary/[0.04] px-3 py-2 text-xs text-slate-600">
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* FAB mobile — geste app native : créer une classe depuis le pouce */}
            {view === 'classes' && (
                <Button
                    onClick={() => setCreateModalOpen(true)}
                    size="icon"
                    className="fab-safe fixed right-4 z-50 h-14 w-14 rounded-full shadow-xl shadow-primary/30 transition-transform active:scale-90 sm:hidden print:hidden"
                    aria-label="Créer une nouvelle classe"
                    data-guide="create-class-fab"
                >
                    <Plus className="h-6 w-6" />
                </Button>
            )}
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
            <ImportPlatformModal
                isOpen={isImportModalOpen}
                onClose={() => setImportModalOpen(false)}
                onImport={handleImportPlatform}
            />
            {/* Accueil fusionné (ex-Welcome + ex-« Bien démarrer ») : profil →
                classes PAR LOT → emploi du temps — l'ordre logique des données. */}
            <OnboardingModal
                isOpen={isOnboardingOpen}
                onClose={closeOnboarding}
                config={config}
                onConfigChange={updateConfig}
                classes={classes}
                onCreateClass={createClass}
                onOpenNotebook={onSelectClass}
            />
        </div>
    );
};
