import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';
import { todayInMorocco } from '../domain/calendar/calendar';
import { millisecondsUntilNextMoroccoDay } from '../platform/mobileScheduling';

const todayStore = createStore<{ today: string }>(() => ({ today: todayInMorocco() }));
let subscribers = 0;
let timer: number | undefined;
const snapshot = () => todayStore.getState().today;
const refresh = () => {
  if (timer !== undefined) window.clearTimeout(timer);
  timer = undefined;
  const next = todayInMorocco();
  if (todayStore.getState().today !== next) {
    todayStore.setState({ today: next });
  }
  if (subscribers > 0 && document.visibilityState === 'visible') {
    timer = window.setTimeout(refresh, millisecondsUntilNextMoroccoDay());
  }
};
const subscribe = (listener: () => void) => {
  const unsub = todayStore.subscribe(listener);
  subscribers += 1;
  if (subscribers === 1) {
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('pageshow', refresh);
    refresh();
  }
  return () => {
    unsub();
    subscribers -= 1;
    if (!subscribers) {
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
