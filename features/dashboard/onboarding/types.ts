import type { ComponentType } from 'react';
import type { AppConfig, ClassInfo, Cycle } from '@/types';
import type { ModalLang } from '@/components/ui/lang-toggle';

export const ONBOARDING_TOTAL_STEPS = 5 as const;

export type OnboardingStep = 1 | 2 | 3 | 4 | 5;
type ClassCreationMode = 'catalog' | 'manual';
type ClassDraftIssue = 'missingGroup' | 'invalidGroup' | 'missingLabel' | 'existingClass';

export interface OnboardingPageProps {
    config: AppConfig;
    onConfigChange: (patch: Partial<AppConfig>) => void;
    classes: ClassInfo[];
    onCreateClass: (details: { name: string; subject: string; cycle?: Cycle }) => ClassInfo;
    onDeleteClass: (classId: string) => void;
    onComplete: () => Promise<void> | void;
    onSkip: () => void;
}

export interface CycleOption {
    key: Cycle;
    icon: ComponentType<{ className?: string }>;
}

export interface ClassLevelGroup {
    key: string;
    levels: string[];
}

export interface ClassDraft {
    mode: ClassCreationMode;
    level: string;
    group: string;
    label: string;
    subject: string;
}

export interface ClassDraftValidation {
    name: string | null;
    issue: ClassDraftIssue | null;
}

export interface OnboardingCopy {
    brand: string;
    title: string;
    subtitle: string;
    start: string;
    finishing: string;
    configurationCompleted: string;
    configurationError: string;
    classAdded: string;
    addingClass: string;
    classCreationError: string;
    sectionLanguage: string;
    sectionProfile: string;
    sectionSubjects: string;
    sectionClasses: string;
    sectionSchedule: string;
    languageSelect: string;
    fullName: string;
    fullNamePlaceholder: string;
    establishment: string;
    establishmentPlaceholder: string;
    teachingCycle: string;
    subjectSelectionHint: (teacherName: string) => string;
    subjectToAssign: string;
    assignSubjectHint: string;
    otherSubject: string;
    assignedSubject: string;
    levelPlaceholder: string;
    groupPlaceholder: string;
    removeCreatedClass: string;
    classRemoved: (name: string) => string;
    addClass: string;
    catalogMode: string;
    manualMode: string;
    customClassName: string;
    customClassNamePlaceholder: string;
    customNameQuestion: string;
    switchToCatalogQuestion: string;
    groupHint: string;
    missingGroup: string;
    invalidGroup: string;
    missingLabel: string;
    existingClass: string;
    understood: string;
    back: string;
    next: string;
    ignoreClass: string;
    step: (current: number, total: number) => string;
    cycleLabels: Record<Cycle, string>;
    cycleDescriptions: Record<Cycle, string>;
    levelGroupLabels: Record<string, string>;
    selectBranchesHint: string;
    noClassSelectedYet: string;
    configuredClassesCount: (count: number) => string;
    customClassPrompt: string;
    groupPrefix: string;
    otherGroupNumber: string;
    groupsLabel: string;
}

export type { ModalLang };
