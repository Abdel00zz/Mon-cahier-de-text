import React from 'react';

/**
 * KaTeX rend les formules de façon synchrone : il n'existe plus d'état de
 * chargement, ni de typeset en attente. Ce module ne conserve que l'API
 * attendue par les écrans qui affichaient un indicateur pendant le rendu
 * mathématique — désormais toujours « prêt ».
 */
export type MathRuntimeStatus = 'loading' | 'ready' | 'degraded';

interface MathRuntimeState {
  status: MathRuntimeStatus;
  ready: boolean;
}

const READY_STATE: MathRuntimeState = Object.freeze({ status: 'ready', ready: true });

export const MathRuntimeContext = React.createContext<MathRuntimeState>(READY_STATE);
export const MathTypesetPendingContext = React.createContext(0);
export const MathTypesetRegistrationContext = React.createContext<() => () => void>(() => () => {});

export const useMathRuntime = (): MathRuntimeState => READY_STATE;
export const usePendingMathTypesets = (): number => 0;
export const useMathTypesetRegistration = (): (() => () => void) => () => () => {};
