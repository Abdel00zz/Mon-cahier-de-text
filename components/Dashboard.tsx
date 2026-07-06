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
import { Plus, CircleHelp, Settings, TrendingUp } from './ui/icons';
import { AUTH_REQUIRED } from '../config/features';
import { restoreBackup } from '../utils/backup';

const GuideModal = lazy(() => import('./modals/GuideModal').then(module => ({ default: module.GuideModal })));

interface DashboardProps {
    onSelectClass: (classInfo: ClassInfo) => void;
    onOpenSettings: () => void;
}

const getInitials = (name: string): string => {
    if (!name) return "PE";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return "PE";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const AddClassCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <Card
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
        data-guide="create-class"
        className="group flex min-h-[140px] flex-col w-full cursor-pointer items-center justify-center rounded-[20px] border-2 border-dashed border-[#E4D3AC]/80 bg-[#FFFDF7]/50 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#B8935A]/60 hover:bg-[#FFFDF7] hover:shadow-md active:translate-y-0 select-none will-change-transform"
        aria-label="Créer une nouvelle classe"
    >
        <CardContent className="flex flex-col items-center justify-center p-4 text-center gap-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FCF6EA] text-[#B8935A] border border-[#E4D3AC]/40 shadow-sm transition-all duration-300 group-hover:bg-[#B8935A] group-hover:text-white group-hover:scale-105 mb-1">
                <Plus className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-[#2B241D] font-display group-hover:text-[#B8935A] transition-colors">Nouvelle classe</h3>
            <p className="text-[11px] text-[#69604F]/70 font-semibold font-sans">Créer un nouveau cahier</p>
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
    const { classes, addClass, deleteClass, updateClass, isLoading: isClassesLoading } = useClassManager();
    const { config, updateConfig, isLoading: isConfigLoading } = useConfigManager();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
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
    const formattedDate = (() => {
        try {
            const [y, m, d] = today.split('-').map(Number);
            const date = new Date(Date.UTC(y, m - 1, d));
            return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
        } catch {
            return '';
        }
    })();

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

    const initials = getInitials(teacherName);

    return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,hsl(var(--accent)),transparent_34rem)] p-3 pb-8 touch-manipulation safe-bottom sm:p-8" data-dashboard-root>
            <header className="relative mx-auto mb-6 sm:mb-8 max-w-5xl px-3 sm:px-4" id="dashboard-header">
                <div className="flex items-center justify-between border-b border-[#E4D3AC]/30 pb-5 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Elegant Circular Avatar */}
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#B8935A]/10 border border-[#B8935A]/30 text-[#B8935A] font-extrabold text-sm shadow-inner font-sans tracking-wide">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-lg sm:text-2xl font-extrabold text-[#2B241D] font-display tracking-tight leading-none truncate">
                                {teacherName ? teacherName : "Mon Espace"}
                            </h1>
                            <div className="flex items-center gap-x-2 text-[11px] text-[#69604F]/90 font-semibold font-sans mt-1">
                                {config.establishmentName && config.establishmentName.trim() !== teacherName ? (
                                    <span className="text-[#B8935A] font-bold truncate max-w-[120px] sm:max-w-none">{config.establishmentName.trim()}</span>
                                ) : (
                                    <span>Cahier de Textes</span>
                                )}
                                {formattedDate && (
                                    <>
                                        <span className="text-[#E4D3AC]/60 select-none">•</span>
                                        <span className="text-[#69604F]/70 capitalize truncate">{formattedDate.split(' ').slice(0, 3).join(' ')}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    {/* Compact actions - circular buttons on mobile, pill buttons on desktop */}
                    <div className="flex items-center gap-2 shrink-0">
                        <button 
                            onClick={() => setGuideOpen(true)} 
                            className="flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center gap-1.5 sm:px-3.5 sm:py-1.5 rounded-full bg-[#FFFDF7] border border-[#E4D3AC]/70 text-[#69604F] hover:bg-[#FCF6EA] hover:text-[#2B241D] transition-all shadow-sm active:scale-95 cursor-pointer font-sans text-xs font-bold"
                            title="Consulter le guide d'utilisation"
                        >
                            <CircleHelp className="h-4 w-4 text-[#B8935A]" />
                            <span className="hidden sm:inline">Guide</span>
                        </button>
                        <button 
                            onClick={onOpenSettings} 
                            className="flex h-9 w-9 sm:h-auto sm:w-auto items-center justify-center gap-1.5 sm:px-3.5 sm:py-1.5 rounded-full bg-[#FFFDF7] border border-[#E4D3AC]/70 text-[#69604F] hover:bg-[#FCF6EA] hover:text-[#2B241D] transition-all shadow-sm active:scale-95 cursor-pointer font-sans text-xs font-bold"
                            title="Accéder aux réglages"
                        >
                            <Settings className="h-4 w-4 text-[#69604F]" />
                            <span className="hidden sm:inline">Réglages</span>
                        </button>
                    </div>
                </div>
            </header>
            <main>
            <LatenessBanner classes={classes} config={config} />
            <AssessmentBanner classes={classes} config={config} />
            {/* Sélecteur de cycle — MASQUÉ en production (les cycles viennent de
                l'inscription) ; en local sans compte, affiché si plusieurs cycles. */}
            {!showAllClasses && (
            <div className={`w-full flex justify-center mb-5 sm:mb-6 ${((config.selectedCycles?.length ?? 0) === 1 && !config.showAllCycles) ? 'hidden' : ''}`}>
                <div className="inline-flex items-center gap-1 rounded-xl border border-[#E4D3AC] bg-[#FFFDF7] p-1 shadow-sm">
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
                                ? 'bg-primary text-primary-foreground shadow-sm font-sans'
                                : 'text-[#69604F] hover:bg-accent hover:text-accent-foreground font-sans'
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

            <div className="mx-auto max-w-5xl px-3 sm:px-4">
                <h2 className="text-lg font-bold font-display text-[#2B241D] mb-3.5">Mes Classes</h2>
                <div className="grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-2 md:grid-cols-3">
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
                                    onConfigure={() => setEditingClass(classInfo)}
                                />
                            ))
                        }
                </div>
            </div>
            </main>
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
