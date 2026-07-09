import React, { Suspense, lazy, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useClassManager } from '../hooks/useClassManager';
import { useConfigManager } from '../hooks/useConfigManager';
import { useOptimizedLocalStorage } from '../hooks/useOptimizedLocalStorage';
import { DashboardSkeleton } from './ui/PageSkeleton';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { ClassCard } from './ClassCard';
import { DashboardStats } from './DashboardStats';
import { LatenessBanner } from './LatenessBanner';
import { AssessmentBanner } from './AssessmentBanner';
import { OnboardingGuide } from './OnboardingGuide';
import { CreateClassModal } from './modals/CreateClassModal';
import { ImportPlatformModal } from './modals/ImportPlatformModal';
import { WelcomeModal } from './modals/WelcomeModal';
import { ClassInfo, Cycle } from '../types';
import { logger } from '../utils/logger';
import { getBundledCalendar, todayInMorocco } from '../utils/calendar';
import { withAbsences } from '../utils/lateness';
import { nextSessionInfoForClass } from '../utils/timetable';
import { useSessionAssistant } from '../hooks/useSessionAssistant';
import { SessionSpotlight } from './SessionSpotlight';
import { Badge } from './ui/badge';
import { Plus, CircleHelp, Settings } from './ui/icons';
import { AUTH_REQUIRED } from '../config/features';
import { restoreBackup } from '../utils/backup';

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

/** Prénom probable : premier mot du nom, en ignorant les civilités. */
const getFirstName = (name: string): string => {
    const parts = name.trim().split(/\s+/).filter(p => !/^(m\.?|mme\.?|mlle\.?|dr\.?|pr\.?)$/i.test(p));
    return parts[0] ?? '';
};

const getInitials = (name: string): string => {
    if (!name) return "PE";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return "PE";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AddClassCard: React.FC<{ onClick: () => void }> = ({ onClick }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <Card
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            data-guide="create-class"
            className="group flex flex-col justify-between w-full h-full min-h-[160px] cursor-pointer rounded-[24px] border-2 border-dashed shadow-sm transition-all duration-300 ease-out active:scale-[0.985] select-none will-change-transform relative overflow-hidden"
            style={{
                borderColor: hovered
                    ? 'color-mix(in srgb, hsl(var(--primary)) 60%, hsl(var(--border)))'
                    : 'hsl(var(--border))',
                backgroundColor: hovered
                    ? 'color-mix(in srgb, hsl(var(--primary)) 8%, hsl(var(--card)))'
                    : 'color-mix(in srgb, hsl(var(--primary)) 3%, hsl(var(--card)))',
            }}
            aria-label="Créer une nouvelle classe"
        >
            <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-3.5 flex-1">
                <div 
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary border border-border/40 shadow-sm transition-all duration-300"
                    style={{
                        backgroundColor: hovered ? 'hsl(var(--primary))' : 'hsl(var(--secondary))',
                        color: hovered ? 'hsl(var(--primary-foreground))' : 'hsl(var(--primary))',
                        transform: hovered ? 'scale(1.05)' : 'scale(1)',
                    }}
                >
                    <Plus className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-sm font-extrabold text-card-foreground font-display transition-colors">Nouvelle classe</h3>
                    <p className="text-[11px] text-muted-foreground font-semibold font-sans mt-0.5">Créer un nouveau cahier</p>
                </div>
            </CardContent>
        </Card>
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
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [isGuideOpen, setGuideOpen] = useState(false);
    const [isWelcomeModalOpen, setWelcomeModalOpen] = useState(false);
    const [lastModifiedDates, setLastModifiedDates] = useState<Record<string, string | null>>({});
    const { value: selectedCycle, setValue: setSelectedCycle } = useOptimizedLocalStorage<Cycle>('selected_cycle_v1', 'college', 100);
    // séance du moment (en cours / imminente / qui vient de finir) — rafraîchie chaque minute
    const liveSuggestion = useSessionAssistant(classes, config);

    const isLoading = isClassesLoading || isConfigLoading;

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

    // Écran d'accueil (config initiale) : uniquement en mode LOCAL sans compte.
    // En production, l'inscription fournit déjà nom, cycles et matières.
    useEffect(() => {
        if (!AUTH_REQUIRED && !isConfigLoading && !config.hasCompletedWelcome) {
            setWelcomeModalOpen(true);
        }
    }, [config.hasCompletedWelcome, isConfigLoading]);

    const handleCreateClass = (details: { name: string; subject: string; cycle?: Cycle; }) => {
        addClass({
            ...details,
            cycle: details.cycle ?? selectedCycle,
            teacherName: config.defaultTeacherName || 'Enseignant',
        });
        // bascule le tableau de bord sur le cycle de la classe créée
        if (details.cycle && details.cycle !== selectedCycle) {
            setSelectedCycle(details.cycle);
        }
        setCreateModalOpen(false);
    };

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

    const needsConfiguration = !config.establishmentName || !config.defaultTeacherName;
    // En production, les cycles sont déclarés à l'inscription : plus d'onglets,
    // toutes les classes du professeur sont affichées ensemble.
    const showAllClasses = AUTH_REQUIRED;

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

    const initials = getInitials(teacherName);

    return (
    <div className="min-h-screen bg-background p-3 pb-8 touch-manipulation safe-bottom sm:p-8" data-dashboard-root>
            <header className="relative mx-auto mb-6 sm:mb-8 max-w-5xl px-3 sm:px-4" id="dashboard-header">
                <div className="flex items-center justify-between border-b border-border/50 pb-5 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Elegant Circular Avatar */}
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-extrabold text-sm shadow-inner font-sans tracking-wide">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-base sm:text-2xl font-extrabold text-foreground font-display tracking-tight leading-none truncate">
                                {teacherName ? (
                                    <>
                                        {getGreeting()}, {getFirstName(teacherName)}
                                        <span className="ml-1 inline-block text-[0.85em] animate-fade-in" aria-hidden>👋</span>
                                    </>
                                ) : 'Mon Espace'}
                            </h1>
                            <div className="flex items-center gap-x-2 text-[11px] text-muted-foreground font-semibold font-sans mt-1">
                                {config.establishmentName && config.establishmentName.trim() !== teacherName ? (
                                    <span className="text-primary font-bold truncate max-w-[120px] sm:max-w-none">{config.establishmentName.trim()}</span>
                                ) : (
                                    <span>Cahier de Textes</span>
                                )}
                                {formattedDate && (
                                    <>
                                        <span className="text-muted-foreground/50 select-none">•</span>
                                        <span className="text-muted-foreground capitalize truncate">{formattedDate.split(' ').slice(0, 3).join(' ')}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Compact actions - circular buttons on mobile, pill buttons on desktop */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setGuideOpen(true)} 
                            className="rounded-full flex items-center gap-1.5 h-9 w-9 sm:w-auto sm:px-3.5"
                            title="Consulter le guide d'utilisation"
                        >
                            <CircleHelp className="h-4 w-4 text-primary" />
                            <span className="hidden sm:inline">Guide</span>
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onOpenSettings} 
                            className="rounded-full flex items-center gap-1.5 h-9 w-9 sm:w-auto sm:px-3.5"
                            title="Accéder aux réglages"
                        >
                            <Settings className="h-4 w-4 text-muted-foreground" />
                            <span className="hidden sm:inline">Réglages</span>
                        </Button>
                    </div>
                </div>
            </header>
            <main>
            {/* Installation PWA : AUCUNE bannière applicative — beforeinstallprompt
                n'est pas intercepté, le navigateur affiche sa propre invite native
                (mini-infobar Android, icône d'installation dans l'omnibox). */}
            {/* Séance du moment : la classe concernée + le contenu à traiter,
                affichés dès l'ouverture — un tap ouvre le cahier ET surligne
                l'élément proposé dans l'éditeur. */}
            {liveSuggestion && (
                <SessionSpotlight suggestion={liveSuggestion} onOpenClass={onSelectClass} />
            )}
            <LatenessBanner classes={classes} config={config} />
            <AssessmentBanner classes={classes} config={config} />
            {/* Sélecteur de cycle — MASQUÉ en production (les cycles viennent de
                l'inscription) ; en local sans compte, affiché si plusieurs cycles. */}
            {!showAllClasses && (
            <div className={`w-full flex justify-center mb-5 sm:mb-6 ${((config.selectedCycles?.length ?? 0) === 1 && !config.showAllCycles) ? 'hidden' : ''}`}>
                <Tabs value={selectedCycle} onValueChange={(val) => !isClassesLoading && setSelectedCycle(val as Cycle)}>
                    <TabsList className="rounded-xl border border-border bg-card shadow-sm p-1">
                        {([
                            { key: 'college', label: 'Collège' },
                            { key: 'lycee', label: 'Lycée' },
                            { key: 'prepa', label: 'Prépa' },
                        ] as {key: Cycle; label: string;}[])
                            .filter(opt => config.showAllCycles || !config.selectedCycles?.length || config.selectedCycles.includes(opt.key))
                            .map(opt => (
                                <TabsTrigger
                                    key={opt.key}
                                    value={opt.key}
                                    disabled={isClassesLoading}
                                    className="px-4 py-1.5 text-xs font-semibold font-sans transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                                >
                                    {opt.label}
                                </TabsTrigger>
                            ))
                        }
                    </TabsList>
                </Tabs>
            </div>
            )}

            {/* Cartes statistiques : branchées aux mêmes classes que la grille */}
            <DashboardStats
                classes={classes.filter(c => showAllClasses || (c.cycle || 'college') === selectedCycle)}
                config={config}
            />

            <div className="mx-auto max-w-5xl px-3 sm:px-4">
                {(() => {
                    const visibleClasses = classes
                        .filter(c => showAllClasses || (c.cycle || 'college') === selectedCycle)
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                    return (
                        <>
                            <div className="mb-3.5 flex items-center gap-2">
                                <h2 className="text-lg font-bold font-display text-foreground">Mes Classes</h2>
                                {visibleClasses.length > 0 && (
                                    <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px] font-extrabold tabular-nums">
                                        {visibleClasses.length}
                                    </Badge>
                                )}
                            </div>

                            {visibleClasses.length === 0 ? (
                                /* État vide motivant : premier pas guidé */
                                <div className="flex flex-col items-center gap-3 rounded-[24px] border-2 border-dashed border-border bg-card/50 px-6 py-10 text-center animate-slide-in-up">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <Plus className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-extrabold font-display text-foreground">Créez votre première classe</h3>
                                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                                            Votre cahier de textes numérique commence ici.
                                        </p>
                                    </div>
                                    <Button onClick={() => setCreateModalOpen(true)} data-guide="create-class" className="mt-1 h-11 rounded-full px-6 font-bold shadow-md shadow-primary/20">
                                        <Plus className="mr-1.5 h-4 w-4" />
                                        Nouvelle classe
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-2 md:grid-cols-3">
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
                                                onDelete={() => deleteClass(classInfo.id)}
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
                        </>
                    );
                })()}
            </div>
            </main>

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
            <ImportPlatformModal
                isOpen={isImportModalOpen}
                onClose={() => setImportModalOpen(false)}
                onImport={handleImportPlatform}
            />
            <WelcomeModal
                isOpen={isWelcomeModalOpen}
                onClose={() => {
                    setWelcomeModalOpen(false);
                    if (classes.length === 0) {
                        setCreateModalOpen(true);
                    }
                }}
                config={config}
                onConfigChange={updateConfig}
            />

            {/* Guide d'accueil interactif — pas pendant l'écran de config initial */}
            <OnboardingGuide enabled={!isWelcomeModalOpen && !isCreateModalOpen} />
        </div>
    );
};
