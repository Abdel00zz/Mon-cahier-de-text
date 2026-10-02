import { useEffect, useState, type ReactNode } from 'react';

/** Mount on first use, then retain state and let the child's closing animation finish. */
export function DeferredMount({ active, children }: { active: boolean; children: ReactNode }) {
  const [hasOpened, setHasOpened] = useState(active);
  useEffect(() => { if (active) setHasOpened(true); }, [active]);
  return active || hasOpened ? children : null;
}
