import { memo } from 'react';
import { formatLocalizedSubjectDisplayName } from '@/constants';
import { cn } from '@/lib/utils';
import type { ModalLang, OnboardingCopy } from '../types';

interface SubjectsStepProps {
    subjects: string[];
    selectedSubject: string;
    teacherName: string;
    lang: ModalLang;
    copy: OnboardingCopy;
    onSelect: (subject: string) => void;
}

export const SubjectsStep = memo<SubjectsStepProps>(({ subjects, selectedSubject, teacherName, lang, copy, onSelect }) => (
    <div className="mx-auto max-w-2xl space-y-5 animate-fade-in duration-500">
        <p className="text-start text-sm leading-relaxed text-slate-600 sm:text-base">{copy.subjectSelectionHint(teacherName)}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup">
            {subjects.map(subject => {
                const selected = selectedSubject === subject;
                return (
                    <button
                        key={subject}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onSelect(subject)}
                        className={cn(
                            'flex min-h-12 items-center gap-3 rounded-lg border px-4 py-3 text-start text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20 sm:text-base',
                            selected
                                ? 'border-[#5064df] bg-[#f4f6ff] text-blue-950 shadow-[0_5px_14px_rgba(80,100,223,0.08)]'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50',
                        )}
                    >
                        <span className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                            selected ? 'border-[#5064df]' : 'border-slate-300 bg-white'
                        )}>
                            {selected && <span className="h-2.5 w-2.5 rounded-full bg-[#5064df]" />}
                        </span>
                        <span className="min-w-0 flex-1">{formatLocalizedSubjectDisplayName(subject, lang)}</span>
                    </button>
                );
            })}
        </div>
    </div>
));

SubjectsStep.displayName = 'SubjectsStep';
