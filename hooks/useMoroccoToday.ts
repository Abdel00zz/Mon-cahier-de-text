import { useSyncExternalStore } from 'react';
import { todayInMorocco } from '../utils/calendar';
import { millisecondsUntilNextMoroccoDay } from '../utils/mobileScheduling';

const listeners = new Set<() => void>();
let today = todayInMorocco();
let timer: number | undefined;
const snapshot = () => today;
const refresh = () => {
  if (timer !== undefined) window.clearTimeout(timer);
  timer = undefined;
  const next = todayInMorocco();
  if (today !== next) { today = next; listeners.forEach(listener => listener()); }
  if (listeners.size && document.visibilityState === 'visible') {
    timer = window.setTimeout(refresh, millisecondsUntilNextMoroccoDay());
  }
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('pageshow', refresh);
    refresh();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('pageshow', refresh);
    }
  };
};

/** Shared midnight timer, suspended with the page instead of one interval per consumer. */
export function useMoroccoToday(): string {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
