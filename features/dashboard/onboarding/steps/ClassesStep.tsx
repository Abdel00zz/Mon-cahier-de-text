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
    <div className="space-y-6 animate-fade-in duration-500">
        <section>
            <div className="flex items-center gap-2 text-start">
                <h2 className="text-base font-bold text-slate-900">{copy.sectionClasses}</h2>
                {classes.length > 0 && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{classes.length}</span>}
            </div>

            <CreatedClassesList classes={classes} lang={lang} copy={copy} onRemove={onRemove} />
            <ClassDraftForm cycle={cycle} lang={lang} copy={copy} controller={controller} />
        </section>
    </div>
));

ClassesStep.displayName = 'ClassesStep';
