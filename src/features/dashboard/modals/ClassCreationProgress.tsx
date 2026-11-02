import { Check } from '@/components/ui/icons';
import type { WizardStep } from './classCreationFlow';

interface ClassCreationProgressProps {
  steps: WizardStep[];
  currentIndex: number;
  label: string;
  stepLabel: (step: WizardStep) => string;
  onReturn: (step: WizardStep) => void;
}

/**
 * Stepper circuit style inspiré de Google One & Claude mobile :
 * Nœuds circulaires élégants, circuit de liaison avec remplissage animé terracotta,
 * typographie soignée et sans encombrement.
 */
export function ClassCreationProgress({ steps, currentIndex, label, stepLabel, onReturn }: ClassCreationProgressProps) {
  const count = steps.length;
  const progressRatio = count > 1 ? Math.min(1, Math.max(0, currentIndex / (count - 1))) : 0;

  return (
    <nav className="claude-circuit-steps" aria-label={label}>
      {/* Circuit track de liaison */}
      <div className="claude-circuit-track" aria-hidden="true">
        <div
          className="claude-circuit-fill"
          style={{ width: `${progressRatio * 100}%` }}
        />
      </div>

      {steps.map((step, index) => {
        const complete = index < currentIndex;
        const current = index === currentIndex;
        const state = complete ? 'complete' : current ? 'current' : 'upcoming';

        const nodeContent = (
          <>
            <span className="claude-circuit-node" aria-hidden="true">
              {complete ? (
                <Check className="h-4 w-4 stroke-[2.5]" />
              ) : (
                <span>{index + 1}</span>
              )}
            </span>
            <span className="claude-circuit-label">{stepLabel(step)}</span>
          </>
        );

        return (
          <div
            key={step}
            className="claude-circuit-step"
            data-state={state}
            aria-current={current ? 'step' : undefined}
          >
            {complete ? (
              <button
                type="button"
                onClick={() => onReturn(step)}
                className="flex flex-col items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer"
                title={stepLabel(step)}
              >
                {nodeContent}
              </button>
            ) : (
              <div className="flex flex-col items-center gap-1.5">
                {nodeContent}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
