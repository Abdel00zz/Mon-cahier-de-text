import { useContext, useEffect, useRef } from 'react';
import { MathJaxBaseContext } from 'better-react-mathjax';
import { MathRuntimeContext } from '@/contexts/MathRuntimeContext';
import { splitMathText } from '@/utils/math';
import { titleDirection } from '@/utils/contentDirection';

/** Short titles inside transient portals: convert off-DOM, then commit only if still mounted. */
function Formula({ source }: { source: string }) {
  const runtime = useContext(MathJaxBaseContext);
  const ready = useContext(MathRuntimeContext);
  const host = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ready || runtime?.version !== 3) return;
    let cancelled = false;
    const node = host.current;
    const tex = source.startsWith('$$') ? source.slice(2, -2)
      : source.startsWith('$') ? source.slice(1, -1)
      : /^\\[([]/.test(source) ? source.slice(2, -2) : source;
    void runtime.promise.then(async math => {
      await math.startup.promise;
      if (cancelled || !node?.isConnected) return;
      const output = await math.tex2chtmlPromise(tex, { display: false });
      if (cancelled || !node.isConnected) return;
      node.replaceChildren(output);
      const style = math.chtmlStylesheet();
      if (!style.isConnected) document.head.appendChild(style);
    }).catch(() => { /* Keep readable source text offline or if a formula is invalid. */ });
    return () => { cancelled = true; };
  }, [ready, runtime, source]);
  return <span ref={host} className="math-text inline-block" dir="ltr">{source}</span>;
}

export function MathTitle({ text }: { text: string }) {
  return <bdi dir={titleDirection(text)}>{splitMathText(text).map((part, index) => part.math ? <Formula key={`${index}:${part.text}`} source={part.text} /> : part.text)}</bdi>;
}
