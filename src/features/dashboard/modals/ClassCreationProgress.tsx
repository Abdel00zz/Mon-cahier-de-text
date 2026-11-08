import type { WizardStep } from './classCreationFlow';

interface ClassCreationProgressProps {
  steps: WizardStep[];
  currentIndex: number;
  label: string;
  stepLabel: (step: WizardStep) => string;
  onReturn: (step: WizardStep) => void;
}

/**
 * Progression multistep numérotée — cercles 30px à bordure, ligne de liaison
 * qui se remplit (motif « Progress Steps » classique) :
 *
 *   ●━━━━━●━━━━━○━━━━━○     (bordure colorée = étape atteinte)
 *
 * Adaptations au projet (le code d'origine utilisait #3498db + Muli) :
 *   • couleurs : tokens --cm-accent / --cm-border / --cm-sheet (dark inclus) ;
 *   • RTL : la ligne pousse depuis le début logique (inset-inline-start),
 *     donc depuis la DROITE en interface arabe — le remplissage suit la
 *     progression, jamais un `left` physique figé ;
 *   • piste exactement entre les CENTRES du premier et du dernier nœud
 *     (inset calculé : 50/n % de chaque côté), la formule
 *     width = (atteintes − 1) / (n − 1) × 100 % retombe donc pile sur le
 *     centre du nœud atteint ;
 *   • l'étape courante garde un marqueur plein (où suis-je ?), les atteintes
 *     ne changent QUE leur bordure — l'esthétique légère du motif d'origine ;
 *   • a11y : role=list/listitem, aria-current="step", retour cliquable sur
 *     les étapes déjà validées.
 */
export function ClassCreationProgress({ steps, currentIndex, label, stepLabel, onReturn }: ClassCreationProgressProps) {
  const count = steps.length;
  const progressRatio = count > 1 ? Math.min(1, Math.max(0, currentIndex / (count - 1))) : 0;
  /* Inset logique de chaque côté : centre du premier / dernier nœud
     (colonnes flex égales : centre de la colonne i ≈ (i + ½) / n de la largeur). */
  const trackInset = `${50 / count}%`;

  return (
    <nav className="claude-circuit-steps" aria-label={label} role="list">
      {/* Piste de liaison : rail vide + remplissage animé */}
      <div
        className="claude-circuit-track"
        aria-hidden="true"
        style={{ insetInlineStart: trackInset, insetInlineEnd: trackInset }}
      >
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
            {/* Le numéro, toujours — atteinte = bordure, courante = pastille pleine. */}
            <span className="claude-circuit-node" aria-hidden="true">{index + 1}</span>
            <span className="claude-circuit-label">{stepLabel(step)}</span>
          </>
        );

        return (
          <div
            key={step}
            className="claude-circuit-step"
            data-state={state}
            role="listitem"
            aria-current={current ? 'step' : undefined}
          >
            {complete ? (
              <button
                type="button"
                onClick={() => onReturn(step)}
                className="flex flex-col items-center gap-1.5 bg-transparent border-0 p-0 cursor-pointer"
                title={stepLabel(step)}
                aria-label={stepLabel(step)}
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
