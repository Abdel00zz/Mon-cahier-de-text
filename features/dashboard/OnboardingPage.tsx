import { lazy, Suspense, useCallback, useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { formatLocalizedClassDisplayName } from '@/constants';
import type { ClassInfo, Cycle } from '@/types';
import { OnboardingShell } from './onboarding/OnboardingShell';
import { copyFor, subjectOptionsFor } from './onboarding/content';
import { useOnboardingClassDraft } from './onboarding/useOnboardingClassDraft';
import { useOnboardingNavigation } from './onboarding/useOnboardingNavigation';
import { ClassesStep } from './onboarding/steps/ClassesStep';
import { LanguageStep } from './onboarding/steps/LanguageStep';
import { ProfileStep } from './onboarding/steps/ProfileStep';
import { SubjectsStep } from './onboarding/steps/SubjectsStep';
import type { ModalLang, OnboardingCopy, OnboardingPageProps, OnboardingStep } from './onboarding/types';

// La grille hebdomadaire est la partie la plus lourde du parcours : elle ne
// charge qu'à la dernière étape, après la création des classes.
const ScheduleStep = lazy(() => import('./onboarding/steps/ScheduleStep').then(module => ({ default: module.ScheduleStep })));

const titleForStep = (copy: OnboardingCopy, step: OnboardingStep): string => ({
    1: copy.title,
    2: copy.sectionProfile,
    3: copy.sectionSubjects,
    4: copy.sectionClasses,
    5: copy.sectionSchedule,
}[step]);

/**
 * Orchestrateur mince de la première connexion.
 * Les étapes restent purement visuelles ; la persistance et les actions métier
 * demeurent exclusivement entre les mains de Dashboard et de ses hooks.
 */
export const OnboardingPage = ({
    config,
    onConfigChange,
    classes,
    onCreateClass,
    onDeleteClass,
    onComplete,
    onSkip,
}: OnboardingPageProps) => {
    // Pour les deux langues proposées ici, la source de vérité est désormais
    // la locale globale que LocaleProvider applique au reste de l'application.
    const lang: ModalLang = config.applicationLocale === 'ar' ? 'ar' : 'fr';
    const copy = useMemo(() => copyFor(lang), [lang]);
    const [finishing, setFinishing] = useState(false);

    const cycle = (config.selectedCycles?.[0] as Cycle | undefined) ?? 'lycee';
    const selectedSubjects = config.selectedSubjects ?? [];
    const subjectOptions = useMemo(() => subjectOptionsFor(config.selectedSubjects), [config.selectedSubjects]);
    const isProfileValid = Boolean(config.defaultTeacherName?.trim());

    const classDraft = useOnboardingClassDraft({
        cycle,
        subject: selectedSubjects[0] ?? '',
        selectedSubjects,
        classes,
        copy,
        onConfigChange,
        onCreateClass,
    });
    const navigation = useOnboardingNavigation({
        isProfileValid,
        isSubjectValid: selectedSubjects.length > 0,
        isClassesValid: classes.length > 0,
    });

    const handleLanguageSelect = useCallback((nextLang: ModalLang) => {
        onConfigChange({ applicationLocale: nextLang });
        navigation.goToProfile();
    }, [navigation.goToProfile, onConfigChange]);

    const handleTeacherNameChange = useCallback((defaultTeacherName: string) => {
        onConfigChange({ defaultTeacherName });
    }, [onConfigChange]);

    const handleEstablishmentChange = useCallback((establishmentName: string) => {
        onConfigChange({ establishmentName });
    }, [onConfigChange]);

    const handleCycleChange = useCallback((nextCycle: Cycle) => {
        onConfigChange({ selectedCycles: [nextCycle], showAllCycles: false });
        classDraft.resetForCycle(nextCycle);
    }, [classDraft.resetForCycle, onConfigChange]);

    const handleSubjectToggle = useCallback((subject: string) => {
        const next = selectedSubjects.includes(subject)
            ? selectedSubjects.filter(s => s !== subject)
            : [...selectedSubjects, subject];
        onConfigChange({ selectedSubjects: next, showAllSubjects: false });
    }, [onConfigChange, selectedSubjects]);

    const handleRemoveClass = useCallback((classInfo: ClassInfo) => {
        onDeleteClass(classInfo.id);
        toast.success(copy.classRemoved(formatLocalizedClassDisplayName(classInfo.name, lang)));
    }, [copy, lang, onDeleteClass]);

    const handleComplete = useCallback(async () => {
        if (finishing) return;
        setFinishing(true);
        try {
            await onComplete();
            toast.success(copy.configurationCompleted);
        } catch {
            toast.error(copy.configurationError);
        } finally {
            setFinishing(false);
        }
    }, [copy, finishing, onComplete]);

    // Sans classe, l'emploi du temps ne peut pas être rempli : « Ignorer »
    // termine directement la configuration au lieu de passer à l'étape 5.
    const showIgnoreClass = navigation.step === 4 && classes.length === 0;

    let content: ReactNode;
    if (navigation.step === 1) {
        content = <LanguageStep lang={lang} copy={copy} onSelect={handleLanguageSelect} />;
    } else if (navigation.step === 2) {
        content = (
            <ProfileStep
                teacherName={config.defaultTeacherName ?? ''}
                establishmentName={config.establishmentName ?? ''}
                cycle={cycle}
                copy={copy}
                onTeacherNameChange={handleTeacherNameChange}
                onEstablishmentChange={handleEstablishmentChange}
                onCycleChange={handleCycleChange}
            />
        );
    } else if (navigation.step === 3) {
        content = (
            <SubjectsStep
                subjects={subjectOptions}
                selectedSubjects={selectedSubjects}
                teacherName={config.defaultTeacherName ?? ''}
                lang={lang}
                copy={copy}
                onToggle={handleSubjectToggle}
            />
        );
    } else if (navigation.step === 4) {
        content = (
            <ClassesStep
                classes={classes}
                cycle={cycle}
                lang={lang}
                copy={copy}
                controller={classDraft}
                onRemove={handleRemoveClass}
            />
        );
    } else {
        content = (
            <Suspense fallback={<div className="py-10 text-center text-sm font-medium text-slate-500">{copy.sectionSchedule}…</div>}>
                <ScheduleStep classes={classes} config={config} onConfigChange={onConfigChange} />
            </Suspense>
        );
    }

    return (
        <OnboardingShell
            lang={lang}
            step={navigation.step}
            title={titleForStep(copy, navigation.step)}
            subtitle={navigation.step === 1 ? copy.subtitle : undefined}
            canContinue={navigation.canContinue}
            finishing={finishing}
            canComplete={classes.length > 0}
            copy={copy}
            onBack={navigation.back}
            onNext={navigation.next}
            onComplete={handleComplete}
            onSkip={onSkip}
            showIgnore={showIgnoreClass}
            onIgnore={handleComplete}
        >
            {content}
        </OnboardingShell>
    );
};
