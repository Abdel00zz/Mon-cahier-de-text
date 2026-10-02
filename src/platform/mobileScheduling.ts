import { getBundledCalendar, todayInMorocco, type HolidayCalendar } from '../domain/calendar/calendar.js';

/** Local midnight, including Morocco's Ramadan offset changes; never assumes a 24h day. */
export function millisecondsUntilNextMoroccoDay(now = new Date(), calendar: HolidayCalendar = getBundledCalendar()): number {
  const start = now.getTime();
  const today = todayInMorocco(now, calendar);
  let low = start;
  let high = start + 27 * 3600_000;
  while (high - low > 100) {
    const middle = Math.floor((low + high) / 2);
    if (todayInMorocco(new Date(middle), calendar) === today) low = middle;
    else high = middle;
  }
  return Math.max(100, high - start + 100);
}

export interface ForegroundSchedulerEnvironment {
  active: () => boolean;
  saveData: () => boolean;
  setTimer: (callback: () => void, delay: number) => number;
  clearTimer: (timer: number) => void;
  subscribe: (wake: () => void) => () => void;
}

const browserEnvironment = (): ForegroundSchedulerEnvironment => ({
  active: () => document.visibilityState === 'visible' && document.documentElement?.dataset.nativeActive !== 'false' && navigator.onLine,
  saveData: () => (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true,
  setTimer: (callback, delay) => window.setTimeout(callback, delay),
  clearTimer: timer => window.clearTimeout(timer),
  subscribe: wake => {
    const windowEvents = ['online', 'offline', 'pageshow'] as const;
    windowEvents.forEach(event => window.addEventListener(event, wake));
    document.addEventListener('visibilitychange', wake);
    return () => {
      windowEvents.forEach(event => window.removeEventListener(event, wake));
      document.removeEventListener('visibilitychange', wake);
    };
  },
});

/** One timer after completion; zero periodic wakeups while hidden/offline, bounded error backoff. */
export function startForegroundPolling(
  task: () => Promise<boolean | void>,
  options: { interval: number; onInactive?: () => void; environment?: ForegroundSchedulerEnvironment },
): () => void {
  const environment = options.environment ?? browserEnvironment();
  let timer: number | undefined;
  let stopped = false;
  let running = false;
  let wakeRequested = false;
  let failures = 0;
  const clear = () => { if (timer !== undefined) environment.clearTimer(timer); timer = undefined; };
  const wake = () => {
    clear();
    if (stopped) return;
    if (!environment.active()) { wakeRequested = false; options.onInactive?.(); return; }
    if (running) { wakeRequested = true; return; }
    running = true;
    void (async () => {
      let success: boolean | void = false;
      try { success = await task(); } catch { /* The caller owns its error UI. */ }
      failures = success === false ? Math.min(failures + 1, 3) : 0;
      running = false;
      if (stopped || !environment.active()) return;
      if (wakeRequested) { wakeRequested = false; wake(); return; }
      const delay = options.interval * Math.max(environment.saveData() ? 2 : 1, 2 ** failures);
      timer = environment.setTimer(wake, delay);
    })();
  };
  const unsubscribe = environment.subscribe(wake);
  wake();
  return () => { stopped = true; clear(); unsubscribe(); };
}
