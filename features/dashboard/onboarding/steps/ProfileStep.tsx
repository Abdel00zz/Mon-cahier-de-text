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
        className="grid gap-3 sm:grid-cols-3"
        role="group"
        aria-label={copy.teachingCycle}
      >
        {ONBOARDING_CYCLES.map(({ key, icon: Icon }) => (
          <button
            key={key}
            type="button"
            aria-pressed={cycles.includes(key)}
            onClick={() =>
              onCyclesChange(
                cycles.includes(key)
                  ? cycles.filter((c) => c !== key)
                  : [...cycles, key],
              )
            }
            className="keep-surface keep-interactive keep-choice flex min-h-24 items-center gap-3 p-4 text-start sm:min-h-36 sm:flex-col sm:items-start"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/5 dark:bg-white/10">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-semibold">
                {copy.cycleLabels[key]}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-[#5f6368] dark:text-[#bdc1c6]">
                {copy.cycleDescriptions[key]}
              </span>
            </span>
          </button>
        ))}
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
