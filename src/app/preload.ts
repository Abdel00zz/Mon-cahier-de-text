/** A failed speculative load must remain retryable and never reject an event handler. */
const preload = (load: () => Promise<unknown>) => {
  let pending: Promise<unknown> | null = null;
  return () => {
    if (typeof window === 'undefined') return null;
    pending ??= load().catch(() => { pending = null; });
    return pending;
  };
};


/**
 * Préchargement de la page de paramètres pour éliminer la latence au clic.
 */
export const preloadSettingsPage = preload(() => Promise.all([
  import('@/features/settings/SettingsPage'),
  import('@/features/settings/components/ScheduleTab'),
]));
