import { memo, useMemo } from 'react';
import { Input } from '@/components/ui/input';
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
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={controller.toggleMode}
                        className="text-xs font-semibold text-primary hover:text-primary/80"
                    >
                        {draft.mode === 'catalog' ? copy.manualMode : copy.catalogMode}
                    </button>
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
                                                <SelectItem key={level} value={level}>{formatLocalizedClassDisplayName(level, lang)}</SelectItem>
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
