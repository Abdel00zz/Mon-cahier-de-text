/** Capacitor events do not update navigator.onLine in Android's WebView. */
export function isNetworkOnline(): boolean {
  const native = typeof document === 'undefined' ? undefined : document.documentElement?.dataset.nativeOnline;
  if (native !== undefined) return native === 'true';
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

interface NativeNetwork {
  getStatus(): Promise<{ connected: boolean }>;
  addListener(event: 'networkStatusChange', listener: (status: { connected: boolean }) => void): Promise<{ remove(): Promise<void> }>;
}

interface NetworkEnvironment {
  publish(connected: boolean): void;
  subscribeResume(refresh: () => void): () => void;
}

const browserEnvironment = (): NetworkEnvironment => ({
  publish(connected) {
    const previous = isNetworkOnline();
    document.documentElement.dataset.nativeOnline = String(connected);
    // Store the native truth before waking authentication and sync consumers.
    if (previous !== connected) window.dispatchEvent(new Event(connected ? 'online' : 'offline'));
  },
  subscribeResume(refresh) {
    window.addEventListener('native-resume', refresh);
    return () => window.removeEventListener('native-resume', refresh);
  },
});

/** No polling: native events plus a fresh snapshot on launch/resume.
 * A newer event always wins over an older asynchronous status query. */
export function startNativeNetworkMonitoring(network: NativeNetwork, environment = browserEnvironment()): () => void {
  let disposed = false;
  let revision = 0;
  let listener: { remove(): Promise<void> } | undefined;
  const refresh = () => {
    const request = ++revision;
    void network.getStatus().then(status => {
      if (!disposed && request === revision) environment.publish(status.connected);
    }).catch(() => { /* Keep the last known state; a plugin failure is not an offline signal. */ });
  };
  const unsubscribe = environment.subscribeResume(refresh);
  void network.addListener('networkStatusChange', status => {
    if (disposed) return;
    revision++;
    environment.publish(status.connected);
  }).then(handle => {
    if (disposed) { void handle.remove().catch(() => {}); return; }
    listener = handle;
    refresh();
  }).catch(() => { if (!disposed) refresh(); });
  return () => {
    disposed = true;
    revision++;
    unsubscribe();
    void listener?.remove().catch(() => {});
  };
}
