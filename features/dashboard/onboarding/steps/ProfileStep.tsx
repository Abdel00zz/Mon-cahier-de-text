import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { ONBOARDING_CYCLES } from '../content';
import { cn } from '@/lib/utils';
import type { Cycle } from '@/types';
import type { OnboardingCopy } from '../types';

interface ProfileStepProps {
    teacherName: string;
    establishmentName: string;
    cycle: Cycle;
    copy: OnboardingCopy;
    onTeacherNameChange: (name: string) => void;
    onEstablishmentChange: (name: string) => void;
    onCycleChange: (cycle: Cycle) => void;
}

export const ProfileStep = memo<ProfileStepProps>(({
    teacherName,
    establishmentName,
    cycle,
    copy,
    onTeacherNameChange,
    onEstablishmentChange,
    onCycleChange,
}) => (
    <div className="max-w-2xl space-y-6 animate-fade-in duration-500">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
            <div className="space-y-1.5">
                <label htmlFor="onboarding-teacher-name" className="block text-start text-sm font-semibold text-slate-800">{copy.fullName}</label>
                <Input
                    id="onboarding-teacher-name"
                    type="text"
                    value={teacherName}
                    onChange={event => onTeacherNameChange(event.target.value)}
                    placeholder={copy.fullNamePlaceholder}
                    className="h-12 rounded-lg border-slate-200 bg-white px-4 text-start text-base shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-blue-600 focus-visible:ring-blue-600"
                    autoFocus
                />
            </div>
            <div className="space-y-1.5">
                <label htmlFor="onboarding-establishment" className="block text-start text-sm font-semibold text-slate-800">{copy.establishment}</label>
                <Input
                    id="onboarding-establishment"
                    type="text"
                    value={establishmentName}
                    onChange={event => onEstablishmentChange(event.target.value)}
                    placeholder={copy.establishmentPlaceholder}
                    className="h-12 rounded-lg border-slate-200 bg-white px-4 text-start text-base shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-blue-600 focus-visible:ring-blue-600"
                />
            </div>
        </div>

        <div className="space-y-3 pt-1">
            <p className="text-start text-sm font-semibold text-slate-800">{copy.teachingCycle}</p>
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
                {ONBOARDING_CYCLES.map(option => {
                    const active = cycle === option.key;
                    const Icon = option.icon;
                    return (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => onCycleChange(option.key)}
                            aria-pressed={active}
                            className={cn(
                                'group relative flex min-h-[150px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border p-4 text-center outline-none transition-all duration-300 focus-visible:ring-4 focus-visible:ring-blue-600/20',
                                active
                                    ? 'border-[#5064df] bg-[#f4f6ff] shadow-[0_8px_18px_rgba(80,100,223,0.10)]'
                                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50 hover:shadow-sm',
                            )}
                        >
                            <div className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-300',
                                active ? 'bg-[#5064df] text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200',
                            )}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <div>
                                <span className={cn('block text-sm font-bold sm:text-base', active ? 'text-blue-950' : 'text-slate-900')}>{copy.cycleLabels[option.key]}</span>
                                <span className={cn('mt-0.5 block text-xs font-medium', active ? 'text-blue-700' : 'text-slate-500')}>
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
