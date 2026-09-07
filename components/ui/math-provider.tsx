import React, { useContext, useEffect, useState } from 'react';
import { MathJaxBaseContext, MathJaxContext } from 'better-react-mathjax';
import { mathJaxConfig, MATHJAX_V4_SRC } from '@/config/mathJax';
import { MathRuntimeContext } from '@/contexts/MathRuntimeContext';

const RuntimeReady: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const runtime = useContext(MathJaxBaseContext);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    // onLoad only fires for the first script download. The shared promise also
    // resolves after remounts, StrictMode and hot reload, when the script exists.
    runtime?.promise.then(async math => {
      if ('startup' in math) await math.startup.promise;
      if (active) setReady(true);
    }).catch(() => { if (active) setReady(false); });
    return () => { active = false; };
  }, [runtime]);
  return <MathRuntimeContext.Provider value={ready}>{children}</MathRuntimeContext.Provider>;
};

export const MathProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MathJaxContext version={3} src={MATHJAX_V4_SRC} config={mathJaxConfig}
      onError={() => { /* RuntimeReady preserves source text if download fails. */ }}>
      <RuntimeReady>{children}</RuntimeReady>
    </MathJaxContext>
  );
};
