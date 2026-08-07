import React, { Suspense, lazy, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useClassManager } from '@/hooks/useClassManager';
import { useIsMobile } from '@/hooks/useIsMobile';
import { IOSSearchBar } from '@/components/ui/IOSComponents';
import { defaultNotificationSettings, useConfigManager } from '@/hooks/useConfigManager';
import { useOptimizedLocalStorage } from '@/hooks/useOptimizedLocalStorage';
import { DashboardSkeleton } from '@/components/ui/PageSkeleton';
import { Button } from '@/components/ui/button';
import { ClassCard } from './ClassCard';
import { ClassListItem } from './ClassListItem';
import { CreateClassModal } from './modals/CreateClassModal';
import { OnboardingModal } from './modals/OnboardingModal';
import { ClassInfo, Cycle } from '@/types';
import { formatClassDisplayName } from '@/constants';
import { getBundledCalendar, todayInMorocco } from '@/utils/calendar';
import { withAbsences } from '@/utils/lateness';
import { nextSessionInfoForClass, deriveSchedules } from '@/utils/timetable';
import { ChevronDown, Plus, Settings, CalendarCheck, BookOpen, Clock, Search, Bell, CircleHelp } from '@/components/ui/icons';
import { migrateLessonsData } from '@/utils/dataUtils';
import { useLocale } from '@/i18n/LocaleProvider';

const GuideModal = lazy(() => import('@/features/guide/GuideModal').then(module => ({ default: module.GuideModal })));

interface DashboardProps {
    onSelectClass: (classInfo: ClassInfo) => void;
    onOpenSettings: () => void;
    onOpenNotifications?: () => void;
    onOpenEvaluations?: () => void;
    onOpenGuide?: () => void;
    notificationsCount?: number;
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

export const Dashboard: React.FC<DashboardProps> = ({
    onSelectClass,
    onOpenSettings,
    onOpenNotifications,
    onOpenEvaluations,
    onOpenGuide,
    notificationsCount = 0,
}) => {
    const { locale, t } = useLocale();
    const { classes, addClass, deleteClass, updateClass, isLoading: isClassesLoading } = useClassManager();
    const { config, updateConfig, isLoading: isConfigLoading } = useConfigManager();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
    const [isOnboardingOpen, setOnboardingOpen] = useState(false);
    const [lastModifiedDates, setLastModifiedDates] = useState<Record<string, string | null>>({});
    const { value: selectedCycle, setValue: setSelectedCycle } = useOptimizedLocalStorage<Cycle>('selected_cycle_v1', 'college', 100);
    const { value: classDisplayMode, setValue: setClassDisplayMode } = useOptimizedLocalStorage<ClassDisplayMode>('dashboard_class_display_v1', 'double', 100);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [cycleFilter, setCycleFilter] = useState<string>('all');
    const [isDisplayMenuOpen, setDisplayMenuOpen] = useState(false);
    const displayMenuRef = useRef<HTMLDivElement>(null);

    const isLoading = isClassesLoading || isConfigLoading;

    useEffect(() => {
        if (isClassesLoading) return;

        const dates: Record<string, string | null> = {};
        classes.forEach(classInfo => {
            const lessons = readLessons(classInfo.id);
            dates[classInfo.id] = findLatestDate(lessons);
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

    useEffect(() => {
        if (isConfigLoading) return;
        const preferred = config.selectedCycles?.[0] as Cycle | undefined;
        if (preferred && !config.selectedCycles?.includes(selectedCycle)) {
            setSelectedCycle(preferred);
        }
    }, [isConfigLoading, config.selectedCycles, selectedCycle, setSelectedCycle]);

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
                enabled: true,
                sessionVibration: true,
            },
        });
    }, [config.notificationSettings, updateConfig]);

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
            patch.schedules = deriveSchedules(nextTimetable);
        }
        if (Object.keys(patch).length > 0) updateConfig(patch);
    }, [deleteClass, config.assessmentDates, config.assessmentAbsences, config.pedagogicalEvents, config.timetable, updateConfig]);

    const availableCycles = useMemo(() => {
        const set = new Set<string>();
        classes.forEach(c => { if (c.cycle) set.add(c.cycle); });
        return Array.from(set);
    }, [classes]);

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

    const calendarWithAbsences = withAbsences(calendar, config.absences);
    const nextSession = (classId: string) =>
        nextSessionInfoForClass(
            classId,
            config.timetable,
            config.schedules?.find(s => s.classId === classId)?.slots.map(s => s.weekday) ?? [],
            calendarWithAbsences,
        );

    const todaysSessions = classes
        .map(c => ({ classInfo: c, session: nextSession(c.id) }))
        .filter(item => item.session && (item.session.kind === 'now' || item.session.kind === 'today'));

    const visibleClasses = [...classes]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const filteredClasses = visibleClasses.filter(c => {
        if (cycleFilter !== 'all' && c.cycle !== cycleFilter) return false;
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return c.name.toLowerCase().includes(q) || (c.subject && c.subject.toLowerCase().includes(q));
    });

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

    return (
        <div className="min-h-screen bg-[#F4F6F8] text-foreground antialiased dark:bg-zinc-950 pb-20 sm:pb-8" data-dashboard-root>
            <div className="relative min-w-0 overflow-x-clip" data-dashboard-main>
                <div className="relative z-10 mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
                    <header className="mb-6 sm:mb-8" id="dashboard-header">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight text-zinc-900 dark:text-white leading-tight">
                                    {teacherName ? (
                                        <>
                                            <span className="font-medium">{getGreeting(locale)},</span>{' '}
                                            <span className="font-itim text-primary text-3xl ml-1">{teacherName}</span>
                                        </>
                                    ) : (
                                        <span>{t('dashboard.classes')}</span>
                                    )}
                                </h1>
                            </div>
                        </div>

                        {classes.length > 0 && (isSearchOpen || availableCycles.length > 1) && (
                            <div className="mt-8 space-y-6">
                                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-2 rounded-2xl shadow-sm border-0">
                                    {isSearchOpen && (
                                        <div className="flex-1 min-w-0 animate-in fade-in slide-in-from-top-2">
                                            <IOSSearchBar
                                                value={searchQuery}
                                                onChange={setSearchQuery}
                                                placeholder="Rechercher une classe, une matière..."
                                            />
                                        </div>
                                    )}

                                    {availableCycles.length > 1 && (
                                        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setCycleFilter('all')}
                                                className={`px-4 py-2 text-[13px] font-bold rounded-xl transition-all ${
                                                    cycleFilter === 'all'
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                        : 'text-zinc-500 hover:text-zinc-900'
                                                }`}
                                            >
                                                Toutes
                                            </button>
                                            {availableCycles.map(c => {
                                                const labels: Record<string, string> = { college: 'Collège', lycee: 'Lycée', prepa: 'Prépa' };
                                                return (
                                                    <button
                                                        key={c}
                                                        type="button"
                                                        onClick={() => setCycleFilter(c)}
                                                        className={`px-4 py-2 text-[13px] font-bold rounded-xl transition-all ${
                                                            cycleFilter === c
                                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                                : 'text-zinc-500 hover:text-zinc-900'
                                                        }`}
                                                    >
                                                        {labels[c] || c}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </header>

                    <main>
                        <section className="mt-6 w-full" aria-labelledby="classes-heading">
                            <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2.5">
                                    <h2 id="classes-heading" className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                                        <span>Mes Classes</span>
                                        {filteredClasses.length > 0 && (
                                            <span className="text-zinc-400 dark:text-zinc-500 font-medium text-sm">
                                                ({filteredClasses.length})
                                            </span>
                                        )}
                                    </h2>
                                </div>

                                <div className="flex items-center gap-2">
                                    {onOpenEvaluations && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={onOpenEvaluations}
                                            className="h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-full bg-card text-foreground hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 border border-border font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-[0.98]"
                                            aria-label="Évaluations & Devoirs"
                                            title="Évaluations & Devoirs"
                                        >
                                            <CalendarCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span className="hidden sm:inline text-xs">Évaluations</span>
                                        </Button>
                                    )}

                                    <Button
                                        type="button"
                                        onClick={() => setCreateModalOpen(true)}
                                        className="h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-full bg-[#007AFF] hover:bg-[#0062D6] active:bg-[#0052B3] text-white font-bold text-xs flex items-center gap-1 sm:gap-1.5 shadow-2xs hover:shadow-xs transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
                                        aria-label="Ajouter une classe"
                                        title="Ajouter une classe"
                                    >
                                        <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                                        <span>Classe</span>
                                    </Button>

                                    {classes.length > 0 && (
                                        <div ref={displayMenuRef} className="relative shrink-0 hidden sm:block">
                                            <button
                                                type="button"
                                                onClick={() => setDisplayMenuOpen(open => !open)}
                                                aria-haspopup="menu"
                                                aria-expanded={isDisplayMenuOpen}
                                                className="flex h-8 sm:h-8.5 items-center gap-2 rounded-full bg-white px-3 text-xs font-semibold text-muted-foreground shadow-sm hover:text-zinc-900 active:scale-[0.98] bg-card text-foreground border border-border"
                                            >
                                                <span>{displayCopy(currentDisplay.value).label}</span>
                                                <ChevronDown className={`h-3 w-3 text-zinc-400 transition-transform ${isDisplayMenuOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isDisplayMenuOpen && (
                                                <div
                                                    role="menu"
                                                    className="absolute right-0 top-[calc(100%+0.4rem)] z-30 w-44 overflow-hidden rounded-[16px] bg-white p-2 shadow-lg dark:bg-zinc-800 border-0"
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
                                                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${isActive ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-muted-foreground dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-white'}`}
                                                            >
                                                                <span className="text-[12px] font-bold">{displayCopy(option.value).label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                                {classes.length === 0 ? (
                                    <div className="flex flex-col items-center gap-4 rounded-[24px] bg-white px-6 py-12 text-center shadow-sm bg-card">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                            <BookOpen className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Créez vos classes</h3>
                                            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
                                                Commencez par ajouter vos classes pour organiser votre emploi du temps et vos cahiers de textes.
                                            </p>
                                        </div>
                                        <Button onClick={() => setOnboardingOpen(true)} className="mt-4 h-10 rounded-xl px-6 font-bold bg-[#007AFF] hover:bg-[#0062D6] text-white">
                                            Commencer
                                        </Button>
                                    </div>
                                ) : classDisplayMode === 'list' ? (
                                    <div className="space-y-3" role="list" aria-label="Liste des cahiers">
                                        {filteredClasses.map((classInfo, index) => (
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
                                    </div>
                                ) : (
                                    <div className={`grid ${classGridClass} gap-3 sm:gap-4`}>
                                        {filteredClasses.map((classInfo, index) => (
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

