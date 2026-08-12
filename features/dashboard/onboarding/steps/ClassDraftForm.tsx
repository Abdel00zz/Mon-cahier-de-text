import { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, CircleHelp } from '@/components/ui/icons';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatLocalizedClassDisplayName } from '@/constants';
import { cn } from '@/lib/utils';
import type { Cycle } from '@/types';
import { LEVEL_GROUPS } from '../content';
import type { OnboardingClassDraftController } from '../useOnboardingClassDraft';
import type { ClassDraftIssue, ModalLang, OnboardingCopy } from '../types';

interface ClassDraftFormProps {
    cycle: Cycle;
    lang: ModalLang;
    copy: OnboardingCopy;
    controller: OnboardingClassDraftController;
}

const issueMessage = (issue: ClassDraftIssue | null, copy: OnboardingCopy): string | null => {
    if (issue === 'missingGroup') return copy.missingGroup;
    if (issue === 'invalidGroup') return copy.invalidGroup;
    if (issue === 'missingLabel') return copy.missingLabel;
    if (issue === 'existingClass') return copy.existingClass;
    return null;
};

export const ClassDraftForm = memo<ClassDraftFormProps>(({ cycle, lang, copy, controller }) => {
    const { draft, validation, showValidation } = controller;
    const value = draft.mode === 'catalog' ? draft.group : draft.label;
    const showIssue = Boolean(validation.issue && (showValidation || value));
    const message = useMemo(() => issueMessage(validation.issue, copy), [copy, validation.issue]);

    return (
        <div className="mt-4 space-y-3 text-start">
            <p className="text-xs text-slate-500 sm:text-sm font-medium">{copy.groupHint}</p>

            <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-3 sm:p-4 shadow-2xs">
                {draft.mode === 'catalog' ? (
                    <div className="space-y-3">
                        {/* Main Choice Row: [ Level Select ] [ Group # (smaller) ] [ Add Button (left) ] */}
                        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                            {/* Level Select */}
                            <div className="min-w-[150px] flex-1">
                                <Select value={draft.level} onValueChange={controller.setLevel}>
                                    <SelectTrigger
                                        aria-label={copy.levelPlaceholder}
                                        className="h-11 rounded-xl border-slate-200 bg-white text-start text-xs font-semibold shadow-2xs hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600 sm:text-sm"
                                    >
                                        <SelectValue placeholder={copy.levelPlaceholder} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LEVEL_GROUPS[cycle].map(group => (
                                            <SelectGroup key={group.key}>
                                                <SelectLabel className="py-1.5 text-xs font-bold text-slate-400">
                                                    {copy.levelGroupLabels[group.key]}
                                                </SelectLabel>
                                                {group.levels.map(level => (
                                                    <SelectItem key={level} value={level}>
                                                        {formatLocalizedClassDisplayName(level, lang, { includeClassPrefix: false })}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Group Number Input - smaller width ("l adernier plus petite") */}
                            <div className="w-20 shrink-0 sm:w-22">
                                <Input
                                    aria-label={copy.groupPlaceholder}
                                    type="text"
                                    value={draft.group}
                                    onChange={event => controller.setGroup(event.target.value)}
                                    onBlur={controller.normalizeGroup}
                                    placeholder={lang === 'ar' ? 'رقم' : 'N°'}
                                    className={cn(
                                        'h-11 w-full rounded-xl border-slate-200 bg-white text-center text-xs font-bold shadow-2xs hover:border-slate-300 focus-visible:border-blue-600 focus-visible:ring-blue-600 sm:text-sm',
                                        showIssue ? 'border-red-500 bg-red-50 text-red-900 focus-visible:ring-red-500' : '',
                                    )}
                                    inputMode="numeric"
                                    maxLength={2}
                                    aria-invalid={Boolean(validation.issue)}
                                />
                            </div>

                            {/* Add Class Button - compact & tight */}
                            <Button
                                type="button"
                                onClick={controller.add}
                                disabled={controller.isAdding}
                                aria-busy={controller.isAdding}
                                className="group inline-flex h-11 shrink-0 items-center justify-center gap-1 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white shadow-2xs transition-all hover:bg-black active:scale-[0.98] disabled:bg-slate-400 cursor-pointer"
                            >
                                <Plus className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                                <span className="whitespace-nowrap">{controller.isAdding ? copy.addingClass : copy.addClass}</span>
                            </Button>
                        </div>

                        {/* Custom Name Question at the Bottom ("nom precis en bas label bien place petit et sous forme de qst") */}
                        <div className="pt-1 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={controller.toggleMode}
                                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors cursor-pointer group py-0.5"
                            >
                                <CircleHelp className="h-3.5 w-3.5 text-indigo-500 group-hover:scale-110 transition-transform shrink-0" />
                                <span className="underline decoration-slate-300 group-hover:decoration-indigo-500 underline-offset-2">
                                    {copy.customNameQuestion}
                                </span>
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Custom Name Mode */
                    <div className="space-y-2.5">
                        {/* Question Label well-placed and small */}
                        <label htmlFor="onboarding-custom-class" className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                            <CircleHelp className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            <span>{copy.customNameQuestion}</span>
                        </label>

                        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                            <div className="min-w-[180px] flex-1">
                                <Input
                                    id="onboarding-custom-class"
                                    type="text"
                                    value={draft.label}
                                    onChange={event => controller.setLabel(event.target.value)}
                                    placeholder={copy.customClassNamePlaceholder}
                                    className={cn(
                                        'h-11 rounded-xl border-slate-200 bg-white px-3 text-start text-xs font-medium shadow-2xs hover:border-slate-300 focus-visible:border-blue-600 focus-visible:ring-blue-600 sm:text-sm',
                                        showIssue ? 'border-red-500 bg-red-50 text-red-900 focus-visible:ring-red-500' : '',
                                    )}
                                    maxLength={80}
                                    aria-invalid={Boolean(validation.issue)}
                                />
                            </div>

                            <Button
                                type="button"
                                onClick={controller.add}
                                disabled={controller.isAdding}
                                aria-busy={controller.isAdding}
                                className="group inline-flex h-11 shrink-0 items-center justify-center gap-1 rounded-xl bg-slate-900 px-3 text-xs font-bold text-white shadow-2xs transition-all hover:bg-black active:scale-[0.98] disabled:bg-slate-400 cursor-pointer"
                            >
                                <Plus className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                                <span className="whitespace-nowrap">{controller.isAdding ? copy.addingClass : copy.addClass}</span>
                            </Button>
                        </div>

                        <div className="pt-1">
                            <button
                                type="button"
                                onClick={controller.toggleMode}
                                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors cursor-pointer py-0.5"
                            >
                                <span>{copy.switchToCatalogQuestion}</span>
                            </button>
                        </div>
                    </div>
                )}

                {showIssue && message && (
                    <p className="text-xs font-semibold text-red-600" aria-live="polite">
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
});

ClassDraftForm.displayName = 'ClassDraftForm';
