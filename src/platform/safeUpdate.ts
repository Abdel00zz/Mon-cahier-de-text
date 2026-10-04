export interface SafePwaActionEnvironment {
  canApply: () => boolean;
  setTimer: (callback: () => void, delay: number) => number;
  clearTimer: (timer: number) => void;
  subscribe: (changed: () => void) => () => void;
}

function canApplyPwaAction(): boolean {
  if (document.visibilityState !== 'visible' || document.documentElement.dataset.nativeActive === 'false') return false;
  if (document.querySelector('[role="dialog"], [role="alertdialog"], [data-pwa-update-blocked="true"], [aria-busy="true"]')) return false;
  const focused = document.activeElement;
  return !(focused instanceof HTMLElement && focused.matches('input, textarea, select, [contenteditable]:not([contenteditable="false"])'));
}

const browserEnvironment = (): SafePwaActionEnvironment => ({
  canApply: canApplyPwaAction,
  setTimer: (callback, delay) => window.setTimeout(callback, delay),
  clearTimer: timer => window.clearTimeout(timer),
  subscribe: changed => {
    const events = ['input', 'change', 'focusout', 'pointerup', 'visibilitychange'] as const;
    events.forEach(event => document.addEventListener(event, changed));
    const observer = new MutationObserver(changed);
    observer.observe(document.documentElement, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['data-pwa-update-blocked', 'aria-busy', 'role'],
    });
    return () => {
      events.forEach(event => document.removeEventListener(event, changed));
      observer.disconnect();
    };
  },
});

/** Apply once after a quiet moment; wait for events rather than polling an open form. */
export function startSafePwaAction(action: () => void, environment = browserEnvironment()): () => void {
  let stopped = false;
  let timer: number | undefined;
  let unsubscribe = () => {};
  const stop = () => {
    stopped = true;
    if (timer !== undefined) environment.clearTimer(timer);
    unsubscribe();
  };
  const changed = () => {
    if (timer !== undefined) environment.clearTimer(timer);
    if (stopped) return;
    timer = environment.setTimer(() => {
      timer = undefined;
      if (!environment.canApply()) return;
      stop();
      action();
    }, 1500);
  };
  unsubscribe = environment.subscribe(changed);
  changed();
  return stop;
}
