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
import { ClassInfo, Cycle } from '@/types';
import { getBundledCalendar, localizeCalendarName, todayInMorocco } from '@/utils/calendar';
import { formatLocalizedSubjectDisplayName } from '@/constants';
import { daysBetweenISO } from '@/utils/assessments';
import { withAbsences } from '@/utils/lateness';
import { nextSessionInfoForClass, deriveSchedules } from '@/utils/timetable';
import { ChevronDown, Plus } from '@/components/ui/icons';
import { useLocale } from '@/i18n/LocaleProvider';
import { NotificationFeed } from '@/hooks/useNotificationFeed';
import { useAuth } from '@/contexts/AuthContext';
import { useOrientation } from '@/hooks/useOrientation';
import { Radio, Clock, ArrowRight, ArrowLeft, AlertCircle } from 'lucide-react';
import { computeClassHoursInsight } from '@/utils/scheduleInsights';
import { isArabicText } from '@/utils/textFormat';

interface DashboardProps {
    onSelectClass: (classInfo: ClassInfo) => void;
    notificationFeed: NotificationFeed;
    accountTeacherName?: string;
    onOpenSchedule?: () => void;
    onOnboardingVisibilityChange?: (visible: boolean) => void;
}

type ClassDisplayMode = 'list' | 'single' | 'double';

const CLASS_DISPLAY_OPTIONS: ClassDisplayMode[] = ['list', 'single', 'double'];

const subjectKey = (value: string) => value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr');

const teacherKey = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr');

export const Dashboard: React.FC<DashboardProps> = ({
    onSelectClass,
    notificationFeed,
    accountTeacherName = '',
    onOpenSchedule,
    onOnboardingVisibilityChange,
}) => {
    const { locale, t, isRtl } = useLocale();
    const { user: accountUser, completeWelcome } = useAuth();
    const { classes, addClass, deleteClass, updateClass, isLoading: isClassesLoading } = useClassManager();
    const { config, updateConfig, isLoading: isConfigLoading } = useConfigManager();
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<ClassInfo | null>(null);
    const [isOnboardingOpen, setOnboardingOpen] = useState(false);
    const { type: deviceType } = useDevice();
    const isMobile = deviceType === 'phone';
    const defaultDisplayMode: ClassDisplayMode = isMobile ? 'single' : 'double';
    const { value: selectedCycle, setValue: setSelectedCycle } = useOptimizedLocalStorage<Cycle>('selected_cycle_v1', 'college', 100);
    const { isLandscape } = useOrientation();
    const { value: classDisplayMode, setValue: setClassDisplayMode } = useOptimizedLocalStorage<ClassDisplayMode>('dashboard_class_display_v1', defaultDisplayMode, 100);
    const [subjectFilter, setSubjectFilter] = useState<string>('all');
    const [isDisplayMenuOpen, setDisplayMenuOpen] = useState(false);
    const displayMenuRef = useRef<HTMLDivElement>(null);
    const [now, setNow] = useState(() => new Date());
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
            // La fermeture reste persistée localement puis synchronisée.
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

    const teacherSubjects = useMemo(() => {
        const currentTeacher = teacherKey(teacherName);
        const matchingClasses = currentTeacher
            ? classes.filter(classInfo => teacherKey(classInfo.teacherName) === currentTeacher)
            : [];
        // Les anciennes classes sans nom d'enseignant restent visibles : elles
        // constituent le repli, sans faire apparaître de filtre fantôme.
        const currentClasses = matchingClasses.length > 0 ? matchingClasses : classes;
        const activeSubjects = new Map<string, string>();
        currentClasses.forEach(classInfo => {
            if (classInfo.subject?.trim()) activeSubjects.set(subjectKey(classInfo.subject), classInfo.subject.trim());
        });
        const configuredSubjects = new Set(
            (config.selectedSubjects ?? [])
                .filter((subject): subject is string => Boolean(subject?.trim()))
                .map(subjectKey),
        );
        const subjects = Array.from(activeSubjects.entries())
            .filter(([key]) => configuredSubjects.size === 0 || configuredSubjects.has(key))
            .map(([, subject]) => subject);
        // Une configuration devenue obsolète ne doit pas masquer toutes les
        // matières réellement présentes dans les cahiers actifs.
        return (subjects.length > 0 ? subjects : Array.from(activeSubjects.values()))
            .sort((a, b) => a.localeCompare(b, 'fr'));
    }, [classes, config.selectedSubjects, teacherName]);
    const shouldShowSubjectBadge = teacherSubjects.length > 1;

    // Un filtre devenu invisible (après le passage à une seule matière) ne
    // doit jamais laisser le tableau de bord vide.
    useEffect(() => {
        if (!shouldShowSubjectBadge || (subjectFilter !== 'all' && !teacherSubjects.includes(subjectFilter))) {
            setSubjectFilter('all');
        }
    }, [shouldShowSubjectBadge, subjectFilter, teacherSubjects]);

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
    const assessmentsNextWeek = notificationFeed.assessments.filter(item => {
        const inDays = daysBetweenISO(todayISO, item.dateISO);
        return inDays >= 7 && inDays <= 13;
    }).length;
    const attentionCount = notificationFeed.corrections.length + notificationFeed.attentionCount;
    const affectedClassCount = new Set(notificationFeed.corrections.map(signal => signal.classId)).size;
    const upcomingVacation = calendar.vacances
        .map(vacation => ({ vacation, inDays: daysBetweenISO(todayISO, vacation.debut) }))
        .filter(({ inDays }) => inDays > 0 && inDays <= 21)
        .sort((a, b) => a.inDays - b.inDays)[0] ?? null;
    const scheduleIncompleteCount = classes.filter(cls => {
        const insight = computeClassHoursInsight(cls, config.timetable);
        return insight.officialHours !== null && insight.deviation !== 'match';
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
    const formatClassCount = (count: number) => {
        if (locale === 'ar') {
            if (count === 0) return 'لا توجد أقسام';
            if (count === 1) return 'قسم واحد';
            if (count === 2) return 'قسمان';
            if (count >= 3 && count <= 10) return `${count} أقسام`;
            return `${count} قسماً`;
        }
        if (locale === 'en') {
            return `${count} ${count === 1 ? 'class' : 'classes'}`;
        }
        const words = ['Aucune', 'Une', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix'];
        return `${words[count] ?? new Intl.NumberFormat('fr-MA').format(count)} classe${count > 1 ? 's' : ''}`;
    };
    const formatVacationDate = (dateISO: string) => new Intl.DateTimeFormat(localeCode, {
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
    }).format(new Date(`${dateISO}T12:00:00Z`));
    const welcome: {
        title: React.ReactNode;
        detail: React.ReactNode;
        tone: 'neutral' | 'alert' | 'vacation' | 'deadline';
        action?: { label: string; onClick: () => void };
    } = (() => {
        if (classes.length === 0) {
            return {
                title: t('dashboard.welcome.startTitle'),
                detail: t('dashboard.welcome.startDetail'),
                tone: 'neutral',
            };
        }
        if (scheduleIncompleteCount > 0) {
            const classLabel = formatClassCount(scheduleIncompleteCount);
            const arabicScheduleAlert = scheduleIncompleteCount === 1
                ? 'مهم : قسم واحد يحتاج إلى انتباهكم'
                : scheduleIncompleteCount === 2
                    ? 'مهم : قسمان يحتاجان إلى انتباهكم'
                    : scheduleIncompleteCount <= 10
                        ? `مهم : ${scheduleIncompleteCount} أقسام تحتاج إلى انتباهكم`
                        : `مهم : ${scheduleIncompleteCount} قسماً يحتاج إلى انتباهكم`;

            return {
                title: locale === 'ar'
                    ? arabicScheduleAlert
                    : locale === 'en'
                        ? `Important: ${scheduleIncompleteCount} ${scheduleIncompleteCount === 1 ? 'class needs' : 'classes need'} your attention`
                        : `Important : ${classLabel} ${scheduleIncompleteCount === 1 ? 'nécessite' : 'nécessitent'} votre attention`,
                detail: '',
                tone: 'alert',
                action: onOpenSchedule ? {
                    label: locale === 'ar' ? 'تعديل' : locale === 'en' ? 'Adjust' : 'Ajuster',
                    onClick: onOpenSchedule,
                } : undefined,
            };
        }
        if (attentionCount > 0) {
            const scope = affectedClassCount > 0 ? formatClassCount(affectedClassCount) : t('dashboard.classes').toLowerCase();
            return {
                title: t(attentionCount === 1 ? 'dashboard.welcome.alertTitleOne' : 'dashboard.welcome.alertTitleMany', { count: attentionCount }),
                detail: locale === 'fr'
                    ? <><strong>{scope}</strong> demandent une vérification avant la prochaine séance.</>
                    : t('dashboard.welcome.alertsDetail'),
                tone: 'alert',
            };
        }
        if (holidayToday) {
            return {
                title: t('dashboard.welcome.holidayTitle'),
                detail: t('dashboard.welcome.holidayDetail'),
                tone: 'vacation',
            };
        }
        if (vacationToday) {
            return {
                title: '',
                detail: t('dashboard.welcome.vacationDetail', { date: vacationResumeLabel }),
                tone: 'vacation',
            };
        }
        if (upcomingVacation) {
            return {
                title: localizeCalendarName(upcomingVacation.vacation.nom, locale),
                detail: t('dashboard.welcome.vacationSoonDetail', {
                    date: formatVacationDate(upcomingVacation.vacation.debut),
                    count: upcomingVacation.inDays,
                }),
                tone: 'vacation',
            };
        }
        if (assessmentsThisWeek > 0) {
            return {
                title: t(assessmentsThisWeek === 1 ? 'dashboard.welcome.assessmentTitleOne' : 'dashboard.welcome.assessmentTitleMany', { count: assessmentsThisWeek }),
                detail: t('dashboard.welcome.assessmentsDetail'),
                tone: 'deadline',
            };
        }
        if (assessmentsNextWeek > 0) {
            return {
                title: t(assessmentsNextWeek === 1 ? 'dashboard.welcome.nextWeekTitleOne' : 'dashboard.welcome.nextWeekTitleMany', { count: assessmentsNextWeek }),
                detail: t('dashboard.welcome.nextWeekDetail'),
                tone: 'deadline',
            };
        }
        if (hasCurrentSession) {
            return {
                title: t('dashboard.welcome.nowTitle'),
                detail: t('dashboard.welcome.nowDetail'),
                tone: 'neutral',
            };
        }
        if (hasSessionToday) {
            return {
                title: t('dashboard.welcome.todayTitle'),
                detail: t('dashboard.welcome.todayDetail'),
                tone: 'neutral',
            };
        }
        return {
            title: '',
            detail: t(timeDetailKey),
            tone: 'neutral',
        };
    })();
    const visibleClasses = [...classes]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const filteredClasses = visibleClasses.filter(c => {
        if (subjectFilter !== 'all' && c.subject !== subjectFilter) return false;
        return true;
    });

    const spotlightInfo = useMemo(() => {
        if (classes.length === 0) return null;
        for (const cls of classes) {
            const info = nextSession(cls.id);
            if (info?.kind === 'now') {
                return { classInfo: cls, info, isActiveNow: true };
            }
        }
        for (const cls of classes) {
            const info = nextSession(cls.id);
            if (info?.kind === 'today') {
                return { classInfo: cls, info, isActiveNow: false };
            }
        }
        return null;
    }, [classes, nextSession]);

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    const currentDisplay = CLASS_DISPLAY_OPTIONS.includes(classDisplayMode) ? classDisplayMode : 'double';
    const classGridClass = currentDisplay === 'single'
        ? 'grid-cols-1 max-w-xl mx-auto'
        : 'grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] sm:grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))]';

    const displayCopy = (value: ClassDisplayMode) => {
        const keys: Record<ClassDisplayMode, [string, string]> = {
            list: ['dashboard.display.list', 'dashboard.display.listDescription'],
            single: ['dashboard.display.single', 'dashboard.display.singleDescription'],
            double: ['dashboard.display.double', 'dashboard.display.doubleDescription'],
        };
        const [labelKey, descriptionKey] = keys[value];
        return { label: t(labelKey), description: t(descriptionKey) };
    };

    const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;
    const displayTeacherName = teacherName?.trim() || t('settings.defaultTeacherName');

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
            className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-foreground antialiased pb-20 sm:pb-8 relative overflow-hidden"
            data-dashboard-root
        >
            {/* Ambient Subtle Glows */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10 select-none">
                <div className="absolute -top-32 -left-32 h-[450px] w-[450px] rounded-full bg-blue-100/40 blur-3xl opacity-50 dark:bg-blue-600/10 dark:opacity-20" />
                <div className="absolute top-1/4 -right-32 h-[500px] w-[500px] rounded-full bg-indigo-100/40 blur-3xl opacity-40 dark:bg-indigo-600/10 dark:opacity-15" />
            </div>

            <div className="relative min-w-0 overflow-x-clip" data-dashboard-main>
                {/* En-tête Notion / Linear plein-largeur sans arrondi, poussé en haut */}
                <header
                    id="dashboard-header"
                    aria-live="polite"
                    className="w-full rounded-none border-b border-zinc-200/80 bg-white shadow-2xs dark:border-zinc-800 dark:bg-zinc-900"
                >
                    <div className="mx-auto max-w-5xl px-3.5 py-4 sm:px-6 sm:py-5 lg:px-8 pl-safe pr-safe">
                        {/* 1. Zone supérieure – Bienvenue + Nom d'utilisateur harmonisé */}
                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                            <h1
                                className={`font-bold text-zinc-950 dark:text-white leading-tight tracking-tight ${
                                    isRtl ? 'font-lateef text-3xl sm:text-4xl' : 'font-itim text-2xl sm:text-3xl'
                                }`}
                                dir="auto"
                            >
                                {isRtl ? 'مرحباً :' : locale === 'en' ? 'Welcome :' : 'Bienvenue :'}
                            </h1>

                            <span
                                className={`inline-flex max-w-full items-center justify-center rounded-lg border border-zinc-200/90 bg-zinc-100/95 px-3 py-0.5 text-zinc-900 shadow-2xs transition-colors dark:border-zinc-700/80 dark:bg-zinc-800/90 dark:text-zinc-100 ${
                                    isArabicText(displayTeacherName)
                                        ? 'font-lateef text-3xl sm:text-4xl font-bold leading-tight'
                                        : 'font-itim text-2xl sm:text-3xl font-bold leading-tight'
                                }`}
                                dir="auto"
                            >
                                {displayTeacherName}
                            </span>
                        </div>

                        {/* 2. Zone inférieure – Message important */}
                        {(welcome.title || welcome.detail || scheduleIncompleteCount > 0) && (
                            <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2.5 rounded-[8px] border border-[#fbcfe8] bg-[#fdf2f8] px-3.5 py-2.5 text-xs text-rose-950 transition-all sm:text-sm dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200">
                                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" strokeWidth={2.2} />
                                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                                        <span className="font-bold text-rose-950 dark:text-rose-100">
                                            {welcome.title || (isRtl ? 'مهم : قسم واحد يحتاج إلى انتباهكم' : 'Important : 1 classe nécessite votre attention')}
                                        </span>
                                        {welcome.detail && (
                                            <span className="text-rose-800/80 dark:text-rose-300/80 text-xs">
                                                {welcome.detail}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {welcome.action && (
                                    <button
                                        type="button"
                                        onClick={welcome.action.onClick}
                                        className="group inline-flex shrink-0 cursor-pointer items-center gap-1.5 font-bold text-rose-700 hover:text-rose-900 transition-colors dark:text-rose-300 dark:hover:text-white"
                                    >
                                        <span>{welcome.action.label}</span>
                                        <ArrowIcon className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </header>

                <div className="relative z-10 mx-auto max-w-5xl px-3.5 pt-4 pb-3 sm:px-6 sm:pt-5 lg:px-8 pl-safe pr-safe">
                    {classes.length > 0 && (
                        <div className="mb-3 flex min-h-8 flex-wrap items-center gap-1.5 sm:mb-4 sm:gap-2">
                            <h2 id="classes-heading" className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100 sm:text-sm">
                                <span>{t('dashboard.classes')}</span>
                                {filteredClasses.length > 0 && (
                                    <span className="inline-flex h-4.5 min-w-[20px] items-center justify-center rounded-full border border-blue-200/60 bg-blue-50 px-1.5 text-[10px] font-bold text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/60 dark:text-blue-300">
                                        {filteredClasses.length}
                                    </span>
                                )}
                            </h2>
                            {shouldShowSubjectBadge ? (
                                <div className="order-3 flex w-full min-w-0 items-center gap-1 overflow-x-auto no-scrollbar sm:order-none sm:w-auto sm:flex-1" aria-label={t('dashboard.filterAll')}>
                                    <button
                                        type="button"
                                        onClick={() => setSubjectFilter('all')}
                                        className={`h-7 shrink-0 rounded-lg px-2.5 text-[11px] font-semibold transition-all cursor-pointer active:scale-95 ${
                                            subjectFilter === 'all'
                                                ? 'bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-900'
                                                : 'border border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:text-white'
                                        }`}
                                    >
                                        {t('dashboard.filterAll')}
                                    </button>
                                    {teacherSubjects.map(subject => {
                                        const isActive = subjectFilter === subject;
                                        return (
                                            <button
                                                key={subject}
                                                type="button"
                                                onClick={() => setSubjectFilter(isActive ? 'all' : subject)}
                                                className={`h-7 shrink-0 rounded-lg px-2.5 text-[11px] font-semibold transition-all cursor-pointer active:scale-95 ${
                                                    isActive
                                                        ? 'bg-blue-600 text-white shadow-xs'
                                                        : 'border border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:text-white'
                                                }`}
                                            >
                                                {formatLocalizedSubjectDisplayName(subject, locale)}
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : null}
                            <div className="ms-auto flex shrink-0 items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(true)}
                                className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg bg-blue-600 px-2.5 text-[11px] font-semibold text-white shadow-xs transition-all hover:bg-blue-700 active:scale-95 cursor-pointer"
                                aria-label={t('dashboard.addClass')}
                                title={t('dashboard.addClass')}
                            >
                                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                                <span>{t('dashboard.classShort')}</span>
                            </button>
                            {isLandscape && (
                                <div ref={displayMenuRef} className="relative hidden shrink-0 sm:block">
                                    <button
                                        type="button"
                                        onClick={() => setDisplayMenuOpen(open => !open)}
                                        aria-haspopup="menu"
                                        aria-expanded={isDisplayMenuOpen}
                                        className="flex h-7 items-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2.5 text-[11px] font-medium text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 cursor-pointer"
                                    >
                                        <span>{displayCopy(currentDisplay).label}</span>
                                        <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isDisplayMenuOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {isDisplayMenuOpen && (
                                        <div
                                            role="menu"
                                            className={`absolute top-[calc(100%+0.35rem)] z-30 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white/95 p-1 shadow-lg backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 ${isRtl ? 'left-0' : 'right-0'}`}
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
                                                        className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-start text-xs transition-colors cursor-pointer ${isActive ? 'bg-blue-50 text-blue-600 font-semibold dark:bg-blue-950/60 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'}`}
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
                    )}
                    {/* Spotlight Intelligent: Séance active ou prochaine du jour */}
                    {spotlightInfo && (
                        <div
                            onClick={() => onSelectClass(spotlightInfo.classInfo)}
                            className="mb-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 p-3.5 sm:p-4 shadow-xs backdrop-blur-md cursor-pointer transition-all hover:border-blue-500/40 hover:shadow-md active:scale-[0.99] group"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${spotlightInfo.isActiveNow ? 'bg-emerald-600 text-white shadow-emerald-600/25' : 'bg-blue-600 text-white shadow-blue-600/25'} shadow-sm`}>
                                        {spotlightInfo.isActiveNow ? (
                                            <Radio className="h-5 w-5 animate-pulse stroke-[2.2]" />
                                        ) : (
                                            <Clock className="h-5 w-5 stroke-[2.2]" />
                                        )}
                                        {spotlightInfo.isActiveNow && (
                                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${spotlightInfo.isActiveNow ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/40'}`}>
                                                {spotlightInfo.isActiveNow ? (locale === 'ar' ? 'الآن · حصة جارية' : 'En ce moment · En direct') : (locale === 'ar' ? 'اليوم · الحصة القادمة' : 'Aujourd’hui · Séance à venir')}
                                            </span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                                                {spotlightInfo.info.label}
                                            </span>
                                        </div>
                                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate mt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {spotlightInfo.classInfo.name}
                                            {spotlightInfo.classInfo.subject && (
                                                <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1.5">
                                                    ({formatLocalizedSubjectDisplayName(spotlightInfo.classInfo.subject, locale)})
                                                </span>
                                            )}
                                        </h3>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 hidden md:inline group-hover:underline">
                                        {locale === 'ar' ? 'فتح دفتر النصوص' : 'Ouvrir le cahier'}
                                    </span>
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/70 dark:border-slate-800/70 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 group-hover:border-blue-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <ArrowIcon className="h-4 w-4 stroke-[2.2]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <main>
                        <section className="w-full" aria-labelledby="classes-heading">
                                {classes.length === 0 ? (
                                    <div className="relative flex flex-col items-center justify-center py-10 sm:py-14 md:py-16 px-4 sm:px-8 text-center rounded-3xl border border-slate-200/60 dark:border-white/[0.06] bg-white/70 dark:bg-zinc-900/50 backdrop-blur-xl shadow-xs overflow-hidden">
                                        {/* Colorful Glow behind image */}
                                        <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-96 rounded-full bg-gradient-to-tr from-cyan-500/10 via-cyan-500/10 to-amber-500/10 blur-3xl opacity-50 dark:opacity-30" />

                                        {/* Top: Modern Rounded Framed Illustration */}
                                        <div className="relative mb-5 sm:mb-6 flex items-center justify-center p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-zinc-900/80 shadow-[0_6px_24px_-6px_rgba(15,23,42,0.06)] dark:shadow-[0_6px_24px_-6px_rgba(0,0,0,0.4)] backdrop-blur-sm max-w-full overflow-hidden">
                                            <img
                                                src="/dashboard.png"
                                                alt="Illustration tableau de bord"
                                                className="w-60 sm:w-72 md:w-[360px] lg:w-[420px] max-w-full h-auto object-contain rounded-xl sm:rounded-2xl select-none pointer-events-none"
                                                referrerPolicy="no-referrer"
                                                loading="eager"
                                            />
                                        </div>

                                        {/* Middle: Proportionally Refined Typography (Title & Subtitle) */}
                                        <div className="relative z-10 max-w-md mx-auto space-y-1 sm:space-y-1.5 px-2">
                                            <h3 className="text-base sm:text-lg md:text-xl font-semibold text-slate-900 dark:text-zinc-100 tracking-tight leading-snug">
                                                {t('dashboard.emptyTitle')}
                                            </h3>
                                            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                                                {t('dashboard.emptyDescription')}
                                            </p>
                                        </div>

                                        {/* Bottom: Centered Button */}
                                        <div className="relative z-10 mt-5 sm:mt-6">
                                            <Button
                                                variant="accent"
                                                onClick={() => {
                                                    if (welcomeCompleted) {
                                                        setCreateModalOpen(true);
                                                    } else {
                                                        setOnboardingOpen(true);
                                                    }
                                                }}
                                                className="h-10 px-6 rounded-full font-semibold text-xs sm:text-sm transition-all active:scale-95 inline-flex items-center gap-2 cursor-pointer shadow-md shadow-cyan-500/25 hover:shadow-lg hover:shadow-cyan-500/40"
                                            >
                                                <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                                                <span>{t('dashboard.addClass')}</span>
                                            </Button>
                                        </div>
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
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={`grid ${classGridClass} w-full gap-3 sm:gap-4 lg:gap-5`}>
                                        {filteredClasses.map((classInfo, index) => (
                                            <div
                                                key={classInfo.id}
                                                className="h-full w-full max-w-[430px] sm:max-w-none mx-auto animate-in slide-in-from-bottom-4 fade-in duration-200"
                                                style={{ animationDelay: `${Math.min(index, 8) * 45}ms`, animationFillMode: 'backwards' }}
                                            >
                                                <ClassCard
                                                    classInfo={classInfo}
                                                    onSelect={() => onSelectClass(classInfo)}
                                                    onConfigure={() => setEditingClass(classInfo)}
                                                    showSubjectBadge={shouldShowSubjectBadge}
                                                    allClasses={classes}
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
                teacherCycles={config.selectedCycles?.length ? (config.selectedCycles as Cycle[]) : undefined}
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
        </div>
    );
};
