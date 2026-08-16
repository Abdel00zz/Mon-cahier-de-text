import { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, CircleHelp, BookOpen, Check, GraduationCap } from '@/components/ui/icons';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatLocalizedClassDisplayName, formatLocalizedSubjectDisplayName, SUBJECTS } from '@/constants';
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
    const { draft, validation, showValidation, activeSubject, selectedSubjects, setSubject } = controller;
    const value = draft.mode === 'catalog' ? draft.group : draft.label;
    const showIssue = Boolean(validation.issue && (showValidation || value));
    const message = useMemo(() => issueMessage(validation.issue, copy), [copy, validation.issue]);

    // Liste des matières à afficher sous forme de badges rapides
    const quickSubjects = useMemo(() => {
        const list = selectedSubjects.length > 0 ? [...selectedSubjects] : SUBJECTS.slice(0, 4);
        if (activeSubject && !list.includes(activeSubject)) {
            list.push(activeSubject);
        }
        return list;
    }, [selectedSubjects, activeSubject]);

    return (
        <div className="mt-4 space-y-3.5 text-start">
            {/* Zone d'affectation intelligente de matière (pratique & aérée) */}
            <div className="rounded-2xl border border-border/80 bg-card p-3.5 sm:p-4 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <BookOpen className="h-4 w-4" />
                        </div>
                        <div>
                            <span className="text-xs font-bold text-foreground">
                                {copy.subjectToAssign}
                            </span>
                        </div>
                    </div>

                    {/* Sélecteur de toutes les matières officielles */}
                    <div className="w-auto">
                        <Select value={activeSubject} onValueChange={setSubject}>
                            <SelectTrigger
                                aria-label={copy.otherSubject}
                                className="h-7 text-[11px] font-semibold rounded-full border-border bg-muted/60 px-2.5 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                            >
                                <SelectValue placeholder={copy.otherSubject} />
                            </SelectTrigger>
                            <SelectContent align={lang === 'ar' ? 'start' : 'end'} className="max-h-60">
                                {SUBJECTS.map(subj => (
                                    <SelectItem key={subj} value={subj} className="text-xs">
                                        {formatLocalizedSubjectDisplayName(subj, lang)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Pilules de sélection rapide et réactive des matières choisies */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {quickSubjects.map(subj => {
                        const isSelected = activeSubject === subj;
                        return (
                            <button
                                key={subj}
                                type="button"
                                onClick={() => setSubject(subj)}
                                className={cn(
                                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95',
                                    isSelected
                                        ? 'bg-primary text-primary-foreground shadow-xs ring-2 ring-primary/20 scale-[1.02]'
                                        : 'bg-muted/50 hover:bg-muted border border-border/70 text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {isSelected ? (
                                    <Check className="h-3.5 w-3.5" />
                                ) : (
                                    <GraduationCap className="h-3.5 w-3.5 opacity-60" />
                                )}
                                <span>{formatLocalizedSubjectDisplayName(subj, lang)}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

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
                        {/* Main Choice Row: [ Level Select ] [ Group # ] [ Add Button ] */}
                        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                            {/* Level Select */}
                            <div className="min-w-[150px] flex-1">
                                <Select value={draft.level} onValueChange={controller.setLevel}>
                                    <SelectTrigger
                                        aria-label={copy.levelPlaceholder}
                                        className="h-11 rounded-xl border-border bg-card text-start text-xs font-semibold shadow-2xs hover:border-slate-300 focus:border-primary focus:ring-primary sm:text-sm"
                                    >
                                        <SelectValue placeholder={copy.levelPlaceholder} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LEVEL_GROUPS[cycle].map(group => (
                                            <SelectGroup key={group.key}>
                                                <SelectLabel className="py-1.5 text-xs font-bold text-muted-foreground">
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

                            {/* Group Number Input */}
                            <div className="w-20 shrink-0 sm:w-22">
                                <Input
                                    aria-label={copy.groupPlaceholder}
                                    type="text"
                                    value={draft.group}
                                    onChange={event => controller.setGroup(event.target.value)}
                                    onBlur={controller.normalizeGroup}
                                    placeholder={lang === 'ar' ? 'رقم' : 'N°'}
                                    className={cn(
                                        'h-11 w-full rounded-xl border-border bg-card text-center text-xs font-bold shadow-2xs hover:border-slate-300 focus-visible:border-primary focus-visible:ring-primary sm:text-sm',
                                        showIssue ? 'border-destructive bg-destructive/10 text-destructive focus-visible:ring-destructive' : '',
                                    )}
                                    inputMode="numeric"
                                    maxLength={2}
                                    aria-invalid={Boolean(validation.issue)}
                                />
                            </div>

                            {/* Add Class Button */}
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

                        {/* Custom Name Question at the Bottom */}
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
                    /* Custom Name Mode */
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

