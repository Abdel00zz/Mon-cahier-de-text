import React, { Suspense, lazy, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useClassManager } from '@/hooks/useClassManager';
import { defaultNotificationSettings, useConfigManager } from '@/hooks/useConfigManager';
import { useOptimizedLocalStorage } from '@/hooks/useOptimizedLocalStorage';
import { DashboardSkeleton } from '@/components/ui/PageSkeleton';
import { Button } from '@/components/ui/button';
import { ClassCard } from './ClassCard';
import { ClassListItem } from './ClassListItem';
import { CreateClassModal } from './modals/CreateClassModal';
import { OnboardingModal } from './modals/OnboardingModal';
import { ClassInfo, Cycle } from '@/types';
import { getBundledCalendar } from '@/utils/calendar';
import { withAbsences } from '@/utils/lateness';
import { nextSessionInfoForClass, deriveSchedules } from '@/utils/timetable';
import { ChevronDown, Plus, CalendarCheck, BookOpen } from '@/components/ui/icons';
import { migrateLessonsData } from '@/utils/dataUtils';
import { useLocale } from '@/i18n/LocaleProvider';

const GuideModal = lazy(() => import('@/features/guide/GuideModal').then(module => ({ default: module.GuideModal })));

interface DashboardProps {
    onSelectClass: (classInfo: ClassInfo) => void;
    onOpenEvaluations?: () => void;
}

type ClassDisplayMode = 'list' | 'single' | 'double' | 'triple';

const CLASS_DISPLAY_OPTIONS: ClassDisplayMode[] = ['list', 'single', 'double', 'triple'];

/** Salutation selon l'heure, petite touche vivante, esprit app mobile. */
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
    onOpenEvaluations,
}) => {
    const { locale, t, isRtl } = useLocale();
    const { classes, addClass, deleteClass, updateClass, isLoading: isClassesLoading } = useClassManager();
    const { config, updateConfig, isLoading: isConfigLoading } = useConfigManager();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
    const [isOnboardingOpen, setOnboardingOpen] = useState(false);
    const [lastModifiedDates, setLastModifiedDates] = useState<Record<string, string | null>>({});
    const { value: selectedCycle, setValue: setSelectedCycle } = useOptimizedLocalStorage<Cycle>('selected_cycle_v1', 'college', 100);
    const { value: classDisplayMode, setValue: setClassDisplayMode } = useOptimizedLocalStorage<ClassDisplayMode>('dashboard_class_display_v1', 'double', 100);
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
    const calendarWithAbsences = withAbsences(calendar, config.absences);
    const nextSession = (classId: string) =>
        nextSessionInfoForClass(
            classId,
            config.timetable,
            config.schedules?.find(s => s.classId === classId)?.slots.map(s => s.weekday) ?? [],
            calendarWithAbsences,
            locale,
        );

    const visibleClasses = [...classes]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const filteredClasses = visibleClasses.filter(c => {
        if (cycleFilter !== 'all' && c.cycle !== cycleFilter) return false;
        return true;
    });

    const currentDisplay = CLASS_DISPLAY_OPTIONS.includes(classDisplayMode) ? classDisplayMode : 'double';
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
        <div className="min-h-screen bg-transparent text-foreground antialiased dark:bg-zinc-950 pb-20 sm:pb-8" data-dashboard-root>
            <div className="relative min-w-0 overflow-x-clip" data-dashboard-main>
                <div className="relative z-10 mx-auto max-w-[1440px] px-4 py-5 sm:px-7 sm:py-7 lg:px-10">
                    <header className="mb-8 space-y-4" id="dashboard-header">
                        <div className="flex items-center gap-3">
                            <div className="min-w-0 shrink-0">
                                <p className={`mb-0.5 text-[10px] font-bold text-muted-foreground ${isRtl ? 'font-ar tracking-normal' : 'uppercase tracking-[0.14em]'}`}>{t('dashboard.teacherSpace')}</p>
                                <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-2xl">
                                    {teacherName ? (
                                        <>
                                            <span className="font-medium">{getGreeting(locale)}{locale === 'ar' ? '،' : ','}</span>{' '}
                                            <span className="text-primary">{teacherName}</span>
                                        </>
                                    ) : (
                                        <span>{t('dashboard.notebook')}</span>
                                    )}
                                </h1>
                            </div>
                        </div>

                        {classes.length > 0 && availableCycles.length > 1 && (
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                <button
                                    type="button"
                                    onClick={() => setCycleFilter('all')}
                                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                        cycleFilter === 'all'
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'border border-border/65 bg-card/80 text-muted-foreground shadow-2xs hover:border-primary/20 hover:text-foreground dark:bg-zinc-900'
                                    }`}
                                >
                                    {t('dashboard.filterAll')}
                                </button>
                                {availableCycles.map(c => {
                                    return (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setCycleFilter(c)}
                                            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                                                cycleFilter === c
                                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                                    : 'border border-border/65 bg-card/80 text-muted-foreground shadow-2xs hover:border-primary/20 hover:text-foreground dark:bg-zinc-900'
                                            }`}
                                        >
                                            {t(`cycle.${c}`)}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </header>

                    <main>
                        <section className="w-full" aria-labelledby="classes-heading">
                            <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2.5">
                                    <h2 id="classes-heading" className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                                        <span>{t('dashboard.classes')}</span>
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
                                            aria-label={t('dashboard.evaluations')}
                                            title={t('dashboard.evaluations')}
                                        >
                                            <CalendarCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span className="hidden sm:inline text-xs">{t('dashboard.evaluations')}</span>
                                        </Button>
                                    )}

                                    <Button
                                        type="button"
                                        onClick={() => setCreateModalOpen(true)}
                                        className="h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-full bg-primary hover:bg-primary/90 active:bg-primary/85 text-primary-foreground font-bold text-xs flex items-center gap-1 sm:gap-1.5 shadow-2xs hover:shadow-xs transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
                                        aria-label={t('dashboard.addClass')}
                                        title={t('dashboard.addClass')}
                                    >
                                        <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                                        <span>{t('dashboard.classShort')}</span>
                                    </Button>

                                    {classes.length > 0 && (
                                        <div ref={displayMenuRef} className="relative shrink-0 hidden sm:block">
                                            <button
                                                type="button"
                                                onClick={() => setDisplayMenuOpen(open => !open)}
                                                aria-haspopup="menu"
                                                aria-expanded={isDisplayMenuOpen}
                                                className="flex h-8 sm:h-8.5 items-center gap-2 rounded-full bg-card/85 px-3 text-xs font-semibold text-foreground shadow-2xs hover:border-primary/20 active:scale-[0.98] border border-border/70"
                                            >
                                                <span>{displayCopy(currentDisplay).label}</span>
                                                <ChevronDown className={`h-3 w-3 text-zinc-400 transition-transform ${isDisplayMenuOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isDisplayMenuOpen && (
                                                <div
                                                    role="menu"
                                                    className={`absolute top-[calc(100%+0.4rem)] z-30 w-44 overflow-hidden rounded-[16px] border border-border/70 bg-popover/95 p-2 shadow-[0_16px_40px_rgba(30,64,110,0.12)] backdrop-blur-xl dark:bg-zinc-800 ${isRtl ? 'left-0' : 'right-0'}`}
                                                >
                                                    {CLASS_DISPLAY_OPTIONS.map(option => {
                                                        const isActive = option === classDisplayMode;
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
                                                                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors ${isActive ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-muted-foreground dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-white'}`}
                                                            >
                                                                <span className="text-[12px] font-bold">{displayCopy(option).label}</span>
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
                                    <div className="flex flex-col items-center gap-4 rounded-[22px] border border-border/65 bg-card/86 px-6 py-12 text-center shadow-[0_16px_44px_rgba(30,64,110,0.06)] backdrop-blur-sm">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                                            <BookOpen className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-zinc-900 dark:text-white">{t('dashboard.emptyTitle')}</h3>
                                            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
                                                {t('dashboard.emptyDescription')}
                                            </p>
                                            </div>
                                            <Button onClick={() => setOnboardingOpen(true)} className="mt-4 h-10 rounded-xl bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/90">
                                            {t('dashboard.addClass')}
                                        </Button>
                                    </div>
                                ) : classDisplayMode === 'list' ? (
                                    <div className="space-y-3" role="list" aria-label={t('dashboard.classList')}>
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
                existingClasses={classes}
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
