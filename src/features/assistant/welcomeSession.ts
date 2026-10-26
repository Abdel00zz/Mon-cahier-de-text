import { useCallback, useEffect, useState } from 'react';

/** One brief greeting per app document, shared across remounts and React StrictMode. */
export function createWelcomeSession(duration = 3600) {
  let deadline: number | undefined;
  return {
    remaining(now: number): number {
      deadline ??= now + duration;
      return Math.max(0, deadline - now);
    },
    dismiss() { deadline = 0; },
  };
}

const companionWelcome = createWelcomeSession();

export function useCompanionWelcome() {
  const [welcoming, setWelcoming] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      clearTimeout(timer);
      if (document.hidden) { setWelcoming(false); return; }
      const remaining = companionWelcome.remaining(performance.now());
      setWelcoming(remaining > 0);
      if (remaining > 0) timer = setTimeout(() => setWelcoming(false), remaining);
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', sync); };
  }, []);

  const dismissWelcome = useCallback(() => {
    companionWelcome.dismiss();
    setWelcoming(false);
  }, []);

  return { welcoming, dismissWelcome };
}
