import { startSafePwaAction } from './safeUpdate';

export type WebUpdateState = 'idle' | 'checking' | 'current' | 'downloading' | 'downloaded' | 'pending' | 'applying' | 'offline' | 'unavailable' | 'error';
interface UpdateEnvironment {
  online(): boolean;
  schedule(action: () => void): () => void;
}

/** One controller for automatic checks and the help panel. No polling timer. */
export function createWebUpdateControl(environment: UpdateEnvironment) {
  let state: WebUpdateState = 'unavailable';
  let registration: ServiceWorkerRegistration | undefined;
  let activate: (() => Promise<void>) | undefined;
  let cancel: (() => void) | undefined;
  let inFlight: Promise<void> | undefined;
  let detach = () => {};
  let applying = false;
  const listeners = new Set<() => void>();
  const set = (next: WebUpdateState) => {
    if (state === next) return;
    state = next;
    listeners.forEach(listener => listener());
  };
  const ready = () => { if (!applying && state !== 'pending') set('downloaded'); };
  const apply = (explicit = true) => {
    if (!activate || applying) return;
    if (cancel) { if (explicit) set('pending'); return; }
    if (explicit) set('pending');
    cancel = environment.schedule(() => {
      cancel = undefined;
      applying = true;
      set('applying');
      void activate!().catch(() => { applying = false; set('error'); });
    });
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    attach(next: ServiceWorkerRegistration, activation: () => Promise<void>) {
      detach();
      registration = next;
      activate = activation;
      const workers = new Map<ServiceWorker, () => void>();
      const observe = (worker: ServiceWorker | null) => {
        if (!worker || workers.has(worker)) return;
        const changed = () => {
          if (worker.state === 'installing' && state !== 'pending') set('downloading');
          if (worker.state === 'installed') {
            if (next.waiting) ready();
            else if (!applying) set('current');
          }
          if (worker.state === 'redundant' && state === 'downloading') set('error');
          if (worker.state === 'activated' || worker.state === 'redundant') {
            worker.removeEventListener('statechange', changed);
            workers.delete(worker);
          }
        };
        workers.set(worker, changed);
        worker.addEventListener('statechange', changed);
        changed();
      };
      const found = () => observe(next.installing);
      next.addEventListener('updatefound', found);
      observe(next.installing);
      if (next.waiting) ready();
      else if (!next.installing) set(next.active ? 'idle' : 'unavailable');
      detach = () => {
        next.removeEventListener('updatefound', found);
        workers.forEach((changed, worker) => worker.removeEventListener('statechange', changed));
        workers.clear();
      };
    },
    ready,
    apply,
    cancel() {
      cancel?.(); cancel = undefined;
      if (state === 'pending') readyAfterCancellation();
    },
    check(): Promise<void> {
      if (inFlight) return inFlight;
      if (state === 'downloaded' || state === 'pending' || applying || registration?.installing) return Promise.resolve();
      if (!registration) { set('unavailable'); return Promise.resolve(); }
      if (!environment.online()) { set('offline'); return Promise.resolve(); }
      set('checking');
      const current = registration;
      inFlight = Promise.resolve().then(async () => {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try {
          await Promise.race([current.update(), new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error('Update check timed out')), 12_000);
          })]);
          if (registration !== current || state !== 'checking') return; // A worker lifecycle event is authoritative.
          set(current.waiting ? 'downloaded' : current.installing ? 'downloading' : current.active ? 'current' : 'unavailable');
        } catch { if (registration === current && state === 'checking') set(environment.online() ? 'error' : 'offline'); }
        finally { if (timeout) clearTimeout(timeout); inFlight = undefined; }
      });
      return inFlight;
    },
  };
  function readyAfterCancellation() { set('downloaded'); }
}

export const webUpdates = createWebUpdateControl({ online: () => navigator.onLine, schedule: startSafePwaAction });
