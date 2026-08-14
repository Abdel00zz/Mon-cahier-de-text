import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Trash2, Users, GraduationCap } from '@/components/ui/icons';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName } from '@/constants';
import { getClassVisual } from '@/utils/classVisuals';
import type { ClassInfo } from '@/types';
import type { ModalLang, OnboardingCopy } from '../types';

interface CreatedClassesListProps {
    classes: ClassInfo[];
    lang: ModalLang;
    copy: OnboardingCopy;
    onRemove: (classInfo: ClassInfo) => void;
}

export const CreatedClassesList = memo<CreatedClassesListProps>(({ classes, lang, copy, onRemove }) => {
    if (!classes.length) return null;

    return (
        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-2xl border border-slate-200/80 bg-slate-50/50 p-2 text-start" aria-live="polite">
            {classes.map(classInfo => {
                const visual = getClassVisual(classInfo.name);
                const displayName = formatLocalizedClassDisplayName(classInfo.name, lang);
                const subjectName = classInfo.subject ? formatLocalizedSubjectDisplayName(classInfo.subject, lang) : null;

                return (
                    <div
                        key={classInfo.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-2.5 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs"
                    >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Icon container matching dashboard ClassCard */}
                            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold shadow-2xs ${visual.iconSurfaceClass}`}>
                                <Users className="h-5 w-5" />
                            </div>

                            <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                <p className="truncate text-sm font-bold text-slate-900">
                                    {displayName}
                                </p>
                                {subjectName && (
                                    <span className="inline-flex items-center gap-1 w-fit rounded-full bg-slate-100/90 px-2 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200/60">
                                        <GraduationCap className="h-3 w-3 text-slate-500" />
                                        {subjectName}
                                    </span>
                                )}
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            onClick={() => onRemove(classInfo)}
                            aria-label={copy.removeCreatedClass}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                );
            })}
        </div>
    );
});

CreatedClassesList.displayName = 'CreatedClassesList';

