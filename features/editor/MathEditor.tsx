import React, { useState } from 'react';
import { MathJaxContext } from 'better-react-mathjax';
import { AppBootSkeleton } from '@/components/ui/PageSkeleton';
import { MATHJAX_V4_SRC, mathJaxConfig } from '@/config/mathJax';
import { Editor, type EditorProps } from './Editor';

/**
 * Le moteur LaTeX est isolé du reste de l'application : le tableau de bord,
 * les paramètres et les modales ordinaires restent immédiatement interactifs.
 * L'éditeur, lui, conserve une attente honnête tant que les formules ne sont
 * pas prêtes à être composées.
 */
export const MathEditor: React.FC<EditorProps> = (props) => {
  const [mathJaxState, setMathJaxState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  return (
    <MathJaxContext
      version={3}
      src={MATHJAX_V4_SRC}
      config={mathJaxConfig}
      onLoad={() => setMathJaxState('ready')}
      // Hors connexion, le cahier demeure accessible avec la syntaxe source.
      onError={() => setMathJaxState('unavailable')}
    >
      <Editor {...props} />
      {mathJaxState === 'loading' && <AppBootSkeleton stage="latex" overlay />}
    </MathJaxContext>
  );
};
