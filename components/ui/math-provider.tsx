import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { MathJaxBaseContext, MathJaxContext } from 'better-react-mathjax';
import { mathJaxConfig, MATHJAX_V4_SRC } from '@/config/mathJax';
import {
  MathRuntimeContext,
  MathTypesetPendingContext,
  MathTypesetRegistrationContext,
  type MathRuntimeStatus,
} from '@/contexts/MathRuntimeContext';

const MATH_RUNTIME_TIMEOUT_MS = 8_000;

const RuntimeReady: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const runtime = useContext(MathJaxBaseContext);
  const [status, setStatus] = useState<MathRuntimeStatus>('loading');
  const [pendingTypesets, setPendingTypesets] = useState(0);
  const pendingTypesetsRef = useRef(0);
  const publishFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    const timeout = window.setTimeout(() => {
      // Une panne CDN ne doit jamais emprisonner l'utilisateur dans le spinner.
      if (active) setStatus('degraded');
    }, MATH_RUNTIME_TIMEOUT_MS);

    // onLoad only fires for the first script download. The shared promise also
    // resolves after remounts, StrictMode and hot reload, when the script exists.
    runtime?.promise.then(async math => {
      if (!math || !('startup' in math)) throw new Error('MathJax runtime unavailable');
      await math.startup.promise;
      window.clearTimeout(timeout);
      if (active) setStatus('ready');
    }).catch(() => {
      window.clearTimeout(timeout);
      if (active) setStatus('degraded');
    });
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [runtime]);

  useEffect(() => () => {
    if (publishFrameRef.current !== null) window.cancelAnimationFrame(publishFrameRef.current);
  }, []);

  const publishPendingTypesets = useCallback(() => {
    if (publishFrameRef.current !== null) return;
    publishFrameRef.current = window.requestAnimationFrame(() => {
      publishFrameRef.current = null;
      setPendingTypesets(pendingTypesetsRef.current);
    });
  }, []);

  const beginTypeset = useCallback(() => {
    let finished = false;
    pendingTypesetsRef.current += 1;
    publishPendingTypesets();
    return () => {
      if (finished) return;
      finished = true;
      pendingTypesetsRef.current = Math.max(0, pendingTypesetsRef.current - 1);
      publishPendingTypesets();
    };
  }, [publishPendingTypesets]);

  const value = useMemo(() => ({
    status,
    ready: status === 'ready',
  }), [status]);

  return (
    <MathRuntimeContext.Provider value={value}>
      <MathTypesetRegistrationContext.Provider value={beginTypeset}>
        <MathTypesetPendingContext.Provider value={pendingTypesets}>
          {children}
        </MathTypesetPendingContext.Provider>
      </MathTypesetRegistrationContext.Provider>
    </MathRuntimeContext.Provider>
  );
};

export const MathProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MathJaxContext version={3} src={MATHJAX_V4_SRC} config={mathJaxConfig} asyncLoad hideUntilTypeset="every"
      onError={() => { /* RuntimeReady preserves source text if download fails. */ }}>
      <RuntimeReady>{children}</RuntimeReady>
    </MathJaxContext>
  );
};
