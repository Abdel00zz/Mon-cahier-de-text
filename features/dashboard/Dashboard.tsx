import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useClassManager } from '@/hooks/useClassManager';
import { defaultNotificationSettings, useConfigManager } from '@/hooks/useConfigManager';
import { useOptimizedLocalStorage } from '@/hooks/useOptimizedLocalStorage';
import { useDevice } from '@/hooks/useDevice';
import { DashboardSkeleton } from '@/components/ui/PageSkeleton';
import { Button } from '@/components/ui/button';
import { ClassCard } from './ClassCard';
import { ClassListItem } from './ClassListItem';
import { CreateClassModal } from './modals/CreateClassModal';
import { OnboardingPage } from './OnboardingPage';
import { ClassNotificationsModal } from './modals/ClassNotificationsModal';
import { ClassInfo, Cycle } from '@/types';
import { getBundledCalendar, localizeCalendarName, todayInMorocco } from '@/utils/calendar';
import { formatLocalizedSubjectDisplayName } from '@/constants';
import { daysBetweenISO } from '@/utils/assessments';
import { withAbsences } from '@/utils/lateness';
import { nextSessionInfoForClass, deriveSchedules } from '@/utils/timetable';
import { ChevronDown, Plus, BookOpen } from '@/components/ui/icons';
import { readCachedLessons } from '@/utils/notebookStorage';
import { useLocale } from '@/i18n/LocaleProvider';
import { NotificationFeed, notificationFeedForClass } from '@/hooks/useNotificationFeed';
import { useAuth } from '@/contexts/AuthContext';
import { buildSessionIndex, SessionIndex } from '@/utils/sessionIndex';

interface DashboardProps {
    onSelectClass: (classInfo: ClassInfo) => void;
    notificationFeed: NotificationFeed;
    accountTeacherName?: string;
    onOpenSchedule?: () => void;
    onOpenNotifications?: () => void;
    onOnboardingVisibilityChange?: (visible: boolean) => void;
}

type ClassDisplayMode = 'list' | 'single' | 'double';

const CLASS_DISPLAY_OPTIONS: ClassDisplayMode[] = ['list', 'single', 'double'];

/** Salutation selon l'heure, petite touche vivante, esprit app mobile. */
const getGreeting = (locale: 'fr' | 'en' | 'ar', hour: number): string => {
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

export const Dashboard: React.FC<DashboardProps> = ({
    onSelectClass,
    notificationFeed,
    accountTeacherName = '',
    onOpenSchedule,
    onOpenNotifications,
    onOnboardingVisibilityChange,
}) => {
    const { locale, t, isRtl } = useLocale();
    const { user: accountUser, completeWelcome } = useAuth();
    const { classes, addClass, deleteClass, updateClass, isLoading: isClassesLoading } = useClassManager();
    const { config, updateConfig, isLoading: isConfigLoading } = useConfigManager();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
    const [notificationClass, setNotificationClass] = useState<ClassInfo | null>(null);
    const [isOnboardingOpen, setOnboardingOpen] = useState(false);
    const [sessionIndexes, setSessionIndexes] = useState<Record<string, SessionIndex>>({});
    const { type: deviceType } = useDevice();
    const isMobile = deviceType === 'phone';
    const defaultDisplayMode: ClassDisplayMode = isMobile ? 'single' : 'double';
    const { value: selectedCycle, setValue: setSelectedCycle } = useOptimizedLocalStorage<Cycle>('selected_cycle_v1', 'college', 100);
    const { value: classDisplayMode, setValue: setClassDisplayMode } = useOptimizedLocalStorage<ClassDisplayMode>('dashboard_class_display_v1', defaultDisplayMode, 100);
    const [subjectFilter, setSubjectFilter] = useState<string>('all');
    const [isDisplayMenuOpen, setDisplayMenuOpen] = useState(false);
    const displayMenuRef = useRef<HTMLDivElement>(null);
    const [now, setNow] = useState(() => new Date());
    const sessionIndexDay = todayInMorocco(now, getBundledCalendar());
    const teacherName = (config.defaultTeacherName || accountTeacherName).trim();
    const welcomeCompleted = config.hasCompletedWelcome === true || accountUser?.hasCompletedWelcome === true;

    useEffect(() => {
        if (!CLASS_DISPLAY_OPTIONS.includes(classDisplayMode)) {
            setClassDisplayMode('double');
        }
    }, [classDisplayMode, setClassDisplayMode]);

    useEffect(() => {
        const refreshClock = () => setNow(new Date());
        const timer = window.setInterval(refreshClock, 60_000);
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
    const notificationCounts = useMemo(
        () => new Map(classes.map(classInfo => [
            classInfo.id,
            notificationFeedForClass(notificationFeed, classInfo).attentionCount,
        ])),
        [classes, notificationFeed],
    );
    useEffect(() => {
        if (isClassesLoading) return;

        const indexes: Record<string, SessionIndex> = {};
        classes.forEach(classInfo => {
            const lessons = readCachedLessons(classInfo.id);
            indexes[classInfo.id] = buildSessionIndex(lessons, sessionIndexDay);
        });
        setSessionIndexes(indexes);
    }, [classes, isClassesLoading, notificationFeed, sessionIndexDay]);

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
        try {
            await completeWelcome();
        } catch {
            // Hors ligne : hasCompletedWelcome est déjà stocké localement et
            // sera envoyé via la synchronisation dès le retour du réseau.
        }
    }, [completeWelcome, updateConfig, welcomeCompleted]);

    const completeOnboarding = useCallback(async () => {
        const current = { ...defaultNotificationSettings, ...(config.notificationSettings ?? {}) };
        updateConfig({
            hasCompletedWelcome: true,
            notificationSettings: {
                ...current,
                enabled: true,
                sessionVibration: true,
            },
        });
        setOnboardingOpen(false);
        try {
            await completeWelcome();
        } catch {
            // Même stratégie que « Plus tard » : persistance locale + sync.
        }
    }, [completeWelcome, config.notificationSettings, updateConfig]);

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

    const availableSubjects = useMemo(() => {
        const set = new Set<string>();
        classes.forEach(c => { if (c.subject) set.add(c.subject); });
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'));
    }, [classes]);

    if (isLoading) {
        return <DashboardSkeleton />;
    }

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

    const todayISO = todayInMorocco(now, calendar);
    const holidayToday = calendar.joursFeries.find(item => item.date === todayISO);
    const vacationToday = calendar.vacances.find(item => todayISO >= item.debut && todayISO <= item.fin);
    const assessmentsThisWeek = notificationFeed.assessments.filter(item => {
        const inDays = daysBetweenISO(todayISO, item.dateISO);
        return inDays >= 0 && inDays <= 6;
    }).length;
    const sessionStates = classes.map(classInfo => nextSession(classInfo.id)?.kind).filter(Boolean);
    const hasCurrentSession = sessionStates.includes('now');
    const hasSessionToday = sessionStates.includes('today');
    const localeCode = locale === 'ar' ? 'ar-MA' : locale === 'en' ? 'en-GB' : 'fr-MA';
    let currentHour = now.getHours();
    try {
        currentHour = Number(new Intl.DateTimeFormat('en-GB', {
            timeZone: calendar.fuseau,
            hour: '2-digit',
            hourCycle: 'h23',
        }).format(now));
    } catch {
        // Le fuseau local du navigateur reste un repli sûr.
    }
    const todayLabel = new Intl.DateTimeFormat(localeCode, {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: calendar.fuseau,
    }).format(now);
    const vacationResumeISO = vacationToday
        ? (() => {
            const nextDay = new Date(`${vacationToday.fin}T12:00:00Z`);
            nextDay.setUTCDate(nextDay.getUTCDate() + 1);
            const calendarResume = nextDay.toISOString().slice(0, 10);
            return config.schoolYearStart && config.schoolYearStart > vacationToday.fin
                ? config.schoolYearStart
                : calendarResume;
        })()
        : '';
    const vacationResumeLabel = vacationResumeISO
        ? new Intl.DateTimeFormat(localeCode, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${vacationResumeISO}T12:00:00Z`))
        : '';
    const timeDetailKey = currentHour < 13
        ? 'dashboard.welcome.morningDetail'
        : currentHour < 18
            ? 'dashboard.welcome.afternoonDetail'
            : 'dashboard.welcome.eveningDetail';
    const welcome: { eyebrow: string; title: string; detail: string } = (() => {
        if (classes.length === 0) {
            return {
                eyebrow: t('dashboard.welcome.startLabel'),
                title: t('dashboard.welcome.startTitle'),
                detail: t('dashboard.welcome.startDetail'),
            };
        }
        if (holidayToday) {
            return {
                eyebrow: localizeCalendarName(holidayToday.nom, locale),
                title: t('dashboard.welcome.holidayTitle'),
                detail: t('dashboard.welcome.holidayDetail'),
            };
        }
        if (vacationToday) {
            return {
                eyebrow: localizeCalendarName(vacationToday.nom, locale),
                title: '',
                detail: t('dashboard.welcome.vacationDetail', { date: vacationResumeLabel }),
            };
        }
        if (assessmentsThisWeek > 0) {
            return {
                eyebrow: t('dashboard.welcome.assessmentsLabel'),
                title: t(assessmentsThisWeek === 1 ? 'dashboard.welcome.assessmentTitleOne' : 'dashboard.welcome.assessmentTitleMany', { count: assessmentsThisWeek }),
                detail: t('dashboard.welcome.assessmentsDetail'),
            };
        }
        if (hasCurrentSession) {
            return {
                eyebrow: t('dashboard.welcome.nowLabel'),
                title: t('dashboard.welcome.nowTitle'),
                detail: t('dashboard.welcome.nowDetail'),
            };
        }
        if (hasSessionToday) {
            return {
                eyebrow: t('dashboard.welcome.todayLabel'),
                title: t('dashboard.welcome.todayTitle'),
                detail: t('dashboard.welcome.todayDetail'),
            };
        }
        return {
            eyebrow: todayLabel,
            title: '',
            detail: t(timeDetailKey),
        };
    })();
    const greeting = getGreeting(locale, currentHour);
    const teacherNameIsArabic = /[\u0600-\u06FF]/.test(teacherName);

    const visibleClasses = [...classes]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const filteredClasses = visibleClasses.filter(c => {
        if (subjectFilter !== 'all' && c.subject !== subjectFilter) return false;
        return true;
    });

    const currentDisplay = CLASS_DISPLAY_OPTIONS.includes(classDisplayMode) ? classDisplayMode : 'double';
    const classGridClass = currentDisplay === 'single'
        ? 'grid-cols-1 max-w-xl mx-auto'
        : 'grid-cols-1 sm:grid-cols-2';

    const displayCopy = (value: ClassDisplayMode) => {
        const keys: Record<ClassDisplayMode, [string, string]> = {
            list: ['dashboard.display.list', 'dashboard.display.listDescription'],
            single: ['dashboard.display.single', 'dashboard.display.singleDescription'],
            double: ['dashboard.display.double', 'dashboard.display.doubleDescription'],
        };
        const [labelKey, descriptionKey] = keys[value];
        return { label: t(labelKey), description: t(descriptionKey) };
    };

    // Page de démarrage immersive (première connexion, aucun cahier)
    if (isOnboardingOpen && !welcomeCompleted) {
        return (
            <OnboardingPage
                config={config}
                onConfigChange={updateConfig}
                classes={classes}
                onCreateClass={createOnboardingClass}
                onDeleteClass={handleDeleteClass}
                onComplete={completeOnboarding}
                onSkip={closeOnboarding}
            />
        );
    }

    return (
        <div
            className="min-h-screen bg-[#fafafa] dark:bg-[#191919] text-foreground antialiased pb-20 sm:pb-8"
            data-dashboard-root
        >
            <div className="relative min-w-0 overflow-x-clip" data-dashboard-main>
                <div className="relative z-10 mx-auto max-w-[1440px] px-3 py-3 sm:px-6 sm:py-5 lg:px-8">
                    <header className="mb-4 sm:mb-6 space-y-2 sm:space-y-3 pb-1" id="dashboard-header">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
                            <div>
                                <h1 className="flex flex-wrap items-baseline gap-x-1.5 text-lg sm:text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                                    <span>{greeting}{teacherName ? (locale === 'ar' ? '،' : ',') : ''}</span>
                                    {teacherName && (
                                        <span
                                            dir={teacherNameIsArabic ? 'rtl' : 'ltr'}
                                            className="text-black dark:text-white font-bold"
                                        >
                                            {teacherName}
                                        </span>
                                    )}
                                </h1>
                                <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-[13px] mt-0.5 max-w-2xl leading-normal">
                                    {welcome.title && <span className="font-medium text-slate-700 dark:text-zinc-300">{welcome.title} · </span>}
                                    <span>{welcome.detail}</span>
                                </p>
                            </div>

                            {classes.length > 0 && availableSubjects.length > 1 && (
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                                    <button
                                        type="button"
                                        onClick={() => setSubjectFilter('all')}
                                        className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer active:scale-95 ${
                                            subjectFilter === 'all'
                                                ? 'bg-slate-900 text-white shadow-2xs dark:bg-zinc-100 dark:text-zinc-900'
                                                : 'border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                                        }`}
                                    >
                                        {t('dashboard.filterAll')}
                                    </button>
                                    {availableSubjects.map(subject => {
                                        const isActive = subjectFilter === subject;
                                        return (
                                            <button
                                                key={subject}
                                                type="button"
                                                onClick={() => setSubjectFilter(isActive ? 'all' : subject)}
                                                className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer active:scale-95 ${
                                                    isActive
                                                        ? 'bg-slate-900 text-white shadow-2xs dark:bg-zinc-100 dark:text-zinc-900'
                                                        : 'border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                                                }`}
                                            >
                                                {formatLocalizedSubjectDisplayName(subject, locale)}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </header>

                    <main>
                        <section className="w-full" aria-labelledby="classes-heading">
                            <div className="mb-3 sm:mb-4 flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                    <h2 id="classes-heading" className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                                        <span>{t('dashboard.classes')}</span>
                                        {filteredClasses.length > 0 && (
                                            <span className="inline-flex items-center justify-center min-w-[20px] h-4.5 px-1.5 text-[10px] font-semibold rounded-md bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                                                {filteredClasses.length}
                                            </span>
                                        )}
                                    </h2>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setCreateModalOpen(true)}
                                        className="inline-flex h-7.5 items-center gap-1.5 bg-slate-900 px-3 text-xs font-medium text-white shadow-2xs rounded-lg transition-colors hover:bg-slate-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white active:scale-95 cursor-pointer"
                                        aria-label={t('dashboard.addClass')}
                                        title={t('dashboard.addClass')}
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>{t('dashboard.classShort')}</span>
                                    </button>

                                    {classes.length > 0 && (
                                        <div ref={displayMenuRef} className="relative shrink-0 hidden sm:block">
                                            <button
                                                type="button"
                                                onClick={() => setDisplayMenuOpen(open => !open)}
                                                aria-haspopup="menu"
                                                aria-expanded={isDisplayMenuOpen}
                                                className="flex h-7.5 items-center gap-1.5 rounded-lg border border-slate-200/90 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300"
                                            >
                                                <span>{displayCopy(currentDisplay).label}</span>
                                                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isDisplayMenuOpen ? 'rotate-180' : ''}`} />
                                            </button>
                                            {isDisplayMenuOpen && (
                                                <div
                                                    role="menu"
                                                    className={`absolute top-[calc(100%+0.35rem)] z-30 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-md dark:bg-zinc-900 dark:border-zinc-800 ${isRtl ? 'left-0' : 'right-0'}`}
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
                                                                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-start text-xs transition-colors ${isActive ? 'bg-slate-100 text-slate-900 font-semibold dark:bg-zinc-800 dark:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200'}`}
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
                            </div>
                                {classes.length === 0 ? (
                                    <div className="flex flex-col items-center gap-4 rounded-[2rem] border-2 border-slate-200 bg-white px-6 py-12 text-center shadow-none dark:bg-slate-900 dark:border-slate-700">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eeaaff] text-[#423ed8] dark:bg-[#423ed8]/30 dark:text-[#eeaaff]">
                                            <BookOpen className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-[#423ed8] dark:text-[#98e3ff]">{t('dashboard.emptyTitle')}</h3>
                                            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 max-w-sm">
                                                {t('dashboard.emptyDescription')}
                                            </p>
                                            </div>
                                            <Button onClick={() => {
                                                if (welcomeCompleted) {
                                                    setCreateModalOpen(true);
                                                } else {
                                                    setOnboardingOpen(true);
                                                }
                                            }} className="mt-4 h-11 rounded-2xl bg-[#423ed8] px-6 font-bold text-white hover:bg-[#322ebd] shadow-none">
                                            {t('dashboard.addClass')}
                                        </Button>
                                    </div>
                                ) : currentDisplay === 'list' ? (
                                    <div className="space-y-3" role="list" aria-label={t('dashboard.classList')}>
                                        {filteredClasses.map((classInfo, index) => (
                                            <div
                                                key={classInfo.id}
                                                role="listitem"
                                                className="animate-in slide-in-from-bottom-4 fade-in duration-200"
                                                style={{ animationDelay: `${Math.min(index, 8) * 35}ms`, animationFillMode: 'backwards' }}
                                            >
                                                <ClassListItem
                                                    classInfo={classInfo}
                                                    onSelect={() => onSelectClass(classInfo)}
                                                    onConfigure={() => setEditingClass(classInfo)}
                                                    onShowNotifications={() => setNotificationClass(classInfo)}
                                                    notificationCount={notificationCounts.get(classInfo.id) ?? 0}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={`grid ${classGridClass} gap-3 sm:gap-4 w-full`}>
                                        {filteredClasses.map((classInfo, index) => (
                                            <div
                                                key={classInfo.id}
                                                className="h-full w-full max-w-[420px] sm:max-w-none mx-auto animate-in slide-in-from-bottom-4 fade-in duration-200"
                                                style={{ animationDelay: `${Math.min(index, 8) * 45}ms`, animationFillMode: 'backwards' }}
                                            >
                                                <ClassCard
                                                    classInfo={classInfo}
                                                    onSelect={() => onSelectClass(classInfo)}
                                                    onConfigure={() => setEditingClass(classInfo)}
                                                    onShowNotifications={() => setNotificationClass(classInfo)}
                                                    notificationCount={notificationCounts.get(classInfo.id) ?? 0}
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
                defaultTeacherName={teacherName}
                defaultCycle={selectedCycle}
                teacherSubjects={config.selectedSubjects}
                teacherCycles={config.showAllCycles ? undefined : (config.selectedCycles as Cycle[] | undefined)}
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
            <ClassNotificationsModal
                isOpen={!!notificationClass}
                classInfo={notificationClass}
                config={config}
                feed={notificationFeed}
                sessionIndex={notificationClass ? sessionIndexes[notificationClass.id] : undefined}
                nextSession={notificationClass ? nextSession(notificationClass.id) : null}
                onClose={() => setNotificationClass(null)}
                onSelectClass={onSelectClass}
                onOpenSchedule={onOpenSchedule}
                onOpenNotifications={onOpenNotifications}
            />
        </div>
    );
};
