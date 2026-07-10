import React, { Suspense, lazy, useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useClassManager } from '../hooks/useClassManager';
import { useConfigManager } from '../hooks/useConfigManager';
import { useOptimizedLocalStorage } from '../hooks/useOptimizedLocalStorage';
import { DashboardSkeleton } from './ui/PageSkeleton';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { ClassCard } from './ClassCard';
import { DashboardStats } from './DashboardStats';
import { OnboardingGuide } from './OnboardingGuide';
import { CreateClassModal } from './modals/CreateClassModal';
import { ImportPlatformModal } from './modals/ImportPlatformModal';
import { ClassInfo, Cycle } from '../types';
import { logger } from '../utils/logger';
import { getBundledCalendar, todayInMorocco } from '../utils/calendar';
import { withAbsences } from '../utils/lateness';
import { nextSessionInfoForClass } from '../utils/timetable';
// Session assistant imports removed
import { Badge } from './ui/badge';
import { Plus, BookOpen, Settings, CircleHelp } from './ui/icons';
import { Leaf, Sun } from 'lucide-react';
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
    return (
        <button
            onClick={onClick}
            data-guide="create-class"
            className="group relative flex h-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[2.5rem] bg-[#fdfbf7] p-8 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_60px_-15px_rgba(82,121,111,0.15)] border-2 border-dashed border-[#cad2c5] hover:border-[#84a98c] hover:bg-white w-full focus:outline-none focus:ring-4 focus:ring-[#84a98c]/20 text-center"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-[#e8f0ec]/0 to-[#f4f1ea]/0 transition-colors duration-700 group-hover:from-[#e8f0ec]/50 group-hover:to-[#f4f1ea]/50"></div>
            
            <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-[#f4f1ea] border-2 border-[#e8e4d9] text-[#84a98c] transition-all duration-500 group-hover:scale-110 group-hover:rotate-90 group-hover:bg-[#fff3ec] group-hover:text-[#e76f51] group-hover:border-[#ffd6c2] shadow-sm mb-6">
                <Plus className="w-8 h-8" />
            </div>
            <div className="relative z-10">
                <span className="block text-2xl font-black text-[#52796f] transition-colors group-hover:text-[#2f3e46] font-display">Nouveau cahier</span>
                <span className="block text-[15px] font-semibold text-[#84a98c] mt-2">Créer un cahier de textes</span>
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
    const { config, isLoading: isConfigLoading } = useConfigManager();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
    const [isImportModalOpen, setImportModalOpen] = useState(false);
    const [isGuideOpen, setGuideOpen] = useState(false);
    const [lastModifiedDates, setLastModifiedDates] = useState<Record<string, string | null>>({});
    const { value: selectedCycle, setValue: setSelectedCycle } = useOptimizedLocalStorage<Cycle>('selected_cycle_v1', 'college', 100);
    // Session assistant features were cleaned up and removed

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

    // overflow-x-clip : masque le débordement horizontal (lucioles) sans créer
    // de conteneur de scroll — `hidden` forcerait overflow-y:auto et casserait
    // tout `position: sticky` descendant (même piège que corrigé dans App).
    return (
        <div className="min-h-screen bg-background text-foreground antialiased relative overflow-x-clip" data-dashboard-root>
            {/* Éléments magiques flottants (Lucioles/Poussières) */}
            <div className="firefly w-6 h-6 top-[10%] left-[15%]" style={{ animationDelay: '0s' }}></div>
            <div className="firefly w-4 h-4 top-[20%] right-[20%]" style={{ animationDelay: '2s' }}></div>
            <div className="firefly w-8 h-8 top-[40%] left-[5%]" style={{ animationDelay: '4s' }}></div>
            <div className="firefly w-5 h-5 top-[60%] right-[10%]" style={{ animationDelay: '1s' }}></div>
            <div className="firefly w-3 h-3 top-[80%] left-[25%]" style={{ animationDelay: '3s' }}></div>

            <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
                <header className="mb-12 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6" id="dashboard-header">
                    <div>
                        <h1 className="text-4xl sm:text-5xl font-black text-[#2f3e46] tracking-tight font-display">
                            {getGreeting()}, <span className="text-[#52796f]">{teacherName}</span>
                        </h1>
                        <p className="text-[15px] font-semibold text-[#52796f] mt-2 flex items-center gap-2">
                            <Sun className="w-4 h-4 text-[#e76f51]" />
                            {formattedDate ? `Nous sommes le ${formattedDate}, une belle journée pour apprendre.` : "Une belle journée pour apprendre."}
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={() => setGuideOpen(true)} 
                            className="flex items-center gap-2 px-5 py-3 text-[14px] font-bold text-[#84a98c] bg-white rounded-full border border-[#e8e4d9] hover:bg-[#f4f1ea] hover:text-[#52796f] transition-all shadow-sm group"
                            title="Consulter le guide d'utilisation"
                        >
                            <CircleHelp className="h-4 w-4 group-hover:scale-110 transition-transform" />
                            Guide
                        </button>
                        <button
                            onClick={onOpenSettings} 
                            className="flex items-center gap-2 px-5 py-3 text-[14px] font-bold text-[#84a98c] bg-white rounded-full border border-[#e8e4d9] hover:bg-[#f4f1ea] hover:text-[#52796f] transition-all shadow-sm group"
                            title="Accéder aux réglages"
                        >
                            <Settings className="h-4 w-4 group-hover:rotate-90 transition-transform duration-500" />
                            Réglages
                        </button>
                    </div>
                </header>
                <main>
            {/* Installation PWA : AUCUNE bannière applicative — beforeinstallprompt
                n'est pas intercepté, le navigateur affiche sa propre invite native
                (mini-infobar Android, icône d'installation dans l'omnibox). */}
            {/* Comme en production : les cycles viennent du compte — toutes les
                classes du professeur sont affichées ensemble, sans onglets. */}

            {/* Cartes statistiques : branchées aux mêmes classes que la grille */}
            <DashboardStats classes={classes} config={config} />

            <div className="w-full">
                {(() => {
                    const visibleClasses = [...classes]
                        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                    return (
                        <>
                            <div className="flex items-center gap-4 mb-6">
                                <h2 className="text-2xl font-extrabold text-[#2f3e46]">Mes Cahiers de Textes</h2>
                                {visibleClasses.length > 0 && (
                                    <span className="px-3 py-1 bg-[#cad2c5] text-[#2f3e46] text-sm font-bold rounded-full">
                                        {visibleClasses.length}
                                    </span>
                                )}
                            </div>

                            {visibleClasses.length === 0 ? (
                                /* État vide motivant : premier pas guidé */
                                <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-primary/20 surface-art px-6 py-10 text-center animate-slide-in-up">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--mint-wash)_/_0.45)] text-primary">
                                        <Plus className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-extrabold font-display text-foreground">Créez votre première classe</h3>
                                        <p className="mt-1 text-xs font-semibold text-muted-foreground">
                                            Votre cahier de textes numérique commence ici.
                                        </p>
                                    </div>
                                    <Button onClick={() => setCreateModalOpen(true)} data-guide="create-class" className="mt-1 h-11 rounded-full px-6 font-bold shadow-md shadow-primary/20">
                                        Nouvelle classe
                                    </Button>
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
            <ImportPlatformModal
                isOpen={isImportModalOpen}
                onClose={() => setImportModalOpen(false)}
                onImport={handleImportPlatform}
            />
            {/* Guide d'accueil interactif — pas pendant la création de classe */}
            <OnboardingGuide enabled={!isCreateModalOpen} />
        </div>
    );
};
