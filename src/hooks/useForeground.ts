import { useEffect } from 'react';
import { useLatest } from './useLatest';

/**
 * Déclenche un callback lorsque l'application revient au premier plan :
 * - `visibilitychange` (lorsque document.visibilityState === 'visible')
 * - `pageshow`
 * - `native-resume` (événement personnalisé Capacitor)
 * - `online`
 */
export function useForeground(onForeground: () => void): void {
  const callbackRef = useLatest(onForeground);

  useEffect(() => {
    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        callbackRef.current();
      }
    };
    const handleEvent = () => {
      callbackRef.current();
    };

    document.addEventListener('visibilitychange', handleVisible);
    window.addEventListener('pageshow', handleEvent);
    window.addEventListener('native-resume', handleEvent);
    window.addEventListener('online', handleEvent);

    return () => {
      document.removeEventListener('visibilitychange', handleVisible);
      window.removeEventListener('pageshow', handleEvent);
      window.removeEventListener('native-resume', handleEvent);
      window.removeEventListener('online', handleEvent);
    };
  }, [callbackRef]);
}
