import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useClassManager } from '@/hooks/useClassManager';
import { useConfigManager } from '@/hooks/useConfigManager';
import { useOptimizedLocalStorage } from '@/hooks/useOptimizedLocalStorage';
import { useDevice } from '@/hooks/useDevice';
import { DashboardSkeleton } from '@/components/ui/PageSkeleton';
import { Button } from '@/components/cahier/Button';
import { AlertBanner } from '@/components/cahier/AlertBanner';
import { SectionHeader } from '@/components/cahier/SectionHeader';
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
import { Radio, Clock, ArrowRight, ArrowLeft } from 'lucide-react';
import { computeClassHoursInsight } from '@/utils/scheduleInsights';

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
        void completeWelcome().catch(() => {
            // Hors ligne : hasCompletedWelcome est déjà stocké localement et
            // sera envoyé via la synchronisation dès le retour du réseau.
        });
    }, [completeWelcome, updateConfig, welcomeCompleted]);

    const openNotebook = useCallback((classInfo: ClassInfo) => {
        onSelectClass(classInfo);
    }, [onSelectClass]);

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
        ? 'grid-cols-1 max-w-[430px] mx-auto'
        : 'grid-cols-[repeat(auto-fill,minmax(280px,1fr))] sm:grid-cols-[repeat(auto-fill,320px)] lg:grid-cols-[repeat(auto-fill,345px)] justify-start';

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

    // Page de démarrage immersive (première connexion, aucun cahier)
    if (isOnboardingOpen && !welcomeCompleted) {
        return (
            <OnboardingPage
                config={config}
                onConfigChange={updateConfig}
                classes={classes}
                onCreateClass={createOnboardingClass}
                onDeleteClass={handleDeleteClass}
                onComplete={closeOnboarding}
                onSkip={closeOnboarding}
            />
        );
    }

    return (
        <div
            className="min-h-screen bg-white dark:bg-[#202124] text-[#202124] dark:text-[#e8eaed] font-sans antialiased pb-20 sm:pb-8"
            data-dashboard-root
        >
            <div className="relative min-w-0 overflow-x-clip" data-dashboard-main>
                {/* Bandeau d'alerte / message important */}
                {(welcome.title || welcome.detail || scheduleIncompleteCount > 0) && (
                    <header
                        id="dashboard-header"
                        aria-live="polite"
                        className="w-full border-b border-[#e0e0e0] dark:border-[#5f6368] bg-white dark:bg-[#202124]"
                    >
                        <div className="mx-auto max-w-5xl px-3.5 py-3 sm:px-6 sm:py-4 lg:px-8 pl-safe pr-safe space-y-2.5">
                            <AlertBanner
                                title={welcome.title || (isRtl ? 'مهم : قسم واحد يحتاج إلى انتباهكم' : 'Important : 1 classe nécessite votre attention')}
                                detail={welcome.detail}
                                type="critique"
                                isRtl={isRtl}
                                action={welcome.action ? {
                                    label: welcome.action.label,
                                    onClick: welcome.action.onClick,
                                } : undefined}
                            />
                        </div>
                    </header>
                )}

                <div className="relative z-10 mx-auto max-w-5xl px-3.5 pt-4 pb-3 sm:px-6 lg:px-8 pl-safe pr-safe">
                    {classes.length > 0 && (
                        <div className="mb-4">
                            <SectionHeader
                                title={t('dashboard.classes')}
                                count={filteredClasses.length}
                                isArabic={isRtl}
                                actions={
                                    <div className="flex items-center gap-2">
                                        {shouldShowSubjectBadge ? (
                                            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar" aria-label={t('dashboard.filterAll')}>
                                                <button
                                                    type="button"
                                                    onClick={() => setSubjectFilter('all')}
                                                    className={`h-8 shrink-0 rounded-[10px] px-3 text-xs font-medium font-sans transition-all cursor-pointer active:scale-95 ${
                                                        subjectFilter === 'all'
                                                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-blue-700 dark:text-blue-300 shadow-xs'
                                                            : 'border border-[#e0e0e0] dark:border-[#5f6368] bg-white text-[#202124] dark:text-[#e8eaed] hover:bg-slate-100 dark:bg-[#3c4043]'
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
                                                            className={`h-8 shrink-0 rounded-[10px] px-3 text-xs font-medium font-sans transition-all cursor-pointer active:scale-95 ${
                                                                isActive
                                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-blue-700 dark:text-blue-300 shadow-xs'
                                                                    : 'border border-[#e0e0e0] dark:border-[#5f6368] bg-white text-[#202124] dark:text-[#e8eaed] hover:bg-slate-100 dark:bg-[#3c4043]'
                                                            }`}
                                                        >
                                                            {formatLocalizedSubjectDisplayName(subject, locale)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : null}

                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => setCreateModalOpen(true)}
                                            aria-label={t('dashboard.addClass')}
                                            title={t('dashboard.addClass')}
                                        >
                                            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                                            <span>{t('dashboard.classShort')}</span>
                                        </Button>

                                        {isLandscape && (
                                            <div ref={displayMenuRef} className="relative hidden shrink-0 sm:block">
                                                <button
                                                    type="button"
                                                    onClick={() => setDisplayMenuOpen(open => !open)}
                                                    aria-haspopup="menu"
                                                    aria-expanded={isDisplayMenuOpen}
                                                    className="flex h-8 items-center gap-1.5 rounded-[10px] border border-[#e0e0e0] dark:border-[#5f6368] bg-white px-2.5 text-xs font-medium text-[#202124] dark:text-[#e8eaed] shadow-2xs hover:bg-slate-100 dark:bg-[#3c4043] cursor-pointer"
                                                >
                                                    <span>{displayCopy(currentDisplay).label}</span>
                                                    <ChevronDown className={`h-3.5 w-3.5 text-[#5f6368] dark:text-[#9aa0a6] transition-transform ${isDisplayMenuOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                {isDisplayMenuOpen && (
                                                    <div
                                                        role="menu"
                                                        className={`absolute top-[calc(100%+0.35rem)] z-30 w-40 overflow-hidden rounded-[12px] border border-[#e0e0e0] dark:border-[#5f6368] bg-white p-1 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] dark:shadow-[0_1px_3px_1px_rgba(255,255,255,0.15)] ${isRtl ? 'left-0' : 'right-0'}`}
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
                                                                    className={`flex w-full items-center justify-between rounded-[8px] px-2.5 py-1.5 text-start text-xs font-sans cursor-pointer ${isActive ? 'bg-slate-100 dark:bg-[#3c4043] text-[#202124] dark:text-[#e8eaed] font-bold' : 'text-[#5f6368] dark:text-[#9aa0a6] hover:bg-slate-100 dark:bg-[#3c4043] hover:text-[#202124] dark:text-[#e8eaed]'}`}
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
                                }
                            />
                        </div>
                    )}
                    {/* Spotlight Intelligent: Séance active ou prochaine du jour */}
                    {spotlightInfo && (
                        <div
                            onClick={() => openNotebook(spotlightInfo.classInfo)}
                            className="mb-5 rounded-[16px] border border-[#e0e0e0] dark:border-[#5f6368] bg-white p-3.5 sm:p-4 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] dark:shadow-[0_1px_3px_1px_rgba(255,255,255,0.15)] cursor-pointer transition-all hover:shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] dark:shadow-[0_1px_3px_1px_rgba(255,255,255,0.15)] active:scale-[0.99] group"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3.5 min-w-0">
                                    <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${spotlightInfo.isActiveNow ? 'bg-[#2F7A5C] text-white shadow-xs' : 'bg-[#3D6FB4] text-white shadow-xs'}`}>
                                        {spotlightInfo.isActiveNow ? (
                                            <Radio className="h-5 w-5 animate-pulse stroke-[2.2]" />
                                        ) : (
                                            <Clock className="h-5 w-5 stroke-[2.2]" />
                                        )}
                                        {spotlightInfo.isActiveNow && (
                                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2F7A5C] opacity-75" />
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2F7A5C]" />
                                            </span>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${spotlightInfo.isActiveNow ? 'bg-[#E5F1EA] text-[#2F7A5C] border border-[#2F7A5C]/30' : 'bg-[#E7EEF8] text-[#3D6FB4] border border-[#3D6FB4]/30'}`}>
                                                {spotlightInfo.isActiveNow ? (locale === 'ar' ? 'الآن · حصة جارية' : 'En ce moment · En direct') : (locale === 'ar' ? 'اليوم · الحصة القادمة' : 'Aujourd’hui · Séance à venir')}
                                            </span>
                                            <span className="text-xs text-[#5f6368] dark:text-[#9aa0a6] hidden sm:inline">
                                                {spotlightInfo.info.label}
                                            </span>
                                        </div>
                                        <h3 className="text-sm sm:text-base font-bold text-[#202124] dark:text-[#e8eaed] truncate mt-0.5 font-sans font-medium text-xl group-hover:text-[#3D6FB4] transition-colors">
                                            {spotlightInfo.classInfo.name}
                                            {spotlightInfo.classInfo.subject && (
                                                <span className="text-xs font-normal text-[#5f6368] dark:text-[#9aa0a6] font-sans ml-1.5">
                                                    ({formatLocalizedSubjectDisplayName(spotlightInfo.classInfo.subject, locale)})
                                                </span>
                                            )}
                                        </h3>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs font-semibold text-[#3D6FB4] hidden md:inline group-hover:underline">
                                        {locale === 'ar' ? 'فتح دفتر النصوص' : 'Ouvrir le cahier'}
                                    </span>
                                    <div className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[#e0e0e0] dark:border-[#5f6368] bg-slate-100 dark:bg-[#3c4043] text-[#202124] dark:text-[#e8eaed] group-hover:bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 group-hover:text-blue-700 dark:text-blue-300 transition-all">
                                        <ArrowIcon className="h-4 w-4 stroke-[2.2]" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <main>
                        <section className="w-full" aria-labelledby="classes-heading">
                                {classes.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center rounded-[16px] border border-[#e0e0e0] dark:border-[#5f6368] bg-white px-4 py-10 text-center shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_1px_3px_1px_rgba(60,64,67,0.15)] dark:shadow-[0_1px_3px_1px_rgba(255,255,255,0.15)] sm:px-8 sm:py-14 md:py-16">
                                        <div className="mb-5 flex max-w-full items-center justify-center overflow-hidden rounded-[16px] border border-[#e0e0e0] dark:border-[#5f6368] bg-slate-50 dark:bg-[#3c4043] p-2 sm:mb-6 sm:p-2.5">
                                            <img
                                                src="/dashboard.png"
                                                alt="Illustration tableau de bord"
                                                className="w-60 sm:w-72 md:w-[360px] lg:w-[420px] max-w-full h-auto object-contain rounded-[12px] select-none pointer-events-none"
                                                referrerPolicy="no-referrer"
                                                loading="eager"
                                            />
                                        </div>

                                        <div className="max-w-md space-y-1.5 px-2">
                                            <h3 className="font-sans font-medium text-2xl sm:text-3xl font-bold text-[#202124] dark:text-[#e8eaed]">
                                                {t('dashboard.emptyTitle')}
                                            </h3>
                                            <p className="mx-auto max-w-sm text-xs leading-relaxed text-[#5f6368] dark:text-[#9aa0a6] font-sans sm:text-sm">
                                                {t('dashboard.emptyDescription')}
                                            </p>
                                        </div>

                                        <div className="mt-5 sm:mt-6">
                                            <Button
                                                variant="primary"
                                                onClick={() => {
                                                    if (welcomeCompleted) {
                                                        setCreateModalOpen(true);
                                                    } else {
                                                        setOnboardingOpen(true);
                                                    }
                                                }}
                                                className="h-10 px-6 text-sm font-semibold"
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
                                                    onSelect={() => openNotebook(classInfo)}
                                                    onConfigure={() => setEditingClass(classInfo)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={`grid ${classGridClass} w-full gap-x-4 gap-y-7 sm:gap-x-5 sm:gap-y-8 lg:gap-x-6 lg:gap-y-8 pt-4`}>
                                        {filteredClasses.map((classInfo, index) => (
                                            <div
                                                key={classInfo.id}
                                                className="h-full w-full animate-in slide-in-from-bottom-4 fade-in duration-200"
                                                style={{ animationDelay: `${Math.min(index, 8) * 45}ms`, animationFillMode: 'backwards' }}
                                            >
                                                <ClassCard
                                                    classInfo={classInfo}
                                                    onSelect={() => openNotebook(classInfo)}
                                                    onConfigure={() => setEditingClass(classInfo)}
                                                    showSubjectBadge={shouldShowSubjectBadge}
                                                    allClasses={classes}
                                                    index={index}
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
                defaultCycle={selectedCycle}
                teacherSubjects={config.selectedSubjects}
                teacherCycles={config.selectedCycles}
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
