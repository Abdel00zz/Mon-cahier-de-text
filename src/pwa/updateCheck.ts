interface UpdateCheckEnvironment {
  active(): boolean;
  now(): number;
  subscribe(check: () => void): () => void;
}
const environment = (): UpdateCheckEnvironment => ({
  active: () => document.visibilityState === 'visible' && navigator.onLine
    && !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
  now: () => Date.now(),
  subscribe: check => {
    document.addEventListener('visibilitychange', check);
    window.addEventListener('online', check);
    window.addEventListener('focus', check);
    return () => {
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('online', check);
      window.removeEventListener('focus', check);
    };
  },
});

/** Refresh long-lived PWAs on return; no recurring timer or hidden traffic. */
export function startPwaUpdateChecks(registration: Pick<ServiceWorkerRegistration, 'update'>, env = environment()): () => void {
  let stopped = false;
  let inFlight = false;
  let nextCheck = env.now() + 3600_000; // Registration already checked on startup.
  const check = () => {
    if (stopped || inFlight || !env.active() || env.now() < nextCheck) return;
    inFlight = true;
    nextCheck = env.now() + 3600_000;
    void registration.update().catch(() => { nextCheck = env.now() + 600_000; })
      .finally(() => { inFlight = false; });
  };
  const unsubscribe = env.subscribe(check);
  return () => { stopped = true; unsubscribe(); };
}
