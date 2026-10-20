import { useEffect, useState } from 'react';
import { subscribe } from '@/infrastructure/sync/syncBus';

/** Refresh after real writes/pulls; batches a burst of notebook updates without polling. */
export function useCompanionRevision() {
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    return subscribeCompanionChanges(() => setRevision(value => value + 1));
  }, []);
  return revision;
}

/** Public event adapter, kept independent of React for lifecycle verification. */
export function subscribeCompanionChanges(notify: () => void, doc: Document = document, view: Window = window): () => void {
    let pending: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (doc.hidden || pending !== undefined) return;
      pending = setTimeout(() => { pending = undefined; if (!doc.hidden) notify(); }, 100);
    };
    const storage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith('classData_v1_')) refresh();
    };
    const dispose = [subscribe('dirty', refresh), subscribe('pull-applied', refresh)];
    view.addEventListener('storage', storage);
    view.addEventListener('pageshow', refresh);
    doc.addEventListener('visibilitychange', refresh);
    return () => {
      clearTimeout(pending);
      dispose.forEach(remove => remove());
      view.removeEventListener('storage', storage);
      view.removeEventListener('pageshow', refresh);
      doc.removeEventListener('visibilitychange', refresh);
    };
}
