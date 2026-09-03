import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { ONBOARDING_CYCLES } from '../content';
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

export const ProfileStep = memo<ProfileStepProps>(
  ({
    teacherName,
    establishmentName,
    cycles,
    copy,
    onTeacherNameChange,
    onEstablishmentChange,
    onCyclesChange,
  }) => (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed text-[#5f6368] dark:text-[#bdc1c6]">
        {copy.cycleSelectionHint}
      </p>
      <div
        className="grid gap-3.5 sm:grid-cols-3"
        role="group"
        aria-label={copy.teachingCycle}
      >
        {ONBOARDING_CYCLES.map(({ key }) => {
          const isSelected = cycles.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isSelected}
              onClick={() =>
                onCyclesChange(
                  isSelected
                    ? cycles.filter((c) => c !== key)
                    : [...cycles, key],
                )
              }
              className={`group relative flex min-h-[136px] flex-col items-center justify-center rounded-2xl border p-5 text-center transition-all duration-200 cursor-pointer sm:min-h-[150px] sm:p-6 ${
                isSelected
                  ? 'border-2 border-amber-400 bg-amber-400/10 shadow-xs dark:border-amber-400 dark:bg-amber-400/20'
                  : 'border-[#eaeaea] bg-white text-[#202124] hover:border-neutral-400 hover:bg-[#fafafa] dark:border-[#27272a] dark:bg-[#18181b] dark:text-[#e8eaed] dark:hover:border-neutral-600'
              }`}
            >
              <span className="block text-base font-bold text-[#202124] dark:text-[#e8eaed] sm:text-lg leading-snug">
                {copy.cycleLabels[key]}
              </span>
              <span className="mt-2 block text-xs leading-relaxed text-[#5f6368] dark:text-[#bdc1c6] sm:text-[13px] max-w-[230px]">
                {copy.cycleDescriptions[key]}
              </span>
            </button>
          );
        })}
      </div>
      <details className="keep-surface p-4">
        <summary className="min-h-11 cursor-pointer content-center text-sm font-medium">
          {copy.personalDetails}{' '}
          <span className="text-xs font-normal text-[#5f6368] dark:text-[#bdc1c6]">
            · {copy.optional}
          </span>
        </summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="onboarding-teacher-name"
              className="mb-2 block text-sm"
            >
              {copy.fullName}
            </label>
            <Input
              id="onboarding-teacher-name"
              value={teacherName}
              onChange={(e) => onTeacherNameChange(e.target.value)}
              placeholder={copy.fullNamePlaceholder}
              autoComplete="name"
              className="h-11 rounded-lg bg-transparent text-base"
            />
          </div>
          <div>
            <label
              htmlFor="onboarding-establishment"
              className="mb-2 block text-sm"
            >
              {copy.establishment}
            </label>
            <Input
              id="onboarding-establishment"
              value={establishmentName}
              onChange={(e) => onEstablishmentChange(e.target.value)}
              placeholder={copy.establishmentPlaceholder}
              autoComplete="organization"
              className="h-11 rounded-lg bg-transparent text-base"
            />
          </div>
        </div>
      </details>
    </div>
  ),
);
ProfileStep.displayName = 'ProfileStep';
