import { memo } from 'react';
import { formatLocalizedSubjectDisplayName } from '@/constants';
import { cn } from '@/lib/utils';
import type { ModalLang, OnboardingCopy } from '../types';

interface SubjectsStepProps {
    subjects: string[];
    selectedSubjects: string[];
    teacherName: string;
    lang: ModalLang;
    copy: OnboardingCopy;
    onToggle: (subject: string) => void;
}

export const SubjectsStep = memo<SubjectsStepProps>(({ subjects, selectedSubjects, teacherName, lang, copy, onToggle }) => (
    <div className="mx-auto max-w-2xl space-y-5 animate-fade-in duration-500">
        <p className="text-start text-sm leading-relaxed text-slate-600 sm:text-base">{copy.subjectSelectionHint(teacherName)}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label={copy.sectionSubjects}>
            {subjects.map(subject => {
                const selected = selectedSubjects.includes(subject);
                return (
                    <button
                        key={subject}
                        type="button"
                        role="checkbox"
                        aria-checked={selected}
                        onClick={() => onToggle(subject)}
                        className={cn(
                            'flex min-h-12 items-center gap-3 rounded-lg border px-4 py-3 text-start text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-600/20 sm:text-base',
                            selected
                                ? 'border-[#5064df] bg-[#f4f6ff] text-blue-950 shadow-[0_5px_14px_rgba(80,100,223,0.08)]'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50',
                        )}
                    >
                        <span className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                            selected ? 'border-[#5064df] bg-[#5064df]' : 'border-slate-300 bg-white'
                        )}>
                            {selected && (
                                <svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                    <path d="M20 6 9 17l-5-5" />
                                </svg>
                            )}
                        </span>
                        <span className="min-w-0 flex-1">{formatLocalizedSubjectDisplayName(subject, lang)}</span>
                    </button>
                );
            })}
        </div>
    </div>
));

SubjectsStep.displayName = 'SubjectsStep';
