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
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)] transition-all hover:bg-black hover:shadow-[0_6px_18px_rgba(0,0,0,0.25)] active:scale-[0.97] disabled:bg-slate-400 disabled:shadow-none"
                >
                    <Plus className="h-4 w-4" />
                    {controller.isAdding ? copy.addingClass : copy.addClass}
                </Button>
            </div>

            <CreatedClassesList classes={classes} lang={lang} copy={copy} onRemove={onRemove} />
            <ClassDraftForm cycle={cycle} lang={lang} copy={copy} controller={controller} />
        </section>
    </div>
));

ClassesStep.displayName = 'ClassesStep';
