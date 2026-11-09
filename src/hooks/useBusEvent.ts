import { useEffect } from 'react';
import { subscribe, type SyncEvent, type SyncListener } from '../infrastructure/sync/syncBus';
import { useLatest } from './useLatest';

/**
 * Abonnement déclaratif aux événements du bus de synchronisation avec nettoyage automatique.
 * Utilise `useLatest` pour garantir que le listener invoque toujours la version la plus récente
 * sans réabonnement intempestif.
 */
export function useBusEvent(
  events: SyncEvent | readonly SyncEvent[],
  listener: SyncListener
): void {
  const listenerRef = useLatest(listener);

  useEffect(() => {
    const list = Array.isArray(events) ? events : [events];
    const handler: SyncListener = (source, keys) => {
      listenerRef.current(source, keys);
    };

    const unsubs = list.map(event => subscribe(event, handler));
    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [events, listenerRef]);
}
