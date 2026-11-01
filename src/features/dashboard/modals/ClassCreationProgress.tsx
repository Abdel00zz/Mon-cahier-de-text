import { Check } from '@/components/ui/icons';
import type { WizardStep } from './classCreationFlow';

interface ClassCreationProgressProps {
  steps: WizardStep[];
  currentIndex: number;
  label: string;
  stepLabel: (step: WizardStep) => string;
  onReturn: (step: WizardStep) => void;
}

/** Completed steps remain reachable without clearing the teacher's draft. */
export function ClassCreationProgress({ steps, currentIndex, label, stepLabel, onReturn }: ClassCreationProgressProps) {
  const progressRatio = steps.length > 1 ? Math.min(1, Math.max(0, currentIndex / (steps.length - 1))) : 0;
  return <nav className="class-create-progress" aria-label={label}>
    <ol style={{
      gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
      ['--step-progress' as string]: String(progressRatio),
    }}>
      {steps.map((step, index) => {
        const complete = index < currentIndex;
        const state = complete ? 'complete' : index === currentIndex ? 'current' : 'upcoming';
        const content = <>
          <span className="class-create-progress-number" aria-hidden="true">{complete ? <Check /> : index + 1}</span>
          <span className="class-create-progress-label">{stepLabel(step)}</span>
        </>;
        return <li key={step} data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
          {complete ? <button type="button" onClick={() => onReturn(step)}>{content}</button> : <span className="class-create-progress-item">{content}</span>}
        </li>;
      })}
    </ol>
  </nav>;
}
