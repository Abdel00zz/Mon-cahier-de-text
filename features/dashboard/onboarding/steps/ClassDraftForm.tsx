import { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, CircleHelp, Check, GraduationCap } from '@/components/ui/icons';
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

    const groups = LEVEL_GROUPS[cycle];
    const activeGroup = groups.find(group => group.levels.includes(draft.level)) ?? groups[0];

    const selectGroup = (groupKey: string) => {
        const target = groups.find(group => group.key === groupKey);
        if (target?.levels.length) controller.setLevel(target.levels[0]);
    };

    return (
        <div className="mt-4 space-y-3.5 text-start">
            {/* Zone de saisie et de création de la classe */}
            <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/30 p-3.5 sm:p-4 shadow-xs">
                <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <GraduationCap className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground">
                        {draft.mode === 'catalog' ? copy.catalogMode : copy.customClassName}
                    </span>
                </div>

                {draft.mode === 'catalog' ? (
                    <div className="space-y-3">
                        {/* Choix en deux temps : paliers (sidebar) + filières complètes */}
                        <div className="grid gap-2.5 sm:grid-cols-[9.5rem_1fr] sm:gap-3">
                            <nav
                                aria-label={copy.levelPlaceholder}
                                className="flex gap-1.5 overflow-x-auto pb-0.5 sm:flex-col sm:overflow-visible sm:pb-0"
                            >
                                {groups.map(group => {
                                    const isActive = activeGroup?.key === group.key;
                                    return (
                                        <button
                                            key={group.key}
                                            type="button"
                                            onClick={() => selectGroup(group.key)}
                                            aria-pressed={isActive}
                                            className={cn(
                                                'inline-flex h-9 shrink-0 items-center justify-start rounded-lg px-3 text-xs font-bold transition-colors cursor-pointer sm:w-full',
                                                isActive
                                                    ? 'bg-primary text-primary-foreground shadow-xs'
                                                    : 'bg-muted/50 text-muted-foreground border border-border/70 hover:bg-muted hover:text-foreground'
                                            )}
                                        >
                                            {copy.levelGroupLabels[group.key]}
                                        </button>
                                    );
                                })}
                            </nav>

                            <div
                                className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border/70 bg-card p-1.5"
                                aria-label={copy.levelPlaceholder}
                            >
                                {activeGroup?.levels.map(level => {
                                    const isSelected = draft.level === level;
                                    return (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => controller.setLevel(level)}
                                            aria-pressed={isSelected}
                                            className={cn(
                                                'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-start text-xs font-semibold leading-snug transition-colors cursor-pointer',
                                                isSelected
                                                    ? 'bg-primary/10 text-foreground ring-1 ring-primary/30'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            )}
                                        >
                                            <span className="min-w-0 flex-1">
                                                {formatLocalizedClassDisplayName(level, lang, { includeClassPrefix: false })}
                                            </span>
                                            {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Numéro de groupe + ajout */}
                        <div className="flex items-center gap-2">
                            <Input
                                aria-label={copy.groupPlaceholder}
                                type="text"
                                value={draft.group}
                                onChange={event => controller.setGroup(event.target.value)}
                                onBlur={controller.normalizeGroup}
                                placeholder={lang === 'ar' ? 'رقم' : 'N°'}
                                className={cn(
                                    'h-11 w-20 shrink-0 rounded-xl border-border bg-card text-center text-xs font-bold shadow-2xs hover:border-slate-300 focus-visible:border-primary focus-visible:ring-primary sm:w-22 sm:text-sm',
                                    showIssue ? 'border-destructive bg-destructive/10 text-destructive focus-visible:ring-destructive' : '',
                                )}
                                inputMode="numeric"
                                maxLength={2}
                                aria-invalid={Boolean(validation.issue)}
                            />
                            <Button
                                type="button"
                                onClick={controller.add}
                                disabled={controller.isAdding}
                                aria-busy={controller.isAdding}
                                className="group inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 text-xs font-bold shadow-2xs transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                            >
                                <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
                                <span className="whitespace-nowrap">{controller.isAdding ? copy.addingClass : copy.addClass}</span>
                            </Button>
                        </div>

                        <div className="pt-1 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={controller.toggleMode}
                                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary font-medium transition-colors cursor-pointer group py-0.5"
                            >
                                <CircleHelp className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform shrink-0" />
                                <span className="underline decoration-border group-hover:decoration-primary underline-offset-2">
                                    {copy.customNameQuestion}
                                </span>
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Nom personnalisé */
                    <div className="space-y-2.5">
                        <label htmlFor="onboarding-custom-class" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            <CircleHelp className="h-3.5 w-3.5 text-primary shrink-0" />
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
                                        'h-11 rounded-xl border-border bg-card px-3 text-start text-xs font-medium shadow-2xs hover:border-slate-300 focus-visible:border-primary focus-visible:ring-primary sm:text-sm',
                                        showIssue ? 'border-destructive bg-destructive/10 text-destructive focus-visible:ring-destructive' : '',
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
                                className="group inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-4 text-xs font-bold shadow-2xs transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                            >
                                <Plus className="h-4 w-4 transition-transform group-hover:scale-110" />
                                <span className="whitespace-nowrap">{controller.isAdding ? copy.addingClass : copy.addClass}</span>
                            </Button>
                        </div>

                        <div className="pt-1">
                            <button
                                type="button"
                                onClick={controller.toggleMode}
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary font-medium transition-colors cursor-pointer py-0.5"
                            >
                                <span>{copy.switchToCatalogQuestion}</span>
                            </button>
                        </div>
                    </div>
                )}

                {showIssue && message && (
                    <p className="text-xs font-semibold text-destructive" aria-live="polite">
                        {message}
                    </p>
                )}
            </div>
        </div>
    );
});

ClassDraftForm.displayName = 'ClassDraftForm';
