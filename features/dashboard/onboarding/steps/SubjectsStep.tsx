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
        <p className="text-start text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
            {teacherName ? (
                lang === 'ar' ? (
                    <>
                        الأستاذ <span className="font-itim text-[#0056D2] dark:text-[#38bdf8] font-bold">{teacherName}</span>، اختر المواد التي تدرّسها لإنشاء أقسامك.
                    </>
                ) : (
                    <>
                        <span className="font-itim text-[#0056D2] dark:text-[#38bdf8] font-bold">{teacherName}</span>, choisissez vos matières d'enseignement pour pouvoir créer vos classes.
                    </>
                )
            ) : (
                copy.subjectSelectionHint(teacherName)
            )}
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="group" aria-label={copy.sectionSubjects}>
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
                            'keep-surface keep-interactive keep-choice group flex min-h-12 cursor-pointer items-center gap-3 px-4 py-3 text-start text-sm font-medium sm:text-base',
                        )}
                    >
                        <span className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border transition-all duration-200',
                            selected
                                ? 'border-transparent bg-stone-800 dark:bg-stone-600'
                                : 'border-[#e0e0e0] bg-transparent dark:border-[#5f6368]'
                        )}>
                            {selected && (
                                <svg className="h-3 w-3 text-white stroke-[3]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
