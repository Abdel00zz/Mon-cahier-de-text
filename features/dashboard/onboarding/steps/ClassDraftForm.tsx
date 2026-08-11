import { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from '@/components/ui/icons';
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
        <div className="mt-4 space-y-3">
            <p className="text-start text-xs text-slate-500 sm:text-sm">{copy.groupHint}</p>
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                <div className="flex flex-col gap-2 rounded-xl border border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/70 p-2.5 shadow-[0_8px_24px_rgba(80,100,223,0.08)] sm:flex-row sm:items-center sm:justify-between">
                    <button
                        type="button"
                        onClick={controller.toggleMode}
                        className="min-h-10 rounded-lg px-3 text-start text-xs font-semibold text-primary transition-colors hover:bg-indigo-50 hover:text-primary/80"
                    >
                        {draft.mode === 'catalog' ? copy.manualMode : copy.catalogMode}
                    </button>
                    <Button
                        type="button"
                        onClick={controller.add}
                        disabled={controller.isAdding}
                        aria-busy={controller.isAdding}
                        className="group inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-[0_5px_16px_rgba(15,23,42,0.20)] transition-all hover:-translate-y-0.5 hover:bg-black hover:shadow-[0_8px_20px_rgba(15,23,42,0.24)] active:translate-y-0 active:scale-[0.98] disabled:translate-y-0 disabled:bg-slate-400 disabled:shadow-none motion-reduce:transform-none motion-reduce:transition-none sm:w-auto sm:min-w-[11rem]"
                    >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:rotate-90 group-disabled:rotate-0 motion-reduce:transform-none motion-reduce:transition-none">
                            <Plus className="h-3.5 w-3.5" />
                        </span>
                        {controller.isAdding ? copy.addingClass : copy.addClass}
                    </Button>
                </div>

                {draft.mode === 'catalog' ? (
                    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                        <div className="min-w-[180px] flex-1">
                            <Select value={draft.level} onValueChange={controller.setLevel}>
                                <SelectTrigger aria-label={copy.levelPlaceholder} className="h-11 rounded-lg border-slate-200 bg-white text-start text-sm shadow-sm hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600 sm:text-base">
                                    <SelectValue placeholder={copy.levelPlaceholder} />
                                </SelectTrigger>
                                <SelectContent>
                                    {LEVEL_GROUPS[cycle].map(group => (
                                        <SelectGroup key={group.key}>
                                            <SelectLabel className="py-2 text-xs font-bold text-slate-400 sm:text-sm">{copy.levelGroupLabels[group.key]}</SelectLabel>
                                            {group.levels.map(level => (
                                                <SelectItem key={level} value={level}>{formatLocalizedClassDisplayName(level, lang, { includeClassPrefix: false })}</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Input
                            aria-label={copy.groupPlaceholder}
                            type="text"
                            value={draft.group}
                            onChange={event => controller.setGroup(event.target.value)}
                            onBlur={controller.normalizeGroup}
                            placeholder={copy.groupPlaceholder}
                            className={cn(
                                'h-11 w-full rounded-lg border-slate-200 bg-white text-center text-sm shadow-sm hover:border-slate-300 focus-visible:border-blue-600 focus-visible:ring-blue-600 sm:w-28 sm:text-base',
                                showIssue ? 'border-red-500 bg-red-50 text-red-900 focus-visible:ring-red-500' : '',
                            )}
                            inputMode="numeric"
                            maxLength={2}
                            aria-invalid={Boolean(validation.issue)}
                        />
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        <label htmlFor="onboarding-custom-class" className="block text-start text-xs font-semibold text-slate-600">{copy.customClassName}</label>
                        <Input
                            id="onboarding-custom-class"
                            type="text"
                            value={draft.label}
                            onChange={event => controller.setLabel(event.target.value)}
                            placeholder={copy.customClassNamePlaceholder}
                            className={cn(
                                'h-11 rounded-lg border-slate-200 bg-white px-3 text-start text-sm shadow-sm hover:border-slate-300 focus-visible:border-blue-600 focus-visible:ring-blue-600 sm:text-base',
                                showIssue ? 'border-red-500 bg-red-50 text-red-900 focus-visible:ring-red-500' : '',
                            )}
                            maxLength={80}
                            aria-invalid={Boolean(validation.issue)}
                        />
                    </div>
                )}

                {showIssue && message && <p className="text-xs font-medium text-red-600 sm:text-sm" aria-live="polite">{message}</p>}
            </div>
        </div>
    );
});

ClassDraftForm.displayName = 'ClassDraftForm';
