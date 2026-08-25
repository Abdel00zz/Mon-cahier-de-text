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
                    className="h-12 rounded-xl border-slate-200 bg-white px-4 text-start text-lg font-itim font-bold text-[#0056D2] shadow-2xs transition-all placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal placeholder:text-base hover:border-indigo-300 focus-visible:border-indigo-600 focus-visible:ring-indigo-500/20"
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
                    className="h-12 rounded-xl border-slate-200 bg-white px-4 text-start text-base shadow-2xs transition-all placeholder:text-slate-400 hover:border-indigo-300 focus-visible:border-indigo-600 focus-visible:ring-indigo-500/20"
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
                                'group relative flex min-h-[138px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border p-4 text-center outline-none transition-[border-color,background-color,box-shadow,transform] duration-200 focus-visible:ring-4 focus-visible:ring-blue-500/15 active:scale-[0.99]',
                                active
                                    ? 'border-blue-500 bg-blue-50 shadow-[0_8px_24px_rgba(37,99,235,0.10)] ring-1 ring-blue-500'
                                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                            )}
                        >
                            <div className={cn(
                                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300',
                                active
                                    ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(37,99,235,0.22)]'
                                    : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600',
                            )}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <span className={cn('block text-sm font-black sm:text-base', active ? 'text-indigo-950' : 'text-slate-900')}>
                                    {copy.cycleLabels[option.key]}
                                </span>
                                <span className={cn('mt-0.5 block text-xs font-medium', active ? 'text-indigo-700 font-semibold' : 'text-slate-500')}>
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
