import React, { Suspense, lazy, useState, useCallback, useEffect } from 'react';
import { useClassManager } from '../hooks/useClassManager';
import { useConfigManager } from '../hooks/useConfigManager';
import { useOptimizedLocalStorage } from '../hooks/useOptimizedLocalStorage';
import { DashboardSkeleton } from './ui/PageSkeleton';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { ClassCard } from './ClassCard';
import { LatenessBanner } from './LatenessBanner';
import { AssessmentBanner } from './AssessmentBanner';
import { OnboardingGuide } from './OnboardingGuide';
import { CreateClassModal } from './modals/CreateClassModal';
import { ImportPlatformModal } from './modals/ImportPlatformModal';
import { WelcomeModal } from './modals/WelcomeModal';
import { ClassInfo, Cycle } from '../types';
import { logger } from '../utils/logger';
import { getBundledCalendar, nextSchoolDay, todayInMorocco, weekdayLabel } from '../utils/calendar';
import { Plus, CircleHelp, Settings } from './ui/icons';
import { AUTH_REQUIRED } from '../config/features';
import { restoreBackup } from '../utils/backup';

const GuideModal = lazy(() => import('./modals/GuideModal').then(module => ({ default: module.GuideModal })));

interface DashboardProps {
    onSelectClass: (classInfo: ClassInfo) => void;
    onOpenSettings: () => void;
}

const AddClassCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <Card
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
        data-guide="create-class"
        className="group flex min-h-[8.5rem] w-full cursor-pointer items-center justify-center border border-dashed border-slate-300 bg-slate-50/20 text-slate-500 shadow-none transition-all duration-150 hover:border-slate-500 hover:bg-slate-50 hover:text-slate-800"
        aria-label="Créer une nouvelle classe"
    >
        <CardContent className="flex flex-col items-center justify-center p-4 text-center">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-slate-600 transition-colors duration-150 group-hover:bg-slate-900 group-hover:text-white">
                <Plus className="h-3.5 w-3.5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Nouvelle classe</span>
            <span className="mt-0.5 text-[10px] text-slate-400 font-medium">Créer un nouveau cahier</span>
        </CardContent>
    </Card>
);

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
    const { classes, addClass, deleteClass, isLoading: isClassesLoading } = useClassManager();
    const { config, updateConfig, isLoading: isConfigLoading } = useConfigManager();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [isGuideOpen, setGuideOpen] = useState(false);
    const [isWelcomeModalOpen, setWelcomeModalOpen] = useState(false);
    const [lastModifiedDates, setLastModifiedDates] = useState<Record<string, string | null>>({});
    const { value: selectedCycle, setValue: setSelectedCycle } = useOptimizedLocalStorage<Cycle>('selected_cycle_v1', 'college', 100);

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
            alert(`Importation réussie (${count} classe(s)) ! L'application va se recharger.`);
            window.location.reload();
        } catch (error) {
            logger.error("Import failed", error);
            const message = error instanceof Error ? error.message : 'Erreur inconnue';
            alert(`L'importation a échoué: ${message}`);
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
    const nextSessionLabel = (classId: string): string | null => {
        const schedule = config.schedules?.find(s => s.classId === classId);
        if (!schedule || schedule.slots.length === 0) return null;
        const weekdays = schedule.slots.map(s => s.weekday);
        // aujourd'hui est-il un jour de classe ?
        const [y, m, d] = today.split('-').map(Number);
        const todayWeekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
        if (weekdays.includes(todayWeekday)) return "aujourd'hui";
        const next = nextSchoolDay(today, weekdays, calendar);
        if (!next) return null;
        const [ny, nm, nd] = next.split('-').map(Number);
        return weekdayLabel(new Date(Date.UTC(ny, nm - 1, nd)).getUTCDay());
    };

    return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(var(--accent)),transparent_34rem)] p-3 pb-8 touch-manipulation safe-bottom sm:p-8" data-dashboard-root>
            <header className="relative mx-auto mb-8 max-w-5xl rounded-3xl border border-border bg-card/75 p-6 text-center shadow-sm backdrop-blur sm:mb-10 sm:p-8">
                {teacherName ? (
                    <>
                        {/* Mobile: court */}
                        <h1 className="sm:hidden text-2xl font-extrabold text-foreground font-slab">
                            Bienvenue M. {teacherName}
                        </h1>
                        <p className="sm:hidden mt-1 text-muted-foreground text-sm font-medium">
                            Inspirez, simplifiez, progressez — visons +110% d’impact aujourd’hui.
                        </p>
                        {/* Desktop: concis */}
                        <h1 className="hidden sm:block text-3xl sm:text-4xl font-extrabold text-foreground font-slab">
                            Bienvenue M. {teacherName} — Espace pédagogique
                        </h1>
                        <p className="hidden sm:block mt-2 text-muted-foreground text-base font-medium">
                            Objectif du jour: inspirer vos élèves et gagner en efficacité — +110% d’impact.
                        </p>
                    </>
                ) : (
                    <>
                        {/* Mobile: très court */}
                        <h1 className="sm:hidden text-2xl font-extrabold text-foreground font-slab">Espace pédagogique</h1>
                        <p className="sm:hidden mt-1 text-muted-foreground text-sm font-medium">
                            Inspirez vos élèves, simplifiez vos cours, visez +110%.
                        </p>
                        {/* Desktop */}
                        <h1 className="hidden sm:block text-3xl sm:text-4xl font-extrabold text-foreground font-slab">Votre Espace Pédagogique</h1>
                        <p className="hidden sm:block mt-2 text-muted-foreground text-base font-medium">
                            Enseignez avec clarté et impact — allons au-delà de 110% aujourd’hui.
                        </p>
                    </>
                )}
                <div className="absolute top-0 right-0 flex items-center gap-2">
                    <Button
                        variant="icon"
                        size="lg"
                        onClick={() => setGuideOpen(true)}
                        data-tippy-content="Aide"
                        aria-label="Ouvrir l'aide"
                        data-guide="help"
                    >
                        <CircleHelp className="h-6 w-6" />
                    </Button>
                    <Button
                        variant="icon"
                        size="lg"
                        onClick={onOpenSettings}
                        data-tippy-content="Paramètres"
                        aria-label="Ouvrir les paramètres"
                        data-guide="settings"
                        className={needsConfiguration ? 'animate-pulse-glow' : ''}
                    >
                        <Settings className="h-6 w-6" />
                    </Button>
                </div>
            </header>
            <main>
            <LatenessBanner classes={classes} config={config} />
            <AssessmentBanner classes={classes} config={config} />
            {/* Sélecteur de cycle — MASQUÉ en production (les cycles viennent de
                l'inscription) ; en local sans compte, affiché si plusieurs cycles. */}
            {!showAllClasses && (
            <div className={`w-full flex justify-center mb-5 sm:mb-6 ${((config.selectedCycles?.length ?? 0) === 1 && !config.showAllCycles) ? 'hidden' : ''}`}>
                <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm">
                {([
                    { key: 'college', label: 'Collège' },
                    { key: 'lycee', label: 'Lycée' },
                    { key: 'prepa', label: 'Prépa' },
                ] as {key: Cycle; label: string;}[])
                    .filter(opt => config.showAllCycles || !config.selectedCycles?.length || config.selectedCycles.includes(opt.key))
                    .map(opt => (
                    <button
                        key={opt.key}
                        onClick={() => !isClassesLoading && setSelectedCycle(opt.key)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                            selectedCycle === opt.key
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                        aria-pressed={selectedCycle === opt.key}
                        disabled={isClassesLoading}
                    >
                        {opt.label}
                    </button>
                ))}
                </div>
            </div>
            )}


            <div className="mx-auto mt-4 grid max-w-5xl grid-cols-1 gap-4 px-1 sm:mt-8 sm:grid-cols-2 sm:px-2 md:grid-cols-3">
                        {/* Create new class first */}
                        <AddClassCard onClick={() => setCreateModalOpen(true)} />
                        {/* Classes affichées : toutes (production) ou du cycle actif (local sans onglets) */}
                        {classes
                            .filter(c => showAllClasses || (c.cycle || 'college') === selectedCycle)
                            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                            .map(classInfo => (
                                <ClassCard
                                    key={classInfo.id}
                                    classInfo={classInfo}
                                    lastModified={lastModifiedDates[classInfo.id]}
                                    nextSessionLabel={nextSessionLabel(classInfo.id)}
                                    onSelect={() => onSelectClass(classInfo)}
                                    onDelete={() => deleteClass(classInfo.id)}
                                />
                            ))
                        }

                    </div>
            </main>
            <CreateClassModal
                isOpen={isCreateModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onCreate={handleCreateClass}
                defaultTeacherName={config.defaultTeacherName}
                defaultCycle={selectedCycle}
                teacherSubjects={config.selectedSubjects}
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
