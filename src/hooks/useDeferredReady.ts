import { useEffect, useState } from 'react';

/**
 * Diffère un module lourd (compagnon, moteurs secondaires) jusqu'au premier
 * temps mort du navigateur. Le contenu principal devient interactif d'abord,
 * puis le confort se charge sans voler une frame à la saisie. Le délai de
 * repli garantit que la fonctionnalité arrive même sur un appareil qui ne
 * connaît pas `requestIdleCallback`.
 */
export function useDeferredReady(fallbackDelayMs = 900, idleTimeoutMs = 1800): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    let timeoutId: number | undefined;
    let idleId: number | undefined;
    const enable = () => { if (!cancelled) setReady(true); };
    if (typeof window.requestIdleCallback === 'function') {
      idleId = window.requestIdleCallback(enable, { timeout: idleTimeoutMs });
    } else {
      timeoutId = window.setTimeout(enable, fallbackDelayMs);
    }
    return () => {
      cancelled = true;
      if (idleId !== undefined && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [fallbackDelayMs, idleTimeoutMs]);
  return ready;
}
