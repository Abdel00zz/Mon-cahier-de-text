import { memo } from 'react';
import type { ClassInfo, Cycle } from '@/types';
import type { ModalLang, OnboardingCopy } from '../types';
import type { OnboardingClassDraftController } from '../useOnboardingClassDraft';
import { ClassDraftForm } from './ClassDraftForm';
import { CreatedClassesList } from './CreatedClassesList';

interface ClassesStepProps {
    classes: ClassInfo[];
    cycle: Cycle;
    lang: ModalLang;
    copy: OnboardingCopy;
    controller: OnboardingClassDraftController;
    onRemove: (classInfo: ClassInfo) => void;
}

export const ClassesStep = memo<ClassesStepProps>(({ classes, cycle, lang, copy, controller, onRemove }) => (
    <div className="space-y-4 animate-fade-in duration-500">
        <ClassDraftForm cycle={cycle} lang={lang} copy={copy} controller={controller} />
        <CreatedClassesList classes={classes} lang={lang} copy={copy} onRemove={onRemove} />
    </div>
));

ClassesStep.displayName = 'ClassesStep';
