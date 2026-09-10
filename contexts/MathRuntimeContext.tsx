import { createContext, useContext } from 'react';

export type MathRuntimeStatus = 'loading' | 'ready' | 'degraded';

export interface MathRuntimeState {
  status: MathRuntimeStatus;
  ready: boolean;
}

const NOOP_FINISH = () => {};

/** Hors fournisseur, le texte LaTeX reste lisible et ne bloque jamais l'interface. */
export const MathRuntimeContext = createContext<MathRuntimeState>({
  status: 'degraded',
  ready: false,
});

/** Contextes séparés : le compteur ne provoque pas le rerender de chaque formule. */
export const MathTypesetRegistrationContext = createContext<() => () => void>(() => NOOP_FINISH);
export const MathTypesetPendingContext = createContext(0);

export const useMathRuntime = (): MathRuntimeState => useContext(MathRuntimeContext);
export const useMathTypesetRegistration = () => useContext(MathTypesetRegistrationContext);
export const usePendingMathTypesets = () => useContext(MathTypesetPendingContext);
