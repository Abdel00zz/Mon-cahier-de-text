import { useCallback, useEffect, useRef, useState } from 'react';
import type { GuideReference } from '../../constants/guide/model';

type GuideModule = typeof import('../guide/GuideModal');
interface OpenGuide { Component: GuideModule['GuideModal']; reference: GuideReference }

/** Load the existing reader on demand; a late import cannot reopen it after an account change. */
export function useCompanionGuide(owner?: string) {
  const [guide, setGuide] = useState<OpenGuide | null>(null);
  const session = useRef<object | null>(null);
  useEffect(() => {
    session.current = {};
    setGuide(null);
    return () => { session.current = null; };
  }, [owner]);
  const openGuide = useCallback(async (reference: GuideReference, signal?: AbortSignal): Promise<boolean> => {
    const current = session.current;
    if (!current || signal?.aborted) return false;
    const module = await import('../guide/GuideModal');
    if (session.current !== current || signal?.aborted) return false;
    setGuide({ Component: module.GuideModal, reference });
    return true;
  }, []);
  return { guide, openGuide, closeGuide: () => setGuide(null) };
}
