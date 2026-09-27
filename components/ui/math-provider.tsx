import React from 'react';
import { MathRuntimeContext, MathTypesetPendingContext, MathTypesetRegistrationContext } from '@/contexts/MathRuntimeContext';

/**
 * KaTeX n'a plus besoin de fournisseur : ni script à télécharger, ni promesse à
 * attendre. Le composant reste comme simple passe-plat, le temps que les
 * appelants historiques disparaissent.
 */
export const MathProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MathRuntimeContext.Provider value={{ status: 'ready', ready: true }}>
    <MathTypesetRegistrationContext.Provider value={() => () => {}}>
      <MathTypesetPendingContext.Provider value={0}>
        {children}
      </MathTypesetPendingContext.Provider>
    </MathTypesetRegistrationContext.Provider>
  </MathRuntimeContext.Provider>
);
