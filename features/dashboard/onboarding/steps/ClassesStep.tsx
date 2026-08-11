import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from '@/components/ui/icons';
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
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-start">
                    <h2 className="text-base font-bold text-slate-900">{copy.sectionClasses}</h2>
                    {classes.length > 0 && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">{classes.length}</span>}
                </div>
                <Button
                    type="button"
                    onClick={controller.add}
                    disabled={controller.isAdding}
                    aria-busy={controller.isAdding}
                    className="h-10 rounded-lg bg-[#5064df] px-3.5 font-semibold text-white shadow-sm hover:bg-[#4357c9]"
                >
                    <Plus className="me-2 h-4 w-4" />
                    {controller.isAdding ? copy.addingClass : copy.addClass}
                </Button>
            </div>

            <CreatedClassesList classes={classes} lang={lang} copy={copy} onRemove={onRemove} />
            <ClassDraftForm cycle={cycle} lang={lang} copy={copy} controller={controller} />
        </section>
    </div>
));

ClassesStep.displayName = 'ClassesStep';
