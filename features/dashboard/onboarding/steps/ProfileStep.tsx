import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { ONBOARDING_CYCLES } from '../content';
import { cn } from '@/lib/utils';
import type { Cycle } from '@/types';
import type { OnboardingCopy } from '../types';

interface ProfileStepProps {
    teacherName: string;
    establishmentName: string;
    cycles: Cycle[];
    copy: OnboardingCopy;
    onTeacherNameChange: (name: string) => void;
    onEstablishmentChange: (name: string) => void;
    onCyclesChange: (cycles: Cycle[]) => void;
}

export const ProfileStep = memo<ProfileStepProps>(({
    teacherName,
    establishmentName,
    cycles,
    copy,
    onTeacherNameChange,
    onEstablishmentChange,
    onCyclesChange,
}) => (
    <div className="max-w-2xl space-y-6 animate-fade-in duration-500">
        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs sm:p-6">
            <div className="space-y-1.5">
                <label htmlFor="onboarding-teacher-name" className="block text-start text-xs font-bold uppercase tracking-wide text-slate-700">{copy.fullName}</label>
                <Input
                    id="onboarding-teacher-name"
                    type="text"
                    value={teacherName}
                    onChange={event => onTeacherNameChange(event.target.value)}
                    placeholder={copy.fullNamePlaceholder}
                    className="h-12 rounded-[12px] border-slate-200 bg-white px-4 text-start text-lg font-itim font-bold text-[#0056D2] shadow-2xs transition-all placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal placeholder:text-base hover:border-indigo-300 focus-visible:border-indigo-600 focus-visible:ring-indigo-500/20"
                    autoFocus
                />
            </div>
            <div className="space-y-1.5">
                <label htmlFor="onboarding-establishment" className="block text-start text-xs font-bold uppercase tracking-wide text-slate-700">{copy.establishment}</label>
                <Input
                    id="onboarding-establishment"
                    type="text"
                    value={establishmentName}
                    onChange={event => onEstablishmentChange(event.target.value)}
                    placeholder={copy.establishmentPlaceholder}
                    className="h-12 rounded-[12px] border-slate-200 bg-white px-4 text-start text-base shadow-2xs transition-all placeholder:text-slate-400 hover:border-indigo-300 focus-visible:border-indigo-600 focus-visible:ring-indigo-500/20"
                />
            </div>
        </div>

        <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-baseline justify-between gap-1.5">
                <p className="text-start text-sm font-bold text-slate-800">{copy.teachingCycle}</p>
                {cycles.length === 0 && (
                    <p className="text-start text-xs font-semibold text-blue-700" role="status">{copy.cycleSelectionHint}</p>
                )}
            </div>
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
                {ONBOARDING_CYCLES.map(option => {
                    const active = cycles.includes(option.key);
                    const Icon = option.icon;
                    return (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => {
                                onCyclesChange(
                                    active
                                        ? cycles.filter(cycle => cycle !== option.key)
                                        : [...cycles, option.key],
                                );
                            }}
                            aria-pressed={active}
                            className={cn(
                                'keep-surface keep-interactive keep-choice group relative flex min-h-[138px] cursor-pointer flex-col items-center justify-center gap-3 p-4 text-center',
                            )}
                        >
                            <div className={cn(
                                'flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] bg-black/5 dark:bg-white/10',
                            )}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <span className="block text-sm font-semibold sm:text-base">
                                    {copy.cycleLabels[option.key]}
                                </span>
                                <span className="mt-0.5 block text-xs text-[#5f6368] dark:text-[#bdc1c6]">
                                    {copy.cycleDescriptions[option.key]}
                                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    </div>
));

ProfileStep.displayName = 'ProfileStep';
